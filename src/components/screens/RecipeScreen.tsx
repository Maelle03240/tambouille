"use client";
/** Fiche recette (maquette écran 06). */
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { OfflineBanner } from "@/components/app/OfflineBanner";
import { IngredientList } from "@/components/recipe/IngredientList";
import { ReviewNoteSheet } from "@/components/recipe/ReviewNoteSheet";
import { StepText } from "@/components/recipe/StepText";
import { IconBack, IconBookmark, IconPencil } from "@/components/ui/icons";
import { EmptyState, SectionTitle, Spinner, cx } from "@/components/ui/primitives";
import { categoryColors, getCategory } from "@/config/categories";
import { RATINGS, PROTEIN_SOURCES } from "@/config/ui";
import { tagLabel } from "@/config/tags";
import { patchRecipe } from "@/lib/data/actions";
import { useRecipe, useSettings } from "@/lib/data/hooks";
import { useSearchId } from "@/lib/hooks/useSearchId";
import { formatDuration } from "@/lib/recipes/markers";
import { displayTags } from "@/lib/recipes/tags";
import type { Recipe } from "@/lib/recipes/types";

function yieldLabel(r: Recipe) {
  if (!r.yieldQuantity) return null;
  const unit = r.yieldUnit === "personnes" ? "pers." : r.yieldUnit;
  return `${r.yieldQuantity} ${unit}`;
}

export function RecipeScreen() {
  const id = useSearchId();
  const recipe = useRecipe(id);
  const settings = useSettings();
  const { canEdit, online, toast } = useApp();
  const [reviewOpen, setReviewOpen] = useState(false);

  if (recipe === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-neutral-600">
        <Spinner />
      </div>
    );
  }
  if (recipe === null) {
    return (
      <div className="pt-safe px-5">
        <EmptyState title="Recette introuvable">
          <Link href="/" className="font-bold text-accent-700">
            Retour au carnet
          </Link>
        </EmptyState>
      </div>
    );
  }

  const colors = categoryColors(recipe.category);
  const tags = displayTags(recipe, settings);
  const toTest = recipe.tags.includes("a-tester");
  const hasNutrition = [recipe.kcal, recipe.proteinG, recipe.fatG, recipe.carbsG, recipe.fiberG].some((v) => v != null);

  async function toggleTest() {
    if (!recipe) return;
    try {
      const next = toTest ? recipe.tags.filter((t) => t !== "a-tester") : [...recipe.tags, "a-tester"];
      await patchRecipe(recipe.id, { tags: next });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Modification impossible");
    }
  }

  return (
    <div className="pb-16">
      <header
        className="pt-safe rounded-b-[36px] px-[22px] pb-6"
        style={{ background: colors.bg, color: colors.ink }}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3 pt-1">
            <Link href="/" aria-label="Retour" className="flex size-12 items-center justify-center rounded-full bg-white/45">
              <IconBack />
            </Link>
            <OfflineBanner compact />
            <span className="text-[13px] font-bold tracking-[.06em] uppercase">{getCategory(recipe.category).label}</span>
          </div>
          {/* Emplacement image (V2) : photo perso > illustration > couverture typographique */}
          <h1 className="pt-6 font-heading text-[40px] leading-[1.02] text-balance sm:text-[52px]">{recipe.title}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[15px] font-bold">
            {yieldLabel(recipe) && <span>{yieldLabel(recipe)}</span>}
            {recipe.prepMinutes != null && <span>Prép. {formatDuration(recipe.prepMinutes)}</span>}
            {!!recipe.cookMinutes && <span>Cuisson {formatDuration(recipe.cookMinutes)}</span>}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-[22px] px-5 pt-5">
        <Link
          href={`/cuisine?id=${recipe.id}`}
          className="flex h-16 items-center justify-center gap-2.5 rounded-full bg-accent-600 font-heading text-[21px] text-neutral-100 shadow-md active:bg-accent-700"
        >
          Commencer à cuisiner
        </Link>

        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={toggleTest}
              disabled={!online}
              className={cx(
                "h-10 rounded-full border-[1.5px] px-4 text-sm font-bold disabled:opacity-45",
                toTest ? "border-transparent bg-leaf-300 text-leaf-900" : "border-divider text-neutral-800",
              )}
            >
              {toTest ? "À tester ✓" : "Marquer « à tester »"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-full border-[1.5px] border-divider px-4 text-sm font-bold text-neutral-800"
          >
            <IconBookmark size={15} /> À revoir
          </button>
          {canEdit && (
            <Link
              href={online ? `/modifier?id=${recipe.id}` : "#"}
              onClick={(e) => {
                if (!online) {
                  e.preventDefault();
                  toast("Pas de réseau : la modification revient avec la connexion.");
                }
              }}
              className={cx(
                "flex h-10 items-center gap-1.5 rounded-full border-[1.5px] border-divider px-4 text-sm font-bold text-neutral-800",
                !online && "opacity-45",
              )}
            >
              <IconPencil size={15} /> Modifier
            </Link>
          )}
        </div>

        {recipe.personalNotes && (
          <div className="rounded-3xl bg-leaf-200 px-4 py-3.5 text-base leading-relaxed text-leaf-900">
            <strong>Ma note ·</strong> {recipe.personalNotes}
          </div>
        )}

        {(recipe.rating || tags.filter((t) => t !== "a-tester").length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {recipe.rating && (
              <span className="rounded-full bg-accent-200 px-3 py-1 text-[13px] font-bold text-accent-800">
                {RATINGS.find((r) => r.id === recipe.rating)?.label}
              </span>
            )}
            {tags
              .filter((t) => t !== "a-tester")
              .map((t) => (
                <span key={t} className="rounded-full bg-neutral-200 px-3 py-1 text-[13px] font-bold text-neutral-800">
                  {tagLabel(t)}
                </span>
              ))}
          </div>
        )}

        {hasNutrition && (
          <div className="flex flex-col gap-3 rounded-3xl bg-surface p-4">
            <div className="flex items-end justify-between gap-2.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold tracking-[.06em] text-accent-700 uppercase">Protéines / portion</span>
                <span className="font-heading text-[44px] leading-none">
                  {recipe.proteinG != null ? `${Math.round(recipe.proteinG)} g` : "–"}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="font-heading text-2xl leading-none">{recipe.kcal != null ? Math.round(recipe.kcal) : "–"}</span>
                <span className="text-xs font-bold text-neutral-700">kcal / portion</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 border-t border-divider pt-2.5">
              {(
                [
                  ["lipides", recipe.fatG],
                  ["glucides", recipe.carbsG],
                  ["fibres", recipe.fiberG],
                ] as const
              ).map(([label, v]) => (
                <div key={label} className="flex flex-col">
                  <span className="text-[17px] font-bold">{v != null ? `${Math.round(v)} g` : "–"}</span>
                  <span className="text-xs text-neutral-700">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-700">
              {recipe.nutritionConfidence === "from_labels" ? "Calculé depuis les étiquettes" : "Valeurs estimées"}
              {recipe.proteinSource && ` · protéines : ${PROTEIN_SOURCES.find((p) => p.id === recipe.proteinSource)?.label.toLowerCase()}`}
              {recipe.hasVegetables && " · avec légumes"}
            </p>
          </div>
        )}

        <div className="wide:grid wide:grid-cols-[minmax(260px,38%)_1fr] wide:gap-8">
          <section className="flex flex-col">
            <SectionTitle className="mb-0.5">Ingrédients</SectionTitle>
            {recipe.ingredients.length ? (
              <IngredientList ingredients={recipe.ingredients} />
            ) : (
              <p className="py-2 text-neutral-700">Aucun ingrédient pour l&apos;instant.</p>
            )}
          </section>
          <section className="mt-[22px] flex flex-col gap-3 wide:mt-0">
            <SectionTitle>Étapes</SectionTitle>
            {recipe.steps.map((s, i) => (
              <div key={s.id} className="flex gap-3 text-[17px] leading-[1.45]">
                <span className="min-w-4 font-heading text-accent-700">{i + 1}</span>
                <p className="text-pretty">
                  <StepText text={s.text} ingredients={recipe.ingredients} />
                </p>
              </div>
            ))}
            {!recipe.steps.length && <p className="text-neutral-700">Aucune étape pour l&apos;instant.</p>}
          </section>
        </div>
      </main>
      <ReviewNoteSheet recipeId={recipe.id} open={reviewOpen} onClose={() => setReviewOpen(false)} />
    </div>
  );
}
