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
    detail: 'Use preset dropdown or drag and drop to load URDF / CSV / BVH / SMPL model (.npz/.pkl) + motion (.npz).',
    dropHint:
      'Supported: URDF (.urdf), CSV (.csv), BVH (.bvh), SMPL model (.npz/.pkl) + motion (.npz). For SMPL, load model first then motion. Use preset dropdown, drag files/folders, or use Select Folder / Select Files. Space: play/pause, R: reset, Tab: switch view, Shift: SMPL mesh/skeleton.',
  },
  drag_over: {
    chip: 'Drop',
    title: 'Drop To Load',
    detail: 'Release mouse to parse dropped URDF / CSV / BVH / SMPL model (.npz/.pkl) + motion (.npz) files.',
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
      'Select preset, drop another model to replace robot, or drop CSV/BVH/SMPL motion assets to play animation.',
    dropHint: 'Use preset dropdown or drop URDF/CSV/BVH/SMPL model (.npz/.pkl) + motion (.npz) to update current view. For SMPL, model can be loaded first and motion dropped later.',
  },
  error: {
    chip: 'Error',
    title: 'Load Failed',
    detail: 'Fix the input files and try again.',
    dropHint: 'Drop supported files (URDF/CSV/BVH/SMPL model (.npz/.pkl) + motion (.npz)) to retry.',
  },
};

export function getStateCopy(state: ViewerState): StateCopy {
  return STATE_COPY[state];
}
