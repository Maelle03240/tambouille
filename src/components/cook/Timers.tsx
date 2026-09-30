"use client";
/**
 * Minuteurs du mode cuisine (maquette) : pastille dans le texte, barre des
 * minuteurs en cours, et cadran plein écran pour lancer / ajuster.
 */
import { useRef, useState } from "react";
import { IconClose, IconTimer } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";
import { formatDuration } from "@/lib/recipes/markers";
import { clock, remainingSec, type Timer } from "./useCookSession";

const pillBase =
  "mx-0.5 inline-flex items-center gap-[.3em] rounded-full border-2 px-[.7em] py-[.18em] align-baseline text-[.9em] leading-[1.2] font-bold whitespace-nowrap tabular-nums";

/** Pastille dans le texte d'une étape. */
export function TimerPill({ minutes, timer, now, onOpen }: { minutes: number; timer?: Timer; now: number; onOpen: () => void }) {
  const open = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen();
  };
  if (!timer) {
    return (
      <button type="button" onClick={open} className={cx(pillBase, "border-accent-400 bg-accent-200 text-accent-800")}>
        <IconTimer size={16} className="size-[.95em]" /> {formatDuration(minutes)}
      </button>
    );
  }
  if (timer.rang) {
    return (
      <button type="button" onClick={open} className={cx(pillBase, "border-leaf-700 bg-leaf-700 text-neutral-100")}>
        ✓ Prêt
      </button>
    );
  }
  const rem = remainingSec(timer, now);
  if (timer.endAt == null) {
    return (
      <button type="button" onClick={open} className={cx(pillBase, "border-dashed border-accent-500 bg-neutral-100 text-accent-800")}>
        ❚❚ {clock(rem)}
      </button>
    );
  }
  return (
    <button type="button" onClick={open} className={cx(pillBase, "border-accent-600 bg-accent-600 text-neutral-100")}>
      <span className="size-[.5em] rounded-full bg-accent-200" /> {clock(rem)}
    </button>
  );
}

/** Barre fixe des minuteurs lancés. */
export function TimersBar({ timers, now, onOpen }: { timers: Timer[]; now: number; onOpen: (key: string) => void }) {
  if (!timers.length) return null;
  return (
    <div className="no-scrollbar fixed right-3 bottom-[max(16px,env(safe-area-inset-bottom))] left-3 z-30 flex gap-2 overflow-x-auto rounded-[28px] bg-neutral-900 p-2 text-neutral-100 shadow-lg wide:left-auto wide:max-w-[70vw]">
      {timers.map((t) => {
        const rem = remainingSec(t, now);
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onOpen(t.key)}
            className={cx(
              "flex min-h-[60px] flex-none flex-col items-start gap-0.5 rounded-[22px] px-[18px] py-2",
              t.rang ? "bg-leaf-600" : "bg-white/10",
            )}
          >
            <span className="text-xs font-bold opacity-85">
              Étape {t.stepIndex + 1}
              {t.rang ? " · prêt" : t.endAt == null ? " · pause" : ""}
            </span>
            <span className="text-2xl leading-[1.1] font-bold tabular-nums">{t.rang ? "Prêt" : clock(rem)}</span>
          </button>
        );
      })}
    </div>
  );
}

export type DialMode = "new" | "run" | "done";

/**
 * Cadran plein écran. Tourner le cadran ajuste le temps (un tour = 10 min),
 * ± 1 min, puis Lancer / Valider / Relancer.
 */
export function TimerDial({
  mode,
  stepIndex,
  stepText,
  initialSeconds,
  paused,
  onPrimary,
  onPause,
  onStop,
  onClose,
}: {
  mode: DialMode;
  stepIndex: number;
  stepText: string;
  initialSeconds: number;
  paused: boolean;
  onPrimary: (seconds: number) => void;
  onPause: () => void;
  onStop: () => void;
  onClose: () => void;
}) {
  const done = mode === "done";
  const min = done ? 0 : 15;
  const [raw, setRaw] = useState(initialSeconds);
  const drag = useRef<{ cx: number; cy: number; a: number } | null>(null);
  const v = Math.round(raw / 15) * 15;
  const deg = (((raw % 600) + 600) % 600) / 600 * 360;
  const clamp = (s: number) => Math.min(5 * 3600, Math.max(min, s));

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const cxp = r.left + r.width / 2;
    const cyp = r.top + r.height / 2;
    drag.current = { cx: cxp, cy: cyp, a: (Math.atan2(e.clientY - cyp, e.clientX - cxp) * 180) / Math.PI };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const a = (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180) / Math.PI;
    let da = a - d.a;
    if (da > 180) da -= 360;
    if (da < -180) da += 360;
    d.a = a;
    setRaw((s) => clamp(s + (da / 360) * 600));
  };
  const onUp = () => (drag.current = null);

  let primaryLabel: string;
  if (mode === "new") primaryLabel = `Lancer · ${clock(v)}`;
  else if (mode === "run") primaryLabel = `Valider · ${clock(v)}`;
  else primaryLabel = v > 0 ? `Relancer · ${clock(v)}` : "C'est bon";

  const sub = done
    ? v > 0
      ? "temps ajouté"
      : "tourne pour rajouter du temps"
    : mode === "run"
      ? "restant · tourne pour ajuster"
      : "tourne pour ajuster";

  return (
    <div
      className={cx(
        "fixed inset-0 z-50 flex flex-col gap-3.5 overflow-y-auto px-[22px] pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))] text-neutral-100",
        "wide:flex-row-reverse wide:items-center wide:justify-center wide:gap-20 wide:px-[60px]",
        done ? "bg-accent-700" : "bg-neutral-900",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Minuteur"
    >
      {/* Cadran */}
      <div className="order-2 flex flex-1 items-center justify-center wide:order-none wide:flex-none">
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="relative size-[min(270px,70vw)] flex-none cursor-grab touch-none rounded-full select-none wide:size-[min(380px,45vh)]"
          style={{ background: `conic-gradient(var(--color-accent-400) ${deg}deg, rgba(255,255,255,.13) 0)` }}
        >
          {Array.from({ length: 40 }, (_, i) => (
            <div key={i} className="pointer-events-none absolute inset-0" style={{ transform: `rotate(${i * 9}deg)` }}>
              <div
                className="absolute top-[4.75%] left-1/2 -ml-px w-0.5 rounded-sm"
                style={{
                  height: i % 4 ? 6 : 12,
                  marginTop: i % 4 ? -3 : -6,
                  background: `rgba(255,255,255,${i % 4 ? 0.35 : 0.7})`,
                }}
              />
            </div>
          ))}
          <div
            className={cx(
              "pointer-events-none absolute inset-[19%] flex flex-col items-center justify-center gap-1.5 rounded-full",
              done ? "bg-accent-700" : "bg-neutral-900",
            )}
          >
            <div className="font-heading text-[58px] leading-none tabular-nums wide:text-[80px]">{clock(v)}</div>
            <div className="px-2 text-center text-[13px] font-bold opacity-75 wide:text-[15px]">{sub}</div>
          </div>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ transform: `rotate(${deg}deg)` }}
          >
            <div className="absolute top-[4.75%] left-1/2 size-[24%] -translate-1/2 rounded-full bg-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,.35)]" />
          </div>
        </div>
      </div>

      {/* Textes et boutons */}
      <div className="contents wide:flex wide:max-w-[480px] wide:flex-1 wide:flex-col wide:gap-[18px]">
        <div className="order-0 flex items-center justify-between gap-3 wide:flex-row-reverse wide:justify-end">
          <div className="text-sm font-bold tracking-[.08em] text-accent-300 uppercase wide:text-[15px]">
            {done ? "Minuteur terminé" : "Minuteur"} · Étape {stepIndex + 1}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex size-12 flex-none items-center justify-center rounded-full bg-white/15"
          >
            <IconClose />
          </button>
        </div>
        <p className="order-1 text-[17px] leading-snug text-pretty opacity-90 wide:text-2xl wide:opacity-100">{stepText}</p>
        <div className="order-3 flex gap-2.5 wide:mt-3">
          <button
            type="button"
            onClick={() => setRaw((s) => clamp(s - 60))}
            className="h-14 flex-1 rounded-full border-2 border-white/30 text-lg font-bold wide:h-16 wide:text-xl"
          >
            − 1 min
          </button>
          <button
            type="button"
            onClick={() => setRaw((s) => clamp(s + 60))}
            className="h-14 flex-1 rounded-full border-2 border-white/30 text-lg font-bold wide:h-16 wide:text-xl"
          >
            + 1 min
          </button>
        </div>
        <button
          type="button"
          onClick={() => onPrimary(v)}
          className="order-4 h-[68px] flex-none rounded-full bg-neutral-100 font-heading text-[22px] text-accent-800 wide:h-20 wide:text-[26px]"
        >
          {primaryLabel}
        </button>
        <div className="order-5 flex min-h-11 justify-center gap-2.5 wide:justify-start">
          {mode === "run" && (
            <button type="button" onClick={onPause} className="h-11 rounded-full px-[18px] text-base font-bold text-accent-200">
              {paused ? "Reprendre" : "Pause"}
            </button>
          )}
          {mode !== "new" && (
            <button type="button" onClick={onStop} className="h-11 rounded-full px-[18px] text-base font-bold text-accent-200">
              {done && v > 0 ? "C'est bon, terminé" : "Arrêter le minuteur"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
