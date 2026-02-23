export type ViewerState = 'idle' | 'drag_over' | 'loading' | 'ready' | 'error';
export type ViewMode = 'free' | 'root_lock';

export type DroppedFileMap = Map<string, File>;

export interface UrdfJointLike {
  jointType?: string;
  jointValue?: number[];
  setJointValue?: (...values: (number | null)[]) => boolean;
}

export interface UrdfRobotLike {
  name: string;
  joints?: Record<string, UrdfJointLike>;
  links?: Record<string, unknown>;
  setJointValue?: (jointName: string, ...values: number[]) => boolean;
  traverse: (callback: (child: unknown) => void) => void;
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

export interface MotionClip {
  name: string;
  sourcePath: string;
  fps: number;
  frameCount: number;
  stride: number;
  data: Float32Array;
}

export interface CsvMotionLoadResult {
  clip: MotionClip;
  selectedCsvPath: string;
  warnings: string[];
}
