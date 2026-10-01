/**
 * Couleur de chaque foyer (pastille « profil » dans Réglages) : une teinte
 * choisie dans cette liste à partir de l'id du foyer, avec la même clarté
 * que les catégories (theme.css). Changer les teintes ici.
 */
const HUES = [25, 70, 140, 200, 260, 320, 355, 100];

export function householdColors(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = HUES[h % HUES.length];
  return {
    bg: `oklch(var(--category-bg-l) var(--category-bg-c) ${hue})`,
    ink: `oklch(var(--category-ink-l) var(--category-ink-c) ${hue})`,
  };
}
