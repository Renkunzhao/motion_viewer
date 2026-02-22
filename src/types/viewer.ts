import type { Object3D } from 'three';

export type ViewerState = 'idle' | 'drag_over' | 'loading' | 'ready' | 'error';

export type DroppedFileMap = Map<string, File>;

export interface UrdfRobotLike extends Object3D {
  joints?: Record<string, unknown>;
  links?: Record<string, unknown>;
}

export interface LoadResult {
  robotName: string;
  linkCount: number;
  jointCount: number;
  selectedUrdfPath: string;
  warnings: string[];
}

export interface LoadedRobotResult extends LoadResult {
  robot: UrdfRobotLike;
}
