"use client";
import Link from "next/link";
import { categoryColors, getCategory } from "@/config/categories";
import { useSettings } from "@/lib/data/hooks";
import { displayTags } from "@/lib/recipes/tags";
import type { Recipe } from "@/lib/recipes/types";
import { formatDuration } from "@/lib/recipes/markers";
import { RATINGS } from "@/config/ui";
import { imageUrl } from "@/lib/images";
import { cx } from "@/components/ui/primitives";
import { totalMinutes } from "@/lib/recipes/tags";

/**
 * Carte de la liste. Couverture typographique (titre en serif sur la couleur
 * de la catégorie) ; en V2 : photo perso > illustration > cette couverture.
 */
export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const settings = useSettings();
  const colors = categoryColors(recipe.category);
  const tags = displayTags(recipe, settings);
  const rich = tags.includes("riche-en-proteines");
  const test = tags.includes("a-tester");
  const total = totalMinutes(recipe);

  return (
    <Link
      href={`/recette?id=${recipe.id}`}
      className="flex min-h-[210px] flex-col gap-2.5 rounded-3xl p-3.5 transition-transform active:scale-[.98]"
      style={{ background: colors.bg, color: colors.ink }}
    >
      <div className="flex items-start justify-between gap-2 text-[11px] font-bold tracking-[.06em] uppercase opacity-80">
        <span>{getCategory(recipe.category).singular}</span>
        {total ? <span className="normal-case tracking-normal">{formatDuration(total)}</span> : null}
      </div>
      {imageUrl(recipe.imagePath) ? (
        <div
          className={cx("min-h-24 flex-1 bg-center", recipe.imageKind === "generated" ? "bg-contain bg-no-repeat mix-blend-multiply" : "rounded-[14px] bg-cover")}
          style={{ backgroundImage: `url("${imageUrl(recipe.imagePath)}")` }}
        />
      ) : (
        <div className="flex-1" />
      )}
      {(rich || test || recipe.rating) && (
        <div className="flex flex-wrap gap-1">
          {rich && (
            <span className="rounded-full px-2 py-0.5 text-[10.5px] font-extrabold" style={{ background: colors.ink, color: colors.bg }}>
              Riche en protéines
            </span>
          )}
          {test && <span className="rounded-full bg-leaf-300 px-2 py-0.5 text-[10.5px] font-extrabold text-leaf-900">À tester</span>}
          {recipe.rating && (
            <span className="rounded-full bg-white/55 px-2 py-0.5 text-[10.5px] font-extrabold">{RATINGS.find((x) => x.id === recipe.rating)?.label}</span>
          )}
        </div>
      )}
      <div className="font-heading text-[21px] leading-[1.1] text-balance">{recipe.title}</div>
      {(recipe.proteinG != null || recipe.kcal != null) && (
        <div className="flex items-baseline justify-between gap-1.5">
          {recipe.proteinG != null ? (
            <span className="text-base font-extrabold">
              {Math.round(recipe.proteinG)} g <span className="text-[11px] font-bold">prot.</span>
            </span>
          ) : (
            <span />
          )}
          {recipe.kcal != null && <span className="text-xs font-bold">{Math.round(recipe.kcal)} kcal</span>}
        </div>
      )}
    </Link>
  );
}
