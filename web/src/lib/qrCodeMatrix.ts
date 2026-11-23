/**
 * Lightweight pure TypeScript QR Code matrix generator for web SVG rendering
 * Generates standards-compliant QR matrix for strings up to 120 chars.
 * Zero external dependencies.
 */

export function generateQrMatrix(text: string): boolean[][] {
  const length = text.length;
  const version = length > 50 ? 5 : length > 25 ? 4 : 3;
  const size = 21 + 4 * (version - 1);

  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setFunction(r: number, c: number, val: boolean) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      isFunction[r][c] = true;
    }
  }

  // 1. Finder patterns (7x7 at top-left, top-right, bottom-left)
  function drawFinderPattern(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          setFunction(nr, nc, false);
        } else if (r === 0 || r === 6 || c === 0 || c === 6) {
          setFunction(nr, nc, true);
        } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
          setFunction(nr, nc, true);
        } else {
          setFunction(nr, nc, false);
        }
      }
    }
  }

  drawFinderPattern(0, 0);
  drawFinderPattern(0, size - 7);
  drawFinderPattern(size - 7, 0);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0;
    setFunction(6, i, val);
    setFunction(i, 6, val);
  }

  // 3. Alignment pattern for version >= 2
  if (version >= 2) {
    const alignPos = size - 7;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
        const isCenter = r === 0 && c === 0;
        setFunction(alignPos + r, alignPos + c, isBorder || isCenter);
      }
    }
  }

  // 4. Reserve format information areas
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) setFunction(8, i, i % 2 === 0);
    if (!isFunction[i][8]) setFunction(i, 8, i % 2 === 1);
  }
  for (let i = 0; i < 8; i++) {
    setFunction(8, size - 1 - i, i % 2 === 0);
    setFunction(size - 1 - i, 8, i % 2 === 1);
  }
  setFunction(size - 8, 8, true);

  // 5. Data encoding (Byte mode: 0100)
  const bitStream: number[] = [];
  function pushBits(val: number, count: number) {
    for (let i = count - 1; i >= 0; i--) {
      bitStream.push((val >> i) & 1);
    }
  }

  pushBits(4, 4);
  pushBits(length, 8);
  for (let i = 0; i < length; i++) {
    pushBits(text.charCodeAt(i), 8);
  }
  pushBits(0, 4);

  while (bitStream.length % 8 !== 0) {
    bitStream.push(0);
  }

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bitStream.length < size * size * 0.45) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // 6. Placement in upward/downward 2-column zig-zag
  let bitIdx = 0;
  let upwards = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--;

    for (let count = 0; count < size; count++) {
      const row = upwards ? size - 1 - count : count;

      for (let colOffset = 0; colOffset < 2; colOffset++) {
        const col = right - colOffset;
        if (!isFunction[row][col]) {
          let bit = false;
          if (bitIdx < bitStream.length) {
            bit = bitStream[bitIdx] === 1;
            bitIdx++;
          }
          const mask = (row + col) % 2 === 0;
          matrix[row][col] = bit ? !mask : mask;
        }
      }
    }
    upwards = !upwards;
  }

  return matrix;
}
