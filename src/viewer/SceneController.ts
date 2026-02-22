import {
  Box3,
  Color,
  DirectionalLight,
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

export class SceneController {
  private readonly scene: Scene;
  private readonly camera: PerspectiveCamera;
  private readonly renderer: WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly canvas: HTMLCanvasElement;
  private currentRobot: UrdfRobotLike | null = null;
  private animationFrameId = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.scene = new Scene();
    this.scene.background = new Color('#07121a');

    this.camera = new PerspectiveCamera(55, 1, 0.05, 500);
    this.camera.position.set(2.6, 1.8, 2.4);

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
    this.controls.target.set(0, 0.8, 0);

    const hemisphere = new HemisphereLight('#b9dcff', '#0f1114', 1.6);
    this.scene.add(hemisphere);

    const directional = new DirectionalLight('#f6fbff', 2.2);
    directional.position.set(4, 8, 3.5);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.normalBias = 0.0015;
    this.scene.add(directional);

    const grid = new GridHelper(20, 20, '#3a5666', '#1a303a');
    grid.position.y = 0;
    this.scene.add(grid);

    this.animate = this.animate.bind(this);
    this.animate();
  }

  setRobot(robot: UrdfRobotLike): void {
    this.clearRobot();
    this.currentRobot = robot;
    this.scene.add(robot);
    this.applyMeshDefaults(robot);
    this.frameRobot(robot);
  }

  clearRobot(): void {
    if (!this.currentRobot) {
      return;
    }

    this.scene.remove(this.currentRobot);
    disposeObjectTree(this.currentRobot);
    this.currentRobot = null;
  }

  frameRobot(robot: UrdfRobotLike | null = this.currentRobot): void {
    if (!robot) {
      return;
    }

    const box = new Box3().setFromObject(robot);
    if (box.isEmpty()) {
      return;
    }

    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const radius = Math.max(size.x, size.y, size.z, 0.25);
    const distance = radius * 2.4;

    this.controls.target.copy(center);
    this.camera.position.set(
      center.x + distance * 0.8,
      center.y + distance * 0.6,
      center.z + distance * 0.9,
    );
    this.camera.near = Math.max(0.01, distance / 120);
    this.camera.far = Math.max(100, distance * 40);
    this.camera.updateProjectionMatrix();
    this.controls.update();
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
}
