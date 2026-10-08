/**
 * Molette de souris sur une rangée qui défile sur le côté (.no-scrollbar) :
 * on la fait défiler horizontalement au lieu de faire descendre la page.
 * Installé une fois pour toute l'appli (AppProvider).
 */
export function installWheelHScroll(): () => void {
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
    const row = (e.target as Element | null)?.closest?.(".no-scrollbar") as HTMLElement | null;
    if (!row || row.scrollWidth <= row.clientWidth) return;
    const max = row.scrollWidth - row.clientWidth;
    if ((e.deltaY < 0 && row.scrollLeft <= 0) || (e.deltaY > 0 && row.scrollLeft >= max - 1)) return;
    e.preventDefault();
    row.scrollLeft += e.deltaY;
  };
  window.addEventListener("wheel", onWheel, { passive: false });
  return () => window.removeEventListener("wheel", onWheel);
}
