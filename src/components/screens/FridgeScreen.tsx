"use client";
/**
 * MODE FRIGO VIDE (V3) : je note ce que j'ai, l'appli propose les recettes
 * qui l'utilisent, celles où il manque le moins en premier. Les basiques
 * (« Mes basiques » des courses) comptent comme toujours là.
 * Logique : src/lib/recipes/fridge.ts (testée).
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { OfflineBanner } from "@/components/app/OfflineBanner";
import { TabBar } from "@/components/app/TabBar";
import { IconBack, IconPlus, IconTrash } from "@/components/ui/icons";
import { EmptyState, TextInput, cx } from "@/components/ui/primitives";
import { categoryColors, getCategory } from "@/config/categories";
import { FRIDGE_ALWAYS, FRIDGE_BASICS } from "@/config/fridge";
import { setFridge, setFridgeBasics } from "@/lib/data/actions";
import { useFridge, usePantry, useRecipes } from "@/lib/data/hooks";
import { fridgeMatches } from "@/lib/recipes/fridge";

export function FridgeScreen() {
  const recipes = useRecipes();
  const pantry = usePantry();
  const fridge = useFridge();
  const [draft, setDraft] = useState("");

  const items = useMemo(() => fridge?.items ?? [], [fridge]);
  const withBasics = fridge?.basics ?? true;
  const matches = useMemo(
    () =>
      fridgeMatches(recipes ?? [], items, [
        ...FRIDGE_ALWAYS,
        ...(withBasics ? FRIDGE_BASICS : []),
        ...(pantry ?? []).map((b) => b.name),
      ]),
    [recipes, items, withBasics, pantry],
  );


  function add(e: React.FormEvent) {
    e.preventDefault();
    // « œufs, courgettes » : plusieurs d'un coup
    const fresh = draft
      .split(/[,;\n]/)
      .map((t) => t.trim().toLowerCase())
      .filter((t, i, all) => t && !items.includes(t) && all.indexOf(t) === i);
    if (fresh.length) void setFridge([...items, ...fresh]);
    setDraft("");
  }

  return (
    <div className="pb-32">
      <header className="pt-safe mx-auto max-w-3xl px-4">
        <OfflineBanner className="mb-2" />
        <div className="flex items-center gap-2 pt-2">
          <Link href="/" aria-label="Retour" className="flex size-11 flex-none items-center justify-center rounded-full bg-surface">
            <IconBack size={20} />
          </Link>
          <h1 className="font-heading text-[34px] leading-[1.1]">Mon frigo</h1>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setFridge([])}
              aria-label="Tout enlever"
              className="ml-auto flex size-11 items-center justify-center rounded-full text-neutral-700"
            >
              <IconTrash size={18} />
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-3 px-4 pt-3">
        <form onSubmit={add} className="flex gap-2">
          <TextInput value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="J'ai aussi… ex. courgettes, poulet" enterKeyHint="done" />
          <button
            type="submit"
            aria-label="Ajouter"
            disabled={!draft.trim()}
            className="flex size-12 flex-none items-center justify-center rounded-full bg-accent-600 text-neutral-100 disabled:opacity-45"
          >
            <IconPlus size={20} />
          </button>
        </form>

        {/* les basiques d'un seul geste (comme « Masquer les basiques » des courses) */}
        <button type="button" onClick={() => setFridgeBasics(!withBasics)} className="flex min-h-12 items-center gap-2.5 px-1 text-left">
          <span className={cx("relative h-7 w-12 flex-none rounded-full transition-colors", withBasics ? "bg-leaf-600" : "bg-neutral-400")}>
            <span className={cx("absolute top-0.5 size-6 rounded-full bg-white shadow-sm transition-all", withBasics ? "left-[22px]" : "left-0.5")} />
          </span>
          <span className="flex flex-col text-sm leading-tight">
            <span className="font-bold">J&apos;ai les basiques</span>
            <span className="text-neutral-700">{FRIDGE_BASICS.join(", ")}</span>
          </span>
        </button>

        {items.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {items.map((it) => (
              <button
                key={it}
                type="button"
                onClick={() => setFridge(items.filter((x) => x !== it))}
                aria-label={`Enlever ${it}`}
                className="flex h-10 items-center gap-1.5 rounded-full bg-leaf-200 pr-3 pl-4 font-bold text-leaf-900"
              >
                {it} <span className="text-lg leading-none opacity-60">×</span>
              </button>
            ))}
          </div>
        )}

        {items.length > 0 && recipes !== undefined && matches.length === 0 && (
          <EmptyState title="Aucune recette">Aucune recette n&apos;utilise ces produits.</EmptyState>
        )}

        <div className="flex flex-col gap-2 pt-1">
          {matches.map(({ recipe: r, missing }) => {
            const colors = categoryColors(r.category);
            return (
              <Link
                key={r.id}
                href={`/recette?id=${r.id}`}
                className="flex flex-col gap-1 rounded-3xl px-4 py-3.5"
                style={{ background: colors.bg, color: colors.ink }}
              >
                <span className="text-[11px] font-bold tracking-[.06em] uppercase opacity-80">{getCategory(r.category).singular}</span>
                <span className="font-heading text-[21px] leading-[1.1]">{r.title}</span>
                <span className="text-[15px] leading-snug">
                  {missing.length === 0 ? (
                    <strong>Tout y est ✓</strong>
                  ) : (
                    <>
                      <strong>Il manque :</strong> {missing.join(", ")}
                    </>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </main>
      <TabBar />
    </div>
  );
}
