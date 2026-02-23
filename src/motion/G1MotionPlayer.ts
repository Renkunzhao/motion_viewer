import { Euler, Quaternion, Vector3 } from 'three';

import { G1_JOINT_NAMES, G1_JOINT_VALUE_OFFSET, G1_ROOT_JOINT_NAME } from '../io/motion/G1MotionSchema';
import type { MotionClip, UrdfRobotLike } from '../types/viewer';

type RequestFrameFn = (callback: FrameRequestCallback) => number;
type CancelFrameFn = (requestId: number) => void;

export interface MotionBindingReport {
  missingRequiredJoints: string[];
  missingRootJoint: boolean;
}

export interface MotionFrameSnapshot {
  frameIndex: number;
  frameCount: number;
  fps: number;
  timeSeconds: number;
}

interface G1MotionPlayerOptions {
  now?: () => number;
  requestAnimationFrame?: RequestFrameFn;
  cancelAnimationFrame?: CancelFrameFn;
}

function defaultNow(): number {
  if (typeof globalThis.performance !== 'undefined') {
    return globalThis.performance.now();
  }

  return Date.now();
}

function defaultRequestFrame(callback: FrameRequestCallback, now: () => number): number {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }

  return setTimeout(() => callback(now()), 16) as unknown as number;
}

function defaultCancelFrame(requestId: number): void {
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(requestId);
    return;
  }

  clearTimeout(requestId as unknown as ReturnType<typeof setTimeout>);
}

export class G1MotionPlayer {
  public onFrameChanged: ((snapshot: MotionFrameSnapshot) => void) | null = null;
  public onPlaybackStateChanged: ((isPlaying: boolean) => void) | null = null;
  public onWarning: ((warning: string) => void) | null = null;

  private readonly now: () => number;
  private readonly requestFrame: RequestFrameFn;
  private readonly cancelFrame: CancelFrameFn;
  private readonly tempQuat = new Quaternion();
  private readonly tempEuler = new Euler();
  private robot: UrdfRobotLike | null = null;
  private clip: MotionClip | null = null;
  private rootSetter: ((x: number, y: number, z: number, roll: number, pitch: number, yaw: number) => void) | null =
    null;
  private rootTransformAnchor:
    | {
        basePosition: any;
        baseQuaternion: any;
      }
    | null = null;
  private rootTransformFallback:
    | {
        position: { copy: (value: any) => unknown };
        quaternion: { copy: (value: any) => unknown };
        basePosition: any;
        baseQuaternion: any;
      }
    | null = null;
  private jointSetters: Array<((value: number) => void) | null> = [];
  private bindingReport: MotionBindingReport = {
    missingRequiredJoints: [...G1_JOINT_NAMES],
    missingRootJoint: true,
  };
  private currentFrame = 0;
  private isPlaying = false;
  private rafId: number | null = null;
  private playbackStartTimeMs = 0;
  private readonly tempMotionPosition = new Vector3();
  private readonly tempComposedPosition = new Vector3();
  private readonly tempComposedQuaternion = new Quaternion();

  constructor(options: G1MotionPlayerOptions = {}) {
    this.now = options.now ?? defaultNow;
    this.requestFrame =
      options.requestAnimationFrame ??
      ((callback: FrameRequestCallback) => defaultRequestFrame(callback, this.now));
    this.cancelFrame = options.cancelAnimationFrame ?? defaultCancelFrame;
  }

  attachRobot(robot: UrdfRobotLike | null): MotionBindingReport {
    const robotChanged = this.robot !== robot;
    this.robot = robot;
    if (!robot) {
      this.rootTransformAnchor = null;
    } else if (robotChanged) {
      this.rootTransformAnchor = this.captureRootTransformAnchor(robot);
    }

    this.bindingReport = this.rebindRobot();
    if (this.clip && this.bindingReport.missingRequiredJoints.length === 0) {
      this.applyFrame(this.currentFrame);
    }

    return {
      missingRequiredJoints: [...this.bindingReport.missingRequiredJoints],
      missingRootJoint: this.bindingReport.missingRootJoint,
    };
  }

  loadClip(clip: MotionClip | null): MotionBindingReport {
    this.pause();
    this.clip = clip;
    this.currentFrame = 0;
    this.bindingReport = this.rebindRobot();

    if (!this.clip) {
      return {
        missingRequiredJoints: [...this.bindingReport.missingRequiredJoints],
        missingRootJoint: this.bindingReport.missingRootJoint,
      };
    }

    this.applyFrame(0);
    return {
      missingRequiredJoints: [...this.bindingReport.missingRequiredJoints],
      missingRootJoint: this.bindingReport.missingRootJoint,
    };
  }

  play(): void {
    if (this.isPlaying || !this.clip) {
      return;
    }

    const lastFrame = this.clip.frameCount - 1;
    if (lastFrame <= 0 || this.currentFrame >= lastFrame) {
      return;
    }

    this.isPlaying = true;
    this.playbackStartTimeMs = this.now() - this.currentFrame * this.getFrameDurationMs();
    this.onPlaybackStateChanged?.(true);
    this.rafId = this.requestFrame(this.handleAnimationFrame);
  }

  pause(): void {
    if (this.rafId !== null) {
      this.cancelFrame(this.rafId);
      this.rafId = null;
    }

    if (!this.isPlaying) {
      return;
    }

    this.isPlaying = false;
    this.onPlaybackStateChanged?.(false);
  }

  seek(frameIndex: number): void {
    if (!this.clip) {
      return;
    }

    const targetFrame = this.clampFrame(frameIndex);
    this.applyFrame(targetFrame);

    if (this.isPlaying) {
      this.playbackStartTimeMs = this.now() - targetFrame * this.getFrameDurationMs();
    }
  }

  reset(): void {
    this.pause();
    if (!this.clip) {
      this.currentFrame = 0;
      return;
    }

    this.applyFrame(0);
  }

  dispose(): void {
    this.pause();
    this.robot = null;
    this.clip = null;
    this.rootSetter = null;
    this.jointSetters = [];
    this.onFrameChanged = null;
    this.onPlaybackStateChanged = null;
    this.onWarning = null;
  }

  private readonly handleAnimationFrame = (timestamp: number): void => {
    if (!this.isPlaying || !this.clip) {
      return;
    }

    const elapsedMs = timestamp - this.playbackStartTimeMs;
    const nextFrame = Math.floor(elapsedMs / this.getFrameDurationMs());
    const lastFrame = this.clip.frameCount - 1;

    if (nextFrame >= lastFrame) {
      this.applyFrame(lastFrame);
      this.pause();
      return;
    }

    if (nextFrame !== this.currentFrame) {
      this.applyFrame(nextFrame);
    }

    this.rafId = this.requestFrame(this.handleAnimationFrame);
  };

  private getFrameDurationMs(): number {
    const fps = this.clip?.fps ?? 30;
    return 1000 / Math.max(fps, 1);
  }

  private clampFrame(frameIndex: number): number {
    if (!this.clip) {
      return 0;
    }

    const lastFrame = Math.max(this.clip.frameCount - 1, 0);
    return Math.min(lastFrame, Math.max(0, Math.floor(frameIndex)));
  }

  private rebindRobot(): MotionBindingReport {
    this.rootSetter = null;
    this.rootTransformFallback = null;
    this.jointSetters = [];

    if (!this.robot) {
      return {
        missingRequiredJoints: [...G1_JOINT_NAMES],
        missingRootJoint: true,
      };
    }

    const missingRequired: string[] = [];

    for (const jointName of G1_JOINT_NAMES) {
      const setter = this.createJointSetter(jointName);
      if (!setter) {
        missingRequired.push(jointName);
      }

      this.jointSetters.push(setter);
    }

    this.rootSetter = this.createRootSetter();
    if (!this.rootSetter) {
      this.rootTransformFallback = this.createRootTransformFallback();
    }
    const report: MotionBindingReport = {
      missingRequiredJoints: missingRequired,
      missingRootJoint: !this.rootSetter && !this.rootTransformFallback,
    };

    if (!report.missingRootJoint && !this.rootSetter && this.rootTransformFallback && this.clip) {
      this.onWarning?.(
        `Joint "${G1_ROOT_JOINT_NAME}" was not found. Root motion is applied to robot transform fallback.`,
      );
    }

    if (report.missingRootJoint && this.clip) {
      this.onWarning?.(
        `Joint "${G1_ROOT_JOINT_NAME}" was not found. Root translation/rotation is ignored.`,
      );
    }

    return report;
  }

  private createJointSetter(jointName: string): ((value: number) => void) | null {
    if (!this.robot) {
      return null;
    }

    const joint = this.robot.joints?.[jointName];
    if (this.robot.joints && !joint) {
      return null;
    }

    if (typeof this.robot.setJointValue === 'function') {
      return (value: number) => {
        this.robot?.setJointValue?.(jointName, value);
      };
    }

    if (!joint || typeof joint.setJointValue !== 'function') {
      return null;
    }

    return (value: number) => {
      joint.setJointValue?.(value);
    };
  }

  private createRootSetter():
    | ((x: number, y: number, z: number, roll: number, pitch: number, yaw: number) => void)
    | null {
    if (!this.robot) {
      return null;
    }

    const rootJoint = this.robot.joints?.[G1_ROOT_JOINT_NAME];
    if (this.robot.joints && !rootJoint) {
      return null;
    }

    if (typeof this.robot.setJointValue === 'function') {
      return (x, y, z, roll, pitch, yaw) => {
        this.robot?.setJointValue?.(G1_ROOT_JOINT_NAME, x, y, z, roll, pitch, yaw);
      };
    }

    if (!rootJoint || typeof rootJoint.setJointValue !== 'function') {
      return null;
    }

    return (x, y, z, roll, pitch, yaw) => {
      rootJoint.setJointValue?.(x, y, z, roll, pitch, yaw);
    };
  }

  private captureRootTransformAnchor(robot: UrdfRobotLike): {
    basePosition: any;
    baseQuaternion: any;
  } | null {
    const target = robot as unknown as {
      position?: { clone?: () => any };
      quaternion?: { clone?: () => any };
    };

    if (
      !target.position ||
      !target.quaternion ||
      typeof target.position.clone !== 'function' ||
      typeof target.quaternion.clone !== 'function'
    ) {
      return null;
    }

    return {
      basePosition: target.position.clone(),
      baseQuaternion: target.quaternion.clone(),
    };
  }

  private createRootTransformFallback():
    | {
        position: { copy: (value: any) => unknown };
        quaternion: { copy: (value: any) => unknown };
        basePosition: any;
        baseQuaternion: any;
      }
    | null {
    if (!this.robot) {
      return null;
    }

    const target = this.robot as unknown as {
      position?: { clone?: () => any; copy?: (value: any) => unknown };
      quaternion?: { clone?: () => any; copy?: (value: any) => unknown };
      matrixWorldNeedsUpdate?: boolean;
    };

    if (
      !target.position ||
      !target.quaternion ||
      typeof target.position.clone !== 'function' ||
      typeof target.position.copy !== 'function' ||
      typeof target.quaternion.clone !== 'function' ||
      typeof target.quaternion.copy !== 'function'
    ) {
      return null;
    }

    const anchor = this.rootTransformAnchor;
    if (!anchor) {
      return null;
    }

    const position = target.position as { clone: () => any; copy: (value: any) => unknown };
    const quaternion = target.quaternion as { clone: () => any; copy: (value: any) => unknown };

    return {
      position,
      quaternion,
      basePosition: anchor.basePosition,
      baseQuaternion: anchor.baseQuaternion,
    };
  }

  private applyFrame(frameIndex: number): void {
    if (!this.clip) {
      return;
    }

    const frame = this.clampFrame(frameIndex);
    const base = frame * this.clip.stride;
    const data = this.clip.data;

    if (this.rootSetter) {
      const x = data[base];
      const y = data[base + 1];
      const z = data[base + 2];
      const qx = data[base + 3];
      const qy = data[base + 4];
      const qz = data[base + 5];
      const qw = data[base + 6];

      this.tempQuat.set(qx, qy, qz, qw);
      if (this.tempQuat.lengthSq() < 1e-10) {
        this.tempQuat.identity();
      } else {
        this.tempQuat.normalize();
      }

      this.tempEuler.setFromQuaternion(this.tempQuat, 'XYZ');
      this.rootSetter(
        x,
        y,
        z,
        this.tempEuler.x,
        this.tempEuler.y,
        this.tempEuler.z,
      );
    } else if (this.rootTransformFallback) {
      const x = data[base];
      const y = data[base + 1];
      const z = data[base + 2];
      const qx = data[base + 3];
      const qy = data[base + 4];
      const qz = data[base + 5];
      const qw = data[base + 6];
      const fallback = this.rootTransformFallback;

      this.tempQuat.set(qx, qy, qz, qw);
      if (this.tempQuat.lengthSq() < 1e-10) {
        this.tempQuat.identity();
      } else {
        this.tempQuat.normalize();
      }

      this.tempMotionPosition.set(x, y, z);
      this.tempComposedPosition
        .copy(fallback.basePosition)
        .applyQuaternion(this.tempQuat)
        .add(this.tempMotionPosition);
      this.tempComposedQuaternion
        .copy(this.tempQuat)
        .multiply(fallback.baseQuaternion);

      fallback.position.copy(this.tempComposedPosition);
      fallback.quaternion.copy(this.tempComposedQuaternion);
    }

    for (let jointIndex = 0; jointIndex < this.jointSetters.length; jointIndex += 1) {
      const setter = this.jointSetters[jointIndex];
      if (!setter) {
        continue;
      }

      setter(data[base + G1_JOINT_VALUE_OFFSET + jointIndex]);
    }

    this.currentFrame = frame;
    this.onFrameChanged?.({
      frameIndex: frame,
      frameCount: this.clip.frameCount,
      fps: this.clip.fps,
      timeSeconds: frame / Math.max(this.clip.fps, 1),
    });
  }
}
