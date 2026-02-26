import type { ViewerState } from '../types/viewer';

export interface StateCopy {
  chip: string;
  title: string;
  dropHint: string;
}

const STATE_COPY: Record<ViewerState, StateCopy> = {
  idle: {
    chip: 'Idle',
    title: 'Wait for load',
    dropHint: 'Use preset dropdown to play a demo.\n Drag and drop to load models (.bvh, .urdf, .npz/.pkl (SMPL) ).',
  },
  drag_over: {
    chip: 'Drop',
    title: 'Drop To Load',
    dropHint: 'Release mouse to parse dropped folder or file.',
  },
  loading: {
    chip: 'Loading',
    title: 'Loading Files',
    dropHint: 'Loading is in progress. Please wait.',
  },
  model_ready: {
    chip: 'Model Ready',
    title: 'Model Loaded',
    dropHint:
      'Drag and drop to load motion (.csv, .npz, .pkl) or objects (.obj).',
  },
  playing: {
    chip: 'Playing',
    title: 'Motion Playing',
    dropHint:
      '',
  },
  error: {
    chip: 'Error',
    title: 'Load Failed',
    dropHint:
      'Supported format .bvh, .urdf, .npz, .pkl, .csv.',
  },
};

export function getStateCopy(state: ViewerState): StateCopy {
  return STATE_COPY[state];
}
