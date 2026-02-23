import { Euler, Quaternion } from 'three';
import { describe, expect, it, vi } from 'vitest';

import {
  G1_CSV_STRIDE,
  G1_JOINT_NAMES,
  G1_ROOT_JOINT_NAME,
} from '../io/motion/G1MotionSchema';
import type { MotionClip, UrdfRobotLike } from '../types/viewer';
import { G1MotionPlayer } from './G1MotionPlayer';

interface CapturedJointCall {
  jointName: string;
  values: number[];
}

type RafCallback = (timestamp: number) => void;

function createClip(frameCount: number): MotionClip {
  const data = new Float32Array(frameCount * G1_CSV_STRIDE);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const base = frame * G1_CSV_STRIDE;
    data[base] = frame + 0.1;
    data[base + 1] = frame + 0.2;
    data[base + 2] = frame + 0.3;
    data[base + 3] = 0;
    data[base + 4] = 0;
    data[base + 5] = 0;
    data[base + 6] = 1;

    for (let jointIndex = 0; jointIndex < G1_JOINT_NAMES.length; jointIndex += 1) {
      data[base + 7 + jointIndex] = frame * 10 + jointIndex;
    }
  }

  return {
    name: 'test.csv',
    sourcePath: 'motions/test.csv',
    fps: 30,
    frameCount,
    stride: G1_CSV_STRIDE,
    data,
  };
}

function createMockRobot(options: {
  includeRoot?: boolean;
  jointNames?: readonly string[];
} = {}): { robot: UrdfRobotLike; calls: CapturedJointCall[] } {
  const includeRoot = options.includeRoot ?? true;
  const jointNames = options.jointNames ?? G1_JOINT_NAMES;
  const calls: CapturedJointCall[] = [];
  const joints: Record<string, {}> = {};

  if (includeRoot) {
    joints[G1_ROOT_JOINT_NAME] = {};
  }

  for (const jointName of jointNames) {
    joints[jointName] = {};
  }

  const robot: UrdfRobotLike = {
    name: 'test-robot',
    joints,
    setJointValue: (jointName, ...values) => {
      calls.push({ jointName, values });
      return Boolean(joints[jointName]);
    },
    traverse: () => {
      // no-op for tests
    },
  };

  return { robot, calls };
}

describe('G1MotionPlayer', () => {
  it('clamps seek bounds and applies exact frame values', () => {
    const { robot, calls } = createMockRobot();
    const clip = createClip(2);
    const player = new G1MotionPlayer();
    const frameIndices: number[] = [];

    player.onFrameChanged = (snapshot) => frameIndices.push(snapshot.frameIndex);
    player.attachRobot(robot);
    player.loadClip(clip);
    player.seek(-100);
    player.seek(100);

    expect(frameIndices).toEqual([0, 0, 1]);
    expect(calls).toHaveLength(30 * 3);

    const rootCalls = calls.filter((call) => call.jointName === G1_ROOT_JOINT_NAME);
    expect(rootCalls).toHaveLength(3);
    expect(rootCalls[2]?.values[0]).toBeCloseTo(1.1);
    expect(rootCalls[2]?.values[1]).toBeCloseTo(1.2);
    expect(rootCalls[2]?.values[2]).toBeCloseTo(1.3);
  });

  it('converts root quaternion into XYZ Euler before applying floating joint', () => {
    const { robot, calls } = createMockRobot();
    const clip = createClip(1);
    const expectedEuler = new Euler(0.6, -0.35, 0.4, 'XYZ');
    const quat = new Quaternion().setFromEuler(expectedEuler);
    clip.data[3] = quat.x;
    clip.data[4] = quat.y;
    clip.data[5] = quat.z;
    clip.data[6] = quat.w;

    const player = new G1MotionPlayer();
    player.attachRobot(robot);
    player.loadClip(clip);

    const rootCalls = calls.filter((call) => call.jointName === G1_ROOT_JOINT_NAME);
    expect(rootCalls).toHaveLength(1);
    const values = rootCalls[0]?.values ?? [];
    expect(values[3]).toBeCloseTo(expectedEuler.x, 5);
    expect(values[4]).toBeCloseTo(expectedEuler.y, 5);
    expect(values[5]).toBeCloseTo(expectedEuler.z, 5);
  });

  it('reports missing joints and missing root based on robot joint map', () => {
    const { robot } = createMockRobot({
      includeRoot: false,
      jointNames: G1_JOINT_NAMES.slice(2),
    });
    const player = new G1MotionPlayer();

    const report = player.attachRobot(robot);

    expect(report.missingRequiredJoints).toEqual([
      G1_JOINT_NAMES[0],
      G1_JOINT_NAMES[1],
    ]);
    expect(report.missingRootJoint).toBe(true);
  });

  it('stops at the last frame and emits playback state transitions', () => {
    let nowMs = 0;
    let nextRafId = 1;
    let pendingCallback: unknown = null;
    const cancelSpy = vi.fn();
    const player = new G1MotionPlayer({
      now: () => nowMs,
      requestAnimationFrame: (callback: RafCallback) => {
        pendingCallback = callback;
        const id = nextRafId;
        nextRafId += 1;
        return id;
      },
      cancelAnimationFrame: cancelSpy,
    });
    const { robot } = createMockRobot();
    const clip = createClip(3);
    const playbackEvents: boolean[] = [];
    const frameIndices: number[] = [];

    player.onPlaybackStateChanged = (isPlaying) => playbackEvents.push(isPlaying);
    player.onFrameChanged = (snapshot) => frameIndices.push(snapshot.frameIndex);
    player.attachRobot(robot);
    player.loadClip(clip);
    player.play();

    expect(playbackEvents).toEqual([true]);
    expect(pendingCallback).not.toBeNull();

    const tick1 = pendingCallback;
    nowMs = 35;
    pendingCallback = null;
    if (typeof tick1 !== 'function') {
      throw new Error('Expected first RAF callback.');
    }
    (tick1 as RafCallback)(nowMs);
    expect(frameIndices).toContain(1);
    expect(playbackEvents).toEqual([true]);
    expect(pendingCallback).not.toBeNull();

    const tick2 = pendingCallback;
    nowMs = 80;
    pendingCallback = null;
    if (typeof tick2 !== 'function') {
      throw new Error('Expected second RAF callback.');
    }
    (tick2 as RafCallback)(nowMs);

    expect(frameIndices[frameIndices.length - 1]).toBe(2);
    expect(playbackEvents).toEqual([true, false]);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(pendingCallback).toBeNull();
  });
});
