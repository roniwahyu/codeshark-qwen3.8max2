/* ============ GLADI KETIK PER PERTEMUAN (P1–P16) ============
   Jembatan antara kurikulum 16 pertemuan (curriculum.ts) dan mesin
   TypingGame. Selama ini tombol "latihan" di layar materi HTML selalu
   mengarah ke modul generik (html/css/js) sehingga progres per pertemuan
   tidak pernah tercatat. Modul h{no} / c{no} / j{no} di bawah memakai kode
   latihan milik lesson — jadi skor, bintang, dan XP tersimpan PER PERTEMUAN
   di save.lessons (lihat recordLesson di App.tsx). */

import type { ModuleDef } from "./modules";
import { MODULES, getModule } from "./modules";
import { CURRICULUM } from "./curriculum";
import type { Lesson } from "./curriculum";
import type { Lang } from "../lib/highlight";

/** kunci penyimpanan progres untuk satu pertemuan */
export const lessonModId = (no: number): string => `l${no}`;

const langOfPhase = (phase: Lesson["phase"]): Lang =>
  phase === "CSS" ? "css" : phase === "JS" ? "js" : "html";

/** preview hidup dari potongan kode latihan pertemuan → dibungkus halaman utuh */
const wrapPreview = (lang: Lang, code: string): string => {
  if (lang === "css")
    return `<!DOCTYPE html>\n<html>\n<head>\n<style>\n${code}\n</style>\n</head>\n<body>\n<h1>Halaman Contoh</h1>\n<p>Gaya di atas adalah hasil ketikanmu di sesi ini!</p>\n<button>Tombol Contoh</button>\n<ul><li>Item daftar</li><li>Item lain</li></ul>\n<div class="kartu"><h2>Kartu</h2><p>Isi kartu contoh.</p></div>\n</body>\n</html>`;
  if (lang === "js")
    return `<!DOCTYPE html>\n<html>\n<head>\n<style>body{font-family:sans-serif;background:#0b2036;color:#eaf6ff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;gap:14px}button{background:#2ee6c8;color:#04222b;border:none;border-radius:12px;padding:12px 26px;font-size:17px;font-weight:bold;cursor:pointer}#pesan{font-size:18px;color:#9ad7f5;min-height:24px}h2{margin:0}</style>\n</head>\n<body>\n<h2>Hasil Latihan JS</h2>\n<p id="pesan">Output muncul di Konsol (F12) atau teks ini berubah oleh kodemu.</p>\n<button>Klik Aku!</button>\n<script>\n${code}\n<\/script>\n</body>\n</html>`;
  /* html: bila latihan hanya fragmen (tanpa <html>), bungkus dalam kerangka */
  const full = /<html[\s>]/i.test(code);
  return full
    ? code
    : `<!DOCTYPE html>\n<html lang="id">\n<head>\n<meta charset="UTF-8" />\n<title>Hasil Latihanku</title>\n</head>\n<body>\n${code}\n</body>\n</html>`;
};

/** bangun ModuleDef dari sebuah lesson kurikulum yang punya latihan ketik */
export function moduleFromLesson(l: Lesson): ModuleDef | null {
  if (!l.practice) return null;
  const lang = langOfPhase(l.phase);
  const fallback = getModule(lang);
  return {
    id: lessonModId(l.no),
    num: l.no,
    title: `Pertemuan ${l.no}: ${l.title}`,
    subtitle: l.goal,
    icon: l.phase === "CSS" ? "brush" : l.phase === "JS" ? "bolt" : "tag",
    color: fallback.color,
    lang,
    slides: l.slides,
    practiceTitle: `Gladi Ketik P${l.no}`,
    practiceIntro: l.practice.intro,
    code: l.practice.code,
    preview: (typed) => wrapPreview(lang, typed),
  };
}

/** daftar semua modul latihan pertemuan (hanya lesson dengan practice) */
export const LESSON_MODULES: ModuleDef[] = CURRICULUM.map(moduleFromLesson).filter(
  (m): m is ModuleDef => m !== null,
);

/* ---- modul quest: juggling (teks sprint) & drill/project (reuse gladi l{no}) ---- */
import { ALL_QUESTS, isJugglingId, lessonNoFromQuest } from "./quests";
import type { QuestDef } from "./quests";

const questMod = (q: QuestDef): ModuleDef => {
  const l = CURRICULUM.find((x) => x.no === q.lessonNo);
  const lang: Lang = l ? langOfPhase(l.phase) : "html";
  const fallback = getModule(lang);
  return {
    id: q.id,
    num: q.lessonNo,
    title: q.title,
    subtitle: q.desc,
    icon: lang === "css" ? "brush" : lang === "js" ? "bolt" : "tag",
    color: "#2ee6c8",
    lang,
    slides: [],
    practiceTitle: q.title,
    practiceIntro: q.desc,
    code: q.text ?? l?.practice?.code ?? fallback.code,
    preview: (typed) => wrapPreview(lang, typed),
  };
};

/** lookup seragam: modul generik (html/css/js), modul pertemuan (l1..l17), ATAU quest (q{n}-*) */
export function getAnyModule(id: string): ModuleDef {
  if (isJugglingId(id)) {
    const q = ALL_QUESTS.find((x) => x.id === id);
    if (q) return questMod(q);
  }
  if (id.startsWith("q")) {
    /* quest drill/project → pakai gladi ketik pertemuan terkait */
    const no = lessonNoFromQuest(id);
    const lm = LESSON_MODULES.find((m) => m.id === `l${no}`);
    if (lm) return { ...lm, id, practiceTitle: ALL_QUESTS.find((q) => q.id === id)?.title ?? lm.practiceTitle };
  }
  const lm = LESSON_MODULES.find((m) => m.id === id);
  if (lm) return lm;
  return getModule(id);
}

/** modul untuk sebuah nomor pertemuan, atau modul generik tahapnya sebagai cadangan */
export function practiceModuleFor(no: number): ModuleDef {
  const id = lessonModId(no);
  const lm = LESSON_MODULES.find((m) => m.id === id);
  if (lm) return lm;
  const l = CURRICULUM.find((x) => x.no === no);
  return getModule(l ? langOfPhase(l.phase) : "html");
}

export { MODULES };
