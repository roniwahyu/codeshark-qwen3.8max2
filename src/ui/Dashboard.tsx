import { useEffect, useRef, useState } from "react";
import type { SaveData } from "../lib/storage";
import { rankOf } from "../lib/storage";
import type { AgeCfg, ModuleDef } from "../data/modules";
import { MODULES } from "../data/modules";
import { HTML_DOCS } from "../data/materiHtml";
import { questsForLesson } from "../data/quests";
import { sfx } from "../lib/audio";
import {
  IconFin, IconBolt, IconCoin, IconBook, IconKeyboard, IconStar, IconStarLine,
  IconLock, IconCheck, IconArrowR, IconEye, IconRetry, IconSound, IconMute,
   IconTarget, IconTimer, IconTrophy, IconX, IconTag, IconBrush, IconHome,
} from "./icons";
import { tokenize } from "../lib/highlight";
import { CaptainAvatar } from "../characters";
import MiniSpeedometer from "./MiniSpeedometer";

interface Props {
  save: SaveData;
  cfg: AgeCfg;
  onMateri: (id: string) => void;
  onPractice: (id: string) => void;
  /** buka Materi HTML berbasis dokumen .md per pertemuan */
  onMateriHtml?: (no?: number) => void;
  /** progres kurikulum P1–P16 */
  lessonsDone?: number;
  lessonTotal?: number;
  nextLessonNo?: number | null;
  onLessonPractice?: (no: number) => void;
  /** quest mingguan: status tuntas per quest id + aksi mulai quest */
  questStatus?: Record<string, boolean>;
  onQuest?: (questId: string) => void;
  onToggleSound: () => void;
  onResetProfile: () => void;
}

const MOD_ICON = {
  tag: IconTag,
  brush: IconBrush,
  bolt: IconBolt,
} as const;

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 }
    );
    el.querySelectorAll(".reveal").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return ref;
}

export default function Dashboard({ save, cfg, onMateri, onPractice, onMateriHtml, lessonsDone, lessonTotal, nextLessonNo, onLessonPractice, questStatus, onQuest, onToggleSound, onResetProfile }: Props) {
  const revealRef = useReveal();
  const [preview, setPreview] = useState<ModuleDef | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const profile = save.profile!;
  const rank = rankOf(save.xp);
  const doneCount = MODULES.filter((m) => (save.modules[m.id]?.completions ?? 0) > 0).length;
  const avgAcc = (() => {
    const bests = MODULES.map((m) => save.modules[m.id]?.best).filter(
      (b): b is NonNullable<typeof b> => !!b
    );
    if (!bests.length) return null;
    return Math.round(bests.reduce((a, b) => a + b.accuracy, 0) / bests.length);
  })();

  return (
    <div ref={revealRef} className="relative z-10 min-h-screen">
      {/* ============ HUD TOPBAR HEADER ============ */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[rgba(4,14,26,0.85)] border-b border-[rgba(69,198,255,0.15)]">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <span className="w-10 h-10 rounded-xl grid place-items-center text-[var(--teal)] bg-[rgba(46,230,200,0.12)] border border-[rgba(46,230,200,0.45)] shadow-[0_0_16px_rgba(46,230,200,0.25)] shrink-0">
            <IconFin size={22} />
          </span>
          <div className="mr-auto leading-tight">
            <p className="font-display font-extrabold tracking-wide text-white text-sm md:text-base">
              CODESHARK <span className="text-[var(--teal)]">ACADEMY</span>
            </p>
            <p className="text-[10px] text-[var(--dim)] font-bold tracking-[0.2em] uppercase">
              PETA MISI • {cfg.label.toUpperCase()}
            </p>
          </div>

          {/* Chips Koin & XP */}
          <div className="chip !bg-[rgba(7,24,42,0.85)] !border-[rgba(255,194,71,0.35)] !text-[var(--amber)] shadow-[0_2px_10px_rgba(0,0,0,0.25)]" title="Koin">
            <IconCoin size={15} /> {save.coins}
          </div>
          <div className="chip !bg-[rgba(7,24,42,0.85)] !border-[rgba(46,230,200,0.35)] !text-[var(--teal)] shadow-[0_2px_10px_rgba(0,0,0,0.25)]" title="Experience">
            <IconBolt size={15} /> {save.xp} XP
          </div>

          {/* Tombol Suara & Profil */}
          <button className="btn btn-ghost !p-2 !rounded-xl !bg-[rgba(10,34,56,0.5)] !border-[rgba(126,196,236,0.2)]" onClick={onToggleSound} aria-label="Suara">
            {profile.sound ? <IconSound size={17} /> : <IconMute size={17} />}
          </button>
          <button className="btn btn-ghost !p-2 !rounded-xl !bg-[rgba(10,34,56,0.5)] !border-[rgba(126,196,236,0.2)]" onClick={() => setConfirmReset(true)} aria-label="Ganti Profil">
            <IconHome size={17} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-24">
        {/* ============ HERO KARTU PROFIL KAPTEN (HUD STYLE) ============ */}
        <section className="hud-hero-card mt-7 p-6 md:p-8 relative overflow-hidden screen-in">
          {/* Ambient Glow di belakang kartu */}
          <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full pointer-events-none opacity-20" style={{ background: `radial-gradient(circle, var(--teal), transparent 70%)` }} />
          <div className="absolute right-0 top-0 w-80 h-80 rounded-full pointer-events-none opacity-15" style={{ background: `radial-gradient(circle, #45c6ff, transparent 70%)` }} />

          <div className="flex flex-col lg:flex-row lg:items-center gap-7 relative z-10">
            {/* Sisi Kiri: Avatar Kapten + Sapaan & Progress Rank */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-5 flex-1 min-w-0">
              <div className="relative shrink-0">
                <CaptainAvatar size={124} className="drop-shadow-[0_0_24px_rgba(46,230,200,0.35)]" />
              </div>

              <div className="flex-1 min-w-0 text-center sm:text-left">
                <p className="text-xs font-semibold text-[var(--dim)] tracking-wide">
                  {doneCount === MODULES.length ? "Semua misi selesai — luar biasa!" : "Selamat datang kembali,"}
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-2.5 mt-1 flex-wrap">
                  <h1 className="font-display font-extrabold text-3xl md:text-4xl text-white tracking-tight">
                    Kapten {profile.name}
                  </h1>
                  <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-[rgba(6,24,42,0.85)] border border-[rgba(126,196,236,0.25)] text-[var(--dim)]">
                    {cfg.range}
                  </span>
                </div>

                {/* Info Rank & Kebutuhan XP */}
                <div className="mt-3.5 flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(255,194,71,0.12)] border border-[rgba(255,194,71,0.4)] text-[var(--amber)] text-xs font-bold">
                    <IconTrophy size={14} /> Rank: {rank.cur.name}
                  </span>
                  {rank.next ? (
                    <span className="text-xs text-[var(--dim)] font-semibold">
                      <strong className="text-white">{rank.next.xp - save.xp} XP</strong> lagi menuju <span className="text-[var(--teal)] font-bold">{rank.next.name}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--teal)] font-bold">Pangkat Tertinggi Samudra!</span>
                  )}
                </div>

                {/* Progress Bar Gradien Cyan -> Amber */}
                <div className="mt-3 max-w-md w-full">
                  <div className="h-2.5 rounded-full bg-[rgba(4,16,28,0.95)] border border-[rgba(126,196,236,0.18)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(4, rank.pct)}%`,
                        background: "linear-gradient(90deg, #2ee6c8 0%, #45c6ff 60%, #ffc247 100%)",
                        boxShadow: "0 0 10px rgba(46, 230, 200, 0.6)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sisi Kanan: 4 Kotak HUD Stats (2x2 Grid ala dashboard_hud.jfif) */}
            <div className="grid grid-cols-2 gap-3 lg:w-72 shrink-0">
              {/* Card 1: MISI */}
              <div className="hud-stat-box p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[var(--teal)]">
                  <IconBook size={18} />
                  <span className="font-display font-extrabold text-2xl text-white leading-none">
                    {doneCount}/{MODULES.length}
                  </span>
                </div>
                <p className="text-[10px] uppercase tracking-[0.16em] font-extrabold text-[var(--faint)] mt-2">
                  MISI
                </p>
              </div>

              {/* Card 2: AKURASI */}
              <div className="hud-stat-box p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[var(--teal)]">
                  <IconTarget size={19} />
                  <span className="font-display font-extrabold text-2xl text-[var(--teal)] leading-none">
                    {avgAcc === null ? "100%" : `${avgAcc}%`}
                  </span>
                </div>
                <p className="text-[10px] uppercase tracking-[0.16em] font-extrabold text-[var(--faint)] mt-2">
                  AKURASI
                </p>
              </div>

              {/* Card 3: WPM TERBAIK (dengan mini speedometer) */}
              <div className="hud-stat-box p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-display font-extrabold text-2xl text-white leading-none">
                    {save.stats.bestWpm || "—"}
                  </span>
                  <MiniSpeedometer val={save.stats.bestWpm ?? 0} max={100} />
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <IconTimer size={13} className="text-[var(--cyan)]" />
                  <p className="text-[10px] uppercase tracking-[0.16em] font-extrabold text-[var(--faint)]">
                    WPM TERBAIK
                  </p>
                </div>
              </div>

              {/* Card 4: COMBO MAKS */}
              <div className="hud-stat-box hud-stat-box-amber p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[var(--amber)]">
                  <IconBolt size={20} />
                  <span className="font-display font-extrabold text-2xl text-[var(--amber)] leading-none">
                    {save.stats.bestCombo || 40}
                  </span>
                </div>
                <p className="text-[10px] uppercase tracking-[0.16em] font-extrabold text-[var(--faint)] mt-2">
                  COMBO MAKS
                </p>
              </div>

              {/* Card 5: AKSES CEPAT — Materi HTML dokumen .md per pertemuan (P1-P6) */}
              {onMateriHtml && (
                <button
                  type="button"
                  onClick={() => { sfx.click(); onMateriHtml(); }}
                  title={`Materi HTML: ${HTML_DOCS.map((d) => `P${d.no}`).join(" · ")}`}
                  className="hud-stat-box hud-stat-box-html p-3.5 flex flex-col justify-between text-left cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <div className="flex items-center justify-between" style={{ color: "#7ee4ff" }}>
                    <IconBook size={18} />
                    <span className="font-display font-extrabold text-lg leading-none" style={{ color: "#7ee4ff" }}>
                      P1–P6
                    </span>
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.16em] font-extrabold text-[var(--faint)] mt-2">
                    MATERI HTML (.md)
                  </p>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ============ PROGRES KURIKULUM P1–P16 + QUEST MINGGUAN ============ */}
        {(lessonsDone != null || nextLessonNo != null) && (
          <section className="mt-12">
            <div className="flex items-center gap-4 mb-7 reveal">
              <h2 className="font-display font-extrabold text-2xl md:text-3xl text-white tracking-tight shrink-0">
                Kurikulum Mingguan
              </h2>
              <span className="h-[1px] flex-1 bg-[rgba(69,198,255,0.2)]" />
              <span className="text-xs font-bold text-[var(--dim)] tracking-wide shrink-0 hidden sm:inline">
                Target: baca materi → selesaikan 3 quest minggu ini
              </span>
            </div>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5">
              {/* Ringkasan kurikulum + CTA lanjutkan */}
              <div className="hud-panel p-5 sm:p-6 reveal">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-display font-extrabold text-lg text-white">
                    Progres Pertemuan
                  </p>
                  <span className="chip !text-[var(--teal)]">
                    {lessonsDone ?? 0}/{lessonTotal ?? 16} gladi tuntas
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[rgba(126,196,236,0.12)] overflow-hidden mt-3 mb-4">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(3, Math.round(((lessonsDone ?? 0) / (lessonTotal ?? 16)) * 100))}%`,
                      background: "linear-gradient(90deg,#45c6ff,#2ee6c8)",
                      boxShadow: "0 0 10px rgba(46,230,200,.6)",
                    }}
                  />
                </div>
                {nextLessonNo != null ? (
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      className="btn btn-amber flex-1 justify-center !py-3"
                      onClick={() => { sfx.click(); onLessonPractice?.(nextLessonNo); }}
                    >
                      <IconKeyboard size={16} /> Lanjutkan Pertemuan {nextLessonNo} — Drill Ketik
                    </button>
                    {onMateriHtml && nextLessonNo <= 6 && (
                      <button
                        className="btn btn-ghost !py-3 justify-center"
                        onClick={() => { sfx.click(); onMateriHtml(nextLessonNo); }}
                      >
                        <IconBook size={15} /> Baca Materi P{nextLessonNo}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--teal)] font-bold flex items-center gap-2">
                    <IconCheck size={16} /> Semua gladi pertemuan selesai! Kejar bintang tambahan di misi favoritmu.
                  </p>
                )}
              </div>

              {/* Quest pertemuan berikutnya */}
              {nextLessonNo != null && (
                <aside className="hud-panel p-5 reveal" aria-label={`Quest Pertemuan ${nextLessonNo}`}>
                  <p className="text-[10px] font-extrabold tracking-[0.22em] uppercase text-[var(--faint)]">
                    Quest Minggu Ini
                  </p>
                  <h3 className="font-display font-extrabold text-lg text-white mt-1 mb-3">
                    Pertemuan {nextLessonNo}
                  </h3>
                  <ul className="space-y-2.5">
                    {questsForLesson(nextLessonNo).map((q) => {
                      const done = questStatus?.[q.id] ?? false;
                      return (
                        <li key={q.id}>
                          <button
                            type="button"
                            disabled={!onQuest}
                            onClick={() => { sfx.click(); onQuest?.(q.id); }}
                            title={q.desc}
                            className={`w-full text-left rounded-xl border px-3.5 py-2.5 transition-all flex items-start gap-2.5 ${
                              done
                                ? "border-[rgba(46,230,200,0.45)] bg-[rgba(46,230,200,0.08)] cursor-default"
                                : "border-[rgba(126,196,236,0.16)] bg-[rgba(255,255,255,0.03)] hover:border-[var(--amber)] hover:bg-[rgba(255,194,71,0.06)]"
                            }`}
                          >
                            <span
                              className={`w-6 h-6 shrink-0 rounded-lg grid place-items-center mt-0.5 ${
                                done ? "bg-[var(--teal)] text-[#04222b]" : "bg-[rgba(255,194,71,0.15)] text-[var(--amber)]"
                              }`}
                            >
                              {done ? <IconCheck size={13} /> : q.kind === "juggling" ? <IconBolt size={13} /> : <IconTarget size={13} />}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[11px] font-extrabold uppercase tracking-wider" style={{ color: done ? "var(--teal)" : "var(--amber)" }}>
                                {q.kind}
                              </span>
                              <span className="block text-sm font-display font-bold text-white leading-tight">{q.title}</span>
                              <span className="block text-[11px] text-[var(--dim)] mt-0.5 line-clamp-2">{q.desc}</span>
                              <span className="block text-[10px] text-[var(--faint)] mt-1 font-bold">
                                Hadiah: {q.xp} XP · {q.coins} koin {done ? "— ✓ TUNTAS" : ""}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </aside>
              )}
            </div>
          </section>
        )}

        {/* ============ PETA MISI SAMUDRA ============ */}
        <section className="mt-12">
          {/* Section Header */}
          <div className="flex items-center gap-4 mb-7 reveal">
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-white tracking-tight shrink-0">
              Peta Misi Samudra
            </h2>
            <span className="h-[1px] flex-1 bg-[rgba(69,198,255,0.2)]" />
            <span className="text-xs font-bold text-[var(--dim)] tracking-wide shrink-0 hidden sm:inline">
              Alur: Materi → Praktik Ketik → Preview
            </span>
          </div>

          {/* Timeline Wrapper */}
          <div className="relative pl-9 md:pl-12">
            <div className="space-y-6">
              {MODULES.map((m, idx) => {
                const prog = save.modules[m.id] ?? { materiDone: false, quizXp: 0, completions: 0 };
                const prevDone = idx === 0 || (save.modules[MODULES[idx - 1].id]?.completions ?? 0) > 0;
                const unlocked = prevDone;
                const done = prog.completions > 0;
                const isCurrentActive = unlocked && !done;
                const MIcon = MOD_ICON[m.icon];
                
                const isLast = idx === MODULES.length - 1;

                return (
                  <article key={m.id} className="reveal relative" style={{ transitionDelay: `${idx * 0.08}s` }}>
                    {/* Garis Vertikal Antar-Node */}
                    {!isLast && (
                      <div className={done ? "hud-timeline-line" : "hud-timeline-dashed"} />
                    )}

                    {/* Node Nomor / Centang di Timeline */}
                    <span
                      className={`absolute -left-9 md:-left-12 top-7 w-8 h-8 md:w-9 md:h-9 rounded-full grid place-items-center font-display font-extrabold text-xs md:text-sm z-10 transition-all ${
                        done
                          ? "bg-[var(--teal)] text-[#04222b] shadow-[0_0_18px_rgba(46,230,200,0.85)] border-2 border-[var(--teal)]"
                          : isCurrentActive
                            ? "bg-[rgba(9,28,46,0.95)] text-[var(--amber)] border-2 border-[var(--amber)] shadow-[0_0_20px_rgba(255,194,71,0.65)]"
                            : "bg-[rgba(5,16,28,0.95)] text-[var(--faint)] border border-[rgba(126,196,236,0.2)]"
                      }`}
                    >
                      {done ? <IconCheck size={16} /> : m.num}
                    </span>

                    {/* Kartu Misi */}
                    <div
                      className={`p-5 md:p-6 transition-all duration-200 ${
                        done
                          ? "hud-card-done"
                          : isCurrentActive
                            ? "hud-card-active"
                            : "hud-card-locked"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-5 justify-between">
                        {/* Kiri: Icon & Info Misi */}
                        <div className="flex items-start md:items-center gap-4 flex-1 min-w-0">
                          {/* Box Ikon Kotak Rounded */}
                          <span
                            className={`w-14 h-14 shrink-0 rounded-2xl grid place-items-center transition-all ${
                              done
                                ? "bg-[rgba(46,230,200,0.12)] border border-[rgba(46,230,200,0.5)] text-[var(--teal)] shadow-[0_0_15px_rgba(46,230,200,0.2)]"
                                : isCurrentActive
                                  ? "bg-[rgba(255,194,71,0.12)] border border-[rgba(255,194,71,0.5)] text-[var(--amber)] shadow-[0_0_15px_rgba(255,194,71,0.2)]"
                                  : "bg-[rgba(10,30,48,0.5)] border border-[rgba(126,196,236,0.15)] text-[var(--faint)]"
                            }`}
                          >
                            <MIcon size={26} />
                          </span>

                          <div className="flex-1 min-w-0">
                            {/* Tag Misi */}
                            <p
                              className="text-[11px] font-extrabold tracking-[0.2em] uppercase"
                              style={{ color: done ? "var(--teal)" : isCurrentActive ? "var(--amber)" : "var(--faint)" }}
                            >
                              MISI 0{m.num} • {m.lang.toUpperCase()}
                            </p>

                            {/* Judul & Subjudul */}
                            <h3 className="font-display font-extrabold text-xl md:text-2xl text-white leading-tight mt-0.5">
                              {m.title}
                            </h3>
                            <p className="text-xs md:text-sm text-[var(--dim)] mt-0.5 font-medium">
                              {m.subtitle}
                            </p>

                            {/* Chips Status */}
                            <div className="flex items-center gap-2 flex-wrap mt-3">
                              {/* Chip Materi */}
                              <span className={`hud-chip ${prog.materiDone ? "hud-chip-done" : ""}`}>
                                {prog.materiDone ? <IconCheck size={13} /> : <IconBook size={13} />} Materi {prog.materiDone ? "✓" : ""}
                              </span>

                              {/* Chip Praktik */}
                              <span className={`hud-chip ${done ? "hud-chip-done" : ""}`}>
                                <IconKeyboard size={13} /> Praktik {done ? "✓" : ""}
                              </span>

                              {/* Bintang & Skor bila selesai */}
                              {done && (
                                <>
                                  <span className="hud-chip !text-[var(--amber)]" title="Bintang Misi">
                                    {Array.from({ length: 3 }, (_, i) =>
                                      i < (prog.best?.stars ?? 3) ? (
                                        <IconStar key={i} size={13} />
                                      ) : (
                                        <IconStarLine key={i} size={13} className="opacity-40" />
                                      )
                                    )}
                                  </span>
                                  <span className="hud-chip text-white font-semibold">
                                    {prog.best ? `${prog.best.score} poin` : "belum ada rekor"}
                                  </span>
                                  <span className="hud-chip !text-[var(--teal)] font-bold">
                                    {prog.best ? `${prog.best.wpm} WPM` : "— WPM"}
                                  </span>
                                </>
                              )}

                              {!unlocked && (
                                <span className="hud-chip !text-[var(--faint)]">
                                  <IconLock size={13} /> Selesaikan Misi 0{m.num - 1} dulu.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Tengah/Kanan Khusus Misi Terkunci: Gembok Cyan Neon */}
                        {!unlocked && (
                          <div className="hidden md:flex items-center justify-center px-6">
                            <div className="hud-lock-glow">
                              <IconLock size={26} />
                            </div>
                          </div>
                        )}

                        {/* Kanan: Tombol-Tombol Aksi Sesuai Status */}
                        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-center">
                          {!unlocked ? (
                            <span className="hud-chip !py-2.5 !px-5 !rounded-xl !bg-[rgba(8,24,40,0.6)] !border-[rgba(126,196,236,0.18)] !text-[var(--faint)] font-bold justify-center">
                              <IconLock size={15} /> Terkunci
                            </span>
                          ) : !prog.materiDone ? (
                            /* Belum buka materi -> Tombol Emas Pelajari Materi */
                            <button
                              className="hud-btn-learn py-3 px-6 flex items-center justify-center gap-2 text-sm shadow-md"
                              onClick={() => { sfx.click(); onMateri(m.id); }}
                            >
                              <span>Pelajari Materi</span> <IconArrowR size={16} />
                            </button>
                          ) : (
                            /* Selesai / Siap Praktik */
                            <>
                              <button
                                className="hud-btn-practice py-2.5 px-6 flex items-center justify-center gap-2 text-sm"
                                onClick={() => { sfx.click(); onPractice(m.id); }}
                              >
                                <IconKeyboard size={16} /> {done ? "Ulangi Praktik" : "Mulai Praktik Ketik"}
                              </button>

                              <div className="flex gap-2">
                                <button
                                  className="btn btn-ghost !py-1.5 !px-3.5 !rounded-full !bg-[rgba(9,30,50,0.7)] !border-[rgba(126,196,236,0.25)] flex-1 text-xs text-[var(--dim)] font-bold hover:text-white"
                                  onClick={() => { sfx.click(); onMateri(m.id); }}
                                >
                                  <IconRetry size={13} /> Materi
                                </button>
                                {done && (
                                  <button
                                    className="hud-btn-preview py-1.5 px-4 flex-1 text-xs flex items-center justify-center gap-1 font-bold"
                                    onClick={() => { sfx.click(); setPreview(m); }}
                                  >
                                    <IconEye size={13} /> Preview
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Footer info progres */}
        <p className="text-center text-xs text-[var(--faint)] mt-16 font-medium reveal">
          CodeShark Academy v0.1 (MVP) — progres tersimpan di localStorage perangkatmu. Upgrade berikutnya: lebih banyak misi, mode tantangan harian, dan papan peringkat.
        </p>
      </main>

      {/* ============ MODAL PREVIEW ============ */}
      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-[rgba(2,9,17,0.85)] backdrop-blur-md screen-in" onClick={() => setPreview(null)}>
          <div className="panel w-full max-w-3xl overflow-hidden anim-pop border-[rgba(46,230,200,0.35)] shadow-[0_0_30px_rgba(46,230,200,0.2)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--line-soft)] bg-[rgba(6,22,38,0.7)]">
              <span className="flex gap-1.5">
                <i className="w-3 h-3 rounded-full bg-[#ff6b57] inline-block" />
                <i className="w-3 h-3 rounded-full bg-[#ffc247] inline-block" />
                <i className="w-3 h-3 rounded-full bg-[#2ee6c8] inline-block" />
              </span>
              <span className="font-code text-xs text-[var(--dim)] bg-[rgba(4,14,26,0.85)] rounded-md px-3 py-1 ml-2 flex-1 truncate">
                preview://hasil-kode/{preview.id}
              </span>
              <button className="btn btn-ghost !p-2" onClick={() => setPreview(null)} aria-label="Tutup">
                <IconX size={16} />
              </button>
            </div>
            <iframe
              title={`Preview ${preview.title}`}
              srcDoc={preview.preview(preview.code)}
              sandbox="allow-scripts"
              className="w-full h-[60vh] bg-white block"
            />
            <div className="px-4 py-3 text-xs text-[var(--dim)] font-semibold border-t border-[var(--line-soft)] bg-[rgba(6,22,38,0.7)]">
              Inilah halaman yang kodenya kamu ketik di misi {preview.title}. {preview.lang === "js" && "Coba klik tombolnya!"}
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL RESET ============ */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-[rgba(2,9,17,0.85)] backdrop-blur-md screen-in" onClick={() => setConfirmReset(false)}>
          <div className="panel w-full max-w-sm p-6 text-center anim-pop" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 mx-auto rounded-full grid place-items-center bg-[rgba(255,107,87,0.15)] text-[var(--coral)] border border-[rgba(255,107,87,0.4)]">
              <IconX size={22} />
            </div>
            <h3 className="font-display font-extrabold text-xl mt-4">Ganti profil & hapus progres?</h3>
            <p className="text-sm text-[var(--dim)] mt-2">
              Semua XP, koin, bintang, dan progres misi di perangkat ini akan dihapus permanen.
            </p>
            <div className="flex gap-3 mt-6">
              <button className="btn btn-ghost flex-1 py-2.5" onClick={() => setConfirmReset(false)}>Batal</button>
              <button className="btn btn-coral flex-1 py-2.5" onClick={onResetProfile}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Panel kode dengan penomoran baris — dipakai juga oleh layar hasil. */
export function CodePanel({ code, lang, caption }: { code: string; lang: "html" | "css" | "js"; caption?: string }) {
  const lines = tokenize(code, lang);
  return (
    <figure className="my-4 rounded-xl overflow-hidden border border-[var(--line)] bg-[rgba(4,17,30,0.85)]">
      <figcaption className="flex items-center gap-2 px-4 py-2 border-b border-[var(--line-soft)] bg-[rgba(10,38,62,0.5)]">
        <span className="flex gap-1.5">
          <i className="w-2.5 h-2.5 rounded-full bg-[#ff6b57] inline-block" />
          <i className="w-2.5 h-2.5 rounded-full bg-[#ffc247] inline-block" />
          <i className="w-2.5 h-2.5 rounded-full bg-[#2ee6c8] inline-block" />
        </span>
        <span className="font-code text-[11px] uppercase tracking-widest text-[var(--faint)]">{lang}</span>
        {caption && <span className="text-xs text-[var(--dim)] ml-auto hidden sm:block">{caption}</span>}
      </figcaption>
      <div className="overflow-x-auto code-scroll py-3">
        <pre className="font-code text-sm leading-[1.75] min-w-max">
          {lines.map((toks, i) => (
            <div key={i} className="flex px-4 hover:bg-[rgba(69,198,255,0.05)]">
              <span className="w-7 shrink-0 text-right mr-4 text-[var(--faint)] select-none">{i + 1}</span>
              <code>
                {toks.length === 0 ? "\u00A0" : toks.map((t, j) => (
                  <span key={j} className={t.cls}>{t.ch}</span>
                ))}
              </code>
            </div>
          ))}
        </pre>
      </div>
      {caption && <p className="px-4 pb-3 text-xs text-[var(--dim)] sm:hidden">{caption}</p>}
    </figure>
  );
}
