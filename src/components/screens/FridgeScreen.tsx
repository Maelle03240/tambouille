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
import { IconBack, IconCheck, IconPlus, IconTrash } from "@/components/ui/icons";
import { EmptyState, TextInput, cx } from "@/components/ui/primitives";
import { categoryColors, getCategory } from "@/config/categories";
import { FRIDGE_ALWAYS, FRIDGE_STAPLES } from "@/config/fridge";
import { setFridge } from "@/lib/data/actions";
import { useFridge, usePantry, useRecipes } from "@/lib/data/hooks";
import { fridgeMatches } from "@/lib/recipes/fridge";

export function FridgeScreen() {
  const recipes = useRecipes();
  const pantry = usePantry();
  const fridge = useFridge();
  const [draft, setDraft] = useState("");

  const items = useMemo(() => fridge ?? [], [fridge]);
  const matches = useMemo(
    () => fridgeMatches(recipes ?? [], items, [...FRIDGE_ALWAYS, ...(pantry ?? []).map((b) => b.name)]),
    [recipes, items, pantry],
  );

  const staples: readonly string[] = FRIDGE_STAPLES;
  const others = items.filter((it) => !staples.includes(it));
  const toggle = (it: string) => setFridge(items.includes(it) ? items.filter((x) => x !== it) : [...items, it]);

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
          <TextInput value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="J'ai… ex. œufs, courgettes" enterKeyHint="done" />
          <button
            type="submit"
            aria-label="Ajouter"
            disabled={!draft.trim()}
            className="flex size-12 flex-none items-center justify-center rounded-full bg-accent-600 text-neutral-100 disabled:opacity-45"
          >
            <IconPlus size={20} />
          </button>
        </form>

        {/* classiques : un geste au lieu de tout écrire */}
        <div className="flex flex-wrap gap-1.5">
          {staples.map((it) => {
            const on = items.includes(it);
            return (
              <button
                key={it}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(it)}
                className={cx(
                  "flex h-9 items-center gap-1 rounded-full border-[1.5px] px-3.5 text-sm font-bold",
                  on ? "border-leaf-700 bg-leaf-700 text-neutral-100" : "border-divider text-neutral-800",
                )}
              >
                {on && <IconCheck size={14} stroke={3} />}
                {it}
              </button>
            );
          })}
        </div>

        {others.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {others.map((it) => (
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
