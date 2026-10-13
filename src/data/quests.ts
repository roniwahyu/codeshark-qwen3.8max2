/* ============ QUEST MINGGUAN PER PERTEMUAN (P1–P17) ============
   Setiap pertemuan punya 3 quest dengan bobot berbeda:
   - drill    : ketik ulang kode latihan minggu itu — target akurasi/WPM
   - juggling : sprint simbol/tipologi spesifik di luar arena misi utama
   - project  : tantangan mekanik (bebas salah / tanpa nyawa / combo tahan lama)
   Quest dinilai dari metrik GameResult + progres baca materi. Rekap mingguan
   memberi bonus XP & koin dan menjadi syarat lencana "Sempurna" di Dashboard. */

import type { GameResult } from "../ui/TypingGame";
import type { AgeId } from "../lib/storage";
import { CURRICULUM } from "./curriculum";

export type QuestKind = "drill" | "juggling" | "project";

export interface QuestGoal {
  /** jumlah gladi ketik (completion) minimal pada modul ini */
  completions?: number;
  minStars?: number;
  minAccuracy?: number;
  /** ambang WPM absolut … */
  minWpm?: number;
  /** … ATAU dikalikan starWpm kelompok usia (adaptif junior→academy) */
  wpmFactor?: number;
  minCombo?: number;
  /** tidak boleh kehilangan nyawa sama sekali pada satu run */
  noDamage?: boolean;
  /** dokumen materi pertemuan harus sudah dibaca */
  needMateri?: boolean;
}

export interface QuestDef {
  id: string; // "q{no}-{k}"
  lessonNo: number;
  kind: QuestKind;
  title: string;
  desc: string;
  goal: QuestGoal;
  xp: number;
  coins: number;
  /** untuk quest juggling: teks target ketik khusus */
  text?: string;
}

export const questIdOf = (lessonNo: number, kind: QuestKind) => `q${lessonNo}-${kind}`;
export const isJugglingId = (id: string) => id.startsWith("q") && id.endsWith("-juggling");
export const lessonNoFromQuest = (id: string): number => {
  const m = /^q(\d+)-/.exec(id);
  return m ? Number(m[1]) : 0;
};

/* ---------- bank teks juggling (sprint simbol per tahap) ---------- */
const JUGGLE_HTML = `<div class="kartu" id="a1"><img src="hiu.svg" alt="hiu" /></div>
<section><h2>Kedalaman</h2><p>-40m &amp; 12 bar;</p></section>
<link rel="stylesheet" href="css/app.css" />
<a href="#kontak" target="_blank" rel="noopener">Lompat</a>
<ul><li>Fin</li><li>Masker</li><li>Tank O₂</li></ul>
<input id="cari" type="search" placeholder="Cari…" required autofocus />`;

const JUGGLE_CSS = `:root{--aksen:#2ee6c8;--gelap:#0b2036}
.kartu:hover{transform:translateY(-3px) scale(1.02)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem}
h1{font:700 clamp(1.5rem,4vw,2.5rem)/1.2 "Baloo",sans-serif}
@media(max-width:640px){nav{flex-direction:column;gap:.5rem}}
button:focus-visible{outline:2px dashed var(--aksen);offset:3px}`;

const JUGGLE_JS = `const hiu = ["mako", "tiger", "paus"];
hiu.forEach((h, i) => console.log(\`\${i + 1}. \${h}\`));
if (kedalaman > 40 && !tabungO2) { naik(); } else { selam(); }
document.querySelector("#tombol").addEventListener("click", (e) => e.target.disabled = true);
const total = [3, 7, 12].reduce((a, b) => a + b, 0); // 22
for (let i = 0; i < hiu.length; i++) hiu[i] = hiu[i].toUpperCase();`;

const JUGGLE_SYMBOL = `<[]>(){}"'"/\\=<>!@#$%^&*_-+:;,.?|~\``.repeat(1).concat(`
<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/></head>
<p>Harga: Rp15.000 &times; 3 = <strong>Rp45.000</strong>.</p>
<div id="app" class="wrap">{items.map(i =&gt; &lt;Li key={i}/&gt;)}</div>`);

/* helper goal ringkas */
const g = (o: QuestGoal) => o;

function buildQuests(): QuestDef[] {
  const out: QuestDef[] = [];
  const add = (
    no: number, kind: QuestKind, title: string, desc: string,
    goal: QuestGoal, xp: number, coins: number, text?: string,
  ) => out.push({ id: questIdOf(no, kind), lessonNo: no, kind, title, desc, goal, xp, coins, text });

  for (const l of CURRICULUM) {
    const no = l.no;
    /* --- DRILL: gladi ketik resmi pertemuan (modul l{no}) --- */
    if (l.practice) {
      const hard = no >= 6 && l.phase !== "HTML"; // beban meningkat menjelang akhir semester
      add(
        no, "drill", `Drill P${no}: ${l.title}`,
        `Tuntaskan gladi ketik pertemuan ${no} dengan akurasi ≥ ${hard ? 92 : 90}% dan WPM ≥ ambang kelasmu.`,
        g({ completions: 1, minAccuracy: hard ? 92 : 90, wpmFactor: hard ? 0.8 : 0.6 }),
        40, 15,
      );
    }
    /* --- JUGGLING: sprint simbol sesuai fase --- */
    const jugText =
      l.phase === "CSS" ? JUGGLE_CSS : l.phase === "JS" ? JUGGLE_JS
      : l.phase === "HTML" ? JUGGLE_HTML : JUGGLE_SYMBOL;
    add(
      no, "juggling", `Juggling P${no}: Sprint Simbol ${l.phase}`,
      "Mode jungling: potongan kode padat simbol. Selesaikan dalam SATU nyawa utuh — kecepatan bebas, yang penting tak tersentuh hiu.",
      g({ completions: 1, noDamage: true }),
      30, 10, jugText,
    );
    /* --- PROJECT: tantangan mekanik lintas mode gladi pertemuan --- */
    if (l.phase === "UTS" || l.phase === "UAS") {
      add(
        no, "project", `Ujian Praktik: Gladi P${no}`,
        "Untuk fase ujian, project-mu adalah gladi ketik itu sendiri: raih 2★ sekaligus baca materi ujian.",
        g({ completions: 1, minStars: 2, needMateri: true }),
        80, 40,
      );
    } else if (no >= 6) {
      add(
        no, "project", `Proyek Kilat P${no}: Combo Samudra`,
        "Buktikan ritme: raih combo ≥ 40 karakter tanpa putus pada gladi ketik pertemuan ini.",
        g({ minCombo: 40 }),
        60, 25,
      );
    } else {
      add(
        no, "project", `Proyek Kilat P${no}: Presisi Pemula`,
        "Ketik dua kali tanpa satu pun kesalahan fatal: selesaikan gladi dengan minimal 2★.",
        g({ completions: 1, minStars: 2 }),
        50, 20,
      );
    }
  }

  /* quest bonus lintas kurikulum untuk pengayaan */
  add(0, "juggling", "Juggling Istimewa: Taman Simbol",
    "Sprint khusus tombol sulit: kurung, kutip, slash, dan operator. Warm-up wajib sebelum lomba ketik.",
    g({ completions: 1 }), 25, 10, JUGGLE_SYMBOL);

  return out;
}

export const ALL_QUESTS: QuestDef[] = buildQuests();

export function questsForLesson(no: number): QuestDef[] {
  return ALL_QUESTS.filter((q) => q.lessonNo === no);
}

/** quest yang mod-nya adalah gladi pertemuan (drill/project) → id modul l{no} */
export const drillModId = (q: QuestDef): string => `l${q.lessonNo}`;

/* ============ PENILAIAN ============ */

export interface QuestState {
  done: boolean;
  progress: string; // teks ringkas untuk UI
}

interface EvalCtx {
  age: AgeId;
  starWpm: number; // cfg.age.starWpm — ambang kecepatan kelas
  best?: { stars: number; accuracy: number; wpm: number };
  completions: number;
  materiDone: boolean;
  lastRun?: GameResult | null; // hasil run terakhir sesi (untuk noDamage/combo live)
}

export function evalQuest(q: QuestDef, ctx: EvalCtx): QuestState {
  const goal = q.goal;
  const parts: string[] = [];
  let ok = true;

  const needCompletions = goal.completions ?? (goal.minCombo || goal.noDamage ? 1 : 0);
  if (needCompletions > 0) {
    const c = ctx.completions >= needCompletions;
    if (!c) ok = false;
    parts.push(`${Math.min(ctx.completions, needCompletions)}/${needCompletions} gladi selesai`);
  }
  if (goal.minAccuracy != null) {
    const a = ctx.best?.accuracy ?? 0;
    if (a < goal.minAccuracy) ok = false;
    parts.push(`akurasi terbaik ${a}/${goal.minAccuracy}%`);
  }
  const wpmNeed = goal.wpmFactor != null
    ? Math.round(ctx.starWpm * goal.wpmFactor)
    : goal.minWpm;
  if (wpmNeed != null) {
    const w = ctx.best?.wpm ?? 0;
    if (w < wpmNeed) ok = false;
    parts.push(`WPM terbaik ${w}/${wpmNeed}`);
  }
  if (goal.minStars != null) {
    const s = ctx.best?.stars ?? 0;
    if (s < goal.minStars) ok = false;
    parts.push(`${s}/${goal.minStars}★`);
  }
  if (goal.minCombo != null) {
    const c = Math.max(ctx.lastRun?.maxCombo ?? 0, 0);
    if (c < goal.minCombo) ok = false;
    parts.push(`combo ${c}/${goal.minCombo}`);
  }
  if (goal.noDamage) {
    const clean = !!ctx.lastRun && ctx.lastRun.errors === 0 && ctx.lastRun.won;
    if (!clean) ok = false;
    parts.push("run bersih tanpa salah");
  }
  if (goal.needMateri) {
    if (!ctx.materiDone) ok = false;
    parts.push(ctx.materiDone ? "materi ✓" : "baca materi dulu");
  }
  return { done: ok, progress: parts.join(" • ") };
}

/** rekap mingguan: apakah semua quest pertemuan ini tuntas */
export function weeklyStatus(no: number, claimed: boolean): { total: number; done: number; all: boolean } {
  void claimed;
  const qs = questsForLesson(no);
  return { total: qs.length, done: 0, all: qs.length > 0 };
}
