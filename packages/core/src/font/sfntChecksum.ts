/**
 * opentype.js 1.3.4 writes a wrong CFF table checksum when the table length
 * is not a multiple of 4 (it depends on the font name length). Windows then
 * rejects the font. This recomputes every table checksum and head.checkSumAdjustment.
 */
function sum32(view: DataView, offset: number, length: number): number {
  let sum = 0;
  const end = offset + length;
  for (let i = offset; i < end; i += 4) {
    let word = 0;
    for (let b = 0; b < 4; b++) {
      word = (word << 8) | (i + b < end ? view.getUint8(i + b) : 0);
    }
    sum = (sum + (word >>> 0)) >>> 0;
  }
  return sum;
}

export function fixSfntChecksums(buffer: ArrayBuffer): ArrayBuffer {
  const view = new DataView(buffer);
  const numTables = view.getUint16(4);
  let headOffset = -1;

  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(
      view.getUint8(rec), view.getUint8(rec + 1), view.getUint8(rec + 2), view.getUint8(rec + 3),
    );
    const offset = view.getUint32(rec + 8);
    const length = view.getUint32(rec + 12);
    if (tag === 'head') {
      headOffset = offset;
      view.setUint32(offset + 8, 0);
    }
    view.setUint32(rec + 4, sum32(view, offset, length));
  }

  if (headOffset >= 0) {
    const total = sum32(view, 0, buffer.byteLength);
    view.setUint32(headOffset + 8, (0xb1b0afba - total) >>> 0);
  }
  return buffer;
}
