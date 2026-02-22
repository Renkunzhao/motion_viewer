export type ViewerState = 'idle' | 'drag_over' | 'loading' | 'ready' | 'error';

export type DroppedFileMap = Map<string, File>;

export interface UrdfRobotLike {
  name: string;
  joints?: Record<string, unknown>;
  links?: Record<string, unknown>;
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
