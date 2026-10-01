"use client";
/** Accueil (maquette écran 03) : recherche, filtres, grille de recettes. */
import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { OfflineBanner } from "@/components/app/OfflineBanner";
import { TabBar } from "@/components/app/TabBar";
import { AddSheet } from "@/components/recipe/AddSheet";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { IconBookmark, IconFridge, IconPlus, IconSearch } from "@/components/ui/icons";
import { Button, Chip, EmptyState, Spinner, cx } from "@/components/ui/primitives";
import { CATEGORIES, categoryColors } from "@/config/categories";
import { MOMENTS } from "@/config/moments";
import { TAGS } from "@/config/tags";
import { saveRecipe } from "@/lib/data/actions";
import { useOpenReviewCount, useRecipes, useSettings } from "@/lib/data/hooks";
import { importToRecipe } from "@/lib/recipes/import-format";
import { SAMPLE_RECIPE } from "@/lib/recipes/samples";
import { filterRecipes } from "@/lib/recipes/search";

const FILTER_TAGS = TAGS.filter((t) => t.id !== "fetes");

export function HomeScreen() {
  const recipes = useRecipes();
  const settings = useSettings();

  const { canEdit, online, toast, syncing, profile, mode } = useApp();
  const reviewCount = useOpenReviewCount(mode === "local" ? null : (profile?.id ?? null));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [moments, setMoments] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  const list = useMemo(
    () => filterRecipes(recipes ?? [], { query, category, moments, tags }, settings),
    [recipes, query, category, moments, tags, settings],
  );

  const toggleTag = (id: string) => setTags((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  const toggleMoment = (id: string) => setMoments((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  async function addSample() {
    try {
      await saveRecipe(importToRecipe(SAMPLE_RECIPE, "json").recipe);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Impossible d'ajouter l'exemple");
    }
  }

  return (
    <div className="pb-40">
      <header className="pt-safe mx-auto max-w-5xl px-5">
        <OfflineBanner className="mb-2" />
        <div className="flex items-end justify-between gap-3 pt-2">
          <div className="flex items-end gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl" />
            <h1 className="font-heading text-[34px] leading-[1.05] sm:text-[40px]">Mes recettes</h1>
          </div>
          {reviewCount > 0 && (
            <Link href="/a-revoir" className="flex items-center gap-1.5 py-2 text-sm font-bold text-accent-700">
              <IconBookmark size={15} /> À revoir · {reviewCount}
            </Link>
          )}
        </div>

        <div className="mt-3.5 flex gap-2">
          <label className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-surface px-[18px] text-neutral-700">
            <IconSearch size={18} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Recette, ingrédient…"
              className="min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-neutral-700 focus:outline-none"
            />
          </label>
          <Link href="/frigo" aria-label="Mon frigo" className="flex size-12 flex-none items-center justify-center rounded-full bg-surface text-neutral-800">
            <IconFridge size={20} />
          </Link>
        </div>
      </header>

      <div className="no-scrollbar mx-auto flex max-w-5xl gap-2 overflow-x-auto px-5 pt-3.5 pb-2">
        <Chip selected={category === null} onClick={() => setCategory(null)}>
          Tout
        </Chip>
        {CATEGORIES.map((c) => {
          const col = categoryColors(c.id);
          const sel = category === c.id;
          return (
            <Chip
              key={c.id}
              selected={sel}
              onClick={() => setCategory(sel ? null : c.id)}
              style={sel ? undefined : { background: col.bg, color: col.ink, borderColor: "transparent" }}
            >
              {c.label}
            </Chip>
          );
        })}
      </div>
      <div className="no-scrollbar mx-auto flex max-w-5xl gap-1.5 overflow-x-auto px-5 pb-4">
        {FILTER_TAGS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => toggleTag(t.id)}
            aria-pressed={tags.includes(t.id)}
            className={cx(
              "h-9 flex-none rounded-full border-[1.5px] px-3.5 text-sm font-bold whitespace-nowrap",
              tags.includes(t.id) ? "border-accent-600 bg-accent-600 text-neutral-100" : "border-divider text-neutral-700",
            )}
          >
            {t.label}
          </button>
        ))}
        <span className="w-px flex-none bg-divider" aria-hidden />
        {MOMENTS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => toggleMoment(m.id)}
            aria-pressed={moments.includes(m.id)}
            className={cx(
              "h-9 flex-none rounded-full border-[1.5px] px-3.5 text-sm font-bold whitespace-nowrap",
              moments.includes(m.id) ? "border-leaf-700 bg-leaf-700 text-neutral-100" : "border-leaf-400 bg-leaf-100 text-leaf-800",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <main className="mx-auto max-w-5xl px-5">
        {recipes === undefined ? (
          <div className="flex justify-center py-16 text-neutral-600">
            <Spinner />
          </div>
        ) : recipes.length === 0 ? (
          <EmptyState title={syncing ? "Chargement du carnet…" : "Ton carnet est vide"}>
            {!syncing && canEdit && (
              <div className="mt-3 flex flex-col items-center gap-2">
                <p>Ajoute ta première recette avec le bouton « Ajouter ».</p>
                <Button variant="ghost" onClick={addSample} disabled={!online}>
                  Ou ajouter la recette d&apos;exemple
                </Button>
              </div>
            )}
          </EmptyState>
        ) : list.length === 0 ? (
          <EmptyState title="Aucune recette trouvée">Essaie un autre mot ou retire un filtre.</EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        )}
      </main>

      {canEdit && (
        <button
          type="button"
          onClick={() => (online ? setAdding(true) : toast("Pas de réseau : l'ajout revient avec la connexion."))}
          className={cx(
            "fixed right-5 bottom-[calc(92px+env(safe-area-inset-bottom))] z-30 flex h-12 items-center gap-2 rounded-full px-5 font-heading text-base shadow-lg",
            online ? "bg-accent-600 text-neutral-100" : "bg-neutral-300 text-neutral-700",
          )}
        >
          <IconPlus size={18} /> Ajouter
        </button>
      )}
      <AddSheet open={adding} onClose={() => setAdding(false)} />
      <TabBar />
    </div>
  );
}
