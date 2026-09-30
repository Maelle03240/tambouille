"use client";
/** Toucher un repas : autre plat au hasard, choisir soi-même, portions, garder, voir. */
import Link from "next/link";
import { IconLock, IconMinus, IconPlus, IconSearch, IconShuffle } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/primitives";
import { momentLabel } from "@/config/moments";
import { longLabel } from "@/lib/planning/dates";
import type { MealPlanEntry } from "@/lib/planning/types";
import type { Recipe } from "@/lib/recipes/types";
import { portionLabel } from "./parts";

export function SlotSheet({
  slot,
  recipe,
  onClose,
  onRandom,
  onChoose,
  onLock,
  onPortions,
  onClear,
}: {
  slot: MealPlanEntry | null;
  recipe?: Recipe;
  onClose: () => void;
  onRandom: () => void;
  onChoose: () => void;
  onLock: () => void;
  onPortions: (p: number) => void;
  onClear: () => void;
}) {
  if (!slot) return null;
  return (
    <Sheet open onClose={onClose}>
      <div className="text-[13px] font-bold tracking-[.06em] text-accent-700 uppercase">
        {momentLabel(slot.meal)} · {longLabel(slot.day)}
      </div>
      <div className="font-heading text-[26px] leading-tight">{recipe?.title ?? "Aucun plat"}</div>
      {recipe && (
        <div className="-mt-1 text-[15px] text-neutral-800">
          {Math.round((recipe.proteinG ?? 0) * slot.portions)} g prot. · {Math.round((recipe.kcal ?? 0) * slot.portions)} kcal
        </div>
      )}

      <button
        type="button"
        onClick={onRandom}
        disabled={slot.locked}
        className="flex min-h-[76px] items-center gap-3.5 rounded-[26px] bg-accent-600 px-4 py-3 text-left text-neutral-100 disabled:opacity-40"
      >
        <IconShuffle size={26} />
        <span className="flex flex-col">
          <span className="font-heading text-xl">Autre plat au hasard</span>
          <span className="text-[13px] opacity-90">Tiré pour coller à tes objectifs du jour</span>
        </span>
      </button>
      <button type="button" onClick={onChoose} className="flex min-h-[76px] items-center gap-3.5 rounded-[26px] bg-surface px-4 py-3 text-left">
        <IconSearch size={26} />
        <span className="flex flex-col">
          <span className="font-heading text-xl">Choisir moi-même</span>
          <span className="text-[13px] text-neutral-700">Recherche, filtres et effet sur tes barres</span>
        </span>
      </button>

      {recipe && (
        <div className="flex items-center justify-between rounded-[26px] bg-surface py-2 pr-2 pl-4">
          <span className="font-bold">{portionLabel(recipe, slot.portions)}</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label="Moins"
              onClick={() => onPortions(slot.portions - 0.5)}
              className="flex size-11 items-center justify-center rounded-full bg-neutral-100 shadow-sm"
            >
              <IconMinus size={20} />
            </button>
            <button
              type="button"
              aria-label="Plus"
              onClick={() => onPortions(slot.portions + 0.5)}
              className="flex size-11 items-center justify-center rounded-full bg-neutral-100 shadow-sm"
            >
              <IconPlus size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="mt-1 mb-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onLock}
          className="flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-divider font-bold"
        >
          <IconLock size={18} /> {slot.locked ? "Déverrouiller" : "Garder ce plat"}
        </button>
        {recipe ? (
          <Link href={`/recette?id=${recipe.id}`} className="flex h-12 items-center justify-center rounded-full font-bold text-accent-700">
            Voir la recette
          </Link>
        ) : (
          <span />
        )}
        {recipe && (
          <button type="button" onClick={onClear} className="col-span-2 h-10 text-sm font-bold text-neutral-700">
            Vider ce repas
          </button>
        )}
      </div>
    </Sheet>
  );
}
