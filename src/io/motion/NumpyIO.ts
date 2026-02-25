const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_COMPRESSION_STORE = 0;
const ZIP_COMPRESSION_DEFLATE = 8;

interface ZipEntry {
  fileName: string;
  compressionMethod: number;
  compressedData: Uint8Array;
  uncompressedSize: number;
}

export interface NpzArchive {
  listFileNames: () => string[];
  readNpy: (fileName: string) => Promise<ParsedNpyArray>;
  hasFile: (fileName: string) => boolean;
}

interface ParsedNpyHeader {
  descr: string;
  fortranOrder: boolean;
  shape: number[];
  dataOffset: number;
}

export interface ParsedNpyArray {
  descr: string;
  fortranOrder: boolean;
  shape: number[];
  rawData: ArrayBuffer;
  dataView: DataView;
  toNumberArray: () => Float64Array;
  toIntArray: () => Int32Array;
  toUintArray: () => Uint32Array;
  toScalarNumber: () => number;
  toScalarString: () => string;
}

function readUint16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readUint32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function decodeAscii(bytes: Uint8Array): string {
  let result = '';
  for (let index = 0; index < bytes.length; index += 1) {
    result += String.fromCharCode(bytes[index] ?? 0);
  }
  return result;
}

function normalizeFileName(fileName: string): string {
  return fileName.replace(/\\/g, '/').replace(/^\/+/, '');
}

function inflateDeflateRaw(data: Uint8Array): Promise<ArrayBuffer> {
  const globalAny = globalThis as unknown as {
    DecompressionStream?: new (format: string) => {
      writable: WritableStream<Uint8Array>;
      readable: ReadableStream<Uint8Array>;
    };
  };

  if (typeof globalAny.DecompressionStream !== 'function') {
    throw new Error('DecompressionStream is not available in this browser; deflated .npz is unsupported.');
  }

  const stream = new globalAny.DecompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  const writePromise = writer.write(data).then(() => writer.close());

  const response = new Response(stream.readable);
  return writePromise.then(() => response.arrayBuffer());
}

async function extractEntryData(entry: ZipEntry): Promise<ArrayBuffer> {
  if (entry.compressionMethod === ZIP_COMPRESSION_STORE) {
    const source = entry.compressedData;
    const output = new Uint8Array(source.length);
    output.set(source);
    return output.buffer;
  }

  if (entry.compressionMethod === ZIP_COMPRESSION_DEFLATE) {
    return inflateDeflateRaw(entry.compressedData);
  }

  throw new Error(`Unsupported zip compression method: ${entry.compressionMethod}`);
}

function parseZipEntries(buffer: ArrayBuffer): Map<string, ZipEntry> {
  const dataView = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const entries = new Map<string, ZipEntry>();
  let offset = 0;

  while (offset + 4 <= dataView.byteLength) {
    const signature = readUint32(dataView, offset);
    if (signature !== ZIP_LOCAL_FILE_HEADER_SIGNATURE) {
      break;
    }

    const compressionMethod = readUint16(dataView, offset + 8);
    const compressedSize = readUint32(dataView, offset + 18);
    const uncompressedSize = readUint32(dataView, offset + 22);
    const fileNameLength = readUint16(dataView, offset + 26);
    const extraFieldLength = readUint16(dataView, offset + 28);
    const fileNameStart = offset + 30;
    const fileNameEnd = fileNameStart + fileNameLength;
    const extraFieldEnd = fileNameEnd + extraFieldLength;
    const compressedDataEnd = extraFieldEnd + compressedSize;

    if (compressedDataEnd > dataView.byteLength) {
      throw new Error('Corrupted .npz zip payload: entry exceeds file bounds.');
    }

    const rawFileName = decodeAscii(bytes.subarray(fileNameStart, fileNameEnd));
    const fileName = normalizeFileName(rawFileName);
    const compressedData = bytes.subarray(extraFieldEnd, compressedDataEnd);
    entries.set(fileName, {
      fileName,
      compressionMethod,
      compressedData,
      uncompressedSize,
    });

    offset = compressedDataEnd;
  }

  if (entries.size === 0) {
    throw new Error('Invalid .npz file: no local file entries found.');
  }

  return entries;
}

function parseShape(rawShape: string): number[] {
  const trimmed = rawShape.trim();
  if (!trimmed || trimmed === '') {
    return [];
  }

  const parts = trimmed
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return parts.map((part) => {
    const value = Number(part);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid NPY shape component: ${part}`);
    }
    return Math.floor(value);
  });
}

function parseNpyHeader(buffer: ArrayBuffer): ParsedNpyHeader {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  if (bytes.length < 10) {
    throw new Error('Invalid NPY payload: file is too small.');
  }

  const magic = String.fromCharCode(...bytes.slice(0, 6));
  if (magic !== '\u0093NUMPY') {
    throw new Error('Invalid NPY payload: missing magic header.');
  }

  const major = bytes[6] ?? 0;
  const minor = bytes[7] ?? 0;

  let headerLength = 0;
  let headerStart = 0;
  if (major === 1) {
    headerLength = readUint16(view, 8);
    headerStart = 10;
  } else if (major === 2 || major === 3) {
    headerLength = readUint32(view, 8);
    headerStart = 12;
  } else {
    throw new Error(`Unsupported NPY version: ${major}.${minor}`);
  }

  const headerEnd = headerStart + headerLength;
  if (headerEnd > bytes.length) {
    throw new Error('Invalid NPY payload: header exceeds payload size.');
  }

  const headerText = decodeAscii(bytes.subarray(headerStart, headerEnd)).trim();
  const descrMatch = /'descr'\s*:\s*'([^']+)'/.exec(headerText);
  const fortranMatch = /'fortran_order'\s*:\s*(True|False)/.exec(headerText);
  const shapeMatch = /'shape'\s*:\s*\(([^\)]*)\)/.exec(headerText);

  if (!descrMatch || !fortranMatch || !shapeMatch) {
    throw new Error(`Invalid NPY header: ${headerText}`);
  }

  return {
    descr: descrMatch[1] ?? '',
    fortranOrder: (fortranMatch[1] ?? 'False') === 'True',
    shape: parseShape(shapeMatch[1] ?? ''),
    dataOffset: headerEnd,
  };
}

function computeElementCount(shape: number[]): number {
  if (shape.length === 0) {
    return 1;
  }

  return shape.reduce((product, current) => product * Math.max(current, 0), 1);
}

function inferByteWidthFromDescr(descr: string): number {
  const widthMatch = /([0-9]+)$/.exec(descr.trim());
  if (!widthMatch) {
    throw new Error(`Unsupported NPY dtype descriptor: ${descr}`);
  }

  const width = Number(widthMatch[1]);
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error(`Invalid NPY dtype byte width: ${descr}`);
  }

  const typeCode = descr.length >= 2 ? descr[1] : '';
  if (typeCode === 'U') {
    return Math.floor(width * 4);
  }

  return Math.floor(width);
}

function parseEndian(descr: string): '<' | '>' | '|' {
  const prefix = descr[0] ?? '<';
  if (prefix === '<' || prefix === '>' || prefix === '|') {
    return prefix;
  }

  return '<';
}

function parseTypeCode(descr: string): string {
  const candidate = descr.length >= 2 ? descr[1] : '';
  if (!candidate) {
    throw new Error(`Invalid NPY dtype descriptor: ${descr}`);
  }

  return candidate;
}

function readNumberAt(view: DataView, offset: number, descr: string): number {
  const endian = parseEndian(descr);
  const typeCode = parseTypeCode(descr);
  const width = inferByteWidthFromDescr(descr);
  const littleEndian = endian !== '>';

  if (typeCode === 'f') {
    if (width === 4) {
      return view.getFloat32(offset, littleEndian);
    }
    if (width === 8) {
      return view.getFloat64(offset, littleEndian);
    }
  }

  if (typeCode === 'i') {
    if (width === 1) {
      return view.getInt8(offset);
    }
    if (width === 2) {
      return view.getInt16(offset, littleEndian);
    }
    if (width === 4) {
      return view.getInt32(offset, littleEndian);
    }
    if (width === 8) {
      const value = view.getBigInt64(offset, littleEndian);
      const numberValue = Number(value);
      if (Number.isSafeInteger(numberValue)) {
        return numberValue;
      }
      return Number(value);
    }
  }

  if (typeCode === 'u') {
    if (width === 1) {
      return view.getUint8(offset);
    }
    if (width === 2) {
      return view.getUint16(offset, littleEndian);
    }
    if (width === 4) {
      return view.getUint32(offset, littleEndian);
    }
    if (width === 8) {
      const value = view.getBigUint64(offset, littleEndian);
      const numberValue = Number(value);
      if (Number.isSafeInteger(numberValue)) {
        return numberValue;
      }
      return Number(value);
    }
  }

  throw new Error(`Unsupported numeric dtype descriptor: ${descr}`);
}

function convertFortranToCOrder(
  source: Float64Array,
  shape: number[],
): Float64Array {
  if (shape.length <= 1) {
    return source;
  }

  const target = new Float64Array(source.length);
  const rank = shape.length;
  const cStrides = new Array<number>(rank).fill(1);
  const fStrides = new Array<number>(rank).fill(1);

  for (let axis = rank - 2; axis >= 0; axis -= 1) {
    cStrides[axis] = cStrides[axis + 1] * shape[axis + 1];
  }

  for (let axis = 1; axis < rank; axis += 1) {
    fStrides[axis] = fStrides[axis - 1] * shape[axis - 1];
  }

  const coords = new Array<number>(rank).fill(0);
  for (let linearIndex = 0; linearIndex < source.length; linearIndex += 1) {
    let remainder = linearIndex;
    for (let axis = 0; axis < rank; axis += 1) {
      const stride = cStrides[axis] ?? 1;
      const size = shape[axis] ?? 1;
      coords[axis] = Math.floor(remainder / stride) % size;
      remainder %= stride;
    }

    let fortranIndex = 0;
    for (let axis = 0; axis < rank; axis += 1) {
      fortranIndex += (coords[axis] ?? 0) * (fStrides[axis] ?? 1);
    }
    target[linearIndex] = source[fortranIndex] ?? 0;
  }

  return target;
}

function createParsedNpyArray(buffer: ArrayBuffer): ParsedNpyArray {
  const header = parseNpyHeader(buffer);
  const elementCount = computeElementCount(header.shape);
  const bytes = new Uint8Array(buffer, header.dataOffset);
  const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const byteWidth = inferByteWidthFromDescr(header.descr);
  const expectedByteLength = elementCount * byteWidth;
  if (dataView.byteLength < expectedByteLength) {
    throw new Error(
      `Invalid NPY payload: expected ${expectedByteLength} bytes, got ${dataView.byteLength} bytes.`,
    );
  }

  const readNumericAsFloat64 = (): Float64Array => {
    const values = new Float64Array(elementCount);
    for (let index = 0; index < elementCount; index += 1) {
      values[index] = readNumberAt(dataView, index * byteWidth, header.descr);
    }

    if (header.fortranOrder) {
      return convertFortranToCOrder(values, header.shape);
    }

    return values;
  };

  const assertNumeric = (): void => {
    const typeCode = parseTypeCode(header.descr);
    if (typeCode !== 'f' && typeCode !== 'i' && typeCode !== 'u') {
      throw new Error(`NPY dtype ${header.descr} is not numeric.`);
    }
  };

  return {
    descr: header.descr,
    fortranOrder: header.fortranOrder,
    shape: [...header.shape],
    rawData: dataView.buffer.slice(dataView.byteOffset, dataView.byteOffset + dataView.byteLength),
    dataView,
    toNumberArray: () => {
      assertNumeric();
      return readNumericAsFloat64();
    },
    toIntArray: () => {
      assertNumeric();
      const values = readNumericAsFloat64();
      const output = new Int32Array(values.length);
      for (let index = 0; index < values.length; index += 1) {
        output[index] = Math.trunc(values[index] ?? 0);
      }
      return output;
    },
    toUintArray: () => {
      assertNumeric();
      const values = readNumericAsFloat64();
      const output = new Uint32Array(values.length);
      for (let index = 0; index < values.length; index += 1) {
        output[index] = Math.max(0, Math.trunc(values[index] ?? 0));
      }
      return output;
    },
    toScalarNumber: () => {
      assertNumeric();
      if (header.shape.length !== 0) {
        throw new Error(`NPY value ${header.descr} is not a scalar number.`);
      }
      return readNumberAt(dataView, 0, header.descr);
    },
    toScalarString: () => {
      if (header.shape.length !== 0) {
        throw new Error(`NPY value ${header.descr} is not a scalar string.`);
      }

      const typeCode = parseTypeCode(header.descr);
      if (typeCode !== 'U' && typeCode !== 'S') {
        throw new Error(`NPY dtype ${header.descr} is not a scalar string.`);
      }

      const width = inferByteWidthFromDescr(header.descr);
      if (typeCode === 'S') {
        return decodeAscii(new Uint8Array(dataView.buffer, dataView.byteOffset, width)).replace(/\u0000+$/, '');
      }

      const chars: string[] = [];
      for (let offset = 0; offset < width; offset += 4) {
        const codePoint = dataView.getUint32(offset, true);
        if (codePoint === 0) {
          continue;
        }
        chars.push(String.fromCodePoint(codePoint));
      }
      return chars.join('');
    },
  };
}

export async function parseNpzFile(file: File): Promise<NpzArchive> {
  const buffer = await file.arrayBuffer();
  const entries = parseZipEntries(buffer);
  const cache = new Map<string, ParsedNpyArray>();

  return {
    listFileNames: () => [...entries.keys()],
    hasFile: (fileName: string) => entries.has(normalizeFileName(fileName)),
    readNpy: async (fileName: string) => {
      const normalized = normalizeFileName(fileName);
      const cached = cache.get(normalized);
      if (cached) {
        return cached;
      }

      const entry = entries.get(normalized);
      if (!entry) {
        throw new Error(`NPZ entry not found: ${normalized}`);
      }

      const npyBuffer = await extractEntryData(entry);
      if (entry.uncompressedSize > 0 && npyBuffer.byteLength !== entry.uncompressedSize) {
        throw new Error(
          `NPZ entry size mismatch for ${normalized}: expected ${entry.uncompressedSize}, got ${npyBuffer.byteLength}.`,
        );
      }

      const parsed = createParsedNpyArray(npyBuffer);
      cache.set(normalized, parsed);
      return parsed;
    },
  };
}
