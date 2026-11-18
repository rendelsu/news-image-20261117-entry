// news-image-20261117 — "The World in One Day"
// A flat-design newspaper infographic drawn entirely in code (Node 22 stdlib
// only: fs + zlib). No network, no fonts, no assets: every pixel, every letter
// is produced by this program, so the output is byte-identical on every run.
//
// Layout (1024 x 1024):
//   header band  : "17 NOVEMBER 2026" + "TUESDAY - THE WORLD IN ONE DAY"
//   2 x 2 panels : one story each — bridge / tanker / summit / chip
//   footer strip : "AS REPORTED ON 17 NOVEMBER 2026"
// Each panel is a drawn scene plus a headline bar with two short sub-lines.
// Text uses a hand-built 5x7 bitmap font (all caps) so it stays crisp and
// can never garble.
import * as fs from "node:fs";
import { deflateSync } from "node:zlib";

// ---------------------------------------------------------------- PNG ------
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(width: number, height: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter: none
    Buffer.from(rgb.buffer, rgb.byteOffset + y * width * 3, width * 3).copy(
      raw,
      y * (1 + width * 3) + 1,
    );
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- canvas ------
const W = 1024;
const H = 1024;
const fb = new Uint8Array(W * H * 3);
type RGB = [number, number, number];

const NAVY: RGB = [11, 31, 58];
const SLATE: RGB = [17, 24, 39];
const WHITE: RGB = [255, 255, 255];
const GOLD: RGB = [245, 158, 11];
const LIGHT_GOLD: RGB = [252, 211, 77];
const LIGHT_GRAY: RGB = [209, 213, 219];

function px(x: number, y: number, c: RGB): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return;
  const i = (yi * W + xi) * 3;
  fb[i] = c[0];
  fb[i + 1] = c[1];
  fb[i + 2] = c[2];
}
function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      fb[i] = c[0];
      fb[i + 1] = c[1];
      fb[i + 2] = c[2];
    }
  }
}
function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}
function vGrad(x: number, y: number, w: number, h: number, c1: RGB, c2: RGB): void {
  for (let yy = 0; yy < h; yy++) {
    const t = h <= 1 ? 0 : yy / (h - 1);
    fillRect(x, y + yy, w, 1, [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]);
  }
}
function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let yy = -r; yy <= r; yy++) {
    const half = Math.floor(Math.sqrt(r * r - yy * yy));
    fillRect(cx - half, cy + yy, half * 2 + 1, 1, c);
  }
}
function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let yy = -ry; yy <= ry; yy++) {
    const half = Math.floor((rx * Math.sqrt(ry * ry - yy * yy)) / ry);
    fillRect(cx - half, cy + yy, half * 2 + 1, 1, c);
  }
}
function thickDot(x: number, y: number, t: number, c: RGB): void {
  fillRect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
}
function line(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= steps; i++) {
    thickDot(x0 + (dx * i) / steps, y0 + (dy * i) / steps, t, c);
  }
}
function polyline(points: Array<[number, number]>, t: number, c: RGB): void {
  for (let i = 0; i + 1 < points.length; i++) {
    line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], t, c);
  }
}
function fillPoly(points: Array<[number, number]>, c: RGB): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of points) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[(i + 1) % points.length];
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      fillRect(Math.ceil(xs[i]), y, Math.floor(xs[i + 1]) - Math.ceil(xs[i]) + 1, 1, c);
    }
  }
}
function star(cx: number, cy: number, r: number, c: RGB): void {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.42;
    pts.push([cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)]);
  }
  fillPoly(pts, c);
}

// --------------------------------------------------------------- font ------
// Hand-built 5x7 bitmap font, all caps. "#" = on, "." = off.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10011", "10101", "11001", "10001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "00100", "00100", "00100"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "01100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "'": ["00100", "00100", "00000", "00000", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "10000", "10000"],
  "(": ["00011", "00100", "01000", "01000", "01000", "00100", "00011"],
  ")": ["11000", "00100", "00010", "00010", "00010", "00100", "11000"],
};
function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}
function drawText(s: string, cx: number, y: number, scale: number, c: RGB): void {
  let x = Math.round(cx - textWidth(s, scale) / 2);
  for (const ch of s) {
    const glyph = FONT[ch] ?? FONT[" "];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === "1") {
          fillRect(x + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
    x += 6 * scale;
  }
}

// -------------------------------------------------------------- scenes -----
// Each scene paints into (ox, oy) .. (ox+504, oy+272).

// A — Kerch Bridge: a road bridge over blue water, its middle span broken
// and sinking, smoke and fire at the gap, a small Ukrainian flag on the deck.
function sceneBridge(ox: number, oy: number): void {
  vGrad(ox, oy, 504, 150, [191, 227, 242], [143, 195, 232]);
  vGrad(ox, oy + 150, 504, 122, [46, 109, 164], [23, 69, 110]);
  fillCircle(ox + 440, oy + 42, 32, [255, 249, 219]);
  fillCircle(ox + 440, oy + 42, 24, [255, 243, 176]);
  // towers and cables
  fillRect(ox + 70, oy + 58, 10, 90, [75, 85, 99]);
  fillRect(ox + 420, oy + 58, 10, 90, [75, 85, 99]);
  line(ox + 75, oy + 58, ox + 150, oy + 130, 2, [107, 114, 128]);
  line(ox + 75, oy + 58, ox + 200, oy + 130, 2, [107, 114, 128]);
  line(ox + 425, oy + 58, ox + 350, oy + 130, 2, [107, 114, 128]);
  line(ox + 425, oy + 58, ox + 305, oy + 130, 2, [107, 114, 128]);
  // deck: left and right segments, gap in the middle
  fillRect(ox, oy + 132, 210, 16, [91, 100, 112]);
  fillRect(ox + 300, oy + 132, 204, 16, [91, 100, 112]);
  fillRect(ox, oy + 132, 210, 3, [156, 163, 175]);
  fillRect(ox + 300, oy + 132, 204, 3, [156, 163, 175]);
  // collapsed span sinking into the water
  fillPoly(
    [
      [ox + 216, oy + 132],
      [ox + 294, oy + 132],
      [ox + 262, oy + 208],
      [ox + 240, oy + 208],
    ],
    [91, 100, 112],
  );
  fillPoly(
    [
      [ox + 228, oy + 152],
      [ox + 280, oy + 152],
      [ox + 268, oy + 196],
      [ox + 244, oy + 196],
    ],
    [75, 85, 99],
  );
  // splash, fire, smoke at the gap
  fillCircle(ox + 245, oy + 205, 10, [224, 242, 254]);
  fillCircle(ox + 262, oy + 210, 8, [224, 242, 254]);
  fillCircle(ox + 232, oy + 212, 7, [224, 242, 254]);
  fillPoly(
    [
      [ox + 236, oy + 134],
      [ox + 252, oy + 92],
      [ox + 268, oy + 134],
    ],
    [249, 115, 22],
  );
  fillCircle(ox + 252, oy + 128, 15, [249, 115, 22]);
  fillCircle(ox + 258, oy + 118, 11, [251, 191, 36]);
  fillCircle(ox + 244, oy + 120, 9, [253, 230, 138]);
  fillCircle(ox + 250, oy + 96, 16, [156, 163, 175]);
  fillCircle(ox + 266, oy + 72, 12, [107, 114, 128]);
  fillCircle(ox + 240, oy + 58, 9, [156, 163, 175]);
  // small Ukrainian flag on the left deck
  line(ox + 38, oy + 96, ox + 38, oy + 130, 3, [55, 65, 81]);
  fillRect(ox + 40, oy + 96, 30, 10, [37, 99, 235]);
  fillRect(ox + 40, oy + 106, 30, 10, [250, 204, 21]);
  // waves
  line(ox + 20, oy + 240, ox + 120, oy + 240, 2, [191, 219, 254]);
  line(ox + 300, oy + 250, ox + 420, oy + 250, 2, [191, 219, 254]);
  line(ox + 150, oy + 226, ox + 230, oy + 226, 2, [191, 219, 254]);
}

// B — Strait of Hormuz: an oil tanker burning at dusk, a naval mine in the
// water beside it, a distant second tanker on the horizon.
function sceneTanker(ox: number, oy: number): void {
  vGrad(ox, oy, 504, 120, [253, 230, 138], [249, 115, 22]);
  vGrad(ox, oy + 120, 504, 152, [15, 59, 77], [8, 42, 56]);
  // distant tanker silhouette
  fillRect(ox + 18, oy + 128, 70, 14, [51, 65, 85]);
  fillRect(ox + 60, oy + 116, 16, 12, [51, 65, 85]);
  // oil slick under the hull
  fillEllipse(ox + 255, oy + 228, 150, 9, [5, 10, 15]);
  // hull with bow and red waterline
  fillRect(ox + 90, oy + 150, 330, 58, [31, 41, 55]);
  fillPoly(
    [
      [ox + 420, oy + 150],
      [ox + 452, oy + 179],
      [ox + 420, oy + 208],
    ],
    [31, 41, 55],
  );
  fillRect(ox + 90, oy + 194, 330, 14, [127, 29, 29]);
  // white superstructure and red funnel
  fillRect(ox + 330, oy + 108, 62, 42, [243, 244, 246]);
  for (let i = 0; i < 4; i++) fillRect(ox + 338 + i * 14, oy + 120, 8, 8, [31, 41, 55]);
  fillRect(ox + 296, oy + 122, 28, 28, [185, 28, 28]);
  fillRect(ox + 296, oy + 122, 28, 8, [17, 24, 39]);
  // fire amidships and black smoke column, connected from deck to sky
  fillPoly(
    [
      [ox + 186, oy + 152],
      [ox + 200, oy + 96],
      [ox + 214, oy + 152],
    ],
    [249, 115, 22],
  );
  fillCircle(ox + 200, oy + 150, 18, [249, 115, 22]);
  fillCircle(ox + 206, oy + 138, 12, [251, 191, 36]);
  fillCircle(ox + 194, oy + 140, 8, [253, 230, 138]);
  fillCircle(ox + 200, oy + 108, 14, [31, 41, 55]);
  fillCircle(ox + 208, oy + 84, 13, [55, 65, 81]);
  fillCircle(ox + 196, oy + 60, 11, [31, 41, 55]);
  fillCircle(ox + 206, oy + 40, 9, [55, 65, 81]);
  // naval mine: spiked black ball at the waterline
  const mx = ox + 462;
  const my = oy + 228;
  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI) / 4;
    line(mx, my, mx + 20 * Math.cos(ang), my + 20 * Math.sin(ang), 3, [17, 24, 39]);
  }
  fillCircle(mx, my, 11, [17, 24, 39]);
  // waves
  line(ox + 30, oy + 240, ox + 110, oy + 240, 2, [125, 211, 252]);
  line(ox + 330, oy + 248, ox + 440, oy + 248, 2, [125, 211, 252]);
  line(ox + 140, oy + 258, ox + 260, oy + 258, 2, [125, 211, 252]);
}

// C — Shenzhen summit: three flags (US, China, Russia) behind a conference
// table with three seated leaders.
function sceneSummit(ox: number, oy: number): void {
  fillRect(ox, oy, 504, 272, [237, 242, 247]);
  fillRect(ox, oy + 210, 504, 62, [203, 213, 225]);
  const centers = [ox + 92, ox + 252, ox + 412];
  const suits: RGB[] = [[31, 41, 55], [127, 29, 29], [55, 65, 81]];
  for (let i = 0; i < 3; i++) {
    const cx = centers[i];
    line(cx, oy + 28, cx, oy + 196, 3, [107, 114, 128]);
  }
  // US flag: stripes + blue canton
  fillRect(centers[0] - 36, oy + 28, 72, 46, [185, 28, 28]);
  for (let s = 0; s < 6; s++) fillRect(centers[0] - 36, oy + 32 + s * 7, 72, 3, WHITE);
  fillRect(centers[0] - 36, oy + 28, 30, 25, [30, 58, 138]);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) fillRect(centers[0] - 33 + c * 7, oy + 31 + r * 7, 2, 2, WHITE);
  }
  // China flag: red field, one big gold star, four small ones
  fillRect(centers[1] - 36, oy + 28, 72, 46, [222, 41, 16]);
  star(centers[1] - 16, oy + 50, 9, [255, 222, 0]);
  fillCircle(centers[1] + 8, oy + 38, 2, [255, 222, 0]);
  fillCircle(centers[1] + 16, oy + 46, 2, [255, 222, 0]);
  fillCircle(centers[1] + 14, oy + 58, 2, [255, 222, 0]);
  fillCircle(centers[1] + 4, oy + 64, 2, [255, 222, 0]);
  // Russia flag: white / blue / red horizontal bands
  fillRect(centers[2] - 36, oy + 28, 72, 15, WHITE);
  fillRect(centers[2] - 36, oy + 43, 72, 16, [0, 57, 166]);
  fillRect(centers[2] - 36, oy + 59, 72, 15, [213, 43, 30]);
  // three seated figures, shoulders visible above the table
  for (let i = 0; i < 3; i++) {
    const cx = centers[i];
    fillPoly(
      [
        [cx - 36, oy + 216],
        [cx - 28, oy + 174],
        [cx + 28, oy + 174],
        [cx + 36, oy + 216],
      ],
      suits[i],
    );
    fillCircle(cx, oy + 158, 15, [241, 194, 125]);
    line(cx, oy + 204, cx, oy + 190, 2, [17, 24, 39]);
    fillCircle(cx, oy + 188, 3, [17, 24, 39]);
  }
  // conference table with name plates
  fillEllipse(ox + 252, oy + 222, 210, 26, [30, 58, 95]);
  fillEllipse(ox + 252, oy + 216, 210, 20, [44, 82, 130]);
  for (let i = 0; i < 3; i++) {
    fillRect(centers[i] - 20, oy + 210, 40, 9, WHITE);
  }
}

// D — Nvidia earnings: a chip with gold pins beside a rising chart line.
function sceneChip(ox: number, oy: number): void {
  fillRect(ox, oy, 504, 272, [15, 23, 42]);
  // faint circuit traces in the corners
  const trace: RGB = [20, 83, 45];
  line(ox + 20, oy + 30, ox + 120, oy + 30, 2, trace);
  line(ox + 120, oy + 30, ox + 120, oy + 90, 2, trace);
  fillCircle(ox + 120, oy + 90, 4, [34, 197, 94]);
  line(ox + 420, oy + 250, ox + 480, oy + 250, 2, trace);
  line(ox + 420, oy + 250, ox + 420, oy + 200, 2, trace);
  fillCircle(ox + 420, oy + 200, 4, [34, 197, 94]);
  line(ox + 30, oy + 250, ox + 90, oy + 250, 2, trace);
  fillCircle(ox + 30, oy + 250, 3, [34, 197, 94]);
  // chip body with gold pins
  fillRect(ox + 40, oy + 56, 170, 170, [30, 41, 59]);
  fillRect(ox + 40, oy + 56, 170, 3, [100, 116, 139]);
  fillRect(ox + 40, oy + 223, 170, 3, [100, 116, 139]);
  fillRect(ox + 40, oy + 56, 3, 170, [100, 116, 139]);
  fillRect(ox + 207, oy + 56, 3, 170, [100, 116, 139]);
  for (let x = ox + 52; x <= ox + 196; x += 18) {
    fillRect(x, oy + 46, 10, 10, GOLD);
    fillRect(x, oy + 226, 10, 10, GOLD);
  }
  for (let y = oy + 68; y <= oy + 206; y += 18) {
    fillRect(ox + 30, y, 10, 10, GOLD);
    fillRect(ox + 210, y, 10, 10, GOLD);
  }
  fillRect(ox + 60, oy + 76, 130, 130, [15, 23, 42]);
  drawText("AI", ox + 125, oy + 118, 6, [226, 232, 240]);
  // rising chart with arrowhead
  const pts: Array<[number, number]> = [
    [ox + 250, oy + 210],
    [ox + 300, oy + 185],
    [ox + 340, oy + 195],
    [ox + 390, oy + 150],
    [ox + 430, oy + 130],
    [ox + 470, oy + 95],
  ];
  polyline(pts, 5, [34, 197, 94]);
  for (const [pxx, pyy] of pts) fillCircle(pxx, pyy, 4, [34, 197, 94]);
  fillPoly(
    [
      [ox + 470, oy + 95],
      [ox + 452, oy + 96],
      [ox + 466, oy + 112],
    ],
    [34, 197, 94],
  );
  // faint grid lines behind the chart
  line(ox + 240, oy + 210, ox + 480, oy + 210, 1, [51, 65, 85]);
  line(ox + 240, oy + 150, ox + 480, oy + 150, 1, [51, 65, 85]);
}

// -------------------------------------------------------------- layout -----
interface Panel {
  px: number;
  py: number;
  scene: (ox: number, oy: number) => void;
  head: string;
  sub1: string;
  sub2: string;
}

const PANELS: Panel[] = [
  {
    px: 4,
    py: 152,
    scene: sceneBridge,
    head: "KERCH BRIDGE HIT",
    sub1: "UKRAINE STRIKES CRIMEA SPAN",
    sub2: "RUSSIA HITS KYIV BRIDGES",
  },
  {
    px: 516,
    py: 152,
    scene: sceneTanker,
    head: "TANKERS MINED",
    sub1: "MINES HIT SHIPS AT HORMUZ",
    sub2: "THIRD U.S. CARRIER ARRIVES",
  },
  {
    px: 4,
    py: 552,
    scene: sceneSummit,
    head: "TRUMP IN ASIA",
    sub1: "XI, TRUMP, PUTIN SUMMIT SET",
    sub2: "THURSDAY IN SHENZHEN",
  },
  {
    px: 516,
    py: 552,
    scene: sceneChip,
    head: "NVIDIA REPORTS",
    sub1: "FIRST SINCE HUANG'S EXIT",
    sub2: "AFTER THE BELL TUESDAY",
  },
];

function main(): void {
  // paper
  fillRect(0, 0, W, H, WHITE);
  // header band
  fillRect(0, 0, W, 148, NAVY);
  drawText("17 NOVEMBER 2026", 512, 26, 8, WHITE);
  fillRect(132, 94, 760, 4, GOLD);
  drawText("TUESDAY - THE WORLD IN ONE DAY", 512, 108, 3, LIGHT_GOLD);
  // panels
  for (const p of PANELS) {
    p.scene(p.px, p.py);
    const ly = p.py + 272;
    fillRect(p.px, ly, 504, 116, SLATE);
    const cx = p.px + 252;
    drawText(p.head, cx, ly + 14, 4, WHITE);
    drawText(p.sub1, cx, ly + 52, 3, LIGHT_GOLD);
    drawText(p.sub2, cx, ly + 80, 3, LIGHT_GRAY);
  }
  // footer strip
  fillRect(4, 952, 1016, 68, NAVY);
  drawText("AS REPORTED ON 17 NOVEMBER 2026", 512, 978, 3, LIGHT_GOLD);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(`${outDir}/entry.png`, encodePNG(W, H, fb));
}

main();
