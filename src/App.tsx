import { useEffect, useState } from "react";
import type { AgeId, Best, LessonProg, SaveData } from "./lib/storage";
import { clearSave, defaultSave, loadSave, persist, rankOf } from "./lib/storage";
import { AGE_GROUPS } from "./data/modules";
import { getAnyModule, lessonModId } from "./data/lessons";
import { CURRICULUM } from "./data/curriculum";
import { ALL_QUESTS, evalQuest, lessonNoFromQuest } from "./data/quests";
import type { QuestDef } from "./data/quests";
import { sfx } from "./lib/audio";
import Ambient from "./graphics/Ambient";
import Onboarding from "./ui/Onboarding";
import Dashboard from "./ui/Dashboard";
import Materi from "./ui/Materi";
import MateriHtml from "./ui/MateriHtml";
import TypingGame from "./ui/TypingGame";
import type { GameResult } from "./ui/TypingGame";
import Results from "./ui/Results";

type Screen =
  | { s: "dash" }
  | { s: "materi"; id: string }
  | { s: "materi-html"; no?: number }
  | { s: "game"; id: string; k: number }
  | { s: "result"; id: string; r: GameResult; xp: number; coins: number; rankUp: string | null };

/** gabungkan dua rekor terbaik — dipakai untuk rollup progres tahap */
const betterBest = (a?: Best, b?: Best): Best | undefined => {
  if (!a) return b;
  if (!b) return a;
  return b.stars > a.stars || (b.stars === a.stars && b.score > a.score) ? b : a;
};

export default function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [sound, setSound] = useState<boolean>(() => loadSave().profile?.sound ?? true);
  const [screen, setScreen] = useState<Screen>({ s: "dash" });
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => persist(save), [save]);
  useEffect(() => {
    sfx.enabled = sound;
  }, [sound]);

  const profile = save.profile;
  const cfg = AGE_GROUPS[profile?.age ?? "teen"];

  /* ===== aksi profil ===== */
  const createProfile = (name: string, age: AgeId) => {
    sfx.click();
    setSave((s) => ({
      ...s,
      profile: { name, age, sound, createdAt: Date.now() },
    }));
    setScreen({ s: "dash" });
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSave((s) => (s.profile ? { ...s, profile: { ...s.profile, sound: next } } : s));
  };

  const resetProfile = () => {
    clearSave();
    setSave(defaultSave());
    setScreen({ s: "dash" });
    sfx.click();
  };

  /* ===== aksi permainan ===== */
  const completeMateri = (id: string, quizXp: number) => {
    const prev = save.modules[id] ?? { materiDone: false, quizXp: 0, completions: 0 };
    const firstRead = !prev.materiDone;
    const firstQuiz = prev.quizXp === 0 && quizXp > 0;
    const gained = (firstRead ? 20 : 0) + (firstQuiz ? quizXp : 0);
    setSave((s) => {
      const p = s.modules[id] ?? { materiDone: false, quizXp: 0, completions: 0 };
      return {
        ...s,
        xp: s.xp + gained,
        modules: {
          ...s.modules,
          [id]: { ...p, materiDone: true, quizXp: Math.max(p.quizXp, quizXp) },
        },
      };
    });
    /* pertama kali selesai materi → langsung lanjut ke praktikum (alur belajar) */
    if (firstRead) enterPractice(id);
    else setScreen({ s: "dash" });
  };

  /** tandai dokumen materi P{no} sudah dibaca → XP sekali per dokumen */
  const completeMateriHtml = (no: number) => {
    setSave((s) => {
      const key = String(no);
      const p = s.lessons[key] ?? { materiDone: false, quizXp: 0, completions: 0 };
      if (p.materiDone) return s;
      return {
        ...s,
        xp: s.xp + 20,
        lessons: { ...s.lessons, [key]: { ...p, materiDone: true } },
      };
    });
  };

  const enterPractice = (id: string) => {
    setGameKey((k) => k + 1);
    setScreen({ s: "game", id, k: gameKey + 1 });
  };

  /* ===== quest mingguan ===== */
  /** semua quest yang sudah tuntas menurut save + hasil run terakhir sesi */
  const evaluateQuests = (s: SaveData, lastRun?: GameResult | null): QuestDef[] => {
    const done: QuestDef[] = [];
    for (const q of ALL_QUESTS) {
      if (s.quests.includes(q.id)) continue; // sudah diklaim
      const no = String(q.lessonNo);
      const lp: LessonProg = s.lessons[no] ?? { materiDone: false, quizXp: 0, completions: 0 };
      const state = evalQuest(q, {
        age: s.profile?.age ?? "teen",
        starWpm: AGE_GROUPS[s.profile?.age ?? "teen"].starWpm,
        best: lp.best,
        completions: lp.completions,
        materiDone: lp.materiDone,
        lastRun: lastRun ?? null,
      });
      if (state.done) done.push(q);
    }
    return done;
  };

  const finishPractice = (rawId: string, r: GameResult) => {
    /* quest drill/project dijalankan lewat modul l{no} — petakan kembali ke id quest */
    const isQuestRun = rawId.startsWith("q");
    const id = isQuestRun ? lessonModId(lessonNoFromQuest(rawId)) : rawId;
    const mod = getAnyModule(id);
    const isLesson = id.startsWith("l");
    const prevRankName = rankOf(save.xp).cur.name;
    const xpGained = r.won ? 50 + r.stars * 25 + Math.round(r.accuracy / 5) : Math.round(r.score / 25);
    const coinsGained = r.won ? 10 + r.stars * 10 + Math.round(r.accuracy / 10) : 0;

    const best: Best = { stars: r.stars, score: r.score, accuracy: r.accuracy, wpm: r.wpm };

    let lessons = save.lessons;
    let modules = save.modules;
    if (isLesson) {
      const key = id.slice(1); // "l12" → "12"
      const prevL: LessonProg = save.lessons[key] ?? { materiDone: false, quizXp: 0, completions: 0 };
      const better = !prevL.best || best.stars > prevL.best.stars || (best.stars === prevL.best.stars && best.score > prevL.best.score);
      lessons = {
        ...save.lessons,
        [key]: {
          ...prevL,
          completions: prevL.completions + (r.won ? 1 : 0),
          best: better ? best : prevL.best,
        },
      };
      /* rollup ke modul tahap (html/css/js) supaya Peta Misi tetap hidup */
      const stageId = mod.lang;
      const prevM = save.modules[stageId] ?? { materiDone: true, quizXp: 0, completions: 0 };
      modules = {
        ...save.modules,
        [stageId]: {
          ...prevM,
          completions: prevM.completions + (r.won ? 1 : 0),
          best: betterBest(prevM.best, best),
        },
      };
    } else {
      const prev = save.modules[id] ?? { materiDone: true, quizXp: 0, completions: 0 };
      const prevBest = prev.best;
      const better =
        !prevBest ||
        r.stars > prevBest.stars ||
        (r.stars === prevBest.stars && r.score > prevBest.score);
      modules = {
        ...save.modules,
        [id]: {
          ...prev,
          completions: prev.completions + (r.won ? 1 : 0),
          best: better ? best : prevBest,
        },
      };
    }

    /* ===== evaluasi quest memakai progres HASIL run ini (lastRun utk noDamage/combo) ===== */
    const midSave: SaveData = { ...save, lessons, modules };
    const newlyDone = evaluateQuests(midSave, r);
    const questXp = newlyDone.reduce((a, q) => a + q.xp, 0);
    const questCoins = newlyDone.reduce((a, q) => a + q.coins, 0);

    const totalXp = xpGained + questXp;
    const newXp = save.xp + totalXp;
    const newRankName = rankOf(newXp).cur.name;
    const rankUp = newRankName !== prevRankName ? newRankName : null;

    setSave({
      ...save,
      xp: newXp,
      coins: save.coins + coinsGained + questCoins,
      modules,
      lessons,
      quests: [...save.quests, ...newlyDone.map((q) => q.id)],
      stats: {
        games: save.stats.games + 1,
        wins: save.stats.wins + (r.won ? 1 : 0),
        bestWpm: Math.max(save.stats.bestWpm, r.won ? r.wpm : 0),
        bestCombo: Math.max(save.stats.bestCombo, r.maxCombo),
        keystrokes: save.stats.keystrokes + r.correct + r.errors,
        correct: save.stats.correct + r.correct,
      },
    });
    void isQuestRun;
    setScreen({ s: "result", id: rawId, r, xp: totalXp, coins: coinsGained + questCoins, rankUp });
  };

  /* ===== turunan progres kurikulum untuk Dashboard ===== */
  const lessonNos = CURRICULUM.filter((l) => l.practice).map((l) => l.no);
  const lessonsDone = lessonNos.filter((n) => (save.lessons[String(n)]?.completions ?? 0) > 0).length;
  /** pertemuan berikutnya yang belum dituntaskan gladi ketiknya */
  const nextLessonNo = lessonNos.find((n) => (save.lessons[String(n)]?.completions ?? 0) === 0) ?? null;

  /** status semua quest per pertemuan (dihitung ulang murni dari save) */
  const questStatus: Record<string, boolean> = {};
  for (const q of ALL_QUESTS) {
    const lp = save.lessons[String(q.lessonNo)] ?? { materiDone: false, quizXp: 0, completions: 0 };
    questStatus[q.id] =
      save.quests.includes(q.id) ||
      evalQuest(q, {
        age: cfg.id,
        starWpm: cfg.starWpm,
        best: lp.best,
        completions: lp.completions,
        materiDone: lp.materiDone,
        lastRun: null, // goal live-only (combo/noDamage) tetap tercatat via save.quests
      }).done;
  }

  /* ===== render ===== */
  return (
    <div className={`age-${cfg.id}`} style={{ "--accent": cfg.accent, "--accent-deep": shade(cfg.accent) } as React.CSSProperties}>
      <Ambient fish={!profile || screen.s === "dash"} />

      {!profile ? (
        <Onboarding soundOn={sound} onToggleSound={toggleSound} onCreate={createProfile} />
      ) : screen.s === "dash" ? (
        <Dashboard
          save={save}
          cfg={cfg}
          lessonsDone={lessonsDone}
          lessonTotal={lessonNos.length}
          nextLessonNo={nextLessonNo}
          onMateri={(id) =>
            /* modul HTML memakai dokumen .md per pertemuan sebagai materi utama */
            id === "html" ? setScreen({ s: "materi-html" }) : setScreen({ s: "materi", id })
          }
          onPractice={enterPractice}
          onMateriHtml={(no) => setScreen({ s: "materi-html", no })}
          onLessonPractice={(no) => enterPractice(lessonModId(no))}
          questStatus={questStatus}
          onQuest={(qid) => enterPractice(qid)}
          onToggleSound={toggleSound}
          onResetProfile={resetProfile}
        />
      ) : screen.s === "materi-html" ? (
        <MateriHtml
          initialNo={screen.no}
          save={save}
          onPractice={enterPractice}
          onRead={(no) => completeMateriHtml(no)}
          onExit={() => setScreen({ s: "dash" })}
        />
      ) : screen.s === "materi" ? (
        <Materi
          key={screen.id}
          mod={getAnyModule(screen.id)}
          cfg={cfg}
          alreadyDone={!!save.modules[screen.id]?.materiDone}
          onComplete={(quizXp) => completeMateri(screen.id, quizXp)}
          onPractice={() => enterPractice(screen.id)}
          onExit={() => setScreen({ s: "dash" })}
        />
      ) : screen.s === "game" ? (
        <TypingGame
          key={`${screen.id}-${screen.k}`}
          mod={getAnyModule(screen.id)}
          cfg={cfg}
          zen={screen.id.endsWith("-project")}
          onDone={(r) => finishPractice(screen.id, r)}
          onExit={() => setScreen({ s: "dash" })}
        />
      ) : (
        <Results
          mod={getAnyModule(screen.id)}
          cfg={cfg}
          result={screen.r}
          xpGained={screen.xp}
          coinsGained={screen.coins}
          rankUp={screen.rankUp}
          onRetry={() => enterPractice(screen.id)}
          onMap={() => setScreen({ s: "dash" })}
        />
      )}
    </div>
  );
}

/* versi lebih gelap dari warna aksen — untuk bayangan tombol */
function shade(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const f = (v: number) => Math.max(0, Math.round(v * 0.62));
  const r = f((n >> 16) & 255);
  const gr = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (gr << 8) | b).toString(16).padStart(6, "0")}`;
}
