import type { ViewerState } from '../types/viewer';

export interface StateCopy {
  chip: string;
  title: string;
  detail: string;
  dropHint: string;
}

const STATE_COPY: Record<ViewerState, StateCopy> = {
  idle: {
    chip: 'Idle',
    title: 'Motion Viewer',
    detail: 'Drag and drop to load URDF / CSV / BVH.',
    dropHint:
      'Supported: URDF (.urdf), CSV (.csv), BVH (.bvh). Drag files/folders or use Select Folder / Select Files. Space: play/pause, R: reset, Tab: switch view.',
  },
  drag_over: {
    chip: 'Drop',
    title: 'Drop To Load',
    detail: 'Release mouse to parse dropped URDF / CSV / BVH files.',
    dropHint: 'Release now to load dropped files.',
  },
  loading: {
    chip: 'Loading',
    title: 'Loading Files',
    detail: 'Parsing files and preparing scene.',
    dropHint: 'Loading is in progress. Please wait.',
  },
  ready: {
    chip: 'Ready',
    title: 'Viewer Ready',
    detail:
      'Drop another model to replace robot, or drop CSV/BVH motion to play animation.',
    dropHint: 'Drop URDF/CSV/BVH to update current view.',
  },
  error: {
    chip: 'Error',
    title: 'Load Failed',
    detail: 'Fix the input files and try again.',
    dropHint: 'Drop supported files (URDF/CSV/BVH) to retry.',
  },
};

export function getStateCopy(state: ViewerState): StateCopy {
  return STATE_COPY[state];
}
