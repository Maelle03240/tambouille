"use client";
/**
 * D'où vient cette recette (versions perso, famille étape 2) :
 * « Ta version · voir l'originale », « Ta recette », « Recette de Léa »,
 * avec l'état de la proposition pour son auteur. Rien pour la bibliothèque.
 */
import Link from "next/link";
import { useApp } from "@/components/app/AppProvider";
import { usePeople, useRecipe } from "@/lib/data/hooks";
import type { Recipe } from "@/lib/recipes/types";

const STATUS = { pending: "Proposée", refused: "Refusée" } as const;

export function RecipeOrigin({ recipe }: { recipe: Recipe }) {
  const { profile } = useApp();
  const people = usePeople();
  const original = useRecipe(recipe.forkedFromId);
  if (recipe.status !== "personal") return null;

  const mine = recipe.ownerId === profile?.id;
  const author = people?.find((p) => p.id === recipe.ownerId)?.displayName || "quelqu'un";
  const changedSince = !!original && !!recipe.forkBase && original.updatedAt > recipe.forkBase.recipe.updatedAt;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-3xl bg-surface px-4 py-3 text-[15px] print:hidden">
      <span className="font-bold">{mine ? (recipe.forkedFromId ? "Ta version" : "Ta recette") : `Recette de ${author}`}</span>
      {recipe.forkedFromId && original && (
        <Link href={`/recette?id=${original.id}`} className="font-bold text-accent-700">
          voir l&apos;originale
        </Link>
      )}
      {mine && recipe.proposalStatus && (
        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[13px] font-bold text-neutral-700">{STATUS[recipe.proposalStatus]}</span>
      )}
      {mine && changedSince && <span className="w-full text-sm text-neutral-700">L&apos;originale a changé depuis.</span>}
    </div>
  );
}
