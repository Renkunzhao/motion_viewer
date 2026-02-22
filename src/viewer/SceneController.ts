import {
  Box3,
  Color,
  DirectionalLight,
  Group,
  GridHelper,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import type { UrdfRobotLike } from '../types/viewer';

const HALF_PI = Math.PI / 2;
const GRID_BASE_SIZE = 20;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function disposeMaterial(material: unknown): void {
  if (!material || typeof material !== 'object') {
    return;
  }

  const disposable = material as { dispose?: () => void };
  disposable.dispose?.();
}

function disposeObjectTree(object: UrdfRobotLike): void {
  object.traverse((child) => {
    const maybeMesh = child as Mesh & {
      geometry?: { dispose?: () => void };
      material?: unknown | unknown[];
    };

    maybeMesh.geometry?.dispose?.();

    if (Array.isArray(maybeMesh.material)) {
      maybeMesh.material.forEach((material) => disposeMaterial(material));
    } else {
      disposeMaterial(maybeMesh.material);
    }
  });
}

export function getModelRootRotationX(up: '+Z' | '+Y'): number {
  return up === '+Z' ? -HALF_PI : 0;
}

export function computeCameraDistance(
  maxDimension: number,
  fovDegrees: number,
  fitOffset = 1.35,
): number {
  const safeDimension = Math.max(maxDimension, 0.01);
  const safeFov = clamp(fovDegrees, 10, 120);
  const fitHeightDistance =
    safeDimension / (2 * Math.tan((safeFov * Math.PI) / 180 / 2));
  return Math.max(fitHeightDistance * fitOffset, safeDimension * 1.15, 0.8);
}

export function computeGridScale(maxDimension: number, baseSize = GRID_BASE_SIZE): number {
  if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
    return 1;
  }

  const desiredCoverage = Math.max(maxDimension * 2.2, 2);
  const rawScale = desiredCoverage / baseSize;
  return clamp(rawScale, 0.2, 30);
}

export function evaluateScaleWarning(maxDimension: number): string | null {
  if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
    return 'Model bounds are invalid. Check if meshes were loaded correctly.';
  }

  if (maxDimension < 0.1) {
    return `Model is very small (${maxDimension.toFixed(4)} units). Scale may be in millimeters.`;
  }

  if (maxDimension > 30) {
    return `Model is very large (${maxDimension.toFixed(2)} units). Scale may be oversized.`;
  }

  return null;
}

export class SceneController {
  public onViewWarning: ((warning: string | null) => void) | null = null;

  private readonly scene: Scene;
  private readonly camera: PerspectiveCamera;
  private readonly renderer: WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly canvas: HTMLCanvasElement;
  private readonly modelRoot: Group;
  private readonly referenceGrid: GridHelper;
  private currentRobot: UrdfRobotLike | null = null;
  private modelUpAxis: '+Z' | '+Y' = '+Z';
  private animationFrameId = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.scene = new Scene();
    this.scene.background = new Color('#07121a');

    this.camera = new PerspectiveCamera(55, 1, 0.05, 500);
    this.camera.position.set(2.4, 2.1, 2.8);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.9;
    this.controls.zoomSpeed = 1.0;
    this.controls.target.set(0, 1.0, 0);

    const hemisphere = new HemisphereLight('#b9dcff', '#0f1114', 1.6);
    this.scene.add(hemisphere);

    const directional = new DirectionalLight('#f6fbff', 2.2);
    directional.position.set(4, 8, 3.5);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.normalBias = 0.0015;
    this.scene.add(directional);

    this.modelRoot = new Group();
    this.modelRoot.name = 'model-root';
    this.scene.add(this.modelRoot);

    this.referenceGrid = new GridHelper(GRID_BASE_SIZE, 20, '#3a5666', '#1a303a');
    this.referenceGrid.position.y = 0;
    this.scene.add(this.referenceGrid);

    this.setModelUpAxis('+Z');

    this.animate = this.animate.bind(this);
    this.animate();
  }

  setModelUpAxis(up: '+Z' | '+Y'): void {
    this.modelUpAxis = up;
    this.modelRoot.rotation.set(getModelRootRotationX(up), 0, 0);
    this.modelRoot.updateMatrixWorld(true);
  }

  setRobot(robot: UrdfRobotLike): void {
    this.clearRobot();
    this.currentRobot = robot;
    this.modelRoot.add(robot);
    this.applyMeshDefaults(robot);
    const box = this.frameRobot(robot);
    if (box) {
      this.updateGroundAndGrid(box);
    }
  }

  clearRobot(): void {
    if (!this.currentRobot) {
      return;
    }

    this.modelRoot.remove(this.currentRobot);
    disposeObjectTree(this.currentRobot);
    this.currentRobot = null;
    this.emitWarning(null);
  }

  frameRobot(robot: UrdfRobotLike | null = this.currentRobot): Box3 | null {
    if (!robot) {
      return null;
    }

    this.modelRoot.updateMatrixWorld(true);
    const box = new Box3().setFromObject(this.modelRoot, true);
    if (box.isEmpty()) {
      return null;
    }

    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z, 0.01);
    const distance = computeCameraDistance(maxDimension, this.camera.fov);

    this.controls.target.copy(center);
    this.camera.position.set(
      center.x + distance * 0.85,
      center.y + distance * 0.6,
      center.z + distance * 0.95,
    );
    this.camera.near = Math.max(0.01, distance / 120);
    this.camera.far = Math.max(200, distance * 55);
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.emitWarning(evaluateScaleWarning(maxDimension));
    return box;
  }

  updateGroundAndGrid(box: Box3): void {
    if (box.isEmpty()) {
      return;
    }

    const size = box.getSize(new Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z, 0.01);
    const gridScale = computeGridScale(maxDimension);
    this.referenceGrid.scale.setScalar(gridScale);
    this.referenceGrid.position.y = box.min.y + 0.0005;
  }

  resize(): void {
    const size = new Vector2();
    this.renderer.getSize(size);
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    if (size.x === width && size.y === height) {
      return;
    }

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.controls.dispose();
    this.clearRobot();
    this.renderer.dispose();
  }

  private applyMeshDefaults(robot: UrdfRobotLike): void {
    robot.traverse((child) => {
      const maybeMesh = child as Mesh;
      if (!maybeMesh.isMesh) {
        return;
      }

      maybeMesh.castShadow = true;
      maybeMesh.receiveShadow = true;
    });
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.resize();
    this.renderer.render(this.scene, this.camera);
  }

  private emitWarning(warning: string | null): void {
    this.onViewWarning?.(warning);
  }
}
