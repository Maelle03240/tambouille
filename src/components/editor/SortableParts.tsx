"use client";
/**
 * Briques communes aux éditeurs d'ingrédients et d'étapes : poignée pour
 * glisser une ligne, titre de partie modifiable, boutons d'ajout.
 * Logique des parties : src/lib/recipes/sections.ts (testée).
 */
import { IconClose, IconGrip, IconPlus } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";

export function DragHandle(props: { style: React.CSSProperties; onPointerDown: (e: React.PointerEvent) => void }) {
  return (
    <button
      type="button"
      aria-label="Glisser pour déplacer"
      {...props}
      className="flex w-7 flex-none items-center justify-center self-stretch rounded-lg text-neutral-500 hover:bg-surface active:text-ink"
    >
      <IconGrip size={20} />
    </button>
  );
}

export function SectionHeader({
  id,
  name,
  onRename,
  onRemove,
}: {
  id: string;
  name: string;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 pt-3">
      <input
        id={id}
        value={name}
        onChange={(e) => onRename(e.target.value)}
        placeholder="Nom de la partie (ex. Biscuit)"
        className="min-h-10 min-w-0 flex-1 rounded-field border-b-[1.5px] border-divider bg-transparent px-1 text-[15px] font-bold tracking-[.04em] text-accent-700 uppercase placeholder:font-normal placeholder:tracking-normal placeholder:text-neutral-500 placeholder:normal-case focus:border-accent focus:outline-none"
      />
      <button
        type="button"
        aria-label="Retirer la partie"
        onClick={onRemove}
        className="flex size-9 flex-none items-center justify-center rounded-full text-neutral-700"
      >
        <IconClose size={16} />
      </button>
    </div>
  );
}

export function AddButtons({ label, onAdd, onAddSection }: { label: string; onAdd: () => void; onAddSection: () => void }) {
  const base = "flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-dashed border-neutral-500 font-bold text-neutral-800";
  return (
    <div className="mt-1 flex gap-2">
      <button type="button" onClick={onAdd} className={cx(base, "flex-1")}>
        <IconPlus size={18} /> {label}
      </button>
      <button type="button" onClick={onAddSection} className={cx(base, "px-4")}>
        <IconPlus size={18} /> Partie
      </button>
    </div>
  );
}

/** Après l'ajout d'une partie : place le curseur dans son nom. */
export function focusSoon(id: string) {
  setTimeout(() => document.getElementById(id)?.focus(), 40);
}
