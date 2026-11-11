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
  spin:   {lean:0,   fs:1.65,fe:1.6, bs:-1.65,be:-1.6,fh:.4, fk:.15, bh:-.4,  bk:-.15},
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
// Low graphics drops glows, most rain and film grain for slower phones and laptops.
export let low = false;
export function setLow(v) { low = v; }
export function glow(col, blur) { x.shadowColor = col; x.shadowBlur = low ? 0 : blur; }

const LOOKS = {
  kaal:    {skin: '#9a6644', top: null, pants: '#c8691a', boots: '#3a2416', arms: 'skin', hair: 'topknot', hairCol: '#140d08', sash: '#a3231c', rim: '#ff8a1f'},
  echo:    {skin: '#0b0f13', top: null, pants: '#0c1519', boots: '#05070a', arms: 'skin', hair: 'topknot', hairCol: '#030405', sash: '#0b4650', rim: '#29f0ff', eye: '#29f0ff'},
  vanta:   {skin: '#2a2433', top: '#1b1624', pants: '#1b1624', boots: '#0c0a10', arms: 'top', hair: 'hood', hairCol: '#3d2266', mask: '#e8e4f0', rim: '#a45cff', gloves: '#0c0a10'},
  rook:    {skin: '#7a4e34', top: '#e8641c', pants: '#3a3f46', boots: '#2a1d12', arms: 'metal', hair: 'bald', beard: '#2a1a10', rim: '#ff4d2e', bulk: 1.32, stripes: '#e6e6d8'},
  ion:     {skin: '#c08a64', top: '#1d1d22', pants: '#2a2a30', boots: '#111114', arms: 'top', hair: 'helmet', hairCol: '#d9b416', visor: '#ffe14d', rim: '#ffe14d', jstripe: '#ffd21a'},
  bhairav: {skin: '#6f7480', top: null, pants: '#1f3a8a', boots: '#3c3f46', arms: 'skin', hair: 'stonemask', hairCol: '#3a3d45', third: '#4dd2ff', rim: '#4d7cff', bulk: 1.16, sash: '#c9a23a'},
  mirae:   {skin: '#e3c2a2', top: '#dfe8ef', pants: '#262c34', boots: '#15181c', arms: 'top', hair: 'bob', hairCol: '#0d0d10', coat: '#cfdbe4', rim: '#bff6ff'},
  sora:    {skin: '#b07a52', top: '#1d6644', pants: '#1a2a24', boots: '#101512', arms: 'top', hair: 'hood', hairCol: '#185538', scarf: '#5dff9a', rim: '#5dff9a'},
  glitch:  {skin: '#140914', top: '#1d0b1d', pants: '#120712', boots: '#060206', arms: 'top', hair: 'hood', hairCol: '#2d0b2d', mask: '#ff2fa0', rim: '#ff2fa0', gloves: '#060206'},
  echo_vanta: {skin: '#0b0f13', top: '#081013', pants: '#081013', boots: '#030506', arms: 'top', hair: 'hood', hairCol: '#06272d', mask: '#29f0ff', rim: '#29f0ff', gloves: '#030506'},
  echo_rook:  {skin: '#0b0f13', top: '#0a1a1f', pants: '#0c1519', boots: '#05070a', arms: 'metal', hair: 'bald', beard: '#030405', rim: '#29f0ff', bulk: 1.32, stripes: '#0b4650'},
};
// Echo versions of the later fighters: same shapes, drowned in black with a cyan rim
for (const id of ['ion', 'bhairav', 'mirae', 'sora', 'glitch']) {
  const L = LOOKS[id], dark = c => (c ? '#081013' : c);
  LOOKS['echo_' + id] = { ...L, skin: '#0b0f13', top: dark(L.top), pants: '#0c1519', boots: '#05070a', hairCol: '#06272d', rim: '#29f0ff', mask: L.mask && '#29f0ff', visor: L.visor && '#29f0ff', third: L.third && '#29f0ff', coat: L.coat && '#0a1a1f', scarf: L.scarf && '#29f0ff', jstripe: L.jstripe && '#0b4650', sash: L.sash && '#0b4650' };
}
export const ECHO_LOOK: Record<string, string> = { kaal: 'echo', vanta: 'echo_vanta', rook: 'echo_rook', ion: 'echo_ion', bhairav: 'echo_bhairav', mirae: 'echo_mirae', sora: 'echo_sora', glitch: 'echo_glitch' };

// tapered, slightly muscled limb segment with rounded ends
function limb(pts, w, col) { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(...pts[0]); for (const q of pts.slice(1)) x.lineTo(...q); x.stroke(); }

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
    // shoe
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
  // back cloth (coat tails, sash tail, scarf)
  const wave = Math.sin((o.time || 0) * 6) * 8 * s;
  if (!solid && look.coat) { const ux = k.hip[0] - k.neck[0]; x.fillStyle = mixc(look.coat, -.15); x.beginPath(); x.moveTo(k.hip[0] - 14 * s * f, k.hip[1] - 20 * s); x.quadraticCurveTo(k.hip[0] - 34 * s * f, k.hip[1] + 30 * s, k.hip[0] - 40 * s * f + wave, k.hip[1] + 62 * s); x.lineTo(k.hip[0] - 4 * s * f + wave * .4, k.hip[1] + 58 * s); x.lineTo(k.hip[0] + 8 * s * f, k.hip[1] - 10 * s); x.fill(); }
  if (!solid && look.sash) { x.strokeStyle = look.sash; x.lineWidth = 5 * s; x.lineCap = 'round'; x.beginPath(); x.moveTo(k.hip[0] - 10 * s * f, k.hip[1] - 14 * s); x.quadraticCurveTo(k.hip[0] - 30 * s * f, k.hip[1] + 4 * s + wave, k.hip[0] - 42 * s * f, k.hip[1] + 26 * s - wave); x.stroke(); }
  if (!solid && look.scarf) { x.strokeStyle = look.scarf; x.lineWidth = 6 * s; x.lineCap = 'round'; x.beginPath(); x.moveTo(k.neck[0], k.neck[1] + 4 * s); x.bezierCurveTo(k.neck[0] - 30 * s * f, k.neck[1] - 6 * s + wave, k.neck[0] - 55 * s * f, k.neck[1] + 10 * s - wave, k.neck[0] - 80 * s * f, k.neck[1] + wave); x.stroke(); }
  arm(k.bE, k.bH, true); legs(k.bK, k.bF, k.hip, true);
  // torso
  const T = torsoPath(k, o, I);
  if (solid) { x.fillStyle = solid; x.fill(); }
  else {
    const tc = look.top || look.skin, g = x.createLinearGradient(...T.P(.5, 24), ...T.P(.5, -24));
    g.addColorStop(0, mixc(tc, f > 0 ? -.4 : .18)); g.addColorStop(.5, tc); g.addColorStop(1, mixc(tc, f > 0 ? .18 : -.4)); x.fillStyle = g; x.fill();
    x.save(); x.clip();
    if (!look.top) { x.strokeStyle = mixc(look.skin, -.35); x.lineWidth = 1.5 * s; x.beginPath(); x.moveTo(...T.P(.7, 16)); x.quadraticCurveTo(...T.P(.62, 0), ...T.P(.7, -16)); x.moveTo(...T.P(.62, 0)); x.lineTo(...T.P(.3, 0)); x.stroke(); }
    if (look.stripes) { x.fillStyle = look.stripes; for (const a of [.3, .62]) { const p1 = T.P(a, 30), p2 = T.P(a, -30); x.save(); x.lineWidth = 5 * s; x.strokeStyle = look.stripes; x.beginPath(); x.moveTo(...p1); x.lineTo(...p2); x.stroke(); x.restore(); } }
    if (look.jstripe) { x.strokeStyle = look.jstripe; x.lineWidth = 4 * s; x.beginPath(); x.moveTo(...T.P(.95, 18)); x.lineTo(...T.P(.1, -18)); x.stroke(); }
    if (look.sash) { x.strokeStyle = look.sash; x.lineWidth = 7 * s; x.beginPath(); x.moveTo(...T.P(.98, 18 * f)); x.lineTo(...T.P(.08, -16 * f)); x.stroke(); }
    if (look.coat) { x.strokeStyle = mixc(look.coat, -.3); x.lineWidth = 1.5 * s; x.beginPath(); x.moveTo(...T.P(.98, 4)); x.lineTo(...T.P(0, 8)); x.stroke(); }
    x.restore();
    // belt
    x.strokeStyle = mixc(look.pants, -.5); x.lineWidth = 5 * s; x.beginPath(); x.moveTo(...T.P(.08, 17)); x.lineTo(...T.P(.08, -17)); x.stroke();
  }
  legs(k.fK, k.fF, k.hip, false);
  // neck
  taper(k.neck, pt(k.neck, k.head, .6), 10 * s * b + I, 9 * s + I, C(look.skin), 0, !!solid);
  // head
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
    x.fillStyle = look.mask || look.skin; if (look.mask) glow(look.mask, look.mask === '#ff2fa0' ? 14 : 4);
    x.beginPath(); x.ellipse(4.5, 1.5, 8.5, 11, 0, 0, 7); x.fill(); x.shadowBlur = 0;
    if (look.mask) { x.fillStyle = '#05040a'; x.fillRect(4, -3.5, 8, 2); } else eye('#120c08');
    if (look.mask === '#ff2fa0') for (let i = 0; i < 5; i++) { x.fillStyle = i % 2 ? '#29f0ff' : '#fff'; x.fillRect(-2 + hash(i + Math.floor((o.time || 0) * 15)) * 12, -8 + hash(i * 5 + Math.floor((o.time || 0) * 15)) * 16, 3, 3); }
  } else if (look.hair === 'bald') {
    face(); x.fillStyle = mixc(look.skin, .1); x.beginPath(); x.ellipse(-2, -8, 7, 4, -.3, 0, 7); x.fill();
    x.fillStyle = look.beard; x.beginPath(); x.moveTo(-5, 3); x.quadraticCurveTo(4, 8, 13, 4); x.lineTo(11, 12); x.quadraticCurveTo(2, 18, -6, 9); x.fill();
    x.fillStyle = mixc(look.skin, -.3); x.beginPath(); x.ellipse(-3, 0, 2.5, 3.5, 0, 0, 7); x.fill(); eye('#1a0f08');
  } else if (look.hair === 'helmet') {
    const hg = x.createLinearGradient(-14, -14, 12, 12); hg.addColorStop(0, mixc(look.hairCol, .3)); hg.addColorStop(1, mixc(look.hairCol, -.5));
    x.fillStyle = hg; x.beginPath(); x.ellipse(0, -1, 14, 15.5, 0, 0, 7); x.fill();
    glow(look.visor, 12); x.fillStyle = look.visor; x.beginPath(); x.moveTo(1, -6); x.lineTo(14, -5); x.quadraticCurveTo(15, 1, 12, 3); x.lineTo(1, 2); x.fill(); x.shadowBlur = 0;
    x.fillStyle = '#111'; x.fillRect(-12, -2, 6, 2);
  } else if (look.hair === 'stonemask') {
    face(); x.fillStyle = look.hairCol; for (const [a, h] of [[-8, 9], [0, 12], [8, 9]]) { x.beginPath(); x.moveTo(a - 4, -11); x.lineTo(a, -11 - h); x.lineTo(a + 4, -11); x.fill(); }
    const mg = x.createLinearGradient(0, -12, 0, 12); mg.addColorStop(0, '#9aa0aa'); mg.addColorStop(1, '#4a4f58'); x.fillStyle = mg;
    x.beginPath(); x.moveTo(-1, -13); x.lineTo(13, -9); x.lineTo(15, 2); x.lineTo(11, 12); x.lineTo(1, 13); x.fill();
    x.strokeStyle = '#2f333a'; x.lineWidth = 1; x.beginPath(); x.moveTo(4, 6); x.lineTo(12, 6); x.stroke();
    glow(look.third, 14); x.fillStyle = look.third; x.beginPath(); x.ellipse(8, -8, 1.6, 3, 0, 0, 7); x.fill(); eye(look.third, look.third);
  } else if (look.hair === 'bob') {
    x.fillStyle = look.hairCol; x.beginPath(); x.ellipse(-2, -2, 14.5, 15.5, 0, 0, 7); x.fill();
    face(); x.fillStyle = look.hairCol; x.beginPath(); x.ellipse(-2, -6, 13.5, 10.5, 0, Math.PI * .95, Math.PI * 2.02); x.lineTo(13, -3); x.lineTo(-13, 8); x.fill();
    x.fillRect(-15, -4, 9, 16); eye('#0d0d10');
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
  } else if (type === 'sickle') {
    local(h, fd, () => {
      x.scale(s, f > 0 ? s : -s);
      x.fillStyle = '#5a3a1e'; x.beginPath(); x.roundRect(-6, -3, 34, 6, 2); x.fill();
      x.fillStyle = steel(28, -30, 40, 0); x.beginPath(); x.moveTo(26, -3); x.quadraticCurveTo(30, -38, 6, -44); x.quadraticCurveTo(24, -30, 22, -3); x.closePath(); x.fill();
      x.strokeStyle = '#fff'; x.lineWidth = .8; x.beginPath(); x.moveTo(6, -44); x.quadraticCurveTo(24, -32, 22, -6); x.stroke();
    });
    const a = [h[0] - fd[0] * 6 * s, h[1] - fd[1] * 6 * s], b = [h2[0], h2[1]], mid = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 46 * s];
    for (let i = 0; i <= 22; i++) {
      const q = i / 22, px = (1 - q) * (1 - q) * a[0] + 2 * q * (1 - q) * mid[0] + q * q * b[0], py = (1 - q) * (1 - q) * a[1] + 2 * q * (1 - q) * mid[1] + q * q * b[1];
      x.strokeStyle = '#8f99a2'; x.lineWidth = 1.4 * s; x.beginPath(); x.ellipse(px, py, (i % 2 ? 2 : 3.2) * s, (i % 2 ? 3.2 : 2) * s, 0, 0, 7); x.stroke();
    }
    x.fillStyle = metalGrad(b[0] - 6, b[1], b[0] + 6, b[1]); x.beginPath(); x.arc(b[0], b[1] + 2 * s, 6 * s, 0, 7); x.fill();
    glow(col, 12); x.strokeStyle = col; x.lineWidth = 1.5 * s; const fr = Math.floor(t * 20);
    x.beginPath(); for (let i = 0; i <= 10; i++) { const q = i / 10, px = lerp(a[0], b[0], q), py = lerp(a[1], b[1], q) + Math.sin(q * Math.PI) * 40 * s; x.lineTo(px + (hash(i + fr) - .5) * 14 * s, py + (hash(i * 3 + fr) - .5) * 14 * s); } x.stroke(); x.shadowBlur = 0;
  } else if (type === 'trident') {
    const top = [h[0] + f * 12 * s, h[1] - 112 * s], bot = [h[0] - f * 5 * s, h[1] + 62 * s];
    const g = x.createLinearGradient(bot[0] - 4, 0, bot[0] + 4, 0); g.addColorStop(0, '#6b4a1a'); g.addColorStop(.5, '#e0b860'); g.addColorStop(1, '#6b4a1a');
    limb([bot, top], 5.5 * s, g);
    x.fillStyle = '#3b2a10'; for (let i = 0; i < 4; i++) { const p = pt(bot, top, .55 + i * .03); x.fillRect(p[0] - 4 * s, p[1] - 1.5 * s, 8 * s, 3 * s); }
    local(top, dirOf(bot, top), () => {
      x.scale(s, s); const gg = x.createLinearGradient(0, -20, 0, 20); gg.addColorStop(0, '#fff2c0'); gg.addColorStop(.5, '#d9a93a'); gg.addColorStop(1, '#7a5418');
      x.fillStyle = gg; x.fillRect(-4, -18, 8, 36);
      x.beginPath(); x.moveTo(0, -3); x.lineTo(44, -3); x.lineTo(56, 0); x.lineTo(44, 3); x.lineTo(0, 3); x.fill();
      for (const sgn of [-1, 1]) { x.beginPath(); x.moveTo(2, sgn * 14); x.quadraticCurveTo(14, sgn * 22, 30, sgn * 16); x.lineTo(40, sgn * 13); x.lineTo(30, sgn * 12); x.quadraticCurveTo(16, sgn * 15, 4, sgn * 9); x.fill(); x.beginPath(); x.moveTo(30, sgn * 16); x.lineTo(24, sgn * 22); x.lineTo(26, sgn * 14); x.fill(); }
    });
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) { const r = hash(i * 3 + Math.floor(t * 16)); const fg = x.createRadialGradient(top[0], top[1] - 30 * s - i * 6 * s, 0, top[0], top[1] - 30 * s - i * 6 * s, (16 - i) * s); fg.addColorStop(0, 'rgba(200,230,255,.7)'); fg.addColorStop(1, 'rgba(40,90,255,0)'); x.fillStyle = fg; x.beginPath(); x.arc(top[0] + (r - .5) * 18 * s, top[1] - 30 * s - i * 6 * s, (16 - i) * s, 0, 7); x.fill(); }
    x.restore();
  } else if (type === 'katana') {
    local(h, [fd[0] * .55 + f * .45, fd[1] * .55 - .75], () => {
      x.scale(s, f > 0 ? s : -s);
      x.fillStyle = '#111'; x.fillRect(-18, -3.5, 22, 7); x.strokeStyle = '#e6e6e6'; x.lineWidth = .8; x.beginPath(); for (let i = -16; i < 2; i += 4) { x.moveTo(i, -3.5); x.lineTo(i + 3, 3.5); x.moveTo(i + 3, -3.5); x.lineTo(i, 3.5); } x.stroke();
      x.fillStyle = '#c9a23a'; x.beginPath(); x.ellipse(5, 0, 2.5, 8, 0, 0, 7); x.fill();
      glow(col, 14); x.fillStyle = 'rgba(215,245,255,.55)'; x.beginPath(); x.moveTo(7, -2.6); x.quadraticCurveTo(60, -6, 112, -14); x.lineTo(118, -15); x.quadraticCurveTo(62, 0, 7, 3); x.closePath(); x.fill();
      x.shadowBlur = 0; x.strokeStyle = '#ffffff'; x.lineWidth = 1; x.beginPath(); x.moveTo(8, 3); x.quadraticCurveTo(62, 0, 118, -15); x.stroke();
      x.strokeStyle = 'rgba(160,240,255,.9)'; x.beginPath(); for (let i = 0; i <= 20; i++) { const q = i / 20; x.lineTo(lerp(10, 110, q), lerp(.5, -12, q) + Math.sin(q * 30) * .8); } x.stroke();
    });
  } else if (type === 'fans') {
    for (const [hp, d, k2] of [[h, fd, 0], [h2, bd, 1]]) local(hp, d, () => {
      x.scale(s, f > 0 ? s : -s); const span = 1.9, a0 = -span / 2 - .2 + Math.sin(t * 4 + k2) * .15;
      for (let i = 0; i < 10; i++) { const a1 = a0 + span * i / 10, a2 = a0 + span * (i + 1) / 10; x.fillStyle = i % 2 ? '#123d28' : '#1f6b45'; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 34, a1, a2); x.closePath(); x.fill(); }
      x.strokeStyle = '#3a3f46'; x.lineWidth = 1.2; x.beginPath(); for (let i = 0; i <= 10; i++) { const a = a0 + span * i / 10; x.moveTo(0, 0); x.lineTo(Math.cos(a) * 34, Math.sin(a) * 34); } x.stroke();
      glow(col, 10); x.strokeStyle = steel(-30, -30, 30, 30); x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 34, a0, a0 + span); x.stroke(); x.shadowBlur = 0;
      x.fillStyle = '#c9a23a'; x.beginPath(); x.arc(0, 0, 3, 0, 7); x.fill();
    });
  } else if (type === 'glitch') {
    const opts = ['urumi', 'kukri', 'hammer', 'sickle', 'trident', 'katana', 'fans'];
    const pick = opts.at(Math.floor(t * 3) % opts.length);
    if (Math.floor(t * 20) % 7 !== 0) drawWeapon(pick, k, {...o, wcol: col}, t);
    const fr = Math.floor(t * 18); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? 'rgba(255,47,160,.8)' : 'rgba(41,240,255,.8)'; x.fillRect(h[0] + (hash(i + fr) - .3) * 90 * s * f, h[1] + (hash(i * 7 + fr) - .5) * 80 * s, 6 * s, 6 * s); }
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
  if (low) n = Math.floor(n / 4);
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
  if (!low) for (let i = 0; i < 260; i++) x.fillRect(r() * W, r() * H, 2, 2);
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
export function skyline(base, col, seed, scale, win) {
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

// ---------- stage 2: the flooded temple on floor 61 ----------
const templeLayer = cached(() => {
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04070a'); g.addColorStop(1, '#0a1418'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 7; i++) { const px = 80 + i * 190; x.fillStyle = '#0b1116'; x.fillRect(px, 80, 60, 520); x.fillStyle = 'rgba(41,240,255,.05)'; x.fillRect(px, 80, 4, 520); }
  const lg = x.createLinearGradient(640, 0, 640, 600); lg.addColorStop(0, 'rgba(255,200,140,.18)'); lg.addColorStop(1, 'rgba(255,200,140,0)');
  x.fillStyle = lg; x.beginPath(); x.moveTo(560, 0); x.lineTo(720, 0); x.lineTo(860, 600); x.lineTo(420, 600); x.fill();
});
export function temple(t) {
  templeLayer();
  x.fillStyle = 'rgba(8,30,40,.85)'; x.fillRect(0, 590, W, H);
  x.strokeStyle = 'rgba(41,240,255,.15)';
  for (let i = 0; i < 8; i++) { x.beginPath(); const y = 596 + i * 16; x.moveTo(0, y); for (let xx = 0; xx <= W; xx += 30) x.lineTo(xx, y + Math.sin(xx * .02 + t * 1.2 + i) * 3); x.stroke(); }
  glow('#29f0ff', 12); x.fillStyle = 'rgba(41,240,255,.6)'; x.fillRect(0, 580, W, 2); x.shadowBlur = 0;
}
