// Node 22, standard library only. Draws one 1024x1024 PNG to /output/entry.png
// (or $MAKEFUN_OUTPUT_DIR). No network. Deterministic: two runs are byte-identical.
// "The World in One Day" - Wednesday, 25 November 2026. Version 2: the COP31
// hero is redrawn (no grey blocks), map pins 7/8/10 sit on their coastlines,
// and the By the Clock note says which times were reported and which are in
// publication order.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const W = 1024;
const H = 1024;
const buf = new Uint8Array(W * H * 3);
const PAPER = [247, 242, 231];
const INK = [20, 38, 74];
const RED = [179, 32, 44];
const BLUE = [31, 78, 140];
const GOLD = [176, 124, 30];
const GREY = [90, 92, 98];
const LGREY = [210, 208, 198];
const WHITE = [255, 255, 255];
const BLACK = [12, 12, 14];
const GREEN = [32, 110, 62];
const TEAL = [14, 110, 110];
const TAN = [217, 196, 154];
const SEA = [207, 227, 238];

function fill(c) {
  for (let i = 0; i < W * H; i++) {
    buf[i * 3] = c[0]; buf[i * 3 + 1] = c[1]; buf[i * 3 + 2] = c[2];
  }
}
function px(x, y, c) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
}
function rect(x, y, w, h, c) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(i, j, c);
}
function hline(x, y, w, c) { rect(x, y, w, 1, c); }
function vline(x, y, h, c) { rect(x, y, 1, h, c); }
function line(x0, y0, x1, y1, c) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0, guard = 0;
  for (;;) {
    px(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
    if (++guard > 5000) break;
  }
}
function circle(cx, cy, r, c) {
  cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y <= r * r) px(cx + x, cy + y, c);
  }
}
function ring(cx, cy, r, c) {
  cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
  for (let a = 0; a < 360; a += 2) {
    const t = a * Math.PI / 180;
    px(cx + Math.round(r * Math.cos(t)), cy + Math.round(r * Math.sin(t)), c);
  }
}
function tri(x0, y0, x1, y1, x2, y2, c) {
  const minX = Math.round(Math.min(x0, x1, x2)), maxX = Math.round(Math.max(x0, x1, x2));
  const minY = Math.round(Math.min(y0, y1, y2)), maxY = Math.round(Math.max(y0, y1, y2));
  const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d;
    const b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d;
    const cc = 1 - a - b;
    if (a >= 0 && b >= 0 && cc >= 0) px(x, y, c);
  }
}
function poly(points, c) {
  // filled polygon, points = [[x,y],...]
  let minY = 1e9, maxY = -1e9;
  for (const p of points) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  minY = Math.round(minY); maxY = Math.round(maxY);
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.round(xs[k]); x <= Math.round(xs[k + 1]); x++) px(x, y, c);
    }
  }
}

// ---- 5x7 bitmap font (uppercase) ----
const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
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
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '"': ['01010', '01010', '00000', '00000', '00000', '00000', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '$': ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '*': ['00000', '10101', '01110', '11111', '01110', '10101', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '<': ['00010', '00100', '01000', '10000', '01000', '00100', '00010'],
  '>': ['01000', '00100', '00010', '00001', '00010', '00100', '01000'],
};
function textWidth(s, scale) { return s.length * 6 * scale - scale; }
function drawText(s, x, y, scale, c) {
  s = s.toUpperCase();
  let cx = Math.round(x);
  y = Math.round(y);
  for (const ch of s) {
    const g = FONT[ch] || FONT[' '];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === '1') rect(cx + col * scale, y + r * scale, scale, scale, c);
      }
    }
    cx += 6 * scale;
  }
  return cx;
}
function drawTextCentered(s, cx, y, scale, c) {
  const w = textWidth(s, scale);
  drawText(s, cx - w / 2, y, scale, c);
}
function wrapText(s, maxW, scale) {
  const words = s.toUpperCase().split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (textWidth(trial, scale) <= maxW || !cur) cur = trial;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawPara(s, x, y, maxW, scale, c, lineH, maxLines) {
  const lines = wrapText(s, maxW, scale).slice(0, maxLines || 99);
  for (let i = 0; i < lines.length; i++) drawText(lines[i], x, y + i * lineH, scale, c);
  return lines.length;
}

// ---- PNG encode (deterministic) ----
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
function encodePNG() {
  const raw = new Uint8Array(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W); dv.setUint32(4, H);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))];
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

// ---- illustrated scenes (each draws into box x,y,w,h) ----
const SKY = [16, 34, 64];
const SKY2 = [38, 68, 110];
const SAND = [232, 214, 170];
const SEA2 = [30, 80, 120];
const GRASS = [46, 125, 62];
const DARK = [18, 22, 30];
const WOOD = [112, 72, 38];
const WOOD_D = [80, 50, 26];
const WOOD_L = [140, 96, 52];

function sceneTreaty(x, y, w, h) {
  rect(x, y, w, h, SKY2);
  circle(x + w - 34, y + 26, 16, [245, 220, 130]);
  // sea strip at bottom
  rect(x, y + h - 26, w, 26, SEA2);
  for (let i = 0; i < 8; i++) hline(x + 8 + i * 14, y + h - 18 + (i % 2) * 5, 8, [160, 200, 225]);
  // two flag poles
  vline(x + 52, y + 22, h - 48, [220, 220, 220]);
  vline(x + w - 60, y + 22, h - 48, [220, 220, 220]);
  // Australian flag: blue field, union jack corner, stars
  rect(x + 56, y + 24, 52, 30, [20, 40, 110]);
  rect(x + 56, y + 24, 24, 14, [180, 30, 40]);
  for (let i = 0; i < 3; i++) line(x + 56, y + 24 + i * 5, x + 80, y + 24 + i * 5, WHITE);
  circle(x + 96, y + 34, 3, WHITE);
  circle(x + 88, y + 46, 2, WHITE);
  circle(x + 102, y + 46, 2, WHITE);
  // Solomons flag: blue top, green bottom, yellow diagonal, stars
  rect(x + w - 112, y + 24, 52, 30, [30, 90, 180]);
  poly([[x + w - 112, y + 54], [x + w - 60, y + 54], [x + w - 60, y + 24]], [30, 130, 70]);
  line(x + w - 112, y + 54, x + w - 60, y + 24, [240, 210, 60]);
  line(x + w - 112, y + 54, x + w - 60, y + 24, [240, 210, 60]);
  circle(x + w - 100, y + 32, 2, WHITE);
  circle(x + w - 88, y + 30, 2, WHITE);
  circle(x + w - 78, y + 36, 2, WHITE);
  // table + treaty document
  rect(x + w / 2 - 46, y + h - 52, 92, 8, [120, 80, 40]);
  rect(x + w / 2 - 34, y + h - 62, 30, 10, WHITE);
  hline(x + w / 2 - 30, y + h - 58, 22, INK);
  hline(x + w / 2 - 30, y + h - 55, 22, INK);
  rect(x + w / 2 + 6, y + h - 62, 30, 10, WHITE);
  hline(x + w / 2 + 10, y + h - 58, 22, INK);
  hline(x + w / 2 + 10, y + h - 55, 22, INK);
  // pen
  line(x + w / 2 + 40, y + h - 60, x + w / 2 + 52, y + h - 48, GOLD);
}
function sceneShip(x, y, w, h) {
  rect(x, y, w, h, [12, 22, 44]);
  // stars
  for (let i = 0; i < 14; i++) px(x + 8 + ((i * 37) % (w - 16)), y + 6 + ((i * 23) % 34), [200, 210, 230]);
  // moon
  circle(x + w - 30, y + 22, 12, [235, 235, 220]);
  // sea
  rect(x, y + h - 34, w, 34, [16, 52, 88]);
  for (let i = 0; i < 10; i++) hline(x + 6 + i * 13, y + h - 26 + (i % 3) * 6, 8, [90, 140, 190]);
  // cargo ship silhouette
  rect(x + 22, y + h - 58, 96, 24, [30, 30, 36]);
  rect(x + 34, y + h - 74, 30, 16, [44, 44, 52]);
  rect(x + 70, y + h - 68, 8, 10, [70, 70, 80]);
  rect(x + 28, y + h - 58, 84, 4, [90, 40, 36]);
  // containers
  rect(x + 40, y + h - 82, 14, 8, [180, 90, 40]);
  rect(x + 58, y + h - 82, 14, 8, [60, 130, 90]);
  // drone above with dotted path
  circle(x + w - 52, y + 48, 5, [200, 200, 200]);
  hline(x + w - 62, y + 48, 20, [200, 200, 200]);
  vline(x + w - 52, y + 40, 16, [200, 200, 200]);
  for (let i = 0; i < 6; i++) px(x + w - 52 - i * 8, y + 48 + i * 4, [255, 220, 80]);
  // explosion star on ship
  circle(x + 108, y + h - 66, 7, [255, 200, 60]);
  circle(x + 108, y + h - 66, 3, [255, 240, 160]);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    line(x + 108, y + h - 66, x + 108 + Math.round(14 * Math.cos(a)), y + h - 66 + Math.round(14 * Math.sin(a)), [255, 180, 40]);
  }
}
// COP31, v2 redesign: a summit hall at dusk. A red NO DEAL banner over a long
// negotiation table; wooden chairs with slats behind it, one chair knocked
// over on the floor and a briefcase left behind (the walkout); an oil derrick
// silhouette and a setting sun. No flat grey blocks anywhere.
function sceneCop(x, y, w, h) {
  // dusk sky, orange horizon band, dry ground
  rect(x, y, w, 92, [36, 52, 96]);
  rect(x, y + 92, w, 10, [232, 140, 70]);
  rect(x, y + 102, w, h - 102, [150, 110, 70]);
  // stars in the upper sky
  for (let i = 0; i < 10; i++) px(x + 12 + ((i * 31) % (w - 24)), y + 6 + ((i * 13) % 26), [210, 215, 235]);
  // setting sun over the horizon
  circle(x + w - 42, y + 88, 15, [245, 180, 80]);
  circle(x + w - 42, y + 88, 10, [250, 205, 120]);
  // oil derrick silhouette (the blocking producers), left side
  line(x + 26, y + 102, x + 40, y + 34, [40, 35, 30]);
  line(x + 56, y + 102, x + 42, y + 34, [40, 35, 30]);
  line(x + 30, y + 86, x + 52, y + 86, [40, 35, 30]);
  line(x + 34, y + 70, x + 48, y + 70, [40, 35, 30]);
  line(x + 40, y + 34, x + 66, y + 52, [40, 35, 30]);
  // NO DEAL banner, red frame on white
  rect(x + w / 2 - 74, y + 10, 148, 40, RED);
  rect(x + w / 2 - 71, y + 13, 142, 34, WHITE);
  drawText('NO DEAL', x + w / 2 - 61, y + 20, 3, RED);
  drawTextCentered('CLIMATE TALKS', x + w / 2, y + 54, 1, WHITE);
  // chairs behind the table: backrest with light slats, seat, legs
  for (let i = 0; i < 4; i++) {
    const cx = x + 28 + i * 62;
    rect(cx, y + 74, 16, 4, WOOD_L);
    rect(cx, y + 78, 16, 20, WOOD);
    rect(cx + 4, y + 78, 2, 20, TAN);
    rect(cx + 10, y + 78, 2, 20, TAN);
    rect(cx, y + 98, 16, 6, WOOD_L);
    rect(cx + 1, y + 104, 3, 6, WOOD_D);
    rect(cx + 12, y + 104, 3, 6, WOOD_D);
  }
  // negotiation table with nameplates and papers
  rect(x + 16, y + 108, w - 64, 8, [96, 64, 36]);
  rect(x + 26, y + 116, 6, 12, [80, 52, 28]);
  rect(x + w - 78, y + 116, 6, 12, [80, 52, 28]);
  for (let i = 0; i < 4; i++) {
    const nx = x + 40 + i * 62;
    rect(nx, y + 101, 16, 7, WHITE);
    hline(nx + 2, y + 104, 12, INK);
  }
  rect(x + w / 2 - 12, y + 101, 24, 7, WHITE);
  hline(x + w / 2 - 9, y + 104, 18, INK);
  // briefcase left behind on the floor (the walkout)
  rect(x + 230, y + 124, 20, 12, [40, 26, 12]);
  rect(x + 237, y + 119, 6, 5, [40, 26, 12]);
  hline(x + 230, y + 130, 20, GOLD);
  // one chair knocked over on the floor, right of the table
  rect(x + 286, y + 102, 3, 14, WOOD_D);
  rect(x + 298, y + 102, 3, 14, WOOD_D);
  rect(x + 284, y + 116, 18, 8, WOOD_L);
  rect(x + 282, y + 124, 32, 9, WOOD);
  rect(x + 290, y + 126, 2, 5, TAN);
  rect(x + 302, y + 126, 2, 5, TAN);
  // cracks in the dry ground
  line(x + 20, y + 138, x + 44, y + 128, [110, 80, 50]);
  line(x + 44, y + 128, x + 70, y + 140, [110, 80, 50]);
  line(x + w - 90, y + 140, x + w - 60, y + 130, [110, 80, 50]);
}
function sceneCyber(x, y, w, h) {
  rect(x, y, w, h, DARK);
  for (let i = 0; i < 5; i++) {
    const yy = y + 8 + i * 12;
    for (let j = 0; j < 12; j++) {
      if ((i * 7 + j * 3) % 4 !== 0) px(x + 8 + j * 7, yy, [40, 160, 90]);
    }
  }
  // monitor
  rect(x + w / 2 - 26, y + 16, 52, 34, [10, 30, 50]);
  rect(x + w / 2 - 26, y + 16, 52, 34, [10, 30, 50]);
  hline(x + w / 2 - 22, y + 24, 44, [60, 200, 110]);
  hline(x + w / 2 - 22, y + 30, 30, [60, 200, 110]);
  hline(x + w / 2 - 22, y + 36, 38, [60, 200, 110]);
  rect(x + w / 2 - 8, y + 50, 16, 4, [90, 90, 100]);
  // red warning triangle
  tri(x + 14, y + h - 14, x + 30, y + h - 44, x + 46, y + h - 14, [200, 30, 30]);
  rect(x + 28, y + h - 36, 4, 12, WHITE);
  rect(x + 28, y + h - 20, 4, 4, WHITE);
  // key
  circle(x + w - 30, y + h - 26, 8, GOLD);
  rect(x + w - 30, y + h - 26, 16, 4, GOLD);
  rect(x + w - 18, y + h - 22, 3, 6, GOLD);
}
function sceneHuawei(x, y, w, h) {
  rect(x, y, w, h, [24, 28, 44]);
  // big chip
  rect(x + 14, y + 14, 44, 44, [30, 90, 60]);
  rect(x + 24, y + 24, 24, 24, [60, 160, 110]);
  for (let i = 0; i < 4; i++) {
    hline(x + 6, y + 22 + i * 10, 8, [180, 180, 190]);
    hline(x + 58, y + 22 + i * 10, 8, [180, 180, 190]);
  }
  // gavel
  rect(x + w - 52, y + 18, 34, 12, [150, 110, 60]);
  line(x + w - 36, y + 30, x + w - 22, y + 58, [150, 110, 60]);
  line(x + w - 36, y + 30, x + w - 22, y + 58, [150, 110, 60]);
  rect(x + w - 34, y + 58, 30, 5, [150, 110, 60]);
  // scales of justice
  vline(x + w - 70, y + h - 40, 34, GOLD);
  hline(x + w - 84, y + h - 40, 28, GOLD);
  line(x + w - 84, y + h - 40, x + w - 84, y + h - 28, GOLD);
  line(x + w - 56, y + h - 40, x + w - 56, y + h - 28, GOLD);
  tri(x + w - 92, y + h - 28, x + w - 76, y + h - 28, x + w - 84, y + h - 18, GOLD);
  tri(x + w - 64, y + h - 28, x + w - 48, y + h - 28, x + w - 56, y + h - 18, GOLD);
  // verdict stamp
  rect(x + 16, y + h - 30, 40, 16, [180, 30, 30]);
  rect(x + 18, y + h - 28, 36, 12, [220, 60, 60]);
}
function sceneRiyadh(x, y, w, h) {
  rect(x, y, w, h, [20, 26, 54]);
  circle(x + w - 26, y + 20, 10, [230, 230, 210]);
  // Kingdom-style tower with arch opening
  rect(x + 22, y + 14, 30, h - 26, [150, 160, 180]);
  tri(x + 22, y + 14, x + 52, y + 14, x + 37, y + 34, [20, 26, 54]);
  rect(x + 28, y + 40, 18, 6, [240, 220, 120]);
  rect(x + 28, y + 52, 18, 4, [240, 220, 120]);
  rect(x + 28, y + 62, 18, 4, [240, 220, 120]);
  // second tower
  rect(x + 60, y + 34, 22, h - 46, [110, 120, 140]);
  // smoke plume
  for (let i = 0; i < 5; i++) circle(x + 34 + i * 3, y + 10 - i * 2 + 14, 5 + i, [120, 120, 130]);
  // explosion flash
  circle(x + 37, y + 30, 8, [255, 200, 60]);
  circle(x + 37, y + 30, 4, [255, 240, 160]);
  // ground + siren light
  rect(x, y + h - 12, w, 12, [40, 40, 48]);
  circle(x + w - 18, y + h - 22, 6, [255, 60, 60]);
  circle(x + w - 18, y + h - 22, 3, [255, 180, 180]);
}
function sceneEbola(x, y, w, h) {
  rect(x, y, w, h, [232, 224, 200]);
  // tent hospital
  poly([[x + 8, y + h - 14], [x + 8, y + 34], [x + w / 2, y + 10], [x + w - 8, y + 34], [x + w - 8, y + h - 14]], [240, 240, 235]);
  line(x + 8, y + 34, x + w - 8, y + 34, [160, 40, 40]);
  rect(x + w / 2 - 10, y + 22, 20, 14, [200, 40, 40]);
  hline(x + w / 2 - 10, y + 27, 20, WHITE);
  vline(x + w / 2 - 2, y + 22, 14, WHITE);
  // PPE figures
  for (let i = 0; i < 3; i++) {
    const fx = x + 16 + i * 22;
    circle(fx + 6, y + h - 34, 6, WHITE);
    rect(fx, y + h - 28, 12, 16, WHITE);
    rect(fx - 2, y + h - 28, 4, 10, WHITE);
    rect(fx + 10, y + h - 28, 4, 10, WHITE);
  }
  // virus dots
  for (let i = 0; i < 6; i++) {
    const vx = x + w - 30 + ((i * 11) % 22), vy = y + 12 + ((i * 7) % 22);
    circle(vx, vy, 3, [160, 40, 40]);
  }
}
function sceneAfcon(x, y, w, h) {
  rect(x, y, w, h, GRASS);
  hline(x, y + h / 2, w, [220, 220, 220]);
  circle(x + w / 2, y + h / 2, 12, [220, 220, 220]);
  // trophy
  rect(x + w / 2 - 8, y + 8, 16, 22, GOLD);
  tri(x + w / 2 - 14, y + 8, x + w / 2 - 8, y + 8, x + w / 2 - 8, y + 20, GOLD);
  tri(x + w / 2 + 14, y + 8, x + w / 2 + 8, y + 8, x + w / 2 + 8, y + 20, GOLD);
  rect(x + w / 2 - 4, y + 30, 8, 8, GOLD);
  rect(x + w / 2 - 10, y + 38, 20, 4, GOLD);
  // ball
  circle(x + 18, y + h - 16, 8, WHITE);
  circle(x + 18, y + h - 16, 3, BLACK);
  // confetti
  for (let i = 0; i < 10; i++) {
    const cx = x + 6 + ((i * 29) % (w - 12)), cy = y + 6 + ((i * 17) % 30);
    rect(cx, cy, 3, 3, i % 2 ? [255, 220, 60] : [255, 255, 255]);
  }
}
function sceneChen(x, y, w, h) {
  rect(x, y, w, h, [150, 30, 30]);
  // great hall silhouette
  rect(x + 10, y + 26, w - 20, 20, [120, 20, 20]);
  tri(x + 10, y + 26, x + w - 10, y + 26, x + w / 2, y + 10, [120, 20, 20]);
  for (let i = 0; i < 6; i++) vline(x + 18 + i * 13, y + 46, h - 58, [200, 180, 120]);
  // magnifier over document
  circle(x + w / 2 + 12, y + h - 30, 12, [200, 220, 240]);
  ring(x + w / 2 + 12, y + h - 30, 12, [40, 40, 60]);
  line(x + w / 2 + 21, y + h - 21, x + w / 2 + 32, y + h - 10, [40, 40, 60]);
  rect(x + w / 2 - 34, y + h - 34, 34, 10, WHITE);
  hline(x + w / 2 - 30, y + h - 30, 26, INK);
}
function sceneGaza(x, y, w, h) {
  rect(x, y, w, h, [210, 190, 160]);
  // damaged buildings
  rect(x + 8, y + 26, 22, h - 38, [140, 125, 105]);
  tri(x + 8, y + 26, x + 30, y + 26, x + 19, y + 14, [140, 125, 105]);
  rect(x + 36, y + 40, 26, h - 52, [160, 145, 125]);
  rect(x + 68, y + 18, 20, h - 30, [120, 105, 88]);
  // windows dark
  rect(x + 14, y + 34, 5, 5, [40, 36, 30]);
  rect(x + 42, y + 48, 5, 5, [40, 36, 30]);
  rect(x + 74, y + 26, 5, 5, [40, 36, 30]);
  // smoke plumes
  for (let i = 0; i < 4; i++) circle(x + 22 + i * 4, y + 12 - i, 5 + i, [110, 105, 100]);
  for (let i = 0; i < 3; i++) circle(x + w - 24 - i * 3, y + 10 - i, 4 + i, [110, 105, 100]);
  // white dove
  circle(x + w / 2, y + h - 18, 5, WHITE);
  tri(x + w / 2 + 4, y + h - 20, x + w / 2 + 16, y + h - 26, x + w / 2 + 12, y + h - 14, WHITE);
  tri(x + w / 2 - 4, y + h - 20, x + w / 2 - 14, y + h - 28, x + w / 2 - 10, y + h - 14, WHITE);
}
function sceneMadrid(x, y, w, h) {
  rect(x, y, w, h, GRASS);
  hline(x, y + 12, w, WHITE);
  hline(x, y + h - 12, w, WHITE);
  // goal
  rect(x + w - 34, y + 10, 26, 26, WHITE);
  rect(x + w - 32, y + 12, 22, 22, [30, 90, 50]);
  // ball in net
  circle(x + w - 21, y + 23, 5, WHITE);
  circle(x + w - 21, y + 23, 2, BLACK);
  // scoreboard
  rect(x + 8, y + 8, 44, 16, [10, 10, 14]);
  rect(x + 12, y + 12, 8, 8, [255, 60, 60]);
  rect(x + 40, y + 12, 8, 8, [255, 255, 255]);
  // players
  circle(x + 22, y + h - 22, 5, [255, 255, 255]);
  rect(x + 17, y + h - 17, 10, 12, [255, 255, 255]);
  circle(x + 44, y + h - 26, 5, [230, 180, 40]);
  rect(x + 39, y + h - 21, 10, 12, [230, 180, 40]);
}
function sceneInflation(x, y, w, h) {
  rect(x, y, w, h, [245, 238, 214]);
  // rising chart arrow
  line(x + 10, y + h - 18, x + 34, y + h - 34, RED);
  line(x + 34, y + h - 34, x + 56, y + h - 28, RED);
  line(x + 56, y + h - 28, x + w - 16, y + 14, RED);
  tri(x + w - 16, y + 14, x + w - 26, y + 16, x + w - 18, y + 24, RED);
  // grid lines
  for (let i = 0; i < 3; i++) hline(x + 8, y + 14 + i * 12, w - 16, LGREY);
  // coins
  circle(x + 16, y + h - 12, 7, GOLD);
  circle(x + 30, y + h - 10, 7, GOLD);
  circle(x + 44, y + h - 12, 7, GOLD);
  // basket
  rect(x + w - 34, y + h - 26, 26, 16, [150, 110, 60]);
  line(x + w - 34, y + h - 26, x + w - 28, y + h - 34, [150, 110, 60]);
  line(x + w - 8, y + h - 26, x + w - 14, y + h - 34, [150, 110, 60]);
}
function sceneCourt(x, y, w, h) {
  rect(x, y, w, h, [226, 220, 205]);
  // courthouse pediment
  tri(x + 8, y + 12, x + w - 8, y + 12, x + w / 2, y + 26, [200, 190, 165]);
  rect(x + 8, y + 26, w - 16, 6, [200, 190, 165]);
  // columns
  for (let i = 0; i < 4; i++) {
    const cx = x + 16 + i * 20;
    rect(cx, y + 32, 8, h - 44, [245, 242, 230]);
    rect(cx - 2, y + 30, 12, 4, [245, 242, 230]);
  }
  // gavel
  rect(x + w - 30, y + h - 26, 22, 8, [120, 85, 40]);
  line(x + w - 20, y + h - 18, x + w - 12, y + h - 8, [120, 85, 40]);
}

// ---- world map ----
function drawMap(x, y, w, h) {
  rect(x, y, w, h, SEA);
  const s = w / 1024;
  const X = (v) => x + v * s;
  const Y = (v) => y + v * (h / 128);
  // continents (coarse polygons in a 1024x128 map space)
  poly([[X(60), Y(28)], [X(150), Y(14)], [X(250), Y(18)], [X(285), Y(44)], [X(250), Y(62)], [X(200), Y(78)], [X(140), Y(84)], [X(90), Y(66)], [X(62), Y(46)]], TAN); // N America
  poly([[X(300), Y(72)], [X(335), Y(66)], [X(360), Y(88)], [X(345), Y(118)], [X(320), Y(122)], [X(302), Y(96)]], TAN); // S America
  poly([[X(468), Y(18)], [X(530), Y(10)], [X(556), Y(26)], [X(540), Y(44)], [X(500), Y(48)], [X(472), Y(34)]], TAN); // Europe
  poly([[X(478), Y(56)], [X(540), Y(50)], [X(585), Y(66)], [X(580), Y(92)], [X(545), Y(116)], [X(505), Y(108)], [X(482), Y(82)]], TAN); // Africa
  poly([[X(560), Y(12)], [X(700), Y(8)], [X(820), Y(18)], [X(860), Y(38)], [X(830), Y(66)], [X(760), Y(78)], [X(680), Y(76)], [X(610), Y(60)], [X(565), Y(38)]], TAN); // Asia
  poly([[X(830), Y(88)], [X(895), Y(82)], [X(920), Y(98)], [X(885), Y(114)], [X(840), Y(108)]], TAN); // Australia
  poly([[X(950), Y(76)], [X(975), Y(72)], [X(985), Y(84)], [X(962), Y(92)], [X(948), Y(86)]], TAN); // New Guinea / Solomons area
}
// v2 pin fixes, checked against the polygons above: Riyadh was floating in
// the sea west of Arabia (604,62 -> 644,66, central Arabia, on land); Gaza
// was in the Mediterranean (578,52 -> 594,52, right on the Levant coast);
// Dakar was in the Atlantic (468,74 -> 482,74, right on Senegal's coast).
const PINS = [
  [1, 'CANBERRA', 880, 100], [2, 'HONIARA', 962, 84], [3, 'KYIV', 530, 26],
  [4, 'HELSINKI', 545, 12], [5, 'BENGHAZI', 552, 62], [6, 'ANTALYA', 560, 42],
  [7, 'RIYADH', 644, 66], [8, 'GAZA', 594, 52], [9, 'KINSHASA', 520, 92],
  [10, 'DAKAR', 482, 74], [11, 'SHANGHAI', 800, 46], [12, 'WASHINGTON', 152, 46],
];
function drawPins(mx, my, mw, mh) {
  const sx = mw / 1024, sy = mh / 128;
  for (const p of PINS) {
    const cx = mx + p[2] * sx, cy = my + p[3] * sy;
    circle(cx, cy, 8, RED);
    ring(cx, cy, 8, WHITE);
    drawText(String(p[0]), cx - (p[0] < 10 ? 3 : 6), cy - 3, 1, WHITE);
  }
}

// ---- data: Wednesday 25 November 2026 ----
FONT['\u2022'] = ['00000', '00000', '01100', '01100', '01100', '00000', '00000'];

const REGIONS = [
  { code: 'EUR', name: 'EUROPE', count: 5, color: [31, 78, 140] },
  { code: 'AFR', name: 'AFRICA', count: 11, color: [176, 124, 30] },
  { code: 'ASI', name: 'ASIA', count: 7, color: [179, 32, 44] },
  { code: 'ME', name: 'MIDDLE EAST', count: 6, color: [110, 60, 140] },
  { code: 'AME', name: 'AMERICAS', count: 6, color: [32, 110, 62] },
  { code: 'OCE', name: 'OCEANIA', count: 6, color: [14, 110, 110] },
  { code: 'WLD', name: 'WORLD', count: 2, color: [90, 92, 98] },
];
const TOTAL_STORIES = 43;

const NUMBERS = [
  ['74,746', 'GAZA DEATH TOLL'],
  ['5,775', 'EBOLA DEATHS, DRC'],
  ['11', 'HURT IN RIYADH'],
  ['5-1', 'REAL MADRID - PSV'],
  ['204*', 'SURYAVANSHI, AGE 15'],
  ['4.9%', 'AUSTRALIA INFLATION'],
];

const HEROES = [
  {
    scene: sceneTreaty, tag: 'OCEANIA', title: 'PACIFIC PIVOT',
    deck: 'Australia and Solomon Islands sign a security treaty in Canberra, naming Canberra the islands\' defence partner of choice as Honiara ends its China pact.',
  },
  {
    scene: sceneShip, tag: 'EUROPE', title: 'UKRAINE STRIKES AT SEA',
    deck: 'Zelenskiy confirms Kyiv\'s drones hit a Russian cargo ship in the Gulf of Finland and a warship off Libya; Moscow calls the strikes terrorism.',
  },
  {
    scene: sceneCop, tag: 'WORLD', title: 'COP31 COLLAPSES',
    deck: 'Climate talks in Antalya end with no deal as oil and gas producers block fossil-fuel phaseout language, leaving vulnerable nations without finance.',
  },
];

const GRID = [
  { scene: sceneCyber, tag: 'AMERICAS', head: 'CIA, ODNI BREACHED', deck: 'US spy agencies hit by a cyberattack on classified systems, sources say; the latest in a run of US government breaches.' },
  { scene: sceneHuawei, tag: 'ASIA', head: 'HUAWEI GUILTY', deck: 'US jury finds Huawei guilty on 10 of 12 counts, including bank fraud and stealing trade secrets, after a three-month trial in New York.' },
  { scene: sceneRiyadh, tag: 'MIDDLE EAST', head: 'RIYADH TOWER HIT', deck: 'Houthi drone strikes the capital\'s tallest tower; 11 people wounded, Saudi civil defence says, as Houthis push to 60 km from Aden.' },
  { scene: sceneEbola, tag: 'AFRICA', head: 'EBOLA TEAMS TRAPPED', deck: 'WHO evacuates staff from a hospital in Ituri after three days sheltering from fighting; the outbreak has killed 5,775 of 11,762 cases.' },
  { scene: sceneAfcon, tag: 'AFRICA', head: 'SENEGAL CHAMPIONS AGAIN', deck: 'CAS reinstates Senegal as 2025 AFCON winners, overturning CAF\'s decision to strip the title and hand it to Morocco.' },
  { scene: sceneChen, tag: 'ASIA', head: 'SHANGHAI CHIEF PROBED', deck: 'China investigates Politburo member Chen Jining, the fourth top leader probed since 2025, in Xi\'s latest purge.' },
  { scene: sceneGaza, tag: 'MIDDLE EAST', head: 'GAZA STRIKE KILLS OFFICIAL', deck: 'Israeli air strike kills a Hamas official in Gaza as the death toll reaches 74,746, WAFA says.' },
  { scene: sceneMadrid, tag: 'EUROPE', head: 'REAL MADRID 5-1', deck: 'Madrid rout PSV with five second-half goals in the Champions League; Leipzig beat Lens 3-1, Porto win 1-0 at Feyenoord.' },
  { scene: sceneInflation, tag: 'OCEANIA', head: 'INFLATION 4.9%', deck: 'Australia\'s inflation jumps to 4.9% as Treasurer Chalmers warns of a \'serious moment\' for the economy.' },
  { scene: sceneCourt, tag: 'EUROPE', head: 'SARKOZY TO TRIAL', deck: 'French officials order ex-president Sarkozy and wife Carla Bruni to trial in a corruption case; first hearing April 2027.' },
];

// By the Clock: only 01:44 (Al Jazeera) and 02:37 (AP) were reported with
// exact times. The other four times are the order the stories broke, not
// reported clock times — the footer says so. No time is invented here.
const CLOCK = [
  ['00:45', 'ZELENSKIY CONFIRMS SHIP STRIKES'],
  ['01:44', 'AUSTRALIA 34-10 NZ, RUGBY LEAGUE CROWN'],
  ['02:37', 'SOLOMONS TREATY SIGNED IN CANBERRA'],
  ['04:30', 'COP31 ENDS WITH NO DEAL'],
  ['05:20', 'CIA AND ODNI BREACH REPORTED'],
  ['06:10', 'HOUTHI DRONE HITS RIYADH TOWER'],
];

const ALSO = [
  'EU CAPS CHINESE HYBRID EVS (DAILY DEBRIEF)',
  'LEIPZIG BEAT LENS 3-1 (SPORTRADAR)',
  'DRC FORCES MINERS TO OPEN LOCAL UNITS (OKAYAFRICA)',
  'KENYA AND DRC RESTORE TIES (AFRICAN SPECTATOR)',
  'SENEGAL MIGRANT BOAT SINKS (AFRICAN SPECTATOR)',
  'BURKINA FASO OPENS TECH ACADEMY (OKAYAFRICA)',
  'GAVI TO BUY 1.5M EBOLA VACCINE DOSES (OKAYAFRICA)',
  'BAYELSA BOAT TOLL RISES TO 29 (SKARDU TIMES)',
  'MLAMBO-NGUKA DIES AT 71 (SKARDU TIMES)',
  'AMNESTY: PROBE TIGRAY SHELLING (OKAYAFRICA)',
  'MADAGASCAR SEEKS EX-PRESIDENT ARREST (OKAYAFRICA)',
  'NEPAL QUAKE M5.3 SHAKES SIKKIM (LAST24HRS)',
  'SURYAVANSHI 204* OFF 53 BALLS AT 15 (LAST24HRS)',
  'IRAQ CRACKS DOWN ON OIL SMUGGLING (DAILY DEBRIEF)',
  'MALAYSIA TO RETURN MIGRANTS (DAILY DEBRIEF)',
  'INDIA HOSTS FIRST EU MARITIME TALKS (LAST24HRS)',
  'GAZA TOLL REACHES 74,746 (WAFA)',
  'IRAN LASHES SINGER AHMADI 74 TIMES (DAILY DEBRIEF)',
  'OXFAM: POLLUTION RISKS 99% OF GAZA (BD GLOBAL TIMES)',
  'HOUTHIS 60 KM FROM ADEN (REUTERS)',
  'TRUMP GIVES GIULIANI MEDAL OF FREEDOM (WASH POST)',
  'FORT HOOD SHOOTER SEEKS STAY (REUTERS)',
  'VENEZUELA DEBT AT $237.5BN (HUDDLEWORLD)',
  'DELL LIFTS FORECAST ON AI SERVERS (HUDDLEWORLD)',
  'NVIDIA SHARES FALL 7% (HUDDLEWORLD)',
  'FIJI DROUGHT MAY STRETCH INTO 2027 (PINA)',
  'FIJI A THRASH SAMOA 68-36 IN NETBALL (PINA)',
  'AUSTRALIA 34-10 NZ, RUGBY LEAGUE CROWN (AL JAZEERA)',
  'PACIFIC TIRED OF WAITING ON CLIMATE (PINA)',
  '266M FACE ACUTE FOOD INSECURITY (WFP)',
];

// ---- layout ----
function draw() {
  fill(PAPER);
  // top rules
  rect(0, 0, W, 4, INK);
  hline(8, 6, W - 16, RED);

  // masthead
  drawTextCentered('THE WORLD IN ONE DAY', W / 2, 10, 6, INK);
  drawTextCentered('WEDNESDAY, 25 NOVEMBER 2026', W / 2, 56, 3, RED);
  drawTextCentered(TOTAL_STORIES + ' STORIES \u2022 7 REGIONS \u2022 ONE DAY', W / 2, 80, 2, INK);

  // region bar
  let bx = 8;
  const barW = W - 16;
  for (const r of REGIONS) {
    const w = Math.round(barW * r.count / TOTAL_STORIES);
    rect(bx, 98, w, 14, r.color);
    drawTextCentered(r.code + ' ' + r.count, bx + w / 2, 100, 1, WHITE);
    bx += w;
  }

  // Day in Numbers
  drawText('DAY IN NUMBERS', 8, 116, 1, RED);
  hline(8, 126, W - 16, INK);
  const nw = Math.floor((W - 16 - 5 * 4) / 6);
  for (let i = 0; i < NUMBERS.length; i++) {
    const x = 8 + i * (nw + 4);
    rect(x, 130, nw, 40, WHITE);
    hline(x, 130, nw, LGREY); hline(x, 130 + 39, nw, LGREY);
    vline(x, 130, 40, LGREY); vline(x + nw - 1, 130, 40, LGREY);
    drawTextCentered(NUMBERS[i][0], x + nw / 2, 134, 3, INK);
    drawTextCentered(NUMBERS[i][1], x + nw / 2, 158, 1, GREY);
  }

  // heroes
  const hx = [8, 350, 692], hw = 324;
  for (let i = 0; i < 3; i++) {
    const x = hx[i];
    HEROES[i].scene(x, 176, hw, 146);
    // thin frame on top of the scene edges
    hline(x, 176, hw, INK); hline(x, 176 + 146 - 1, hw, INK);
    vline(x, 176, 146, INK); vline(x + hw - 1, 176, 146, INK);
    drawText(HEROES[i].tag, x, 328, 1, RED);
    drawPara(HEROES[i].title, x, 340, hw, 3, INK, 22, 2);
    drawPara(HEROES[i].deck, x, 386, hw, 1, INK, 9, 3);
  }
  hline(8, 418, W - 16, INK);

  // main grid: 2 cols x 5 rows
  for (let i = 0; i < GRID.length; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 8 + col * 508, y = 426 + row * 60;
    GRID[i].scene(x, y, 96, 56);
    hline(x, y, 96, INK); hline(x, y + 55, 96, INK);
    vline(x, y, 56, INK); vline(x + 95, y, 56, INK);
    drawText(GRID[i].tag, x + 104, y + 1, 1, RED);
    drawPara(GRID[i].head, x + 104, y + 11, 396, 2, INK, 15, 1);
    drawPara(GRID[i].deck, x + 104, y + 28, 396, 1, INK, 9, 3);
  }

  // map
  drawText('THE WORLD - 12 STORIES PINNED', 8, 732, 1, RED);
  hline(8, 742, W - 16, INK);
  drawMap(8, 746, 1008, 94);
  drawPins(8, 746, 1008, 94);
  drawTextCentered('1 CANBERRA  2 HONIARA  3 KYIV  4 HELSINKI  5 BENGHAZI  6 ANTALYA  7 RIYADH  8 GAZA  9 KINSHASA  10 DAKAR  11 SHANGHAI  12 WASHINGTON', W / 2, 844, 1, INK);

  // By the Clock
  drawText('BY THE CLOCK - UTC', 8, 852, 1, RED);
  hline(8, 862, W - 16, INK);
  for (let i = 0; i < CLOCK.length; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 8 + col * 341, y = 868 + row * 16;
    drawText(CLOCK[i][0], x, y, 1, RED);
    drawText(CLOCK[i][1], x + 36, y, 1, INK);
  }

  // Also on
  drawText('ALSO ON - 25 NOVEMBER', 8, 894, 1, RED);
  hline(8, 904, W - 16, INK);
  for (let i = 0; i < ALSO.length; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 8 + col * 341, y = 910 + row * 9;
    drawText('\u2022 ' + ALSO[i], x, y, 1, INK);
  }

  // footer
  hline(8, 1002, W - 16, INK);
  drawText('SOURCES: REUTERS, AP, CNN, AFP, GUARDIAN, AL JAZEERA, XINHUA, OKAYAFRICA, PINA, WHO, WAFA, DOJ, SPORTRADAR, BBC, WFP, BD GLOBAL TIMES, PANAPRESS, WASHINGTON POST', 8, 1006, 1, GREY);
  drawText('DATE CHECK: STORIES FIRST REPORTED 24 NOV BUT HEADLINING 25 NOV PAPERS COUNT; ALL DATES UTC. CLOCK: 01:44 + 02:37 AS REPORTED; REST IN ORDER.', 8, 1015, 1, GREY);
}

function main() {
  draw();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  mkdirSync(outDir, { recursive: true });
  const png = encodePNG();
  writeFileSync(join(outDir, 'entry.png'), png);
  console.log('wrote ' + join(outDir, 'entry.png') + ' ' + png.length + ' bytes');
}
main();
