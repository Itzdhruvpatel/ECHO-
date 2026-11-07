// Fighter stats and frame data. Numbers live here, not in the simulation code.
// Frames are 60 per second. Hitbox x is measured forward from the fighter's center,
// y is height above the attacker's feet.

export type FighterId = 'kaal' | 'vanta' | 'rook';
export type Level = 'high' | 'mid' | 'low' | 'throw';

export interface MoveData {
  name: string;
  pose: string;
  wind?: string; // pose held during startup, if different from the hit pose
  startup: number;
  active: number;
  recovery: number;
  dmg: number;
  level: Level;
  hitstun: number;
  blockstun: number;
  hitstop: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  kd?: boolean; // knocks down
  push?: number; // pushback speed on hit
  lunge?: number; // forward speed during startup and active frames
  rehit?: number; // multi-hit: the move can hit again every this many active frames
  pow: number; // effect strength for sparks and shake
}

export const MOVES: Record<string, MoveData> = {
  fp: { name: 'Front Punch', pose: 'punch', startup: 6, active: 3, recovery: 10, dmg: 40, level: 'high', hitstun: 16, blockstun: 10, hitstop: 6, x0: 20, x1: 115, y0: 150, y1: 215, pow: 0.7 },
  bp: { name: 'Back Punch', pose: 'upper', startup: 9, active: 4, recovery: 16, dmg: 60, level: 'mid', hitstun: 20, blockstun: 14, hitstop: 8, x0: 10, x1: 105, y0: 110, y1: 230, pow: 0.9 },
  fk: { name: 'Front Kick', pose: 'kick', startup: 8, active: 4, recovery: 14, dmg: 55, level: 'mid', hitstun: 18, blockstun: 12, hitstop: 7, x0: 20, x1: 140, y0: 90, y1: 170, pow: 0.9 },
  bk: { name: 'Sweep', pose: 'sweep', startup: 10, active: 4, recovery: 22, dmg: 50, level: 'low', hitstun: 22, blockstun: 12, hitstop: 7, x0: 20, x1: 145, y0: 0, y1: 60, kd: true, pow: 0.9 },
  jk: { name: 'Jump Kick', pose: 'kick', startup: 5, active: 8, recovery: 6, dmg: 60, level: 'mid', hitstun: 20, blockstun: 12, hitstop: 7, x0: 10, x1: 120, y0: 20, y1: 150, pow: 1 },
  throw: { name: 'Throw', pose: 'punch', startup: 5, active: 2, recovery: 25, dmg: 110, level: 'throw', hitstun: 0, blockstun: 0, hitstop: 10, x0: 0, x1: 95, y0: 60, y1: 200, kd: true, pow: 1.2 },
  coil: { name: 'Coil Lash', pose: 'whip', startup: 14, active: 5, recovery: 24, dmg: 90, level: 'mid', hitstun: 26, blockstun: 16, hitstop: 10, x0: 60, x1: 330, y0: 60, y1: 200, pow: 1.2 },
  lunge: { name: 'Shadow Lunge', pose: 'punch', startup: 7, active: 10, recovery: 18, dmg: 80, level: 'mid', hitstun: 22, blockstun: 14, hitstop: 9, x0: 10, x1: 110, y0: 100, y1: 210, lunge: 16, pow: 1.1 },
  slam: { name: 'Ground Breaker', pose: 'whip', wind: 'raise', startup: 22, active: 4, recovery: 26, dmg: 130, level: 'mid', hitstun: 30, blockstun: 20, hitstop: 14, x0: 40, x1: 200, y0: 0, y1: 160, kd: true, push: 9, pow: 1.7 },

  // string follow-ups
  fp2: { name: 'Second Jab', pose: 'upper', startup: 6, active: 3, recovery: 12, dmg: 40, level: 'mid', hitstun: 18, blockstun: 10, hitstop: 6, x0: 10, x1: 110, y0: 120, y1: 220, pow: 0.8 },
  k_monsoon: { name: 'Riptide', pose: 'whip', startup: 9, active: 4, recovery: 22, dmg: 70, level: 'mid', hitstun: 26, blockstun: 14, hitstop: 10, x0: 40, x1: 210, y0: 70, y1: 200, kd: true, push: 8, pow: 1.2 },
  k_undertow: { name: 'Undertow', pose: 'sweep', startup: 9, active: 4, recovery: 22, dmg: 60, level: 'low', hitstun: 24, blockstun: 12, hitstop: 8, x0: 20, x1: 190, y0: 0, y1: 60, kd: true, pow: 1 },
  v_flurry: { name: 'Shade Flurry', pose: 'kick', startup: 7, active: 4, recovery: 18, dmg: 65, level: 'mid', hitstun: 24, blockstun: 12, hitstop: 9, x0: 20, x1: 140, y0: 90, y1: 180, kd: true, push: 8, pow: 1.1 },
  v_nightcut: { name: 'Night Cut', pose: 'punch', startup: 7, active: 5, recovery: 18, dmg: 60, level: 'mid', hitstun: 22, blockstun: 12, hitstop: 8, x0: 10, x1: 120, y0: 100, y1: 210, lunge: 6, pow: 1 },
  r_piledriver: { name: 'Wrecking Ball', pose: 'whip', wind: 'raise', startup: 12, active: 4, recovery: 26, dmg: 110, level: 'mid', hitstun: 30, blockstun: 18, hitstop: 13, x0: 30, x1: 190, y0: 0, y1: 170, kd: true, push: 9, pow: 1.5 },
  r_breakwater: { name: 'Breakwater', pose: 'kick', startup: 9, active: 4, recovery: 20, dmg: 75, level: 'mid', hitstun: 24, blockstun: 14, hitstop: 10, x0: 20, x1: 150, y0: 80, y1: 170, push: 10, pow: 1.2 },

  // Overclock supers (3 meter bars)
  oc_coils: { name: 'Thousand Coils', pose: 'spin', startup: 8, active: 60, recovery: 24, dmg: 45, level: 'mid', hitstun: 16, blockstun: 12, hitstop: 5, x0: -130, x1: 230, y0: 0, y1: 260, push: 1, rehit: 10, pow: 1.1 },
  oc_nightshift: { name: 'Night Shift', pose: 'punch', startup: 6, active: 48, recovery: 22, dmg: 24, level: 'mid', hitstun: 10, blockstun: 8, hitstop: 3, x0: -60, x1: 170, y0: 0, y1: 240, push: 0.5, rehit: 4, pow: 0.9 },
  oc_demolition: { name: 'Demolition Order', pose: 'whip', wind: 'raise', startup: 26, active: 5, recovery: 34, dmg: 300, level: 'mid', hitstun: 40, blockstun: 26, hitstop: 22, x0: 20, x1: 230, y0: 0, y1: 240, kd: true, push: 16, pow: 2.6 },
};

// Strings: from a move, pressing a button during its active frames or early recovery chains into the next move.
export type Btn = 'FP' | 'BP' | 'FK' | 'BK';
export type Chains = Record<string, Partial<Record<Btn, string>>>;

export interface FighterData {
  name: string;
  hp: number;
  walk: number;
  dash: number;
  special: string;
  overclock: string;
  deletion: string;
  lastBreath: string; // finisher for rounds 1 and 2: K.O. with your special
  weapon: string;
  color: string;
  weaponName: string;
  power: string;
  style: string;
  chains: Chains;
  moveList: string; // shown on fighter select, keys are U I J K for FP BP FK BK
}

export const FIGHTERS: Record<FighterId, FighterData> = {
  kaal: {
    name: 'KAAL', hp: 1000, walk: 4.2, dash: 12, special: 'coil', overclock: 'oc_coils', deletion: "KAAL'S LOOP", lastBreath: 'MONSOON CUT', weapon: 'urumi', color: '#ff8a1f', weaponName: 'URUMI WHIP SWORD', power: 'REWIND', style: 'BALANCED, LONG REACH',
    chains: { fp: { FP: 'fp2' }, fp2: { BP: 'k_monsoon' }, fk: { BK: 'k_undertow' } },
    moveList: 'U U I  RIPTIDE  //  J K  UNDERTOW  //  O  COIL LASH  //  P  REWIND  //  ;  THOUSAND COILS',
  },
  vanta: {
    name: 'VANTA', hp: 900, walk: 5.4, dash: 15, special: 'lunge', overclock: 'oc_nightshift', deletion: 'FACELESS', lastBreath: 'CROSS OUT', weapon: 'kukri', color: '#a45cff', weaponName: 'TWIN KUKRIS', power: 'SHADOW PHASE', style: 'RUSHDOWN',
    chains: { fp: { BP: 'bp' }, bp: { FK: 'v_flurry', BP: 'v_nightcut' } },
    moveList: 'U I J  SHADE FLURRY  //  I I  NIGHT CUT  //  O  SHADOW LUNGE  //  P  SHADOW PHASE  //  ;  NIGHT SHIFT',
  },
  rook: {
    name: 'ROOK', hp: 1150, walk: 3.3, dash: 9, special: 'slam', overclock: 'oc_demolition', deletion: 'FOUNDATION', lastBreath: 'PILE DRIVER', weapon: 'hammer', color: '#ff4d2e', weaponName: 'HYDRAULIC HAMMER', power: 'IRON WILL', style: 'HEAVY GRAPPLER',
    chains: { bp: { FP: 'r_piledriver' }, fk: { FK: 'r_breakwater' } },
    moveList: 'I U  WRECKING BALL  //  J J  BREAKWATER  //  O  GROUND BREAKER  //  P  IRON WILL  //  ;  DEMOLITION ORDER',
  },
};

export const ROSTER: FighterId[] = ['kaal', 'vanta', 'rook'];
