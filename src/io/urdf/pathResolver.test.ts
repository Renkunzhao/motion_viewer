import { describe, expect, it } from 'vitest';

import {
  normalizePath,
  resolveFileKeyForRequest,
  selectPrimaryUrdfPath,
  sortUrdfPaths,
} from './pathResolver';
import type { DroppedFileMap } from '../../types/viewer';

function createMockFile(content: string, name: string): File {
  return new File([content], name);
}

describe('pathResolver', () => {
  it('normalizes relative path tokens and slashes', () => {
    expect(normalizePath('.\\robot\\meshes\\..\\pelvis.STL')).toBe('robot/pelvis.STL');
    expect(normalizePath('/robot/./meshes/body.STL')).toBe('robot/meshes/body.STL');
    expect(normalizePath('robot//meshes///arm.STL')).toBe('robot/meshes/arm.STL');
  });

  it('sorts and selects urdf path by depth then name', () => {
    const input = ['b/model.urdf', 'a/z/model.urdf', 'a/model.urdf'];
    expect(sortUrdfPaths(input)).toEqual(['a/model.urdf', 'b/model.urdf', 'a/z/model.urdf']);
    expect(selectPrimaryUrdfPath(input)).toBe('a/model.urdf');
  });

  it('resolves file key with urdf-directory priority and basename fallback', () => {
    const fileMap: DroppedFileMap = new Map([
      ['g1/g1.urdf', createMockFile('<robot/>', 'g1.urdf')],
      ['g1/meshes/pelvis.STL', createMockFile('stl', 'pelvis.STL')],
      ['backup/meshes/pelvis.STL', createMockFile('stl', 'pelvis.STL')],
    ]);

    expect(resolveFileKeyForRequest('meshes/pelvis.STL', 'g1/g1.urdf', fileMap)).toBe(
      'g1/meshes/pelvis.STL',
    );
    expect(resolveFileKeyForRequest('pelvis.STL', 'g1/g1.urdf', fileMap)).toBe(
      'g1/meshes/pelvis.STL',
    );
  });
});
