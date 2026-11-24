import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type RGB = [number, number, number];

type Canvas = {
  width: number;
  height: number;
  pixels: Uint8Array;
};

type Story = {
  color: RGB;
  headline: string;
  summary: string;
};

const WIDTH = 1024;
const HEIGHT = 1024;
const BAND_HEIGHT = 90;
const GRID_STEP = 64;
const TITLE_SCALE = 7;
const BODY_SCALE = 4;
const SUMMARY_SCALE = 3;
const SMALL_SCALE = 2;
const CARD_Y0 = 140;
const CARD_HEIGHT = 196;
const CARD_GAP = 12;
const CARD_MARGIN = 36;
const BAR_WIDTH = 10;
const CARD_PAD = 18;
const FOOTER_LINE_Y = 978;
const FOOTER_TEXT_Y = 993;

const BG: RGB = [0x0b, 0x10, 0x26];
const GRID: RGB = [0x14, 0x1a, 0x38];
const BAND_RED: RGB = [0xc0, 0x39, 0x2b];
const PANEL: RGB = [0x10, 0x16, 0x32];
const PANEL_BORDER: RGB = [0x27, 0x31, 0x5a];
const WHITE: RGB = [0xff, 0xff, 0xff];
const GREY: RGB = [0x9a, 0xa3, 0xc0];
const GREEN: RGB = [0x2e, 0xcc, 0x71];
const ORANGE: RGB = [0xe6, 0x7e, 0x22];
const BLUE: RGB = [0x34, 0x98, 0xdb];
const RED: RGB = [0xe7, 0x4c, 0x3c];

const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  a: ['00000', '00000', '01110', '00001', '01111', '10001', '01111'],
  b: ['10000', '10000', '11110', '10001', '10001', '10001', '11110'],
  c: ['00000', '00000', '01111', '10000', '10000', '10000', '01111'],
  d: ['00001', '00001', '01111', '10001', '10001', '10001', '01111'],
  e: ['00000', '00000', '01110', '10001', '11111', '10000', '01110'],
  f: ['00110', '01001', '01000', '11100', '01000', '01000', '01000'],
  g: ['00000', '01111', '10001', '10001', '01111', '00001', '01110'],
  h: ['10000', '10000', '11110', '10001', '10001', '10001', '10001'],
  i: ['00100', '00000', '01100', '00100', '00100', '00100', '01110'],
  j: ['00010', '00000', '00110', '00010', '00010', '10010', '01100'],
  k: ['10000', '10010', '10100', '11000', '10100', '10010', '10001'],
  l: ['01100', '00100', '00100', '00100', '00100', '00100', '01110'],
  m: ['00000', '00000', '11010', '10101', '10101', '10101', '10101'],
  n: ['00000', '00000', '11110', '10001', '10001', '10001', '10001'],
  o: ['00000', '00000', '01110', '10001', '10001', '10001', '01110'],
  p: ['00000', '11110', '10001', '10001', '11110', '10000', '10000'],
  q: ['00000', '01111', '10001', '10001', '01111', '00001', '00001'],
  r: ['00000', '00000', '10110', '11001', '10000', '10000', '10000'],
  s: ['00000', '00000', '01111', '10000', '01110', '00001', '11110'],
  t: ['01000', '01000', '11110', '01000', '01000', '01001', '00110'],
  u: ['00000', '00000', '10001', '10001', '10001', '10001', '01111'],
  v: ['00000', '00000', '10001', '10001', '10001', '01010', '00100'],
  w: ['00000', '00000', '10001', '10101', '10101', '10101', '01010'],
  x: ['00000', '00000', '10001', '01010', '00100', '01010', '10001'],
  y: ['00000', '10001', '10001', '01111', '00001', '00010', '01100'],
  z: ['00000', '00000', '11111', '00010', '00100', '01000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '"': ['01010', '01010', '00000', '00000', '00000', '00000', '00000'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  "'": ['00100', '00100', '00000', '00000', '00000', '00000', '00000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '*': ['00000', '10101', '01110', '11111', '01110', '10101', '00000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  ',': ['00000', '00000', '00000', '00110', '00100', '01000', '00100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00100', '00100', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  ':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000'],
  ';': ['00000', '00100', '00100', '00000', '00100', '01000', '00000'],
  '<': ['00010', '00100', '01000', '10000', '01000', '00100', '00010'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '>': ['01000', '00100', '00010', '00001', '00010', '00100', '01000'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '@': ['01110', '10001', '10111', '10101', '10111', '10000', '01110'],
  '[': ['01110', '01000', '01000', '01000', '01000', '01000', '01110'],
  '\\': ['10000', '01000', '01000', '00100', '00010', '00010', '00001'],
  ']': ['01110', '00010', '00010', '00010', '00010', '00010', '01110'],
  '^': ['00100', '01010', '10001', '00000', '00000', '00000', '00000'],
  _: ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  '`': ['01000', '00100', '00000', '00000', '00000', '00000', '00000'],
  '{': ['00110', '00100', '01000', '10000', '01000', '00100', '00110'],
  '|': ['00100', '00100', '00100', '00100', '00100', '00100', '00100'],
  '}': ['01100', '00100', '00010', '00001', '00010', '00100', '01100'],
  '~': ['00000', '00000', '01000', '10101', '00010', '00000', '00000'],
};

const STORIES: Story[] = [
  {
    color: GREEN,
    headline: 'NVIDIA REINSTATES JENSEN HUANG AS CEO',
    summary: 'Board votes him back after his resignation; the stock jumps 31 percent and the Nasdaq gains 6 percent.',
  },
  {
    color: ORANGE,
    headline: 'UKRAINIAN SEA DRONES SINK RUSSIAN CORVETTE',
    summary: 'The Merkury sank at Benghazi after a naval drone strike. The UN demands an inquiry.',
  },
  {
    color: BLUE,
    headline: 'COP31 FALLOUT: PACIFIC NATIONS IN DESPAIR',
    summary: 'The failed climate summit triggers resignation calls and blame over fossil-fuel lobbying.',
  },
  {
    color: RED,
    headline: '24 KILLED IN INDONESIA FACTORY FIRE',
    summary: 'The Banten candy factory blaze leaves about 30 missing; rescuers search the ruins.',
  },
];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let value = n;
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[n] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
  return chunk;
}

function encodePng(width: number, height: number, pixels: Uint8Array): Uint8Array {
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer, ihdr.byteOffset, ihdr.byteLength);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowBytes = width * 4;
  const scanlines = new Uint8Array(height * (rowBytes + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowBytes;
    const scanStart = y * (rowBytes + 1);
    scanlines[scanStart] = 0;
    scanlines.set(pixels.subarray(rowStart, rowStart + rowBytes), scanStart + 1);
  }

  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(scanlines)),
    pngChunk('IEND', new Uint8Array(0)),
  ];
  const png = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}

function createCanvas(width: number, height: number): Canvas {
  return { width, height, pixels: new Uint8Array(width * height * 4) };
}

function fillRect(canvas: Canvas, x: number, y: number, width: number, height: number, color: RGB): void {
  const left = Math.max(0, Math.floor(x));
  const top = Math.max(0, Math.floor(y));
  const right = Math.min(canvas.width, Math.floor(x + width));
  const bottom = Math.min(canvas.height, Math.floor(y + height));
  for (let py = top; py < bottom; py++) {
    for (let px = left; px < right; px++) {
      const index = (py * canvas.width + px) * 4;
      canvas.pixels[index] = color[0];
      canvas.pixels[index + 1] = color[1];
      canvas.pixels[index + 2] = color[2];
      canvas.pixels[index + 3] = 255;
    }
  }
}

function drawChar(canvas: Canvas, x: number, y: number, ch: string, scale: number, color: RGB): void {
  const glyph = FONT[ch];
  if (!glyph) return;
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (glyph[row][col] !== '1') continue;
      fillRect(canvas, x + col * scale, y + row * scale, scale, scale, color);
    }
  }
}

function drawText(canvas: Canvas, x: number, y: number, text: string, scale: number, color: RGB): void {
  let cursor = x;
  for (const ch of text) {
    drawChar(canvas, cursor, y, ch, scale, color);
    cursor += 6 * scale;
  }
}

function drawBoldText(canvas: Canvas, x: number, y: number, text: string, scale: number, color: RGB): void {
  drawText(canvas, x, y, text, scale, color);
  drawText(canvas, x + 1, y, text, scale, color);
  drawText(canvas, x, y + 1, text, scale, color);
  drawText(canvas, x + 1, y + 1, text, scale, color);
}

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale;
}

function drawCenteredText(canvas: Canvas, text: string, y: number, scale: number, color: RGB): void {
  drawText(canvas, Math.round((canvas.width - textWidth(text, scale)) / 2), y, text, scale, color);
}

function splitLongWord(word: string, maxWidth: number, scale: number): string[] {
  const pieces: string[] = [];
  let piece = '';
  for (const ch of word) {
    if (piece !== '' && textWidth(piece + ch, scale) > maxWidth) {
      pieces.push(piece);
      piece = ch;
    } else {
      piece += ch;
    }
  }
  if (piece !== '') pieces.push(piece);
  return pieces;
}

function wrapText(text: string, maxWidth: number, scale: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line === '' ? word : line + ' ' + word;
    if (textWidth(candidate, scale) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line !== '') lines.push(line);
    if (textWidth(word, scale) <= maxWidth) {
      line = word;
      continue;
    }
    const pieces = splitLongWord(word, maxWidth, scale);
    lines.push(...pieces.slice(0, -1));
    line = pieces[pieces.length - 1] || '';
  }
  if (line !== '') lines.push(line);
  return lines;
}

function drawGrid(canvas: Canvas): void {
  for (let x = 0; x < canvas.width; x += GRID_STEP) fillRect(canvas, x, 0, 1, canvas.height, GRID);
  for (let y = 0; y < canvas.height; y += GRID_STEP) fillRect(canvas, 0, y, canvas.width, 1, GRID);
}

function countVisibleTitlePixels(canvas: Canvas): number {
  let count = 0;
  for (let y = 0; y < BAND_HEIGHT; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      if (
        canvas.pixels[index] !== BAND_RED[0] ||
        canvas.pixels[index + 1] !== BAND_RED[1] ||
        canvas.pixels[index + 2] !== BAND_RED[2]
      ) {
        count++;
      }
    }
  }
  return count;
}

function assertTitleVisibility(canvas: Canvas): number {
  const visiblePixels = countVisibleTitlePixels(canvas);
  if (visiblePixels <= 5000) {
    throw new Error(`Title band visibility assertion failed: ${visiblePixels} visible pixels`);
  }
  return visiblePixels;
}

function render(): Canvas {
  const canvas = createCanvas(WIDTH, HEIGHT);
  fillRect(canvas, 0, 0, WIDTH, HEIGHT, BG);
  drawGrid(canvas);
  fillRect(canvas, 0, 0, WIDTH, BAND_HEIGHT, BAND_RED);

  drawCenteredText(canvas, 'WORLD NEWS - 24 NOV 2026', 12, TITLE_SCALE, WHITE);
  drawCenteredText(canvas, 'sources: reuters/guardian/ap', 69, SMALL_SCALE, WHITE);

  const cardWidth = WIDTH - 2 * CARD_MARGIN;
  const textX = CARD_MARGIN + BAR_WIDTH + CARD_PAD;
  const textWidthAvailable = cardWidth - BAR_WIDTH - 2 * CARD_PAD;

  STORIES.forEach((story, index) => {
    const cardY = CARD_Y0 + index * (CARD_HEIGHT + CARD_GAP);
    fillRect(canvas, CARD_MARGIN, cardY, cardWidth, CARD_HEIGHT, PANEL);
    fillRect(canvas, CARD_MARGIN, cardY, cardWidth, 1, PANEL_BORDER);
    fillRect(canvas, CARD_MARGIN, cardY + CARD_HEIGHT - 1, cardWidth, 1, PANEL_BORDER);
    fillRect(canvas, CARD_MARGIN + cardWidth - 1, cardY, 1, CARD_HEIGHT, PANEL_BORDER);
    fillRect(canvas, CARD_MARGIN, cardY, BAR_WIDTH, CARD_HEIGHT, story.color);

    const headlineLines = wrapText(story.headline, textWidthAvailable, BODY_SCALE);
    const summaryLines = wrapText(story.summary, textWidthAvailable, SUMMARY_SCALE);
    const headlineLineHeight = 7 * BODY_SCALE + 6;
    const summaryLineHeight = 7 * SUMMARY_SCALE + 5;
    const blockHeight =
      headlineLines.length * headlineLineHeight + 12 + summaryLines.length * summaryLineHeight;
    let y = cardY + Math.floor((CARD_HEIGHT - blockHeight) / 2);

    for (const line of headlineLines) {
      drawBoldText(canvas, textX, y, line, BODY_SCALE, WHITE);
      y += headlineLineHeight;
    }
    y += 12;
    for (const line of summaryLines) {
      drawText(canvas, textX, y, line, SUMMARY_SCALE, GREY);
      y += summaryLineHeight;
    }
  });

  fillRect(canvas, CARD_MARGIN, FOOTER_LINE_Y, cardWidth, 1, GREY);
  drawCenteredText(canvas, '#WORLDNEWS - MADE BY AN AI AGENT - 24 NOV 2026', FOOTER_TEXT_Y, SMALL_SCALE, GREY);
  return canvas;
}

function main(): void {
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  const canvas = render();
  const visibleTitlePixels = assertTitleVisibility(canvas);
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'entry.png'), encodePng(WIDTH, HEIGHT, canvas.pixels));
  console.log(`Wrote entry.png (${WIDTH}x${HEIGHT}); title text pixels: ${visibleTitlePixels}`);
}

main();
