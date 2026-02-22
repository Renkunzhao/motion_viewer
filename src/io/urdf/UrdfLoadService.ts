import { Group, Mesh, MeshPhongMaterial } from 'three';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import URDFLoader from 'urdf-loader';

import type { DroppedFileMap, LoadedRobotResult, UrdfRobotLike } from '../../types/viewer';
import {
  getBaseName,
  getFileExtension,
  normalizePath,
  selectPrimaryUrdfPath,
  sortUrdfPaths,
  resolveFileKeyForRequest,
} from './pathResolver';

export class UrdfLoadService {
  private readonly objectUrls = new Set<string>();

  dispose(): void {
    this.revokeObjectUrls();
  }

  getAvailableUrdfPaths(fileMap: DroppedFileMap): string[] {
    return sortUrdfPaths(
      [...fileMap.keys()].filter((path) => path.toLowerCase().endsWith('.urdf')),
    );
  }

  async loadFromDroppedFiles(
    fileMap: DroppedFileMap,
    preferredUrdfPath?: string,
  ): Promise<LoadedRobotResult> {
    this.revokeObjectUrls();

    const urdfPaths = this.getAvailableUrdfPaths(fileMap);
    let selectedUrdfPath: string | null;

    if (preferredUrdfPath) {
      const normalizedPreferredPath = normalizePath(preferredUrdfPath);
      selectedUrdfPath =
        urdfPaths.find((path) => path === normalizedPreferredPath) ?? null;
      if (!selectedUrdfPath) {
        throw new Error(`Requested URDF not found in dropped files: ${preferredUrdfPath}`);
      }
    } else {
      selectedUrdfPath = selectPrimaryUrdfPath(urdfPaths);
    }

    if (!selectedUrdfPath) {
      throw new Error('No URDF file found. Drop a URDF file or folder containing one.');
    }

    const selectedUrdfFile = fileMap.get(selectedUrdfPath);
    if (!selectedUrdfFile) {
      throw new Error(`Selected URDF file is missing from file map: ${selectedUrdfPath}`);
    }

    const warnings = new Set<string>();
    if (!preferredUrdfPath && urdfPaths.length > 1) {
      warnings.add(
        `Multiple URDF files found. Auto-selected ${selectedUrdfPath}. Drop a narrower folder to choose another.`,
      );
    }

    const urdfContent = await selectedUrdfFile.text();
    const loader = new URDFLoader();
    loader.parseCollision = true;

    const blobUrlByPath = new Map<string, string>();
    const missingResourceWarnings = new Set<string>();

    const reportMissingResource = (requestedPath: string): void => {
      const normalized = normalizePath(requestedPath);
      if (!normalized || missingResourceWarnings.has(normalized)) {
        return;
      }

      missingResourceWarnings.add(normalized);
      warnings.add(`Missing resource: ${normalized}`);
    };

    const resolveBlobUrl = (fileKey: string): string => {
      const existingUrl = blobUrlByPath.get(fileKey);
      if (existingUrl) {
        return existingUrl;
      }

      const file = fileMap.get(fileKey);
      if (!file) {
        throw new Error(`File key was resolved but missing in map: ${fileKey}`);
      }

      const objectUrl = this.registerObjectUrl(file);
      blobUrlByPath.set(fileKey, objectUrl);
      return objectUrl;
    };

    loader.manager.setURLModifier((requestedUrl: string) => {
      if (requestedUrl.startsWith('blob:')) {
        return requestedUrl;
      }

      const fileKey = resolveFileKeyForRequest(requestedUrl, selectedUrdfPath, fileMap);
      if (!fileKey) {
        reportMissingResource(requestedUrl);
        return requestedUrl;
      }

      return resolveBlobUrl(fileKey);
    });

    loader.loadMeshCb = (
      requestedPath: string,
      manager: any,
      done: (object: unknown, error?: unknown) => void,
    ) => {
      const fileKey = resolveFileKeyForRequest(requestedPath, selectedUrdfPath, fileMap);
      if (!fileKey) {
        reportMissingResource(requestedPath);
        done(new Group());
        return;
      }

      const extension = getFileExtension(fileKey);
      const blobUrl = resolveBlobUrl(fileKey);

      const onError = (error: unknown): void => {
        const reason = error instanceof Error ? error.message : String(error);
        warnings.add(`Failed to load mesh ${fileKey}: ${reason}`);
        done(new Group());
      };

      switch (extension) {
        case 'stl':
          new STLLoader(manager).load(
            blobUrl,
            (geometry: unknown) => {
              const material = new MeshPhongMaterial({ color: '#c2ccd5' });
              const mesh = new Mesh(geometry, material);
              done(mesh);
            },
            undefined,
            onError,
          );
          return;
        case 'obj':
          new OBJLoader(manager).load(
            blobUrl,
            (object: unknown) => done(object),
            undefined,
            onError,
          );
          return;
        case 'dae':
          new ColladaLoader(manager).load(
            blobUrl,
            (result: any) => done(result?.scene ?? new Group()),
            undefined,
            onError,
          );
          return;
        default:
          warnings.add(
            `Unsupported mesh format "${extension || 'unknown'}" for ${fileKey}. Skipped this mesh.`,
          );
          done(new Group());
      }
    };

    const urdfBlob = new Blob([urdfContent], { type: 'text/xml' });
    const urdfUrl = this.registerObjectUrl(urdfBlob);
    const robot = await this.loadUrdfWithUrl(loader, urdfUrl);

    return {
      robot,
      robotName: robot.name || getBaseName(selectedUrdfPath).replace(/\.urdf$/i, ''),
      linkCount: robot.links ? Object.keys(robot.links).length : 0,
      jointCount: robot.joints ? Object.keys(robot.joints).length : 0,
      selectedUrdfPath,
      warnings: [...warnings],
    };
  }

  private registerObjectUrl(blob: Blob | File): string {
    const objectUrl = URL.createObjectURL(blob);
    this.objectUrls.add(objectUrl);
    return objectUrl;
  }

  private revokeObjectUrls(): void {
    for (const objectUrl of this.objectUrls) {
      URL.revokeObjectURL(objectUrl);
    }
    this.objectUrls.clear();
  }

  private loadUrdfWithUrl(loader: any, urdfUrl: string): Promise<UrdfRobotLike> {
    return new Promise((resolve, reject) => {
      loader.load(
        urdfUrl,
        (robot: unknown) => {
          const loadedRobot = robot as UrdfRobotLike;
          loadedRobot.traverse((child: unknown) => {
            const maybeMesh = child as any;
            if (maybeMesh.isMesh) {
              maybeMesh.castShadow = true;
              maybeMesh.receiveShadow = true;
            }
          });
          resolve(loadedRobot);
        },
        undefined,
        (error: unknown) => {
          const reason = error instanceof Error ? error.message : String(error);
          reject(new Error(`URDF loading failed: ${reason}`));
        },
      );
    });
  }
}
