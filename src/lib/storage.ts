/* Lapisan penyimpanan lokal (localStorage, namespace codeshark:v1).
   Untuk v0.1 MVP ini pilihan paling tepat — SQLite browser (sql.js/WASM)
   bisa dipertimbangkan di versi berikutnya bila data makin kompleks. */

export type AgeId = "junior" | "teen" | "senior" | "academy";

export interface Profile {
  name: string;
  age: AgeId;
  sound: boolean;
  createdAt: number;
}

export interface Best {
  stars: number;
  score: number;
  accuracy: number;
  wpm: number;
}

export interface ModProg {
  materiDone: boolean;
  quizXp: number;
  best?: Best;
  completions: number;
}

/** progres belajar per pertemuan kurikulum (P1–P16 + UAS) */
export interface LessonProg {
  materiDone: boolean;
  quizXp: number;
  /** skor terbaik pada gladi ketik pertemuan ini */
  best?: Best;
  completions: number;
}

export interface Stats {
  games: number;
  wins: number;
  bestWpm: number;
  bestCombo: number;
  keystrokes: number;
  correct: number;
}

export interface SaveData {
  profile: Profile | null;
  xp: number;
  coins: number;
  modules: Record<string, ModProg>;
  /** kunci = nomor pertemuan (string agar aman di JSON) */
  lessons: Record<string, LessonProg>;
  /** quest mingguan yang sudah tuntas (id "q{no}-{kind}") */
  quests: string[];
  stats: Stats;
}

const KEY = "codeshark:save:v1";

export const defaultSave = (): SaveData => ({
  profile: null,
  xp: 0,
  coins: 0,
  modules: {},
  lessons: {},
  quests: [],
  stats: { games: 0, wins: 0, bestWpm: 0, bestCombo: 0, keystrokes: 0, correct: 0 },
});

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const d = JSON.parse(raw) as Partial<SaveData>;
    const base = defaultSave();
    return {
      ...base,
      ...d,
      stats: { ...base.stats, ...(d.stats || {}) },
      modules: { ...(d.modules || {}) },
      lessons: { ...(d.lessons || {}) },
      quests: Array.isArray(d.quests) ? d.quests : [],
    };
  } catch {
    return defaultSave();
  }
}

export function persist(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage penuh / private mode — abaikan */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* abaikan */
  }
}

/* ============ RANK SYSTEM ============ */
export interface Rank {
  xp: number;
  name: string;
}

export const RANKS: Rank[] = [
  { xp: 0, name: "Plankton" },
  { xp: 120, name: "Ikan Kecil" },
  { xp: 280, name: "Kuda Laut" },
  { xp: 500, name: "Lumba-Lumba" },
  { xp: 800, name: "Hiu Muda" },
  { xp: 1200, name: "Megalodon" },
  { xp: 1700, name: "Legenda Samudra" },
];

export function rankOf(xp: number): { cur: Rank; next: Rank | null; pct: number } {
  let cur = RANKS[0];
  let next: Rank | null = null;
  for (const r of RANKS) {
    if (xp >= r.xp) cur = r;
    else {
      next = r;
      break;
    }
  }
  const pct = next
    ? Math.min(100, Math.round(((xp - cur.xp) / (next.xp - cur.xp)) * 100))
    : 100;
  return { cur, next, pct };
}
