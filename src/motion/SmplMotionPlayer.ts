import { Quaternion, Vector3 } from 'three';

import type { MotionFrameSnapshot } from './G1MotionPlayer';
import type { SmplMotionClip, SmplPlaybackTarget } from '../io/motion/SmplMotionService';

type RequestFrameFn = (callback: FrameRequestCallback) => number;
type CancelFrameFn = (requestId: number) => void;

interface SmplMotionPlayerOptions {
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

export class SmplMotionPlayer {
  public onFrameChanged: ((snapshot: MotionFrameSnapshot) => void) | null = null;
  public onPlaybackStateChanged: ((isPlaying: boolean) => void) | null = null;
  public onWarning: ((warning: string) => void) | null = null;

  private readonly now: () => number;
  private readonly requestFrame: RequestFrameFn;
  private readonly cancelFrame: CancelFrameFn;
  private readonly tempAxis = new Vector3();
  private readonly tempQuat = new Quaternion();
  private target: SmplPlaybackTarget | null = null;
  private clip: SmplMotionClip | null = null;
  private frameCount = 0;
  private fps = 30;
  private currentFrame = 0;
  private isPlaying = false;
  private rafId: number | null = null;
  private playbackStartTimeMs = 0;

  constructor(options: SmplMotionPlayerOptions = {}) {
    this.now = options.now ?? defaultNow;
    this.requestFrame =
      options.requestAnimationFrame ??
      ((callback: FrameRequestCallback) => defaultRequestFrame(callback, this.now));
    this.cancelFrame = options.cancelAnimationFrame ?? defaultCancelFrame;
  }

  load(target: SmplPlaybackTarget | null, clip: SmplMotionClip | null): void {
    this.pause();
    this.target = target;
    this.clip = clip;
    this.currentFrame = 0;

    if (!this.target || !this.clip) {
      this.frameCount = 0;
      this.fps = 30;
      return;
    }

    this.frameCount = this.clip.frameCount;
    this.fps = this.clip.fps;

    if (this.frameCount <= 0) {
      this.onWarning?.('SMPL clip has no valid frames.');
      return;
    }

    this.applyFrame(0);
  }

  play(): void {
    if (this.isPlaying || !this.target || !this.clip) {
      return;
    }

    const lastFrame = this.frameCount - 1;
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
    if (!this.target || !this.clip) {
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

    if (!this.target || !this.clip) {
      this.currentFrame = 0;
      return;
    }

    this.applyFrame(0);
  }

  dispose(): void {
    this.pause();
    this.target = null;
    this.clip = null;
    this.onFrameChanged = null;
    this.onPlaybackStateChanged = null;
    this.onWarning = null;
  }

  private readonly handleAnimationFrame = (timestamp: number): void => {
    if (!this.isPlaying || !this.target || !this.clip) {
      return;
    }

    const elapsedMs = timestamp - this.playbackStartTimeMs;
    const nextFrame = Math.floor(elapsedMs / this.getFrameDurationMs());
    const lastFrame = Math.max(this.frameCount - 1, 0);

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
    return 1000 / Math.max(this.fps, 1);
  }

  private clampFrame(frameIndex: number): number {
    const lastFrame = Math.max(this.frameCount - 1, 0);
    return Math.min(lastFrame, Math.max(0, Math.floor(frameIndex)));
  }

  private applyFrame(frameIndex: number): void {
    if (!this.target || !this.clip) {
      return;
    }

    const frame = this.clampFrame(frameIndex);
    const poseStride = this.clip.poseStride;
    const poseBase = frame * poseStride;
    const transBase = frame * 3;

    const rootX = (this.clip.trans[transBase] ?? 0) - (this.clip.translationOffsetXY[0] ?? 0);
    const rootY = (this.clip.trans[transBase + 1] ?? 0) - (this.clip.translationOffsetXY[1] ?? 0);
    const rootZ = this.clip.trans[transBase + 2] ?? 0;
    this.target.rootGroup.position.set(rootX, rootY, rootZ);

    for (let jointIndex = 0; jointIndex < this.target.bones.length; jointIndex += 1) {
      const bone = this.target.bones[jointIndex];
      if (!bone) {
        continue;
      }

      if (jointIndex >= this.clip.jointCount) {
        bone.quaternion.identity();
        continue;
      }

      const axisBase = poseBase + jointIndex * 3;
      const ax = this.clip.poses[axisBase] ?? 0;
      const ay = this.clip.poses[axisBase + 1] ?? 0;
      const az = this.clip.poses[axisBase + 2] ?? 0;

      this.tempAxis.set(ax, ay, az);
      const angle = this.tempAxis.length();
      if (angle <= 1e-8) {
        bone.quaternion.identity();
        continue;
      }

      this.tempAxis.multiplyScalar(1 / angle);
      this.tempQuat.setFromAxisAngle(this.tempAxis, angle);
      bone.quaternion.copy(this.tempQuat);
    }

    this.currentFrame = frame;
    this.onFrameChanged?.({
      frameIndex: frame,
      frameCount: this.frameCount,
      fps: this.fps,
      timeSeconds: frame / Math.max(this.fps, 1),
    });
  }
}
