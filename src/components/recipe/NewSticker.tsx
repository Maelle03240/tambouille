import { cx } from "@/components/ui/primitives";

/** Étoile à 18 pointes un peu irrégulières (repère -50…50). */
const BURST =
  "0.0,-50.0 6.1,-34.5 15.7,-43.2 17.5,-30.3 32.1,-38.3 26.8,-22.5 39.8,-23.0 32.9,-12.0 49.2,-8.7 35.0,0.0 45.3,8.0 32.9,12.0 43.3,25.0 26.8,22.5 29.6,35.2 17.5,30.3 17.1,47.0 6.1,34.5 0.0,46.0 -6.1,34.5 -17.1,47.0 -17.5,30.3 -29.6,35.2 -26.8,22.5 -43.3,25.0 -32.9,12.0 -45.3,8.0 -35.0,0.0 -49.2,-8.7 -32.9,-12.0 -39.8,-23.0 -26.8,-22.5 -32.1,-38.3 -17.5,-30.3 -15.7,-43.2 -6.1,-34.5";

/**
 * Sticker « NEW » : recette jamais cuisinée (tag `a-tester`, posé à l'ajout,
 * retiré par « Réussie » en fin de mode cuisine). Couleur : --color-danger.
 */
export function NewSticker({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="-50 -50 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="Nouveau"
      className={cx("pointer-events-none drop-shadow-sm", className)}
    >
      <polygon points={BURST} fill="var(--color-danger)" />
      <text
        x="0"
        y="0"
        transform="rotate(-24)"
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontFamily="system-ui, sans-serif"
        fontWeight="900"
        fontSize="27"
        letterSpacing="-1"
      >
        NEW
      </text>
    </svg>
  );
}
