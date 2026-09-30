"use client";
/** Liste « à revoir » (maquette écran 07) : points auto + notes manuelles. */
import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { OfflineBanner } from "@/components/app/OfflineBanner";
import { TabBar } from "@/components/app/TabBar";
import { IconCheck, IconChevronRight } from "@/components/ui/icons";
import { EmptyState, cx } from "@/components/ui/primitives";
import { categoryColors } from "@/config/categories";
import { setReviewDone } from "@/lib/data/actions";
import { useRecipes, useReviewItems } from "@/lib/data/hooks";
import { FIELD_LABELS } from "@/lib/recipes/review";
import type { ReviewItem } from "@/lib/recipes/types";

function sourceOf(item: ReviewItem) {
  if (item.kind === "manual") return { label: "Noté en cuisine", accent: true };
  if (item.field && (item.field.startsWith("ingredient:") || item.field.startsWith("step:"))) return { label: "Import IA", accent: true };
  return { label: item.field ? (FIELD_LABELS[item.field] ?? "Info manquante") : "Info manquante", accent: false };
}

export function ReviewScreen() {
  const items = useReviewItems();
  const recipes = useRecipes();
  const { canEdit, online, toast } = useApp();
  const [showDone, setShowDone] = useState(false);

  const groups = useMemo(() => {
    const byRecipe = new Map<string, ReviewItem[]>();
    for (const it of items ?? []) {
      if (it.done !== showDone) continue;
      byRecipe.set(it.recipeId, [...(byRecipe.get(it.recipeId) ?? []), it]);
    }
    return [...byRecipe.entries()]
      .map(([id, its]) => ({ recipe: recipes?.find((r) => r.id === id), items: its }))
      .filter((g) => g.recipe)
      .sort((a, b) => a.recipe!.title.localeCompare(b.recipe!.title, "fr"));
  }, [items, recipes, showDone]);

  async function toggle(item: ReviewItem) {
    try {
      await setReviewDone(item, !item.done);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Impossible");
    }
  }

  return (
    <div className="pb-32">
      <header className="pt-safe mx-auto max-w-3xl px-5">
        <OfflineBanner className="mb-2" />
        <h1 className="pt-3 pb-1 font-heading text-[36px] leading-[1.1]">À revoir</h1>
        <div className="flex gap-2 pb-4">
          {[false, true].map((d) => (
            <button
              key={String(d)}
              type="button"
              onClick={() => setShowDone(d)}
              className={cx(
                "h-10 rounded-full border-[1.5px] px-4 text-sm font-bold",
                showDone === d ? "border-ink bg-ink text-bg" : "border-divider text-neutral-700",
              )}
            >
              {d ? "Traités" : "À faire"}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-2 px-3.5">
        {items && groups.length === 0 && (
          <EmptyState title={showDone ? "Rien de traité pour l'instant" : "Rien à revoir"}>
            {!showDone && "Tout est en ordre 👌"}
          </EmptyState>
        )}
        {groups.map(({ recipe, items: its }) => {
          const col = categoryColors(recipe!.category);
          return (
            <div key={recipe!.id} className="flex flex-col gap-2 rounded-[28px] bg-surface p-3">
              <Link href={`/recette?id=${recipe!.id}`} className="flex items-center gap-3.5">
                <span
                  className="flex h-[72px] w-16 flex-none items-center justify-center rounded-[18px] font-heading text-3xl"
                  style={{ background: col.bg, color: col.ink }}
                >
                  {recipe!.title.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 font-heading text-[19px] leading-tight">{recipe!.title}</span>
                <IconChevronRight size={20} className="flex-none opacity-60" />
              </Link>
              {its.map((it) => {
                const src = sourceOf(it);
                const fixHref = `/modifier?id=${recipe!.id}${it.field ? `&champ=${encodeURIComponent(it.field)}` : ""}`;
                return (
                  <div key={it.id} className="flex items-center gap-2.5 rounded-[20px] bg-bg/70 py-2 pr-2 pl-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span
                        className={cx(
                          "self-start rounded-full px-2.5 py-0.5 text-xs font-bold",
                          src.accent ? "bg-accent-200 text-accent-800" : "bg-leaf-200 text-leaf-800",
                        )}
                      >
                        {src.label}
                      </span>
                      <span className={cx("text-[15px] leading-snug text-neutral-800", it.done && "line-through opacity-60")}>
                        {it.note}
                      </span>
                    </div>
                    {canEdit && !it.done && (
                      <Link
                        href={online ? fixHref : "#"}
                        onClick={(e) => {
                          if (!online) {
                            e.preventDefault();
                            toast("Pas de réseau : la modification revient avec la connexion.");
                          }
                        }}
                        className="h-10 flex-none rounded-full bg-neutral-100 px-3.5 text-sm leading-10 font-bold"
                      >
                        Corriger
                      </Link>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => toggle(it)}
                        aria-label={it.done ? "Remettre à faire" : "Marquer comme traité"}
                        className={cx(
                          "flex size-10 flex-none items-center justify-center rounded-full border-2",
                          it.done ? "border-leaf-600 bg-leaf-600 text-neutral-100" : "border-neutral-500 text-transparent",
                        )}
                      >
                        <IconCheck size={18} stroke={3.5} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </main>
      <TabBar />
    </div>
  );
}
