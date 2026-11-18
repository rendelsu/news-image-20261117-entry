// news-image-20261117, round 2 — "THE WORLD TODAY"
// A dense one-day newspaper front page for Tuesday 17 November 2026.
// Node 22 stdlib only. Draws a 1024x1024 PNG with a hand-built 5x7 bitmap
// font and a hand-written PNG encoder (zlib deflate + CRC32), then writes
// it to $MAKEFUN_OUTPUT_DIR/entry.png (default /output/entry.png).
// Runs offline, fully deterministic: two runs write identical bytes.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------- palette (newsprint) ----------
const PAPER = [248, 244, 233];
const INK = [20, 20, 20];
const GRAY = [74, 74, 74];
const RULE = [196, 190, 172];
const RED = [176, 30, 30];
const BLUE = [30, 80, 160];
const GREEN = [30, 120, 60];
const PURPLE = [110, 60, 140];
const ORANGE = [200, 100, 20];
const TEAL = [20, 130, 130];
const PINK = [190, 60, 110];
const WATER = [60, 120, 180];

const REGION = {
  war: RED,
  dip: BLUE,
  mkt: GREEN,
  tech: PURPLE,
  us: ORANGE,
  world: TEAL,
  health: PINK,
};

// ---------- canvas ----------
const px = new Uint8Array(W * H * 3);

function fillAll(c) {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}

function rect(x, y, w, h, c) {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    let o = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) {
      px[o] = c[0];
      px[o + 1] = c[1];
      px[o + 2] = c[2];
      o += 3;
    }
  }
}

function setPixel(x, y, c) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const o = (y * W + x) * 3;
  px[o] = c[0];
  px[o + 1] = c[1];
  px[o + 2] = c[2];
}

// Bresenham line, for the bridge sketch.
function drawLine(x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPixel(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

// ---------- 5x7 bitmap font ----------
// Each glyph is 7 rows of 5 bits ("1" = ink). Space is all blank.
const FONT = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
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
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

// Advance per character, in pixels, at a given scale.
function charAdvance(scale) {
  return 6 * scale;
}

function textWidth(s, scale) {
  if (s.length === 0) return 0;
  return s.length * charAdvance(scale) - scale;
}

function drawText(x, y, s, scale, c) {
  let cx = x;
  for (const ch of s) {
    const g = FONT[ch];
    if (g) {
      for (let r = 0; r < 7; r++) {
        const row = g[r];
        for (let cc = 0; cc < 5; cc++) {
          if (row[cc] === "1") rect(cx + cc * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += charAdvance(scale);
  }
}

function drawCentered(y, s, scale, c) {
  drawText((W - textWidth(s, scale)) >> 1, y, s, scale, c);
}

function drawRight(xRight, y, s, scale, c) {
  drawText(xRight - textWidth(s, scale), y, s, scale, c);
}

// Word-wrap to at most maxChars per line; hard-splits an overlong word.
function wrapText(s, maxChars) {
  const words = s.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

const warnings = [];
function drawBlock(x, y, s, scale, maxChars, maxLines, pitch, c, tag) {
  const lines = wrapText(s, maxChars);
  if (lines.length > maxLines) {
    warnings.push(tag + " overflows: " + lines.length + " lines for " + maxLines);
  }
  const shown = lines.slice(0, maxLines);
  for (let i = 0; i < shown.length; i++) {
    drawText(x, y + i * pitch, shown[i], scale, c);
  }
  return shown.length;
}

// ---------- PNG encoder (filter 0, deflate level 9) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  const typeBuf = Buffer.from(type, "ascii");
  out.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 8 + data.length);
  return out;
}

function encodePNG() {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- the day's news: 1 lead + 40 grid stories ----------
// All events happened, or were first reported, on Tuesday 17 November 2026.
// Headlines <= 30 chars, sublines <= 45 chars (grid cells wrap at 15/line).
const LEAD = {
  kicker: "WAR IN EUROPE",
  head1: "KERCH BRIDGE COLLAPSES",
  head2: "UKRAINE HAILS 'UNPRECEDENTED' OPERATION",
  sub: "ROAD SPAN FALLS INTO THE STRAIT AFTER WEEKS OF STRIKES. RAIL STANDS, ARCH DAMAGED. RUSSIA HITS KYIV IN REPLY.",
};

const STORIES = [
  { h: "KYIV BRIDGES HIT", s: "TWO KILLED AS MISSILES HIT KYIV BRIDGES.", r: "war" },
  { h: "TRUMP LANDS IN MANILA", s: "QUAD TALKS AND A THAI TRADE DEAL SIGNED.", r: "dip" },
  { h: "XI-TRUMP-PUTIN SUMMIT SET", s: "TRILATERAL MEET SET FOR THURSDAY.", r: "dip" },
  { h: "NVIDIA SMASHES EARNINGS", s: "SALES 115.8BN, UP 103 PCT. HUANG NOT BACK.", r: "tech" },
  { h: "IRAN DRONES HIT BAHRAIN", s: "THIRD STRIKE IN FIVE DAYS. ALL INTERCEPTED.", r: "war" },
  { h: "TANKERS BURN IN HORMUZ", s: "MINES STRIKE SHIPS. FIRES AT SEA.", r: "war" },
  { h: "US STRIKES QESHM SITE", s: "MISSILES HIT IRGC LAUNCH SITE IN REPLY.", r: "war" },
  { h: "THIRD US CARRIER IN GULF", s: "ROOSEVELT JOINS BUSH, WASHINGTON.", r: "war" },
  { h: "JAPAN SCRAMBLES JETS", s: "RUSSIAN PLANES VIOLATE AIRSPACE.", r: "war" },
  { h: "WEST TO ISRAEL: OPEN GAZA", s: "FOUR NATIONS DEMAND AID ACCESS NOW.", r: "dip" },
  { h: "SIX KILLED IN GAZA", s: "SIX KILLED, INCLUDING A CHILD.", r: "war" },
  { h: "GAZA WINTER RAINS", s: "UN APPEAL AS STORMS WRECK TENTS.", r: "world" },
  { h: "SUDAN: DRONES KILL 8 IN 10", s: "UN: 2,230 DEAD JAN-OCT, MOST BY DRONES.", r: "war" },
  { h: "HOUTHIS ADVANCE IN YEMEN", s: "FORCES RETREAT TO DEFEND ADEN.", r: "war" },
  { h: "KUWAIT UNDER DRONE ATTACK", s: "ARMY REPORTS DRONE STRIKES.", r: "war" },
  { h: "DRONES DOWNED OVER MECCA", s: "SIX DOWNED OVER MECCA, RIYADH.", r: "war" },
  { h: "EPSTEIN \"WAS MURDERED\"", s: "FORENSIC EXPERT TELLS NYT: IT WAS HOMICIDE.", r: "us" },
  { h: "MEASLES HITS US BABIES", s: "13 BORN WITH MEASLES. MOST SINCE 1991.", r: "health" },
  { h: "WHITE HOUSE GAGS TESTIMONY", s: "AGENCIES NEED APPROVAL BEFORE STAFF TESTIFY.", r: "us" },
  { h: "JEFFRIES SEEKS HOUSE VOTE", s: "LEADERSHIP CONTEST LOOMS IN WASHINGTON.", r: "us" },
  { h: "PERMITTING BILL ADVANCES", s: "REFORM CLEARS MAJOR SENATE HURDLE.", r: "us" },
  { h: "DESJARLAIS CONCEDES", s: "TENNESSEE REPUBLICAN LOSES RACE.", r: "us" },
  { h: "1,700 CHECKS FLOATED", s: "KHANNA: REFUND EVERY AMERICAN FOR WAR COSTS.", r: "us" },
  { h: "SERBIA MIG-29 CRASHES", s: "PILOT KILLED IN TRAINING FLIGHT.", r: "world" },
  { h: "UK SANCTIONS SETTLERS", s: "EIGHT FIRMS HIT.", r: "dip" },
  { h: "UK GIVES 240M POUNDS", s: "NEW AIR DEFENCE FUNDS FOR UKRAINE.", r: "dip" },
  { h: "QUAD PLANS 2027 DRILLS", s: "MARITIME EXERCISE AGREED IN MANILA.", r: "dip" },
  { h: "IRAQ OIL FLOWS AGAIN", s: "KIRKUK-CEYHAN PIPELINE REOPENS.", r: "mkt" },
  { h: "BERLIN RAIDS HEZBOLLAH LINK", s: "GROUP BANNED. POLICE SEARCH 28 SITES.", r: "world" },
  { h: "US SEEKS 50.1BN FOR SKIES", s: "AIR TRAFFIC FUNDING REQUEST TO CONGRESS.", r: "us" },
  { h: "SINGAPORE WANTS AI CHIPS", s: "TRUSTED ACCESS SOUGHT AMID US EXPORT CURBS.", r: "tech" },
  { h: "CYBERCRIME TO COST 10.5TN", s: "GLOBAL DAMAGES FORECAST SOARS.", r: "tech" },
  { h: "AFDB SIGNS RECORD LOAN", s: "86.6BN YEN JICA DEAL, LARGEST EVER FOR FUND.", r: "mkt" },
  { h: "EBOLA FEARS AT CONGO MINE", s: "BARRICK FURLOUGHS STAFF OVER OUTBREAK.", r: "health" },
  { h: "MALAWI FUEL CRISIS DRAGS ON", s: "NO END IN SIGHT, MINISTER ADMITS.", r: "world" },
  { h: "DRUG BUGS COULD KILL 39M", s: "DRUG RESISTANCE COULD KILL 39M.", r: "health" },
  { h: "SAHARA MISSION PULLS OUT", s: "FIRST MINURSO TROOPS LEAVE LAAYOUNE.", r: "world" },
  { h: "PESTICIDE ROW IN GENEVA", s: "AFRICAN NATIONS CLASH OVER CHEMICAL RULES.", r: "world" },
  { h: "19 CREW RESCUED AT SEA", s: "GAS HUSKY CREW AIRLIFTED AFTER ORDEAL.", r: "world" },
  { h: "GUATEMALA SENDS IN TROOPS", s: "ARMY AND POLICE DEPLOY IN THE EAST.", r: "world" },
];

// ---------- layout ----------
function drawMasthead() {
  rect(16, 8, 992, 3, RED);
  drawCentered(16, "THE WORLD TODAY", 6, INK);
  drawText(16, 70, "41 STORIES", 2, GRAY);
  drawRight(1008, 70, "FIVE CONTINENTS", 2, GRAY);
  drawCentered(66, "TUESDAY, 17 NOVEMBER 2026", 3, INK);
  rect(16, 92, 992, 4, INK);
  rect(16, 99, 992, 1, INK);
}

// Small sketch of the broken Kerch Bridge: two deck spans, a collapsed
// arch dipping into the strait, water lines, and a red burst at the gap.
function drawBridgeSketch(x0, y0, x1, y1) {
  const deckY = y0 + 42;
  rect(x0, deckY, 92, 6, INK);
  rect(x0 + 132, deckY, x1 - (x0 + 132), 6, INK);
  // Broken arch: left half sags into the water, right half stands.
  drawLine(x0 + 8, deckY, x0 + 66, deckY + 30, INK);
  drawLine(x0 + 66, deckY + 30, x0 + 92, deckY + 6, INK);
  drawLine(x0 + 132, deckY, x0 + 158, deckY + 12, INK);
  // Red burst where the span fell.
  const bx = x0 + 112;
  const by = deckY + 8;
  drawLine(bx - 10, by - 8, bx + 10, by + 8, RED);
  drawLine(bx + 10, by - 8, bx - 10, by + 8, RED);
  drawLine(bx, by - 12, bx, by + 12, RED);
  drawLine(bx - 12, by, bx + 12, by, RED);
  // Water under the bridge.
  for (let i = 0; i < 3; i++) {
    const wy = deckY + 44 + i * 9;
    rect(x0 + i * 14, wy, x1 - x0 - i * 28, 2, WATER);
  }
  drawText(x0, y1 - 16, "THE KERCH BRIDGE", 2, GRAY);
}

function drawLead() {
  drawText(16, 108, LEAD.kicker, 2, RED);
  drawRight(1008, 108, "LEAD STORY", 2, GRAY);
  drawText(16, 128, LEAD.head1, 5, INK);
  drawText(16, 170, LEAD.head2, 3, INK);
  drawBlock(16, 200, LEAD.sub, 2, 60, 2, 16, GRAY, "lead sub");
  drawBridgeSketch(748, 128, 1008, 248);
  rect(16, 252, 992, 2, INK);
}

function drawGrid() {
  const x0 = 18;
  const colW = 188;
  const stepX = 200;
  const y0 = 262;
  const rowH = 85;
  const stepY = 93;
  // Column and row rules.
  for (let c = 1; c < 5; c++) {
    rect(x0 + c * stepX - 6, y0, 1, 736, RULE);
  }
  for (let r = 1; r < 8; r++) {
    rect(x0, y0 + r * stepY - 4, 968, 1, RULE);
  }
  for (let i = 0; i < STORIES.length; i++) {
    const col = i % 5;
    const row = (i / 5) | 0;
    const x = x0 + col * stepX;
    const y = y0 + row * stepY;
    const st = STORIES[i];
    rect(x, y, colW, 4, REGION[st.r]);
    drawBlock(x, y + 9, st.h, 2, 15, 2, 16, INK, "headline " + (i + 1));
    drawBlock(x, y + 43, st.s, 2, 15, 3, 14, GRAY, "subline " + (i + 1));
  }
}

function drawFooter() {
  rect(16, 1004, 992, 1, INK);
  drawCentered(1008, "TUESDAY 17 NOVEMBER 2026 - 41 STORIES FROM FIVE CONTINENTS", 2, GRAY);
}

function buildPage() {
  fillAll(PAPER);
  drawMasthead();
  drawLead();
  drawGrid();
  drawFooter();
}

function main() {
  buildPage();
  const png = encodePNG();
  const outDir = process.argv[2] || process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, "entry.png");
  fs.writeFileSync(out, png);
  console.error("wrote " + out + " " + png.length + " bytes, stories=41, warnings=" + warnings.length);
  for (const w of warnings) console.error("WARN " + w);
}

main();
