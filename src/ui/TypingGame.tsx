import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { AgeCfg, ModuleDef } from "../data/modules";
import { tokenize } from "../lib/highlight";
import { sfx } from "../lib/audio";
import { scene } from "../graphics/scene";
import {
  IconX, IconHeart, IconBolt, IconTimer, IconPause, IconPlay, IconRetry, IconMap, IconFin, IconTarget,
} from "./icons";
import { SharkMascot, Diver } from "../characters";

export interface GameResult {
  won: boolean;
  score: number;
  accuracy: number;
  wpm: number;
  maxCombo: number;
  stars: number;
  timeSec: number;
  correct: number;
  errors: number;
  /** karakter target yang paling sering salah diketik (karakter → jumlah) */
  missed: Record<string, number>;
  /** waktu reaksi rata-rata per karakter (ms) — metrik ritme ketikan */
  avgKeyMs: number;
}

interface Props {
  mod: ModuleDef;
  cfg: AgeCfg;
  /** mode quest: tanpa ancaman hiu & nyawa tak terbatas (project bebas-salah) */
  zen?: boolean;
  onDone: (r: GameResult) => void;
  onExit: () => void;
}

type Status = "count" | "play" | "pause" | "won" | "dead";

interface G {
  lineIdx: number;
  charIdx: number;
  combo: number;
  maxCombo: number;
  correct: number;
  errors: number;
  score: number;
  threat: number;
  lives: number;
  status: Status;
  startAt: number;
  pauseAccum: number;
  pauseAt: number;
  missed: Record<string, number>;
  /** ritme: waktu reaksi per karakter (ms), dibatasi agar outlier tidak mendistorsi */
  keyTimes: number[];
  lastKeyAt: number;
}

const fresh = (): G => ({
  lineIdx: 0, charIdx: 0, combo: 0, maxCombo: 0, correct: 0, errors: 0,
  score: 0, threat: 0, lives: 3, status: "count", startAt: 0, pauseAccum: 0, pauseAt: 0,
  missed: {}, keyTimes: [], lastKeyAt: 0,
});

/* ambang WPM untuk bonus kecepatan (skor tidak lagi buta terhadap kecepatan) */
const SPEED_BONUS_WPM = 40;
/* ambang OVERDRIVE: combo ≥ 25 → skor per karakter ×2 selama combo bertahan */
const OVERDRIVE_COMBO = 25;

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function TypingGame({ mod, cfg, zen = false, onDone, onExit }: Props) {
  const lines = useMemo(() => tokenize(mod.code, mod.lang), [mod]);
  const gref = useRef<G>(fresh());
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [count, setCount] = useState(3);
  const [showGo, setShowGo] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; txt: string }[]>([]);
  const [toast, setToast] = useState<{ id: number; txt: string } | null>(null);
  const [comboPop, setComboPop] = useState(0);
  const [flash, setFlash] = useState(0);
  const [shake, setShake] = useState(0);
  const [ghost, setGhost] = useState<{ id: number; ch: string } | null>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; });

  /* latar laut: aktif selama game berjalan, reset saat keluar */
  useEffect(() => {
    scene.active = true;
    return () => { scene.active = false; scene.threat = 0; scene.progress = 0; };
  }, []);

  const elapsedSec = () => {
    const gg = gref.current;
    if (!gg.startAt) return 0;
    const now = gg.status === "pause" ? gg.pauseAt : performance.now();
    return Math.max(0, now - gg.startAt - gg.pauseAccum) / 1000;
  };

  const computeResult = (won: boolean): GameResult => {
    const gg = gref.current;
    const total = gg.correct + gg.errors;
    const acc = total > 0 ? Math.round((gg.correct / total) * 100) : 100;
    const t = Math.max(5, elapsedSec());
    const wpm = Math.round(gg.correct / 5 / (t / 60));
    /* bintang berbasis akurasi DAN kecepatan — memaksa siswa menjaga ritme,
       bukan sekadar lambat-tapi-bersih atau cepat-berantakan */
    const speedOk = wpm >= cfg.starWpm;
    const stars = won ? (acc >= 95 && speedOk ? 3 : acc >= 85 ? 2 : 1) : 0;
    const avgKeyMs = gg.keyTimes.length
      ? Math.round(gg.keyTimes.reduce((a, b) => a + b, 0) / gg.keyTimes.length)
      : 0;
    return { won, score: gg.score, accuracy: acc, wpm, maxCombo: gg.maxCombo, stars, timeSec: Math.round(t), correct: gg.correct, errors: gg.errors, missed: { ...gg.missed }, avgKeyMs };
  };

  const hurt = () => {
    const gg = gref.current;
    if (gg.status !== "play") return;
    if (zen) {
      /* mode quest project: salah hanya mematahkan combo & menggetarkan layar */
      gg.combo = 0;
      setFlash((f) => f + 1);
      sfx.hurt();
      force();
      return;
    }
    gg.lives -= 1;
    gg.threat = 0;
    gg.combo = 0;
    setFlash((f) => f + 1);
    sfx.hurt();
    if (gg.lives <= 0) {
      gg.status = "dead";
      sfx.lose();
    }
    force();
  };

  /** tombol menyerah — dipakai quest juggling agar siswa bisa mengulang cepat */
  const giveUp = () => {
    const gg = gref.current;
    if (gg.status !== "play" && gg.status !== "pause") return;
    finish(false);
  };

  const finish = (won: boolean) => {
    const gg = gref.current;
    gg.status = won ? "won" : "dead";
    if (won) sfx.win(); else sfx.lose();
    force();
    const r = computeResult(won);
    window.setTimeout(() => onDoneRef.current(r), 1500);
  };

  const win = () => finish(true);

  const spawnParticle = (ci: number, txt: string) => {
    const box = arenaRef.current;
    const el = box?.querySelector(`[data-ci="${ci}"]`);
    if (!box || !el) return;
    const r = (el as HTMLElement).getBoundingClientRect();
    const b = box.getBoundingClientRect();
    const id = ++idRef.current;
    setParticles((p) => [...p.slice(-22), { id, x: r.left - b.left + r.width / 2, y: r.top - b.top - 4, txt }]);
    window.setTimeout(() => setParticles((p) => p.filter((q) => q.id !== id)), 760);
  };

  /* ===== countdown ===== */
  useEffect(() => {
    if (gref.current.status !== "count") return;
    if (count === 0) {
      gref.current.status = "play";
      gref.current.startAt = performance.now();
      sfx.go();
      setShowGo(true);
      const t = window.setTimeout(() => setShowGo(false), 850);
      force();
      return () => window.clearTimeout(t);
    }
    sfx.count();
    const t = window.setTimeout(() => setCount((c) => c - 1), 800);
    return () => window.clearTimeout(t);
  }, [count]);

  /* ===== loop ancaman hiu (zen/project quest: tanpa ancaman) ===== */
  useEffect(() => {
    if (zen) return;
    const iv = window.setInterval(() => {
      const gg = gref.current;
      if (gg.status !== "play") return;
      gg.threat = Math.min(100, gg.threat + cfg.threatRate);
      if (gg.threat >= 100) hurt();
      force();
    }, 100);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zen]);

  /* ===== keyboard ===== */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const gg = gref.current;
      if (e.key === "Escape") {
        if (gg.status === "play") {
          gg.status = "pause";
          gg.pauseAt = performance.now();
          sfx.click();
        } else if (gg.status === "pause") {
          gg.pauseAccum += performance.now() - gg.pauseAt;
          gg.status = "play";
          sfx.click();
        }
        force();
        return;
      }
      if (gg.status !== "play") return;
      if (e.key === "Backspace") {
        e.preventDefault();
        if (gg.charIdx > 0) {
          gg.charIdx -= 1;
          gg.lastKeyAt = 0; /* jeda koreksi tidak dihitung sebagai ritme */
          sfx.back();
          force();
        }
        return;
      }
      if (e.key.length !== 1) return;
      e.preventDefault();

      const line = lines[gg.lineIdx];
      if (!line) return;
      const tok = line[gg.charIdx];

      if (e.key === tok.ch) {
        /* ritme: catat waktu reaksi antar-key (clamp 30–2500ms agar jeda berpikir tak merusak rata-rata) */
        const now = performance.now();
        if (gg.lastKeyAt) {
          const dt = Math.min(2500, Math.max(30, now - gg.lastKeyAt));
          gg.keyTimes.push(dt);
        }
        gg.lastKeyAt = now;

        gg.correct += 1;
        gg.combo += 1;
        gg.maxCombo = Math.max(gg.maxCombo, gg.combo);
        const mult = 1 + Math.min(gg.combo, 100) * 0.02;
        const overdrive = gg.combo >= OVERDRIVE_COMBO ? 2 : 1;
        const el = elapsedSec();
        const liveWpm = el > 5 ? gg.correct / 5 / (el / 60) : 0;
        const gain = Math.round(10 * mult * overdrive) + (liveWpm >= SPEED_BONUS_WPM ? 3 : 0);
        gg.score += gain;
        sfx.key(gg.combo);
        spawnParticle(gg.charIdx, `+${gain}`);
        if (gg.combo === OVERDRIVE_COMBO) {
          setComboPop((p) => p + 1);
          sfx.star();
          const oid = ++idRef.current;
          setToast({ id: oid, txt: "⚡ OVERDRIVE! Skor ×2" });
          window.setTimeout(() => setToast((t) => (t && t.id === oid ? null : t), ), 900);
        } else if (gg.combo % 10 === 0) {
          setComboPop((p) => p + 1);
          sfx.star();
        }
        gg.charIdx += 1;
        if (gg.charIdx >= line.length) {
          gg.score += 40;
          gg.threat = Math.max(0, gg.threat - cfg.relief);
          sfx.line();
          const id = ++idRef.current;
          setToast({ id, txt: cfg.cheers[gg.lineIdx % cfg.cheers.length] });
          window.setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 950);
          gg.lineIdx += 1;
          gg.charIdx = 0;
          if (gg.lineIdx >= lines.length) {
            win();
            return;
          }
        }
      } else {
        gg.errors += 1;
        gg.combo = 0;
        if (!zen) gg.threat = Math.min(100, gg.threat + cfg.missPenalty);
        gg.missed[tok.ch] = (gg.missed[tok.ch] ?? 0) + 1;
        sfx.err();
        setShake((s) => s + 1);
        /* ghost: tampilkan sesaat tombol yang salah ditekan di posisi kursor */
        const gid = ++idRef.current;
        setGhost({ id: gid, ch: e.key });
        window.setTimeout(() => setGhost((x) => (x && x.id === gid ? null : x)), 320);
        if (!zen && gg.threat >= 100) {
          hurt();
          return;
        }
      }
      force();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  /* ===== auto-pause saat tab/jendela kehilangan fokus ===== */
  useEffect(() => {
    const autoPause = () => {
      const gg = gref.current;
      if (gg.status !== "play") return;
      gg.status = "pause";
      gg.pauseAt = performance.now();
      force();
    };
    const onVis = () => { if (document.hidden) autoPause(); };
    window.addEventListener("blur", autoPause);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", autoPause);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const retry = () => {
    gref.current = fresh();
    setCount(3);
    setParticles([]);
    setToast(null);
    sfx.click();
    force();
  };

  const togglePause = () => {
    const gg = gref.current;
    if (gg.status === "play") {
      gg.status = "pause";
      gg.pauseAt = performance.now();
    } else if (gg.status === "pause") {
      gg.pauseAccum += performance.now() - gg.pauseAt;
      gg.status = "play";
    }
    sfx.click();
    force();
  };

  /* ===== render ===== */
  const g = gref.current;
  const activeLine = lines[Math.min(g.lineIdx, lines.length - 1)];
  const upcoming = lines.slice(g.lineIdx + 1, g.lineIdx + 3);
  const progress = ((g.lineIdx + (activeLine.length ? g.charIdx / activeLine.length : 0)) / lines.length) * 100;
  const threatColor = g.threat > 78 ? "var(--coral)" : g.threat > 45 ? "var(--amber)" : "var(--teal)";
  const hintChars = activeLine.slice(g.charIdx, g.charIdx + 3);
  const totalKeys = g.correct + g.errors;
  const liveAcc = totalKeys > 0 ? Math.round((g.correct / totalKeys) * 100) : 100;
  const accColor = liveAcc >= 95 ? "var(--teal)" : liveAcc >= 85 ? "var(--amber)" : "var(--coral)";
  const danger = g.status === "play" && (g.lives === 1 || g.threat > 78);
  scene.threat = g.status === "dead" ? 100 : g.threat;
  scene.progress = progress / 100;

  return (
    <div className="relative z-10 min-h-screen flex flex-col select-none">
      {danger && <div className="danger-vignette" aria-hidden="true" />}
      {/* ===== HUD atas ===== */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[rgba(4,15,26,0.85)] border-b border-[var(--line-soft)]">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-2.5 flex-wrap">
          <button className="btn btn-ghost !px-3 !py-2" onClick={onExit} aria-label="Keluar">
            <IconX size={16} />
          </button>
          <div className="leading-tight mr-auto">
            <p className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: mod.color }}>
              {zen ? `Quest • ${mod.practiceTitle}` : `Misi 0{mod.num} • ${mod.practiceTitle}`}
            </p>
            <p className="font-display font-bold text-sm">Baris {Math.min(g.lineIdx + 1, lines.length)}/{lines.length}</p>
          </div>
          <span className="chip"><IconTimer size={14} /> {fmt(elapsedSec())}</span>
          <span
            className="chip font-display"
            style={{ color: accColor, borderColor: accColor }}
            title={`Syarat bintang 3: akurasi ≥95% dan kecepatan ≥${cfg.starWpm} WPM`}
          >
            <IconTarget size={14} /> {liveAcc}%
          </span>
          <span className="chip !text-[var(--cyan)] font-display" title="Kecepatan ketik langsung (kata per menit)">
            <IconTimer size={14} /> {(() => { const el = elapsedSec(); return el > 5 ? Math.round(g.correct / 5 / (el / 60)) : 0; })()} WPM
          </span>
          <span className="chip !text-[var(--amber)] font-display text-base !px-3.5">
            <IconBolt size={15} /> {g.score}
          </span>
          {g.combo >= 2 && (
            <span key={comboPop} className={`chip font-display anim-pop ${g.combo >= OVERDRIVE_COMBO ? "!text-[#fff] !border-[var(--accent)] overdrive-chip" : "!text-[var(--teal)] !border-[rgba(46,230,200,0.45)]"}`}>
              {g.combo >= OVERDRIVE_COMBO ? "⚡ OVERDRIVE ×2" : `COMBO ×${g.combo}`}
            </span>
          )}
          <span className="flex items-center gap-1">
            {zen ? (
              <button
                className="btn btn-ghost !px-3 !py-1.5 text-[11px] font-extrabold"
                onClick={giveUp}
                title="Akhiri run ini dan nilai ulang dari awal"
              >
                Akhiri Run
              </button>
            ) : (
              [0, 1, 2].map((i) => (
                <IconHeart key={i} size={20} className={i < g.lives ? "text-[var(--coral)]" : "text-[rgba(126,196,236,0.18)]"} />
              ))
            )}
          </span>
          <button className="btn btn-ghost !px-3 !py-2" onClick={togglePause} aria-label="Jeda">
            {g.status === "pause" ? <IconPlay size={16} /> : <IconPause size={16} />}
          </button>
        </div>
        {/* bar ancaman — pada quest project diganti label mode santai */}
        <div className="max-w-5xl mx-auto px-4 pb-2.5 flex items-center gap-3">
          <span className="text-[10px] font-extrabold tracking-[0.18em] uppercase text-[var(--dim)] whitespace-nowrap">
            {zen ? "Mode Proyek — Tanpa Ancaman" : "Ancaman Hiu"}
          </span>
          {!zen && (
            <>
              <div className="flex-1 h-2.5 rounded-full bg-[rgba(6,24,41,0.9)] border border-[var(--line-soft)] overflow-hidden">
                <div className="h-full rounded-full transition-[width] duration-150" style={{ width: `${g.threat}%`, background: `linear-gradient(90deg, var(--teal), ${threatColor})` }} />
              </div>
              <span className="font-code text-xs font-bold tabular-nums" style={{ color: threatColor }}>{Math.round(g.threat)}%</span>
            </>
          )}
        </div>
      </header>

      {/* ===== ARENA ===== */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">
        <div className="panel p-1.5 relative overflow-hidden">
          {/* baris progres */}
          <div className="h-1.5 rounded-t-[10px] overflow-hidden bg-[rgba(6,24,41,0.8)]">
            <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${mod.color}, var(--accent))` }} />
          </div>

          <div key={shake} className={`relative px-4 md:px-7 py-6 md:py-8 ${shake ? "shake" : ""}`}>
            {/* toast cheer */}
            {toast && (
              <div key={toast.id} className="absolute top-3 left-1/2 -translate-x-1/2 font-display font-extrabold text-xl anim-pop z-20" style={{ color: cfg.accent, textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
                {toast.txt}
              </div>
            )}

            {/* partikel skor */}
            <div ref={arenaRef} className="relative">
              {particles.map((p) => (
                <span key={p.id} className="float-p absolute font-code text-xs font-bold text-[var(--amber)] pointer-events-none z-10" style={{ left: p.x, top: p.y }}>
                  {p.txt}
                </span>
              ))}

              <div className={`font-code whitespace-pre overflow-x-auto code-scroll ${cfg.arenaSize} leading-[2.1]`} style={{ minHeight: "9.5rem" }}>
                {/* baris aktif */}
                <div className="min-w-max">
                  <span className="text-[var(--faint)] mr-4 select-none">{String(g.lineIdx + 1).padStart(2, "0")}</span>
                  {activeLine.map((tok, i) => {
                    const done = i < g.charIdx;
                    const cur = i === g.charIdx;
                    const showGhost = cur && ghost !== null;
                    return (
                      <span
                        key={i}
                        data-ci={i}
                        className={showGhost ? "caret-char ch-wrong" : cur ? "caret-char" : done ? "opacity-45" : tok.cls}
                        style={done ? { color: "var(--mint)" } : undefined}
                      >
                        {showGhost ? (ghost!.ch === " " ? "␣" : ghost!.ch) : tok.ch === " " ? "\u00A0" : tok.ch}
                      </span>
                    );
                  })}
                  <span className="inline-block w-2.5 h-5 align-middle ml-0.5 rounded-sm bg-[var(--accent)] opacity-80" style={{ animation: "caretPulse 1s ease infinite" }} />
                </div>
                {/* baris mendatang */}
                {upcoming.map((ln, li) => (
                  <div key={li} className="min-w-max opacity-[0.28]">
                    <span className="text-[var(--faint)] mr-4 select-none">{String(g.lineIdx + 2 + li).padStart(2, "0")}</span>
                    {ln.map((tok, i) => (
                      <span key={i} className={tok.cls}>{tok.ch === " " ? "\u00A0" : tok.ch}</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* petunjuk untuk mode terbimbing */}
            {cfg.hints && g.status === "play" && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold tracking-[0.18em] uppercase text-[var(--faint)]">Berikutnya:</span>
                {hintChars.map((h, i) => (
                  <span key={i} className="keycap">{h.ch === " " ? "␣" : h.ch}</span>
                ))}
              </div>
            )}
          </div>

          {/* kilat merah saat terluka */}
          {flash > 0 && <div key={flash} className="flash-red absolute inset-0 bg-[var(--coral)] pointer-events-none rounded-2xl" />}
        </div>

        {/* ===== LAUT: pangkalan vs hiu ===== */}
        <div className="panel relative h-28 md:h-32 overflow-hidden">
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,42,68,0.35), rgba(4,17,30,0.85))" }} />
          <div className="absolute inset-x-0 bottom-0 h-3 bg-[rgba(126,196,236,0.08)]" />
          {/* pangkalan penyelam */}
          <div className="absolute left-4 md:left-8 bottom-3 flex flex-col items-center gap-1">
            <Diver />
            <span className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-[var(--faint)]">Pangkalan</span>
          </div>
          {/* hiu */}
          <div
            className="absolute bottom-1 transition-[left] duration-300 ease-out"
            style={{ left: `${74 - g.threat * 0.62}%`, width: "clamp(90px, 16vw, 150px)" }}
          >
            <div className={g.threat > 78 ? "anim-wiggle" : "anim-bob"}>
              <SharkMascot className="w-full" style={{ filter: g.threat > 78 ? "drop-shadow(0 0 14px rgba(255,107,87,0.55))" : "drop-shadow(0 8px 16px rgba(0,0,0,0.4))" }} />
            </div>
          </div>
          {/* gelembung kecil */}
          <span className="bubble" style={{ left: "40%", width: 8, height: 8, animationDuration: "6s", "--o": 0.3 } as React.CSSProperties} />
          <span className="bubble" style={{ left: "58%", width: 5, height: 5, animationDuration: "8s", animationDelay: "-3s", "--o": 0.25 } as React.CSSProperties} />
          <span className="bubble" style={{ left: "70%", width: 10, height: 10, animationDuration: "7s", animationDelay: "-1.5s", "--o": 0.3 } as React.CSSProperties} />
        </div>

        <p className="text-center text-xs text-[var(--faint)] font-semibold">
          Ketik persis seperti di atas • <span className="keycap !text-[11px] !h-6 !min-w-6">Backspace</span> mengoreksi •{" "}
          <span className="keycap !text-[11px] !h-6 !min-w-6">Esc</span> jeda • Combo ≥{OVERDRIVE_COMBO} = ⚡ skor ×2 • Bintang 3 butuh akurasi ≥95% &amp; ≥{cfg.starWpm} WPM
        </p>
      </main>

      {/* ===== OVERLAYS ===== */}
      {(g.status === "count" || showGo) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(2,9,17,0.72)] backdrop-blur-sm">
          <div className="text-center">
            <p className="text-sm font-extrabold tracking-[0.3em] uppercase text-[var(--dim)] mb-3">Misi Ketik Dimulai</p>
            <div key={showGo ? "go" : count} className={`font-display font-extrabold ${showGo ? "text-6xl md:text-7xl text-[var(--teal)]" : "text-8xl md:text-9xl"} count-pop`} style={{ color: showGo ? undefined : cfg.accent }}>
              {showGo ? "MULAI!" : count}
            </div>
          </div>
        </div>
      )}

      {g.status === "pause" && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-[rgba(2,9,17,0.78)] backdrop-blur-sm screen-in">
          <div className="panel w-full max-w-sm p-7 text-center anim-pop">
            <span className="w-14 h-14 mx-auto rounded-2xl grid place-items-center bg-[rgba(69,198,255,0.12)] text-[var(--cyan)] border border-[rgba(69,198,255,0.3)]">
              <IconPause size={26} />
            </span>
            <h2 className="font-display font-extrabold text-2xl mt-4">Jeda — Hiu Menunggu</h2>
            <p className="text-sm text-[var(--dim)] mt-1.5">Skor sementara: <strong className="text-[var(--amber)]">{g.score}</strong> • Combo terbaik: <strong className="text-[var(--teal)]">{g.maxCombo}</strong></p>
            <div className="flex flex-col gap-2.5 mt-6">
              <button className="btn btn-primary py-3" onClick={togglePause}><IconPlay size={18} /> Lanjutkan</button>
              <button className="btn btn-ghost py-2.5" onClick={retry}><IconRetry size={17} /> Ulang dari Awal</button>
              <button className="btn btn-ghost py-2.5" onClick={onExit}><IconMap size={17} /> Kembali ke Peta</button>
            </div>
          </div>
        </div>
      )}

      {g.status === "dead" && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-[rgba(20,5,8,0.8)] backdrop-blur-sm screen-in">
          <div className="panel w-full max-w-md p-7 text-center anim-pop !border-[rgba(255,107,87,0.45)]">
            <div className="w-20 mx-auto opacity-90 grayscale-[0.3]"><SharkMascot className="w-full" /></div>
            <h2 className="font-display font-extrabold text-3xl mt-3 text-[var(--coral)]">HIU MENYERANG!</h2>
            <p className="text-sm text-[var(--dim)] mt-2">
              Nyawamu habis di baris {Math.min(g.lineIdx + 1, lines.length)}. Kesalahan membuat ancaman hiu naik — jaga ritme ketikanmu!
            </p>
            <div className="flex justify-center gap-2.5 mt-4 flex-wrap">
              <span className="chip">Skor {g.score}</span>
              <span className="chip">Benar {g.correct}</span>
              <span className="chip !text-[var(--coral)]">Salah {g.errors}</span>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn btn-coral flex-1 py-3" onClick={retry}><IconRetry size={18} /> Coba Lagi</button>
              <button className="btn btn-ghost flex-1 py-3" onClick={onExit}><IconMap size={17} /> Peta</button>
            </div>
          </div>
        </div>
      )}

      {g.status === "won" && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-[rgba(2,9,17,0.78)] backdrop-blur-sm">
          <div className="text-center anim-pop">
            <div className="w-32 mx-auto anim-bob"><SharkMascot className="w-full" /></div>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl mt-4 text-[var(--teal)]" style={{ textShadow: "0 6px 30px rgba(46,230,200,0.4)" }}>
              MISI SELESAI!
            </h2>
            <p className="text-[var(--dim)] font-bold mt-2 flex items-center justify-center gap-2">
              <IconFin size={18} className="text-[var(--teal)]" /> Menghitung hadiahmu…
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
