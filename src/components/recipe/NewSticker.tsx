import { cx } from "@/components/ui/primitives";

/**
 * Sticker « Nouveau » : recette jamais cuisinée (tag `a-tester`, posé à
 * l'ajout, retiré quand on note la recette en fin de mode cuisine).
 */
export function NewSticker({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "pointer-events-none inline-block -rotate-6 rounded-full border-2 border-neutral-100 bg-accent-600 px-2.5 py-0.5 font-heading text-[14px] text-neutral-100 shadow-md",
        className,
      )}
    >
      Nouveau
    </span>
  );
}
