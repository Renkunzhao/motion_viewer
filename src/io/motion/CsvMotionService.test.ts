import { describe, expect, it } from 'vitest';

import type { DroppedFileMap } from '../../types/viewer';
import { G1_CSV_STRIDE, G1_MOTION_FPS } from './G1MotionSchema';
import { CsvMotionService, parseMotionCsv } from './CsvMotionService';

function buildFrameValues(seed: number): string {
  return Array.from({ length: G1_CSV_STRIDE }, (_, index) => (seed + index * 0.01).toFixed(6)).join(',');
}

function buildFileMap(entries: Record<string, string>): DroppedFileMap {
  const fileMap: DroppedFileMap = new Map();
  for (const [path, content] of Object.entries(entries)) {
    fileMap.set(path, new File([content], path.split('/').pop() ?? 'motion.csv'));
  }
  return fileMap;
}

describe('parseMotionCsv', () => {
  it('parses valid csv rows into a motion clip', () => {
    const csvContent = `${buildFrameValues(0)}\n${buildFrameValues(1)}\n`;
    const result = parseMotionCsv(csvContent, 'motions/dance.csv');

    expect(result.clip.frameCount).toBe(2);
    expect(result.clip.stride).toBe(G1_CSV_STRIDE);
    expect(result.clip.fps).toBe(G1_MOTION_FPS);
    expect(result.clip.data.length).toBe(2 * G1_CSV_STRIDE);
    expect(result.warnings).toHaveLength(0);
  });

  it('skips a non-numeric header row', () => {
    const csvContent = `frame,root_x,root_y\n${buildFrameValues(0)}\n`;
    const result = parseMotionCsv(csvContent, 'dance.csv');

    expect(result.clip.frameCount).toBe(1);
    expect(result.warnings[0]).toContain('Detected CSV header row');
  });

  it('throws on wrong column count', () => {
    const csvContent = `1,2,3\n`;
    expect(() => parseMotionCsv(csvContent, 'broken.csv')).toThrow(
      /has 3 columns, expected/,
    );
  });

  it('throws on non-numeric values', () => {
    const goodRow = Array.from({ length: G1_CSV_STRIDE }, (_, index) => String(index));
    const badRow = Array.from({ length: G1_CSV_STRIDE }, (_, index) => String(index));
    badRow[10] = 'bad';
    const csvContent = `${goodRow.join(',')}\n${badRow.join(',')}\n`;

    expect(() => parseMotionCsv(csvContent, 'broken.csv')).toThrow(/not a valid number/);
  });

  it('throws on empty csv', () => {
    expect(() => parseMotionCsv('', 'empty.csv')).toThrow(/CSV is empty/);
  });
});

describe('CsvMotionService', () => {
  it('deterministically selects primary csv and reports warning for multiple candidates', async () => {
    const fileMap = buildFileMap({
      'deep/path/b.csv': `${buildFrameValues(0)}\n`,
      'a.csv': `${buildFrameValues(1)}\n`,
    });

    const service = new CsvMotionService();
    const result = await service.loadFromDroppedFiles(fileMap);

    expect(result.selectedCsvPath).toBe('a.csv');
    expect(result.warnings.some((warning) => warning.includes('Multiple CSV files'))).toBe(true);
  });
});
