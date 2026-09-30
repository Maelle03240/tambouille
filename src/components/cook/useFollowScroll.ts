"use client";
/**
 * L'étape en cours suit le défilement : quand on arrête de défiler, l'étape
 * qui se trouve sur la « ligne de lecture » devient en cours.
 * Marche en portrait (la page défile) comme sur iPad (la colonne des étapes
 * défile). Réglages : src/config/ui.ts (cookFollowScroll, cookReadingLine).
 */
import { useEffect, useRef, type RefObject } from "react";
import { UI } from "@/config/ui";

export function useFollowScroll({
  container,
  enabled,
  onStep,
}: {
  /** Colonne des étapes (défile elle-même en mode deux colonnes). */
  container: RefObject<HTMLElement | null>;
  /** Faux quand la recette est terminée (on garde « Bon appétit »). */
  enabled: boolean;
  onStep: (index: number) => void;
}) {
  /** Pendant un défilement lancé par l'appli (toucher une étape), on n'écoute pas. */
  const pauseUntil = useRef(0);
  const onStepRef = useRef(onStep);
  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  /** Zone qui défile (la colonne sur iPad, la page en portrait) et sa ligne de lecture. */
  const readingArea = () => {
    const el = container.current;
    const scrollsItself = !!el && el.scrollHeight > el.clientHeight + 1 && getComputedStyle(el).overflowY !== "visible";
    const box = scrollsItself ? el.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    return { scroller: scrollsItself ? el : null, line: box.top + (box.bottom - box.top) * UI.cookReadingLine };
  };

  useEffect(() => {
    if (!UI.cookFollowScroll || !enabled) return;
    const el = container.current;
    let timer: ReturnType<typeof setTimeout>;

    const pick = () => {
      if (Date.now() < pauseUntil.current) return;
      const { line, scroller } = readingArea();
      // Tout en haut, la 1re étape ne peut pas descendre jusqu'à la ligne : c'est elle.
      if ((scroller ? scroller.scrollTop : window.scrollY) < 8) return onStepRef.current(0);
      let best = -1;
      let bestDist = Infinity;
      document.querySelectorAll<HTMLElement>("[data-step]").forEach((stepEl) => {
        const r = stepEl.getBoundingClientRect();
        const dist = r.top <= line && r.bottom >= line ? 0 : Math.min(Math.abs(r.top - line), Math.abs(r.bottom - line));
        if (dist < bestDist) {
          bestDist = dist;
          best = Number(stepEl.dataset.step);
        }
      });
      if (best >= 0) onStepRef.current(best);
    };
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(pick, 150);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    el?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      el?.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, enabled]);

  return {
    /** Amène l'étape sur la ligne de lecture (après un toucher, à la reprise). */
    scrollToStep(index: number, smooth = true) {
      pauseUntil.current = Date.now() + 900;
      requestAnimationFrame(() => {
        const stepEl = document.querySelector<HTMLElement>(`[data-step="${index}"]`);
        if (!stepEl) return;
        const { scroller, line } = readingArea();
        const delta = stepEl.getBoundingClientRect().top - line + 24;
        const behavior = smooth ? "smooth" : "auto";
        if (scroller) scroller.scrollBy({ top: delta, behavior });
        else window.scrollBy({ top: delta, behavior });
      });
    },
  };
}
