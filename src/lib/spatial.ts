// Spatial statistics core library — pure TS, no deps
// Grid city: 8x8 cells, indexed 0..63

export interface Cell {
  id: number;
  row: number;
  col: number;
  /** primary value for the active case (e.g. price, temperature) */
  value: number;
  name: string;
}

export type NeighborRule = "rook" | "queen" | "knn" | "distance";

export interface NeighborConfig {
  rule: NeighborRule;
  k?: number;        // for knn
  threshold?: number; // for distance (in grid units)
}

export const GRID_SIZE = 8;
export const TOTAL = GRID_SIZE * GRID_SIZE;

// --- City naming (whimsical district names) ---
const PREFIX = ["新", "云", "海", "星", "玉", "锦", "翠", "晨"];
const SUFFIX = ["桥", "湾", "苑", "巷", "坊", "墟", "原", "塬"];
export function districtName(id: number): string {
  return `${PREFIX[id % PREFIX.length]}${SUFFIX[Math.floor(id / 8) % SUFFIX.length]}`;
}

// --- Seedable PRNG ---
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Generators ---
/** Generate clustered values via Gaussian blur of random seeds */
export function generateClustered(seed = 42, blur = 2): number[] {
  const rng = mulberry32(seed);
  const raw = Array.from({ length: TOTAL }, () => rng());
  // simple box blur
  const out = new Array(TOTAL).fill(0);
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      let sum = 0, n = 0;
      for (let dr = -blur; dr <= blur; dr++) {
        for (let dc = -blur; dc <= blur; dc++) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || rr >= GRID_SIZE || cc < 0 || cc >= GRID_SIZE) continue;
          sum += raw[rr * GRID_SIZE + cc];
          n++;
        }
      }
      out[r * GRID_SIZE + c] = sum / n;
    }
  }
  // normalize 0-100
  const min = Math.min(...out), max = Math.max(...out);
  return out.map(v => Math.round(((v - min) / (max - min)) * 100));
}

export function generateRandom(seed = 7): number[] {
  const rng = mulberry32(seed);
  return Array.from({ length: TOTAL }, () => Math.round(rng() * 100));
}

export function shuffleValues(values: number[], seed = 1): number[] {
  const rng = mulberry32(seed);
  const arr = [...values];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function makeCells(values: number[]): Cell[] {
  return values.map((v, i) => ({
    id: i,
    row: Math.floor(i / GRID_SIZE),
    col: i % GRID_SIZE,
    value: v,
    name: districtName(i),
  }));
}

// --- Neighbor matrix ---
export function buildNeighbors(cfg: NeighborConfig): number[][] {
  const W: number[][] = Array.from({ length: TOTAL }, () => Array(TOTAL).fill(0));
  for (let i = 0; i < TOTAL; i++) {
    const ri = Math.floor(i / GRID_SIZE), ci = i % GRID_SIZE;
    if (cfg.rule === "rook" || cfg.rule === "queen") {
      for (let j = 0; j < TOTAL; j++) {
        if (i === j) continue;
        const rj = Math.floor(j / GRID_SIZE), cj = j % GRID_SIZE;
        const dr = Math.abs(ri - rj), dc = Math.abs(ci - cj);
        if (cfg.rule === "rook" && ((dr === 1 && dc === 0) || (dr === 0 && dc === 1))) W[i][j] = 1;
        if (cfg.rule === "queen" && dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0)) W[i][j] = 1;
      }
    } else if (cfg.rule === "distance") {
      const t = cfg.threshold ?? 1.5;
      for (let j = 0; j < TOTAL; j++) {
        if (i === j) continue;
        const rj = Math.floor(j / GRID_SIZE), cj = j % GRID_SIZE;
        const d = Math.hypot(ri - rj, ci - cj);
        if (d <= t) W[i][j] = 1;
      }
    } else if (cfg.rule === "knn") {
      const k = cfg.k ?? 4;
      const dists: { j: number; d: number }[] = [];
      for (let j = 0; j < TOTAL; j++) {
        if (i === j) continue;
        const rj = Math.floor(j / GRID_SIZE), cj = j % GRID_SIZE;
        dists.push({ j, d: Math.hypot(ri - rj, ci - cj) });
      }
      dists.sort((a, b) => a.d - b.d);
      for (let n = 0; n < k && n < dists.length; n++) W[i][dists[n].j] = 1;
    }
  }
  return W;
}

export function rowStandardize(W: number[][]): number[][] {
  return W.map(row => {
    const sum = row.reduce((a, b) => a + b, 0);
    return sum === 0 ? row : row.map(v => v / sum);
  });
}

export function neighborsOf(W: number[][], i: number): number[] {
  const out: number[] = [];
  for (let j = 0; j < W[i].length; j++) if (W[i][j] > 0) out.push(j);
  return out;
}

// --- Moran's I ---
export function moranI(values: number[], W: number[][]): number {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const dev = values.map(v => v - mean);
  let num = 0, S0 = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      num += W[i][j] * dev[i] * dev[j];
      S0 += W[i][j];
    }
  }
  const denom = dev.reduce((a, b) => a + b * b, 0);
  if (denom === 0 || S0 === 0) return 0;
  return (n / S0) * (num / denom);
}

/** Permutation test, returns { I, pseudoP, expectedI, distribution } */
export function moranPermutation(values: number[], W: number[][], reps = 199, seed = 12345) {
  const observed = moranI(values, W);
  const rng = mulberry32(seed);
  const dist: number[] = [];
  for (let r = 0; r < reps; r++) {
    const arr = [...values];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    dist.push(moranI(arr, W));
  }
  const ge = dist.filter(v => v >= observed).length;
  const le = dist.filter(v => v <= observed).length;
  const pseudoP = (Math.min(ge, le) + 1) / (reps + 1);
  const expectedI = -1 / (values.length - 1);
  return { I: observed, pseudoP, expectedI, distribution: dist };
}

// --- LISA (Local Moran) — simplified, returns z, lagZ, quadrant, pseudoP ---
export type Quadrant = "HH" | "LL" | "HL" | "LH" | "NS";

export interface LisaResult {
  i: number;
  z: number;
  lagZ: number;
  Ii: number;
  quadrant: Quadrant;
  pseudoP: number;
}

export function lisa(values: number[], Wraw: number[][], reps = 99, seed = 999): LisaResult[] {
  const W = rowStandardize(Wraw);
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance) || 1;
  const z = values.map(v => (v - mean) / sd);
  const lagZ = z.map((_, i) => W[i].reduce((acc, w, j) => acc + w * z[j], 0));
  const Ii = z.map((zi, i) => zi * lagZ[i]);

  // permutation per location (conditional)
  const rng = mulberry32(seed);
  const results: LisaResult[] = [];
  for (let i = 0; i < n; i++) {
    const others = z.filter((_, k) => k !== i);
    let ge = 0;
    for (let r = 0; r < reps; r++) {
      // shuffle others
      const shuf = [...others];
      for (let k = shuf.length - 1; k > 0; k--) {
        const j = Math.floor(rng() * (k + 1));
        [shuf[k], shuf[j]] = [shuf[j], shuf[k]];
      }
      // build permuted z with z[i] fixed
      let lag = 0;
      let idx = 0;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        lag += W[i][j] * shuf[idx++];
      }
      const Iperm = z[i] * lag;
      if (Math.abs(Iperm) >= Math.abs(Ii[i])) ge++;
    }
    const pseudoP = (ge + 1) / (reps + 1);
    let quadrant: Quadrant = "NS";
    if (pseudoP <= 0.05) {
      if (z[i] > 0 && lagZ[i] > 0) quadrant = "HH";
      else if (z[i] < 0 && lagZ[i] < 0) quadrant = "LL";
      else if (z[i] > 0 && lagZ[i] < 0) quadrant = "HL";
      else if (z[i] < 0 && lagZ[i] > 0) quadrant = "LH";
    }
    results.push({ i, z: z[i], lagZ: lagZ[i], Ii: Ii[i], quadrant, pseudoP });
  }
  return results;
}

// --- Color helpers (return HSL triplet for use with hsl()) ---
export function rampColor(v: number): string {
  // v 0..100
  const stops = [
    "210 60% 96%",
    "210 70% 82%",
    "212 78% 62%",
    "212 85% 45%",
    "218 88% 28%",
  ];
  const idx = Math.min(stops.length - 1, Math.floor((v / 100) * stops.length));
  return `hsl(${stops[idx]})`;
}

export function quadrantColor(q: Quadrant): string {
  switch (q) {
    case "HH": return "hsl(var(--hh))";
    case "LL": return "hsl(var(--ll))";
    case "HL": return "hsl(var(--hl))";
    case "LH": return "hsl(var(--lh))";
    default: return "hsl(var(--neutral))";
  }
}
