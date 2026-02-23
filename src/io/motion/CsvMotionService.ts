import type { CsvMotionLoadResult, DroppedFileMap, MotionClip } from '../../types/viewer';
import { getBaseName, getPathDepth, normalizePath } from '../urdf/pathResolver';
import { G1_CSV_STRIDE, G1_MOTION_FPS } from './G1MotionSchema';

function sortCsvPaths(paths: string[]): string[] {
  return [...paths]
    .map((path) => normalizePath(path))
    .filter(Boolean)
    .sort((left, right) => {
      const depthDelta = getPathDepth(left) - getPathDepth(right);
      if (depthDelta !== 0) {
        return depthDelta;
      }

      return left.localeCompare(right);
    });
}

function parseCsvLine(line: string): string[] {
  return line.split(',').map((token) => token.trim());
}

function isHeaderRow(tokens: string[]): boolean {
  return tokens.some((token) => !Number.isFinite(Number(token)));
}

function buildClipName(path: string): string {
  const baseName = getBaseName(path);
  return baseName || 'motion.csv';
}

export class CsvMotionService {
  getAvailableCsvPaths(fileMap: DroppedFileMap): string[] {
    return sortCsvPaths(
      [...fileMap.keys()].filter((path) => path.toLowerCase().endsWith('.csv')),
    );
  }

  async loadFromDroppedFiles(
    fileMap: DroppedFileMap,
    preferredCsvPath?: string,
  ): Promise<CsvMotionLoadResult> {
    const csvPaths = this.getAvailableCsvPaths(fileMap);
    let selectedCsvPath: string | null = null;

    if (preferredCsvPath) {
      const normalizedPreferredPath = normalizePath(preferredCsvPath);
      selectedCsvPath =
        csvPaths.find((path) => path === normalizedPreferredPath) ?? null;
      if (!selectedCsvPath) {
        throw new Error(`Requested CSV not found in dropped files: ${preferredCsvPath}`);
      }
    } else {
      selectedCsvPath = csvPaths.length > 0 ? csvPaths[0] : null;
    }

    if (!selectedCsvPath) {
      throw new Error('No CSV file found. Drop a motion CSV file.');
    }

    const selectedFile = fileMap.get(selectedCsvPath);
    if (!selectedFile) {
      throw new Error(`Selected CSV file is missing from file map: ${selectedCsvPath}`);
    }

    const warnings = new Set<string>();
    if (!preferredCsvPath && csvPaths.length > 1) {
      warnings.add(
        `Multiple CSV files found. Auto-selected ${selectedCsvPath}. Drop target CSV to choose another.`,
      );
    }

    const csvContent = await selectedFile.text();
    const parsed = parseMotionCsv(csvContent, selectedCsvPath);
    for (const warning of parsed.warnings) {
      warnings.add(warning);
    }

    return {
      clip: parsed.clip,
      selectedCsvPath,
      warnings: [...warnings],
    };
  }
}

export interface ParseMotionCsvResult {
  clip: MotionClip;
  warnings: string[];
}

export function parseMotionCsv(content: string, sourcePath: string): ParseMotionCsvResult {
  const lines = content.split(/\r?\n/);
  const values: number[] = [];
  const warnings = new Set<string>();
  let rowCount = 0;
  let firstDataRowSeen = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex];
    if (!rawLine || rawLine.trim() === '') {
      continue;
    }

    const tokens = parseCsvLine(rawLine);
    const lineNumber = lineIndex + 1;

    if (!firstDataRowSeen) {
      firstDataRowSeen = true;
      if (isHeaderRow(tokens)) {
        warnings.add(`Detected CSV header row at line ${lineNumber} and skipped it.`);
        continue;
      }
    }

    if (tokens.length !== G1_CSV_STRIDE) {
      throw new Error(
        `CSV row ${lineNumber} has ${tokens.length} columns, expected ${G1_CSV_STRIDE}.`,
      );
    }

    for (let columnIndex = 0; columnIndex < tokens.length; columnIndex += 1) {
      const token = tokens[columnIndex];
      const value = Number(token);
      if (!Number.isFinite(value)) {
        throw new Error(
          `CSV row ${lineNumber}, col ${columnIndex + 1} is not a valid number: "${token}".`,
        );
      }

      values.push(value);
    }

    rowCount += 1;
  }

  if (!firstDataRowSeen) {
    throw new Error('CSV is empty.');
  }

  if (rowCount === 0) {
    throw new Error('CSV does not contain motion frames.');
  }

  const clip: MotionClip = {
    name: buildClipName(sourcePath),
    sourcePath: normalizePath(sourcePath),
    fps: G1_MOTION_FPS,
    frameCount: rowCount,
    stride: G1_CSV_STRIDE,
    data: new Float32Array(values),
  };

  return {
    clip,
    warnings: [...warnings],
  };
}
