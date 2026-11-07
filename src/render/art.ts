// @ts-nocheck
// Canvas 2D art ported from the trailer renderer (demo.html): fighters, weapons, stage, HUD pieces, effects.
// Kept close to the original so the game matches the trailer look. Only v1 fighters are included.

export let x: CanvasRenderingContext2D;
export function setCtx(c: CanvasRenderingContext2D) { x = c; }

export const W = 1280, H = 720;
export const HEAVY = '"Arial Black","Noto Sans CJK JP Black",Impact,sans-serif';
export const COND = 'Bahnschrift,"DejaVu Sans Condensed","Arial Narrow",sans-serif';
export const MONO = 'Consolas,"DejaVu Sans Mono",monospace';

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const eOut = t => 1 - Math.pow(1 - t, 3);
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1000003) / 1000003; }; }
export const hash = n => rng(n)();

// poses: angles in radians from straight down, + toward facing
export const POSE = {
  idle:   {lean:.12, fs:.9,  fe:2.6, bs:.45, be:2.3, fh:.32, fk:.05, bh:-.32, bk:-.12},
  punch:  {lean:.32, fs:1.57,fe:1.57,bs:.15, be:1.9, fh:.55, fk:.2,  bh:-.5,  bk:-.32},
  upper:  {lean:.05, fs:2.7, fe:3.0, bs:.3,  be:1.5, fh:.45, fk:.1,  bh:-.4,  bk:-.25},
  kick:   {lean:-.25,fs:.55, fe:2.1, bs:-.35,be:.9,  fh:1.62,fk:1.6, bh:-.08, bk:-.04},
  whip:   {lean:.28, fs:1.9, fe:1.65,bs:-.2, be:.6,  fh:.55, fk:.2,  bh:-.5,  bk:-.3},
  block:  {lean:.02, fs:1.25,fe:3.0, bs:1.0, be:2.9, fh:.38, fk:.22, bh:-.38, bk:-.22},
  hit:    {lean:-.5, fs:-.5, fe:-1.0,bs:-.9, be:-1.3,fh:.25, fk:.35, bh:-.2,  bk:-.08},
  stag:   {lean:-.2, fs:.15, fe:.3,  bs:-.15,be:-.1, fh:.2,  fk:.3,  bh:-.15, bk:.05},
  raise:  {lean:.05, fs:2.9, fe:3.1, bs:.4,  be:2.0, fh:.35, fk:.1,  bh:-.35, bk:-.15},
  crouch: {lean:.3,  fs:1.25,fe:2.7, bs:.9,  be:2.5, fh:1.35,fk:.1,  bh:-.6,  bk:.75},
  jump:   {lean:.15, fs:1.1, fe:2.5, bs:.6,  be:2.2, fh:1.4, fk:.1,  bh:.5,   bk:-.9},
  sweep:  {lean:.5,  fs:1.0, fe:2.2, bs:-.2, be:1.0, fh:1.55,fk:1.55,bh:-.9,  bk:.9},
};
export const mixPose = (a, b, t) => { const o = {}; for (const k in a) o[k] = lerp(a[k], b[k], t); return o; };

function skeleton(o) {
  const s = o.s, f = o.f, p = o.p;
  const L = (j, a, l) => [j[0] + Math.sin(a) * l * s * f, j[1] + Math.cos(a) * l * s];
  const hip = [0, 0];
  const neck = [Math.sin(p.lean) * 62 * s * f, -Math.cos(p.lean) * 62 * s];
  const head = [neck[0] + Math.sin(p.lean) * 20 * s * f, neck[1] - Math.cos(p.lean) * 20 * s];
  const fE = L(neck, p.fs, 31), fH = L(fE, p.fe, 30), bE = L(neck, p.bs, 31), bH = L(bE, p.be, 30);
  const fK = L(hip, p.fh, 44), fF = L(fK, p.fk, 44), bK = L(hip, p.bh, 44), bF = L(bK, p.bk, 44);
  const dy = -Math.max(fF[1], bF[1]) - (o.air || 0) - 6 * s;
  const sh = pt => [pt[0] + o.x, pt[1] + o.y + dy];
  return {hip: sh(hip), neck: sh(neck), head: sh(head), fE: sh(fE), fH: sh(fH), bE: sh(bE), bH: sh(bH), fK: sh(fK), fF: sh(fF), bK: sh(bK), bF: sh(bF)};
}
export function mixc(hex, k) {
  const n = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const o = n.map(v => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)));
  return '#' + o.map(v => clamp(v, 0, 255).toString(16).padStart(2, '0')).join('');
}
export function glow(col, blur) { x.shadowColor = col; x.shadowBlur = blur; }

const LOOKS = {
  kaal:  {skin: '#9a6644', top: null, pants: '#c8691a', boots: '#3a2416', arms: 'skin', hair: 'topknot', hairCol: '#140d08', sash: '#a3231c', rim: '#ff8a1f'},
  echo:  {skin: '#0b0f13', top: null, pants: '#0c1519', boots: '#05070a', arms: 'skin', hair: 'topknot', hairCol: '#030405', sash: '#0b4650', rim: '#29f0ff', eye: '#29f0ff'},
  vanta: {skin: '#2a2433', top: '#1b1624', pants: '#1b1624', boots: '#0c0a10', arms: 'top', hair: 'hood', hairCol: '#3d2266', mask: '#e8e4f0', rim: '#a45cff', gloves: '#0c0a10'},
  rook:  {skin: '#7a4e34', top: '#e8641c', pants: '#3a3f46', boots: '#2a1d12', arms: 'metal', hair: 'bald', beard: '#2a1a10', rim: '#ff4d2e', bulk: 1.32, stripes: '#e6e6d8'},
};

function taper(p1, p2, w1, w2, col, bulge, solid) {
  const dx = p2[0] - p1[0], dy = p2[1] - p1[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2, c1 = (w1 + w2) / 4 * 1.25 + bulge, c2 = (w1 + w2) / 4 * 1.2 + bulge * .4, a = Math.atan2(ny, nx);
  if (solid) x.fillStyle = col;
  else {
    const g = x.createLinearGradient(mx + nx * c1, my + ny * c1, mx - nx * c1, my - ny * c1), up = ny < 0;
    g.addColorStop(0, mixc(col, up ? .22 : -.45)); g.addColorStop(.45, col); g.addColorStop(1, mixc(col, up ? -.45 : .22));
    x.fillStyle = g;
  }
  x.beginPath();
  x.moveTo(p1[0] + nx * w1 / 2, p1[1] + ny * w1 / 2);
  x.quadraticCurveTo(mx + nx * c1, my + ny * c1, p2[0] + nx * w2 / 2, p2[1] + ny * w2 / 2);
  x.arc(p2[0], p2[1], w2 / 2, a, a - Math.PI, true);
  x.quadraticCurveTo(mx - nx * c2, my - ny * c2, p1[0] - nx * w1 / 2, p1[1] - ny * w1 / 2);
  x.arc(p1[0], p1[1], w1 / 2, a + Math.PI, a, true);
  x.fill();
}
const pt = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];

function torsoPath(k, o, inflate) {
  const s = o.s * (o.bulk || 1), ux = k.neck[0] - k.hip[0], uy = k.neck[1] - k.hip[1], L = Math.hypot(ux, uy), u = [ux / L, uy / L], n = [-u[1], u[0]];
  const P = (along, w) => [k.hip[0] + u[0] * L * along + n[0] * (w * s + inflate), k.hip[1] + u[1] * L * along + n[1] * (w * s + inflate)];
  const pts = {hl: P(0, 17), wl: P(.38, 14), cl: P(.78, 22), sl: P(.97, 21), sr: P(.97, -21), cr: P(.78, -22), wr: P(.38, -14), hr: P(0, -17)};
  x.beginPath(); x.moveTo(...pts.hl); x.quadraticCurveTo(...pts.wl, ...pts.cl); x.lineTo(...pts.sl);
  x.quadraticCurveTo(k.neck[0] + u[0] * 6 * s, k.neck[1] + u[1] * 6 * s, ...pts.sr); x.lineTo(...pts.cr); x.quadraticCurveTo(...pts.wr, ...pts.hr);
  x.quadraticCurveTo(k.hip[0] - u[0] * 6 * s, k.hip[1] - u[1] * 6 * s, ...pts.hl); x.closePath();
  return {u, n, L, P, pts};
}
function metalGrad(x1, y1, x2, y2) {
  const g = x.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, '#3a4047'); g.addColorStop(.35, '#d9e1e7'); g.addColorStop(.55, '#8a949d'); g.addColorStop(1, '#2a2f34'); return g;
}

function drawParts(k, o, look, solid, inflate = 0) {
  const s = o.s, b = (o.bulk || look.bulk || 1), f = o.f, I = inflate, C = c => solid || c;
  const armCol = look.arms === 'skin' ? look.skin : look.arms === 'metal' ? '#8d969f' : look.top;
  const hand = look.gloves || look.skin;
  const legs = (K, F, hip, back) => {
    taper(hip, K, 21 * s * b + I, 15 * s * b + I, C(back ? mixc(look.pants, -.25) : look.pants), 2.5 * s, !!solid);
    taper(K, F, 15 * s * b + I, 10 * s + I, C(back ? mixc(look.pants, -.25) : look.pants), 2 * s, !!solid);
    taper(pt(K, F, .62), F, 12 * s + I, 11 * s + I, C(look.boots), 0, !!solid);
    x.fillStyle = C(look.boots); x.beginPath(); x.moveTo(F[0] - 7 * s * f, F[1] - 5 * s); x.lineTo(F[0] + 12 * s * f, F[1] - 4 * s); x.quadraticCurveTo(F[0] + 19 * s * f, F[1] - 1 * s, F[0] + 18 * s * f, F[1] + 5 * s);
    x.lineTo(F[0] - 8 * s * f, F[1] + 5 * s); x.closePath(); x.fill();
  };
  const arm = (E, Hd, back) => {
    const ac = back ? mixc(armCol, -.25) : armCol;
    taper(k.neck, E, 15 * s * b + I, 12 * s * b + I, C(ac), 2.5 * s * b, !!solid);
    taper(E, Hd, 12 * s * b + I, 8.5 * s * b + I, C(ac), 1.6 * s * b, !!solid);
    x.fillStyle = C(back ? mixc(hand, -.25) : hand); x.beginPath(); x.arc(Hd[0], Hd[1], 6.5 * s * b + I / 2, 0, 7); x.fill();
    if (!solid && look.arms === 'metal') { x.fillStyle = '#2b3036'; x.beginPath(); x.arc(E[0], E[1], 4 * s, 0, 7); x.fill(); x.fillStyle = look.rim; x.fillRect(E[0] - 1.5 * s, E[1] - 1.5 * s, 3 * s, 3 * s); }
  };
  const wave = Math.sin((o.time || 0) * 6) * 8 * s;
  if (!solid && look.sash) { x.strokeStyle = look.sash; x.lineWidth = 5 * s; x.lineCap = 'round'; x.beginPath(); x.moveTo(k.hip[0] - 10 * s * f, k.hip[1] - 14 * s); x.quadraticCurveTo(k.hip[0] - 30 * s * f, k.hip[1] + 4 * s + wave, k.hip[0] - 42 * s * f, k.hip[1] + 26 * s - wave); x.stroke(); }
  arm(k.bE, k.bH, true); legs(k.bK, k.bF, k.hip, true);
  const T = torsoPath(k, o, I);
  if (solid) { x.fillStyle = solid; x.fill(); }
  else {
    const tc = look.top || look.skin, g = x.createLinearGradient(...T.P(.5, 24), ...T.P(.5, -24));
    g.addColorStop(0, mixc(tc, f > 0 ? -.4 : .18)); g.addColorStop(.5, tc); g.addColorStop(1, mixc(tc, f > 0 ? .18 : -.4)); x.fillStyle = g; x.fill();
    x.save(); x.clip();
    if (!look.top) { x.strokeStyle = mixc(look.skin, -.35); x.lineWidth = 1.5 * s; x.beginPath(); x.moveTo(...T.P(.7, 16)); x.quadraticCurveTo(...T.P(.62, 0), ...T.P(.7, -16)); x.moveTo(...T.P(.62, 0)); x.lineTo(...T.P(.3, 0)); x.stroke(); }
    if (look.stripes) { for (const a of [.3, .62]) { const p1 = T.P(a, 30), p2 = T.P(a, -30); x.save(); x.lineWidth = 5 * s; x.strokeStyle = look.stripes; x.beginPath(); x.moveTo(...p1); x.lineTo(...p2); x.stroke(); x.restore(); } }
    if (look.sash) { x.strokeStyle = look.sash; x.lineWidth = 7 * s; x.beginPath(); x.moveTo(...T.P(.98, 18 * f)); x.lineTo(...T.P(.08, -16 * f)); x.stroke(); }
    x.restore();
    x.strokeStyle = mixc(look.pants, -.5); x.lineWidth = 5 * s; x.beginPath(); x.moveTo(...T.P(.08, 17)); x.lineTo(...T.P(.08, -17)); x.stroke();
  }
  legs(k.fK, k.fF, k.hip, false);
  taper(k.neck, pt(k.neck, k.head, .6), 10 * s * b + I, 9 * s + I, C(look.skin), 0, !!solid);
  x.save(); x.translate(...k.head); const lean = Math.atan2(k.head[0] - k.neck[0], k.neck[1] - k.head[1]); x.rotate(lean); x.scale(f * s, s);
  const hs = 1 + I / (12 * s);
  if (solid) { x.fillStyle = solid; x.beginPath(); x.ellipse(0, 0, 13 * hs, 15.5 * hs, 0, 0, 7); x.fill(); x.restore(); arm(k.fE, k.fH, false); return; }
  const skinG = x.createLinearGradient(-12, 0, 12, 0); skinG.addColorStop(0, mixc(look.skin, -.35)); skinG.addColorStop(.6, look.skin); skinG.addColorStop(1, mixc(look.skin, .12));
  const face = () => { x.fillStyle = skinG; x.beginPath(); x.ellipse(0, 0, 11.5, 14, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(10, -3); x.lineTo(14, 2); x.lineTo(10, 4); x.fill(); };
  const eye = (col, glowc) => { if (glowc) glow(glowc, 10); x.fillStyle = col; x.beginPath(); x.ellipse(6, -2.5, 2.4, 1.3, 0, 0, 7); x.fill(); x.shadowBlur = 0; };
  if (look.hair === 'topknot') {
    face(); x.fillStyle = look.hairCol; x.beginPath(); x.ellipse(-1.5, -4, 12.5, 11.5, 0, Math.PI * .9, Math.PI * 2.08); x.lineTo(-11, 4); x.fill();
    x.beginPath(); x.arc(-5, -16, 5.5, 0, 7); x.fill(); x.fillStyle = mixc(look.skin, -.25); x.beginPath(); x.ellipse(-2, 1, 2.5, 3.5, 0, 0, 7); x.fill();
    eye(look.eye || '#1a0f08', look.eye);
  } else if (look.hair === 'hood') {
    x.fillStyle = look.hairCol; x.beginPath(); x.ellipse(-2, -1, 15, 17.5, 0, 0, 7); x.fill();
    x.fillStyle = look.mask || look.skin; if (look.mask) glow(look.mask, 4);
    x.beginPath(); x.ellipse(4.5, 1.5, 8.5, 11, 0, 0, 7); x.fill(); x.shadowBlur = 0;
    if (look.mask) { x.fillStyle = '#05040a'; x.fillRect(4, -3.5, 8, 2); } else eye('#120c08');
  } else if (look.hair === 'bald') {
    face(); x.fillStyle = mixc(look.skin, .1); x.beginPath(); x.ellipse(-2, -8, 7, 4, -.3, 0, 7); x.fill();
    x.fillStyle = look.beard; x.beginPath(); x.moveTo(-5, 3); x.quadraticCurveTo(4, 8, 13, 4); x.lineTo(11, 12); x.quadraticCurveTo(2, 18, -6, 9); x.fill();
    x.fillStyle = mixc(look.skin, -.3); x.beginPath(); x.ellipse(-3, 0, 2.5, 3.5, 0, 0, 7); x.fill(); eye('#1a0f08');
  }
  x.restore();
  arm(k.fE, k.fH, false);
}
function drawSolid(k, o, col, alpha, inflate = 0) { x.save(); x.globalAlpha = alpha; drawParts(k, o, LOOKS[o.look] || LOOKS.kaal, col, inflate); x.restore(); }

// ---------- weapons ----------
function dirOf(a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; }
function local(p, d, fn) { x.save(); x.translate(...p); x.rotate(Math.atan2(d[1], d[0])); fn(); x.restore(); }
function steel(x1, y1, x2, y2) { const g = x.createLinearGradient(x1, y1, x2, y2); g.addColorStop(0, '#f4f8fb'); g.addColorStop(.45, '#a9b3bb'); g.addColorStop(.55, '#e8eef2'); g.addColorStop(1, '#5d666e'); return g; }

function drawWeapon(type, k, o, t) {
  const s = o.s, f = o.f, h = k.fH, h2 = k.bH, col = o.wcol || o.rim, fd = dirOf(k.fE, h), bd = dirOf(k.bE, h2);
  x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
  if (type === 'urumi') {
    local(h, fd, () => { x.fillStyle = '#3a2414'; x.fillRect(-10 * s, -3 * s, 14 * s, 6 * s); x.fillStyle = '#c9a23a'; x.beginPath(); x.ellipse(5 * s, 0, 3 * s, 7 * s, 0, 0, 7); x.fill(); });
    const ext = o.whip || 0;
    for (let i = 0; i < 3; i++) {
      x.beginPath(); x.moveTo(h[0], h[1] + (i - 1) * 2 * s);
      if (ext > .05) {
        const L = (250 - i * 22) * ext * s, wv = Math.sin(t * 30 + i) * 18 * s;
        x.bezierCurveTo(h[0] + f * L * .35, h[1] - 50 * s + wv + i * 4 * s, h[0] + f * L * .7, h[1] + 40 * s - wv, h[0] + f * L, h[1] + wv * .5 + i * 6 * s);
      } else {
        for (let j = 1; j <= 26; j++) { const a = j * .55 + t * 2 + i * .4, r = 6 * s + j * (2.1 - i * .2) * s; x.lineTo(h[0] + Math.cos(a) * r * .55 * f, h[1] + j * 3.4 * s + Math.sin(a) * r * .35); }
      }
      glow(col, 8); x.strokeStyle = i === 1 ? '#f2f6f9' : '#aeb8c0'; x.lineWidth = (i === 1 ? 2.6 : 1.8) * s; x.stroke();
    }
    x.shadowBlur = 0;
  } else if (type === 'kukri') {
    for (const [hp, d] of [[h, fd], [h2, bd]]) local(hp, [d[0] * .2 + f * .98, d[1] * .2 - .3], () => {
      x.scale(s * 1.3, f > 0 ? s * 1.3 : -s * 1.3);
      x.fillStyle = '#4a2c18'; x.beginPath(); x.roundRect(-14, -3.5, 16, 7, 3); x.fill(); x.fillStyle = '#c9a23a'; x.fillRect(1, -4.5, 3, 9);
      x.fillStyle = steel(0, -10, 0, 10); x.beginPath(); x.moveTo(4, -3); x.quadraticCurveTo(22, -4, 36, -12); x.quadraticCurveTo(48, -14, 50, -6); x.quadraticCurveTo(46, 6, 26, 8); x.lineTo(8, 5); x.lineTo(6, 3); x.lineTo(4, 4); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = .8; x.beginPath(); x.moveTo(10, 4.5); x.quadraticCurveTo(38, 6, 49, -5); x.stroke();
      x.strokeStyle = '#3a4047'; x.lineWidth = 1; x.beginPath(); x.moveTo(6, -1); x.quadraticCurveTo(24, -3, 38, -10); x.stroke();
    });
  } else if (type === 'hammer') {
    local(h, fd, () => {
      x.scale(s, s);
      x.fillStyle = metalGrad(0, -4, 0, 4); x.fillRect(-30, -3.5, 110, 7);
      x.fillStyle = '#1b1d20'; for (let i = 0; i < 4; i++) x.fillRect(-26 + i * 7, -4.5, 4, 9);
      x.save(); x.translate(84, 0);
      x.fillStyle = metalGrad(-18, 0, 18, 0); x.fillRect(-16, -32, 32, 64);
      x.fillStyle = '#2a2d31'; x.fillRect(-16, -32, 32, 7); x.fillRect(-16, 25, 32, 7);
      for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#111' : '#f2b01a'; x.beginPath(); x.moveTo(-16 + i * 8, -10); x.lineTo(-8 + i * 8, -10); x.lineTo(-16 + i * 8, 10); x.lineTo(-24 + i * 8, 10); x.closePath(); x.save(); x.beginPath(); x.rect(-16, -10, 32, 20); x.clip(); x.fill(); x.restore(); }
      x.fillStyle = metalGrad(18, 0, 30, 0); x.fillRect(16, -22, 10, 12); x.fillRect(16, 10, 10, 12);
      glow('#ff6a1a', 14); x.fillStyle = '#ff7a2a'; x.fillRect(-3, -30, 6, 4); x.fillRect(-3, 26, 6, 4);
      x.restore();
    });
  }
  x.restore();
}

export function drawFighter(o, t) {
  const look = LOOKS[o.look] || LOOKS.kaal; o = {...o, time: t, bulk: o.bulk || look.bulk};
  const rim = o.dim ? mixc(look.rim, -.55) : look.rim;
  const k = skeleton(o);
  if (o.echo) {
    const j = (hash(Math.floor(t * 24) + 3) - .5) * 10;
    drawSolid(skeleton({...o, x: o.x + j - 6}), o, '#ff2fa0', .22);
    drawSolid(skeleton({...o, x: o.x - j + 6}), o, '#29f0ff', .22);
  }
  x.save(); glow(rim, 9 * o.s); drawParts(k, o, look, rim, 1.8 * o.s); x.restore();
  if (o.dim) { x.save(); x.globalAlpha = .55; drawParts(k, o, look, false); x.restore(); } else drawParts(k, o, look, false);
  if (o.weapon) drawWeapon(o.weapon, k, o, t);
  if (o.echo) for (let i = 0; i < 3; i++) { const yy = k.head[1] + hash(i + Math.floor(t * 12) * 5) * 200; x.fillStyle = 'rgba(41,240,255,.35)'; x.fillRect(o.x - 70 + (hash(i * 9 + Math.floor(t * 12)) - .5) * 40, yy, 140, 2); }
  return k;
}

// ---------- shared fx ----------
export function rain(t, n, alpha, slant = .18) {
  x.save(); x.strokeStyle = `rgba(170,210,255,${alpha})`; x.lineWidth = 1.2; x.beginPath();
  for (let i = 0; i < n; i++) {
    const r = rng(i + 11), sp = 900 + r() * 700, x0 = r() * (W + 200) - 100, y0 = r() * H, len = 14 + r() * 26;
    const y = (y0 + t * sp) % (H + 60) - 30, xx = x0 - (y) * slant;
    x.moveTo(xx, y); x.lineTo(xx - len * slant, y + len);
  }
  x.stroke(); x.restore();
}
export function post(t, fade = 1) {
  lensLayer();
  const r = rng(Math.floor(t * 30) + 77); x.fillStyle = 'rgba(255,255,255,.035)';
  for (let i = 0; i < 260; i++) x.fillRect(r() * W, r() * H, 2, 2);
  if (fade < 1) { x.fillStyle = `rgba(0,0,0,${1 - fade})`; x.fillRect(0, 0, W, H); }
}
export function glitchText(txt, cx, cy, size, t, col = '#fff', weight = '900', font = HEAVY, amt = 1, align = 'center') {
  x.save(); x.font = `${weight} ${size}px ${font}`; x.textAlign = align; x.textBaseline = 'middle';
  const j = amt * (hash(Math.floor(t * 20) + size) - .5) * size * .06;
  x.globalCompositeOperation = 'lighter';
  x.fillStyle = 'rgba(255,40,120,.75)'; x.fillText(txt, cx - 3 * amt + j, cy);
  x.fillStyle = 'rgba(40,240,255,.75)'; x.fillText(txt, cx + 3 * amt - j, cy);
  x.globalCompositeOperation = 'source-over';
  x.fillStyle = col; x.fillText(txt, cx, cy);
  if (amt > .3 && hash(Math.floor(t * 20) + 9) > .6) {
    const sy = cy + (hash(Math.floor(t * 20) + 4) - .5) * size * .7, sh = size * .12;
    const img = x.getImageData(0, Math.max(0, sy), W, sh); x.putImageData(img, (hash(Math.floor(t * 20)) - .5) * 40 * amt, Math.max(0, sy));
  }
  x.restore();
}
export function text(txt, cx, cy, size, col, font = COND, weight = 'bold', align = 'center', alpha = 1, spacing = 0) {
  x.save(); x.globalAlpha = alpha; x.font = `${weight} ${size}px ${font}`; x.textAlign = align; x.textBaseline = 'middle'; x.fillStyle = col;
  if (spacing) x.letterSpacing = spacing + 'px';
  x.fillText(txt, cx, cy); x.restore();
}
export function sparks(cx, cy, dt, seed, col, n = 26, power = 1) {
  if (dt < 0 || dt > .7) return;
  const r = rng(seed); x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, v = (250 + r() * 650) * power, px = cx + Math.cos(a) * v * dt, py = cy + Math.sin(a) * v * dt + 700 * dt * dt;
    const life = 1 - dt / (.35 + r() * .35); if (life <= 0) continue;
    x.strokeStyle = col; x.globalAlpha = life; x.lineWidth = 2 + r() * 2;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px - Math.cos(a) * 18, py - Math.sin(a) * 18); x.stroke();
  }
  if (dt < .12) { x.globalAlpha = 1 - dt / .12; const g = x.createRadialGradient(cx, cy, 0, cx, cy, 90 * power); g.addColorStop(0, '#fff'); g.addColorStop(.3, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 90 * power, 0, 7); x.fill(); }
  x.restore();
}

// ---------- stage: drowned Mumbai rooftop ----------
function skyline(base, col, seed, scale, win) {
  const r = rng(seed); let xx = -40;
  x.fillStyle = col;
  while (xx < W + 40) {
    const w = (40 + r() * 90) * scale, h = (60 + r() * 260) * scale;
    x.fillRect(xx, base - h, w, h + 400);
    if (win) for (let wy = base - h + 12; wy < base - 10; wy += 16) for (let wx = xx + 8; wx < xx + w - 8; wx += 14) if (r() > .82) { x.fillStyle = r() > .5 ? 'rgba(255,170,80,.55)' : 'rgba(80,220,255,.45)'; x.fillRect(wx, wy, 5, 7); x.fillStyle = col; }
    xx += w + r() * 10;
  }
}
export function spire(cx, base, hgt, t, a = 1) {
  x.save(); x.globalAlpha = a;
  x.fillStyle = '#05080d'; x.beginPath(); x.moveTo(cx - 70, base); x.lineTo(cx - 14, base - hgt); x.lineTo(cx + 14, base - hgt); x.lineTo(cx + 70, base); x.fill();
  glow('#29f0ff', 18); x.strokeStyle = 'rgba(41,240,255,.8)'; x.lineWidth = 2;
  for (let i = 1; i < 14; i++) { const q = i / 14, y = base - hgt * q, w = lerp(70, 14, q); x.globalAlpha = a * (.35 + .65 * (Math.sin(t * 3 - i * .6) * .5 + .5)); x.beginPath(); x.moveTo(cx - w, y); x.lineTo(cx + w, y); x.stroke(); }
  x.globalAlpha = a; x.beginPath(); x.moveTo(cx, base); x.lineTo(cx, base - hgt); x.stroke();
  glow('#ff1e3c', 30); x.fillStyle = '#ff2a44'; x.beginPath(); x.arc(cx, base - hgt - 10, 6 + Math.sin(t * 6) * 1.5, 0, 7); x.fill();
  x.restore();
}
// Static layers are drawn once into offscreen canvases; redrawing the skyline every frame cost ~8 ms.
function cached(draw) {
  let c = null;
  return () => {
    if (!c) { c = document.createElement('canvas'); c.width = W; c.height = H; const prev = x; x = c.getContext('2d'); draw(); x = prev; }
    x.drawImage(c, 0, 0);
  };
}
const skyLayer = cached(() => {
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0717'); g.addColorStop(.55, '#122033'); g.addColorStop(1, '#03060a');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
});
const cityLayer = cached(() => { skyline(470, '#0a1220', 5, .9, true); skyline(500, '#060a12', 9, 1.2, false); });
const lensLayer = cached(() => {
  const g = x.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.7)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
});
export function stage(t) {
  skyLayer();
  if (Math.floor(t * 10) % 37 === 0) { x.fillStyle = 'rgba(180,200,255,.15)'; x.fillRect(0, 0, W, H); }
  spire(W / 2, 470, 400, t, .95);
  cityLayer();
  const wg = x.createLinearGradient(0, 500, 0, 560); wg.addColorStop(0, '#0d2a3a'); wg.addColorStop(1, '#04090f'); x.fillStyle = wg; x.fillRect(0, 500, W, 80);
  x.strokeStyle = 'rgba(41,240,255,.18)'; for (let i = 0; i < 8; i++) { x.beginPath(); const y = 505 + i * 8; x.moveTo(0, y); for (let xx = 0; xx <= W; xx += 40) x.lineTo(xx, y + Math.sin(xx * .02 + t * 2 + i) * 2); x.stroke(); }
  const fg = x.createLinearGradient(0, 580, 0, H); fg.addColorStop(0, '#1a1c24'); fg.addColorStop(1, '#07080b'); x.fillStyle = fg; x.fillRect(0, 580, W, H - 580);
  glow('#ff2a44', 14); x.fillStyle = '#ff2a44'; x.fillRect(0, 580, W, 3); x.shadowBlur = 0;
  x.fillStyle = 'rgba(255,255,255,.04)'; for (let i = 0; i < 16; i++) x.fillRect(i * 90, 584, 2, 140);
  x.fillStyle = 'rgba(120,160,220,.06)'; x.fillRect(0, 430, W, 120);
}

// ---------- HUD ----------
export function bar(xx, y, w, val, ghost, col, flip) {
  x.save(); x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(xx - 3, y - 3, w + 6, 30);
  const fw = w * val, gw = w * ghost;
  x.fillStyle = '#ff2a44'; if (flip) x.fillRect(xx, y, gw, 24); else x.fillRect(xx + w - gw, y, gw, 24);
  const g = x.createLinearGradient(0, y, 0, y + 24); g.addColorStop(0, '#fff7a0'); g.addColorStop(1, col);
  x.fillStyle = g; if (flip) x.fillRect(xx, y, fw, 24); else x.fillRect(xx + w - fw, y, fw, 24);
  x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 2; x.strokeRect(xx - 3, y - 3, w + 6, 30); x.restore();
}
export function meter(xx, y, val, col, flip) {
  for (let i = 0; i < 3; i++) {
    const v = clamp(val - i), bx = flip ? xx - (i + 1) * 74 : xx + i * 74;
    x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(bx, y, 68, 12);
    x.save(); if (v >= 1) glow(col, 12); x.fillStyle = col; x.fillRect(flip ? bx + 68 - 68 * v : bx, y, 68 * v, 12); x.restore();
  }
}
export function button(cx, cy, w, h, label, fill, hover, press, t) {
  x.save(); x.translate(cx, cy); const sc = press ? .95 : hover ? 1.04 : 1; x.scale(sc, sc);
  if (fill) { if (hover) glow('#ff2a44', 30); const g = x.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#ff4a5e'); g.addColorStop(1, '#b3122a'); x.fillStyle = g; x.beginPath(); x.roundRect(-w / 2, -h / 2, w, h, 4); x.fill(); x.shadowBlur = 0; }
  else { x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 2; x.beginPath(); x.roundRect(-w / 2, -h / 2, w, h, 4); x.stroke(); }
  if (hover && fill) { const sw = ((t * 1.6) % 1.4) - .2; x.save(); x.beginPath(); x.roundRect(-w / 2, -h / 2, w, h, 4); x.clip(); x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.moveTo(-w / 2 + sw * w, -h / 2); x.lineTo(-w / 2 + sw * w + 30, -h / 2); x.lineTo(-w / 2 + sw * w, h / 2); x.lineTo(-w / 2 + sw * w - 30, h / 2); x.fill(); x.restore(); }
  x.restore();
  text(label, cx, cy + 1, 19, '#fff', HEAVY, '900', 'center', 1, 3);
}
