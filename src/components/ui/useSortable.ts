"use client";
/**
 * Glisser-déposer pour réordonner une liste (étapes, ingrédients), à la
 * souris comme au doigt, sans dépendance : on attrape la poignée ⠿, la ligne
 * suit le pointeur et les autres se décalent dès qu'on passe leur milieu.
 * La page défile toute seule près des bords de l'écran.
 *
 * Utilisation : `ref={sort.container}` sur la liste (en `relative`), chaque
 * ligne porte `data-sort` (dans l'ordre), la poignée reçoit
 * `{...sort.handle}` ; `sort.dragging` = index de la ligne attrapée.
 */
import { useLayoutEffect, useRef, useState } from "react";

const EDGE = 90; // px du bord où la page défile
const SPEED = 12;

export function useSortable(move: (from: number, to: number) => void, canDrop?: (to: number) => boolean) {
  const container = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const state = useRef<{
    /** La ligne attrapée (le même élément reste dans la page quand la liste change d'ordre). */
    el: HTMLElement;
    index: number;
    grab: number;
    y: number;
    pending: boolean;
    raf: number;
  } | null>(null);
  const actions = useRef({ move, canDrop });
  useLayoutEffect(() => {
    actions.current = { move, canDrop };
  });

  const rows = () => [...(container.current?.querySelectorAll<HTMLElement>(":scope > [data-sort]") ?? [])];

  /** Place la ligne attrapée sous le pointeur et la fait changer de place si besoin. */
  function update() {
    const st = state.current;
    const box = container.current;
    if (!st || !box) return;
    const el = st.el;
    const top = st.y - box.getBoundingClientRect().top - st.grab;
    el.style.transform = `translateY(${top - el.offsetTop}px)`;
    if (st.pending) return; // la liste n'a pas encore été redessinée
    const all = rows();
    st.index = all.indexOf(el);
    if (st.index < 0) return;
    const center = top + el.offsetHeight / 2;
    const next = all[st.index + 1];
    const prev = all[st.index - 1];
    let to: number | null = null;
    if (next && center > next.offsetTop + next.offsetHeight / 2) to = st.index + 1;
    else if (prev && center < prev.offsetTop + prev.offsetHeight / 2) to = st.index - 1;
    if (to == null || actions.current.canDrop?.(to) === false) return;
    actions.current.move(st.index, to);
    st.index = to;
    st.pending = true;
    setDragging(to);
  }

  // après chaque rendu : la liste est à jour, on recolle la ligne au pointeur
  useLayoutEffect(() => {
    if (!state.current) return;
    state.current.pending = false;
    update();
  });

  function autoScroll() {
    const st = state.current;
    if (!st) return;
    const dy = st.y < EDGE ? -SPEED : st.y > window.innerHeight - EDGE ? SPEED : 0;
    if (dy) {
      window.scrollBy(0, dy);
      update();
    }
    st.raf = requestAnimationFrame(autoScroll);
  }

  function end() {
    const st = state.current;
    if (!st) return;
    cancelAnimationFrame(st.raf);
    for (const el of rows()) el.style.transform = "";
    state.current = null;
    setDragging(null);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
  }

  function onMove(e: PointerEvent) {
    if (!state.current) return;
    e.preventDefault();
    state.current.y = e.clientY;
    update();
  }

  // une seule poignée pour toutes les lignes : la ligne est retrouvée dans la page
  const handle = {
    style: { touchAction: "none" as const, cursor: "grab" },
    onPointerDown(e: React.PointerEvent) {
      if (e.button !== 0) return;
      const all = rows();
      const el = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-sort]");
      const index = el ? all.indexOf(el) : -1;
      const box = container.current;
      if (!el || index < 0 || !box) return;
      e.preventDefault();
      (document.activeElement as HTMLElement | null)?.blur?.();
      state.current = {
        el,
        index,
        grab: e.clientY - box.getBoundingClientRect().top - el.offsetTop,
        y: e.clientY,
        pending: false,
        raf: 0,
      };
      setDragging(index);
      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      state.current.raf = requestAnimationFrame(autoScroll);
    },
  };

  return { container, handle, dragging };
}
