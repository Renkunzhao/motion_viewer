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
    title: 'Waiting For Input',
    detail: 'Drop a URDF file set to start.',
    dropHint:
      'Drag a robot folder or multi-file set. Chromium browsers have full folder support.',
  },
  drag_over: {
    chip: 'Drop',
    title: 'Drop To Load',
    detail: 'Release mouse to parse URDF and referenced mesh files.',
    dropHint: 'Release now to load this robot.',
  },
  loading: {
    chip: 'Loading',
    title: 'Loading Files',
    detail: 'Parsing URDF and resolving meshes.',
    dropHint: 'Loading is in progress. Please wait.',
  },
  ready: {
    chip: 'Ready',
    title: 'Robot Loaded',
    detail: 'Drop another model anytime to replace current robot. Drop to replace.',
    dropHint: 'Drop again to replace the current robot.',
  },
  error: {
    chip: 'Error',
    title: 'Load Failed',
    detail: 'Fix the input files and try again.',
    dropHint: 'Drop another file set to retry.',
  },
};

export function getStateCopy(state: ViewerState): StateCopy {
  return STATE_COPY[state];
}
