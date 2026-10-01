"use client";
/**
 * LISTE DE COURSES (V2, maquette écran 09) : ingrédients du menu de la
 * semaine + recettes ajoutées, additionnés et rangés par rayon, basiques
 * masqués, partage vers Notes / Keep (ou copie).
 */
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { OfflineBanner } from "@/components/app/OfflineBanner";
import { TabBar } from "@/components/app/TabBar";
import { IconBack, IconCheck, IconChevronDown, IconChevronRight, IconClose, IconMinus, IconPlus, IconShare, IconTrash } from "@/components/ui/icons";
import { EmptyState, Sheet, TextInput, cx } from "@/components/ui/primitives";
import { AISLES, AISLE_HUES, guessAisle } from "@/config/aisles";
import { addPantryBasic, removePantryBasic, updateShopping } from "@/lib/data/actions";
import { useMealPlans, usePantry, useRecipes, useShopping } from "@/lib/data/hooks";
import { addDays, today, weekLabel, weekStart } from "@/lib/planning/dates";
import { formatDecimal, servingsStep } from "@/lib/recipes/quantities";
import type { Recipe } from "@/lib/recipes/types";
import { aggregate, personalItems, toShareText, type ShoppingItem } from "@/lib/shopping/aggregate";

export function ShoppingScreen() {
  const params = useSearchParams();
  const { toast, online } = useApp();
  const [monday, setMonday] = useState(() => weekStart(params.get("semaine") ?? today()));
  const recipes = useRecipes();
  const plans = useMealPlans(monday, addDays(monday, 6));
  const shopping = useShopping();
  const pantry = usePantry();
  const [showBasics, setShowBasics] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [basicsOpen, setBasicsOpen] = useState(false);
  const [newBasic, setNewBasic] = useState("");
  const [itemMenu, setItemMenu] = useState<ShoppingItem | null>(null);
  const [draft, setDraft] = useState("");

  const byId = useMemo(() => new Map((recipes ?? []).map((r) => [r.id, r])), [recipes]);

  /** Recettes de la liste : celles du menu (une fois chacune, recette entière) + ajouts. */
  const sources = useMemo(() => {
    if (!shopping) return [];
    const list: { recipe: Recipe; servings: number; fromPlan: boolean }[] = [];
    const planned = [...new Set((plans ?? []).map((p) => p.recipeId).filter(Boolean) as string[])];
    for (const id of planned) {
      const r = byId.get(id);
      if (!r || shopping.excluded.includes(id)) continue;
      list.push({ recipe: r, servings: shopping.servings[id] ?? (r.yieldQuantity || 1), fromPlan: true });
    }
    for (const e of shopping.extras) {
      const r = byId.get(e.recipeId);
      if (!r || list.some((x) => x.recipe.id === r.id)) continue;
      list.push({ recipe: r, servings: shopping.servings[r.id] ?? e.servings, fromPlan: false });
    }
    return list;
  }, [plans, shopping, byId]);

  const items = useMemo(
    () => [...aggregate(sources, (pantry ?? []).map((b) => b.name)), ...personalItems(shopping?.mine ?? [])],
    [sources, pantry, shopping],
  );
  const visible = items.filter((i) => showBasics || !i.basic);
  const checked = new Set(shopping?.checked ?? []);
  const left = visible.filter((i) => !checked.has(i.key)).length;
  const basicsCount = items.filter((i) => i.basic).length;

  const toggle = (key: string) =>
    updateShopping((s) => ({ ...s, checked: s.checked.includes(key) ? s.checked.filter((k) => k !== key) : [...s.checked, key] }));

  const setServings = (r: Recipe, v: number) =>
    updateShopping((s) => ({ ...s, servings: { ...s.servings, [r.id]: Math.max(servingsStep(r.yieldQuantity), v) } }));

  const removeSource = (r: Recipe, fromPlan: boolean) =>
    updateShopping((s) =>
      fromPlan ? { ...s, excluded: [...s.excluded, r.id] } : { ...s, extras: s.extras.filter((e) => e.recipeId !== r.id) },
    );

  function addMine(e: React.FormEvent) {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    const text = t.charAt(0).toUpperCase() + t.slice(1);
    const aisle = guessAisle(t);
    updateShopping((s) => ({ ...s, mine: [...s.mine, { id: crypto.randomUUID(), text, aisle }] }));
    setDraft("");
    toast(`Rayon ${aisle}`);
  }

  const mineId = (it: ShoppingItem) => it.key.slice("perso:".length);
  const setMineAisle = (it: ShoppingItem, aisle: string) =>
    updateShopping((s) => ({ ...s, mine: s.mine.map((m) => (m.id === mineId(it) ? { ...m, aisle } : m)) }));
  const removeMine = (it: ShoppingItem) =>
    updateShopping((s) => ({ ...s, mine: s.mine.filter((m) => m.id !== mineId(it)), checked: s.checked.filter((k) => k !== it.key) }));

  async function share() {
    const text = toShareText(visible.filter((i) => !checked.has(i.key)), `Courses · ${weekLabel(monday)}`);
    try {
      if (navigator.share) return await navigator.share({ text });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast("Liste copiée");
    } catch {
      toast("Copie impossible sur cet appareil");
    }
  }

  const loading = recipes === undefined || plans === undefined || shopping === undefined;

  return (
    <div className="pb-32">
      <header className="pt-safe mx-auto max-w-3xl px-4">
        <OfflineBanner className="mb-2" />
        <div className="flex items-end justify-between gap-3 px-1 pt-2">
          <h1 className="font-heading text-[36px] leading-[1.1]">Courses</h1>
          {visible.length > 0 && (
            <button type="button" onClick={share} className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-divider px-4 font-bold">
              <IconShare size={18} /> Partager
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 pt-1">
          <button type="button" aria-label="Semaine précédente" onClick={() => setMonday(addDays(monday, -7))} className="flex size-10 items-center justify-center">
            <IconBack size={20} />
          </button>
          <span className="text-[15px] font-bold whitespace-nowrap">{weekLabel(monday)}</span>
          <button type="button" aria-label="Semaine suivante" onClick={() => setMonday(addDays(monday, 7))} className="flex size-10 items-center justify-center">
            <IconChevronRight size={20} />
          </button>
          {items.length > 0 && <span className="ml-auto text-sm font-bold whitespace-nowrap text-neutral-700">{left} restants</span>}
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-3 px-4 pt-2">
        <form onSubmit={addMine} className="flex items-center gap-1.5 rounded-full bg-surface py-[5px] pr-[5px] pl-[18px]">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ajouter… ex. papier toilette"
            enterKeyHint="done"
            style={{ outline: "none" }}
            className="h-11 min-w-0 flex-1 bg-transparent text-base placeholder:text-neutral-600"
          />
          <button type="submit" aria-label="Ajouter" disabled={!draft.trim()} className="flex size-11 flex-none items-center justify-center rounded-full bg-accent-600 text-neutral-100 disabled:opacity-45">
            <IconPlus size={20} />
          </button>
        </form>
        {loading ? null : items.length === 0 ? (
          <EmptyState title="Rien à acheter">Tire un menu de la semaine, ou « Ajouter aux courses » depuis une recette.</EmptyState>
        ) : (
          <>
            {sources.length > 0 && (
              <div className="rounded-[26px] bg-surface">
                <button type="button" onClick={() => setSourcesOpen((o) => !o)} className="flex min-h-14 w-full items-center gap-3 px-4 text-left">
                  <span className="flex-1 font-bold">
                    Pour {sources.length} recette{sources.length > 1 ? "s" : ""}
                  </span>
                  <span className={cx("transition-transform", sourcesOpen && "rotate-180")}>
                    <IconChevronDown size={20} />
                  </span>
                </button>
                {sourcesOpen && (
                  <div className="flex flex-col px-2 pb-2">
                    {sources.map(({ recipe: r, servings, fromPlan }) => (
                      <div key={r.id} className="flex items-center gap-2 border-t border-divider py-2 pl-2">
                        <span className="min-w-0 flex-1 leading-tight font-bold">
                          {r.title}
                          <span className="block text-[13px] font-normal text-neutral-700">
                            {formatDecimal(servings)} {r.yieldUnit}
                            {fromPlan ? " · menu" : ""}
                          </span>
                        </span>
                        <button type="button" aria-label="Moins" onClick={() => setServings(r, servings - servingsStep(r.yieldQuantity))} className="flex size-10 items-center justify-center rounded-full bg-neutral-100">
                          <IconMinus size={18} />
                        </button>
                        <button type="button" aria-label="Plus" onClick={() => setServings(r, servings + servingsStep(r.yieldQuantity))} className="flex size-10 items-center justify-center rounded-full bg-neutral-100">
                          <IconPlus size={18} />
                        </button>
                        <button type="button" aria-label="Retirer" onClick={() => removeSource(r, fromPlan)} className="flex size-10 items-center justify-center rounded-full text-neutral-700">
                          <IconClose size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowBasics((v) => !v)} className="flex min-h-12 flex-1 items-center gap-2.5 px-1.5 text-left">
                <span className={cx("relative h-7 w-12 flex-none rounded-full transition-colors", !showBasics ? "bg-leaf-600" : "bg-neutral-400")}>
                  <span className={cx("absolute top-0.5 size-6 rounded-full bg-white shadow-sm transition-all", !showBasics ? "left-[22px]" : "left-0.5")} />
                </span>
                <span className="text-sm leading-tight font-semibold">
                  Masquer les basiques <span className="font-normal text-neutral-700">· {basicsCount}</span>
                </span>
              </button>
              <button type="button" onClick={() => setBasicsOpen(true)} className="h-11 rounded-full px-3 text-sm font-bold text-accent-700">
                Mes basiques
              </button>
            </div>

            {AISLES.map((aisle) => {
              const its = visible.filter((i) => i.aisle === aisle).sort((a, b) => Number(checked.has(a.key)) - Number(checked.has(b.key)));
              if (!its.length) return null;
              const hue = AISLE_HUES[aisle];
              const remaining = its.filter((i) => !checked.has(i.key)).length;
              return (
                <section key={aisle} className="flex flex-col rounded-[26px] bg-neutral-100 px-2 pt-3 pb-1.5 shadow-sm">
                  <div className="flex items-center gap-2.5 px-2.5 pb-1.5">
                    <span className="size-3.5 flex-none rounded-full" style={{ background: hue == null ? "var(--color-neutral-400)" : `oklch(0.72 0.1 ${hue})` }} />
                    <span className="flex-1 font-heading text-[19px]">{aisle}</span>
                    <span className="text-[13px] font-bold text-neutral-700">{remaining ? `${remaining} / ${its.length}` : "✓"}</span>
                  </div>
                  {its.map((it) => {
                    const on = checked.has(it.key);
                    return (
                      <div key={it.key} className="flex items-center">
                        <button type="button" onClick={() => toggle(it.key)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-[18px] px-2.5 py-1.5 text-left">
                          <span
                            className={cx(
                              "flex size-[30px] flex-none items-center justify-center rounded-full border-2 text-neutral-100",
                              on ? "border-leaf-600 bg-leaf-600" : "border-neutral-500",
                            )}
                          >
                            {on && <IconCheck size={16} stroke={3.5} />}
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className={cx("text-[17px] leading-snug", on && "text-neutral-600 line-through")}>
                              {it.amount && <strong className="font-bold">{it.amount} </strong>}
                              {it.amount ? it.label : it.label.charAt(0).toUpperCase() + it.label.slice(1)}
                            </span>
                            {it.from.length > 0 && <span className="truncate text-[13px] text-neutral-700">{it.from.join(" + ")}</span>}
                          </span>
                          {it.perso && (
                            <span className="ml-auto flex-none rounded-full bg-leaf-200 px-2.5 py-0.5 text-[11px] font-bold text-leaf-800">Perso</span>
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label="Options"
                          onClick={() => setItemMenu(it)}
                          className="flex size-10 flex-none items-center justify-center rounded-full text-lg font-bold text-neutral-600"
                        >
                          ⋯
                        </button>
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </>
        )}
      </main>

      <Sheet open={!!itemMenu} onClose={() => setItemMenu(null)} title={itemMenu?.label}>
        {itemMenu?.perso && (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {AISLES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setMineAisle(itemMenu, a);
                    setItemMenu(null);
                  }}
                  className={cx("h-10 rounded-full px-4 font-bold", a === itemMenu.aisle ? "bg-neutral-900 text-neutral-100" : "bg-surface")}
                >
                  {a}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                removeMine(itemMenu);
                setItemMenu(null);
              }}
              className="mb-2 h-14 rounded-full bg-surface font-bold"
            >
              Retirer de la liste
            </button>
          </>
        )}
        {itemMenu && !itemMenu.perso && (
          <button
            type="button"
            disabled={!online}
            onClick={async () => {
              try {
                if (itemMenu.basic) {
                  const b = pantry?.find((p) => itemMenu.label.toLowerCase().includes(p.name));
                  if (b) await removePantryBasic(b.id);
                } else {
                  await addPantryBasic(itemMenu.label.replace(/^(de |d'|d’)/, ""));
                }
                setItemMenu(null);
              } catch (e) {
                toast(e instanceof Error ? e.message : "Impossible");
              }
            }}
            className="mb-2 h-14 rounded-full bg-surface font-bold disabled:opacity-45"
          >
            {itemMenu.basic ? "Ce n'est plus un basique" : "Toujours dans mes placards (basique)"}
          </button>
        )}
      </Sheet>

      <Sheet open={basicsOpen} onClose={() => setBasicsOpen(false)} title="Mes basiques">
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await addPantryBasic(newBasic);
              setNewBasic("");
            } catch (err) {
              toast(err instanceof Error ? err.message : "Impossible");
            }
          }}
        >
          <TextInput value={newBasic} onChange={(e) => setNewBasic(e.target.value)} placeholder="ex. sel, poivre, huile d'olive" />
          <button type="submit" disabled={!online || !newBasic.trim()} className="flex size-12 flex-none items-center justify-center rounded-full bg-accent-600 text-neutral-100 disabled:opacity-45">
            <IconPlus size={20} />
          </button>
        </form>
        <div className="mb-2 flex flex-wrap gap-2">
          {pantry?.map((b) => (
            <span key={b.id} className="flex h-10 items-center gap-1 rounded-full bg-surface pr-1 pl-4 font-bold">
              {b.name}
              <button type="button" aria-label={`Retirer ${b.name}`} disabled={!online} onClick={() => removePantryBasic(b.id).catch((e) => toast(e.message))} className="flex size-8 items-center justify-center rounded-full text-neutral-700">
                <IconTrash size={15} />
              </button>
            </span>
          ))}
        </div>
      </Sheet>
      <TabBar />
    </div>
  );
}
