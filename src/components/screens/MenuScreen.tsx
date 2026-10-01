"use client";
/**
 * PLANNING (V2, maquette écrans 08 et 10) : menu de la semaine tiré au sort
 * selon les règles et l'objectif prioritaire ; vue Jour avec barres
 * « prévu / objectif » (ce qui est prévu, pas un journal alimentaire).
 */
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { OfflineBanner } from "@/components/app/OfflineBanner";
import { TabBar } from "@/components/app/TabBar";
import { GoalsSheet } from "@/components/planning/GoalsSheet";
import { NutritionBars, RecipeSquare, RulesIndicators, SlotRow } from "@/components/planning/parts";
import { RecipePicker } from "@/components/planning/RecipePicker";
import { SlotSheet } from "@/components/planning/SlotSheet";
import { ApplyTemplateSheet, SaveTemplateSheet } from "@/components/planning/TemplateSheets";
import { usePlanningWeek } from "@/components/planning/usePlanningWeek";
import { IconBack, IconCart, IconChevronRight, IconPlus, IconShuffle } from "@/components/ui/icons";
import { EmptyState, Spinner, cx } from "@/components/ui/primitives";
import { MOMENTS, momentLabel } from "@/config/moments";
import { useSettings } from "@/lib/data/hooks";
import { addDays, longLabel, parseDay, shortLetter, today, weekLabel, weekStart } from "@/lib/planning/dates";
import { isOnTarget, isOver, targetFor, targetValue } from "@/lib/planning/nutrition";
import type { MealPlanEntry } from "@/lib/planning/types";
import { isProteinRich } from "@/lib/recipes/tags";
import type { Recipe } from "@/lib/recipes/types";

export function MenuScreen() {
  const settings = useSettings();
  const { online, toast } = useApp();
  const [monday, setMonday] = useState(() => weekStart(today()));
  const [view, setView] = useState<"semaine" | "jour">("semaine");
  const [day, setDay] = useState(() => today());
  const [openSlot, setOpenSlot] = useState<MealPlanEntry | null>(null);
  const [picking, setPicking] = useState<MealPlanEntry | null>(null);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [saveTpl, setSaveTpl] = useState(false);
  const [applyTpl, setApplyTpl] = useState(false);
  const [busy, setBusy] = useState(false);

  const w = usePlanningWeek(monday);
  const current = w.days.find((d) => d.day === day) ?? w.days[0];
  const lockCount = w.days.reduce((n, d) => n + d.slots.filter((s) => s.locked).length, 0);
  const noGoals = !settings.dailyTargets.kcal && !settings.dailyTargets.proteinMinG;

  const guard = async (fn: () => Promise<void> | void) => {
    if (!online) return toast("Pas de réseau : le planning se modifie en ligne.");
    setBusy(true);
    await fn();
    setBusy(false);
  };

  const moveWeek = (n: number) => {
    const m = addDays(monday, 7 * n);
    setMonday(m);
    setDay(m);
  };

  const recipesOf = (slots: MealPlanEntry[]) => slots.map((s) => (s.recipeId ? w.byId.get(s.recipeId) : undefined)).filter(Boolean) as Recipe[];
  const liveSlot = (s: MealPlanEntry | null) => (s ? w.days.flatMap((d) => d.slots).find((x) => x.key === s.key) ?? s : null);
  const sheetSlot = liveSlot(openSlot);

  if (w.loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-neutral-600">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="pb-48">
      <header className="pt-safe mx-auto max-w-3xl px-4">
        <OfflineBanner className="mb-2" />
        <div className="flex items-end justify-between gap-3 px-1 pt-2">
          <h1 className="font-heading text-[34px] leading-[1.1]">Menu</h1>
          <button type="button" onClick={() => setGoalsOpen(true)} className="h-10 rounded-full border-[1.5px] border-divider px-4 text-sm font-bold">
            Objectifs
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Semaine précédente" onClick={() => moveWeek(-1)} className="flex size-10 items-center justify-center rounded-full">
              <IconBack size={20} />
            </button>
            <span className="text-[15px] font-bold">{weekLabel(monday)}</span>
            <button type="button" aria-label="Semaine suivante" onClick={() => moveWeek(1)} className="flex size-10 items-center justify-center rounded-full">
              <IconChevronRight size={20} />
            </button>
          </div>
          <div className="flex gap-1 rounded-full bg-surface p-1">
            {(["semaine", "jour"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cx("h-9 rounded-full px-4 text-sm font-bold capitalize", view === v && "bg-ink text-bg")}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-3.5 px-4 pt-3">
        {!w.hasRecipes ? (
          <EmptyState title="Pas encore de recettes">Ajoute des recettes pour pouvoir tirer un menu.</EmptyState>
        ) : (
          <>
            {noGoals && (
              <button type="button" onClick={() => setGoalsOpen(true)} className="rounded-3xl bg-accent-100 px-4 py-3 text-left font-bold text-accent-800">
                Fixe tes objectifs (kcal, protéines) pour un tirage sur mesure →
              </button>
            )}

            {view === "semaine" ? (
              <>
                <Link
                  href={`/courses?semaine=${monday}`}
                  className="flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-divider font-bold"
                >
                  <IconCart size={20} /> Liste de courses de la semaine
                </Link>
                {w.days.map((d) => {
                  const sum = w.nutritionOf(d.slots);
                  const kt = targetFor("kcal", settings.dailyTargets);
                  const kv = targetValue(kt);
                  return (
                    <div key={d.day} className="flex flex-col gap-1 rounded-[26px] bg-neutral-100 px-3 pt-3.5 pb-2.5 shadow-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setDay(d.day);
                          setView("jour");
                        }}
                        className="flex items-baseline justify-between px-1 text-left"
                      >
                        <span className={cx("font-heading text-[21px]", d.day === today() && "text-accent-700")}>
                          {longLabel(d.day).split(" ")[0]} {parseDay(d.day).getDate()}
                        </span>
                        <span className="text-sm font-bold">
                          {Math.round(sum.protein)} g prot. <span className={cx("font-semibold", isOver("kcal", sum.kcal, kt) ? "font-bold text-danger" : "text-neutral-700")}>
                            · {Math.round(sum.kcal).toLocaleString("fr-FR")} kcal
                          </span>
                        </span>
                      </button>
                      {kv && (
                        <div className="mx-1 my-1 h-1.5 overflow-hidden rounded-full bg-neutral-300">
                          <div
                            className={cx("h-full rounded-full", isOver("kcal", sum.kcal, kt) ? "bg-danger" : isOnTarget(sum.kcal, kt, 0.1) ? "bg-leaf-600" : "bg-accent-500")}
                            style={{ width: `${Math.min(100, (sum.kcal / kv) * 100)}%` }}
                          />
                        </div>
                      )}
                      {d.slots.map((s) => {
                        const r = s.recipeId ? w.byId.get(s.recipeId) : undefined;
                        return (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => setOpenSlot(s)}
                            className="flex min-h-14 items-center gap-3 rounded-2xl px-1 py-1.5 text-left active:bg-surface"
                          >
                            <RecipeSquare recipe={r} size={42} />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="text-xs font-bold tracking-[.04em] text-neutral-700 uppercase">
                                {momentLabel(s.meal)} {s.locked && "· gardé"}
                              </span>
                              <span className="leading-tight font-bold">{r?.title ?? "À choisir"}</span>
                            </span>
                            {r && (
                              <span className="text-sm font-bold whitespace-nowrap text-neutral-800">
                                {Math.round((r.proteinG ?? 0) * s.portions)} g · {Math.round((r.kcal ?? 0) * s.portions)} kcal
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <div className="flex gap-1.5">
                  {w.days.map((d) => {
                    const rs = recipesOf(d.slots);
                    const good =
                      rs.some((r) => isProteinRich(r, { proteinRichThresholdG: settings.proteinRichThresholdG })) && rs.some((r) => r.hasVegetables);
                    const sel = d.day === current.day;
                    return (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => setDay(d.day)}
                        className={cx("flex h-[62px] flex-1 flex-col items-center justify-center gap-px rounded-[20px]", sel ? "bg-ink text-bg" : "bg-surface")}
                      >
                        <span className="text-xs font-bold opacity-80">{shortLetter(d.day)}</span>
                        <span className="font-heading text-[19px] leading-none">{parseDay(d.day).getDate()}</span>
                        <span className={cx("size-1.5 rounded-full", good ? "bg-leaf-500" : "bg-transparent")} />
                      </button>
                    );
                  })}
                </div>
                <div className="px-1 font-heading text-[23px]">{longLabel(current.day)}</div>
                <NutritionBars sum={w.nutritionOf(current.slots)} targets={settings.dailyTargets} priority={settings.planning.priority} />
                <RulesIndicators recipes={recipesOf(current.slots)} threshold={settings.proteinRichThresholdG} />
                <div className="flex flex-col gap-2">
                  {current.slots.map((s, i) => (
                    <SlotRow
                      key={s.key}
                      slot={s}
                      recipe={s.recipeId ? w.byId.get(s.recipeId) : undefined}
                      onOpen={() => setOpenSlot(s)}
                      onLock={() => guard(() => w.toggleLock(s))}
                      onSwap={() => guard(() => w.reroll(current.day, i))}
                    />
                  ))}
                </div>
                {MOMENTS.some((m) => !current.slots.some((s) => s.meal === m.id)) && (
                  <div className="flex flex-wrap gap-2">
                    {MOMENTS.filter((m) => !current.slots.some((s) => s.meal === m.id)).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => guard(() => w.addMeal(current.day, m.id))}
                        className="flex h-10 items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-neutral-500 px-3.5 text-sm font-bold text-neutral-800"
                      >
                        <IconPlus size={16} /> {m.label}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => guard(() => w.drawDay(current.day))}
                  className="flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-divider font-bold"
                >
                  <IconShuffle size={18} /> Tirer cette journée
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setSaveTpl(true)} className="min-h-14 rounded-[20px] border-[1.5px] border-divider px-3 text-sm font-bold">
                    Enregistrer comme modèle
                  </button>
                  <button type="button" onClick={() => setApplyTpl(true)} className="min-h-14 rounded-[20px] border-[1.5px] border-divider px-3 text-sm font-bold">
                    Appliquer un modèle
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {w.hasRecipes && (
        <button
          type="button"
          disabled={busy}
          onClick={() => guard(w.drawWeek)}
          className="fixed inset-x-4 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 mx-auto flex h-14 max-w-md items-center justify-center gap-2.5 rounded-full bg-accent-600 font-heading text-lg text-neutral-100 shadow-lg disabled:opacity-70"
        >
          {busy ? <Spinner /> : <IconShuffle size={20} />}
          Tirer la semaine au sort
          {lockCount > 0 && <span className="font-sans text-sm font-bold opacity-85">· {lockCount} gardés</span>}
        </button>
      )}

      <SlotSheet
        slot={sheetSlot}
        recipe={sheetSlot?.recipeId ? w.byId.get(sheetSlot.recipeId) : undefined}
        onClose={() => setOpenSlot(null)}
        onRandom={() =>
          guard(async () => {
            const d = w.days.find((x) => x.day === sheetSlot!.day)!;
            await w.reroll(d.day, d.slots.findIndex((x) => x.key === sheetSlot!.key));
            setOpenSlot(null);
          })
        }
        onChoose={() => {
          setPicking(sheetSlot);
          setOpenSlot(null);
        }}
        onLock={() => guard(() => w.toggleLock(sheetSlot!))}
        onPortions={(p) => guard(() => w.setPortions(sheetSlot!, p))}
        onClear={() =>
          guard(async () => {
            await w.removeMeal(sheetSlot!);
            setOpenSlot(null);
          })
        }
      />

      {picking &&
        (() => {
          const d = w.days.find((x) => x.day === picking.day)!;
          return (
            <RecipePicker
              dayEntries={d.slots}
              index={d.slots.findIndex((x) => x.key === picking.key)}
              ctx={w.ctx}
              byId={w.byId}
              onClose={() => setPicking(null)}
              onPick={(id) =>
                guard(async () => {
                  await w.setRecipe(liveSlot(picking)!, id);
                  setPicking(null);
                })
              }
            />
          );
        })()}

      {goalsOpen && <GoalsSheet settings={settings} open onClose={() => setGoalsOpen(false)} />}
      <SaveTemplateSheet open={saveTpl} onClose={() => setSaveTpl(false)} day={current.slots} week={w.days.map((d) => d.slots)} />
      <ApplyTemplateSheet
        open={applyTpl}
        onClose={() => setApplyTpl(false)}
        byId={w.byId}
        onApply={(t) =>
          guard(async () => {
            const targetDays = t.kind === "jour" ? [current.day] : w.days.map((d) => d.day);
            const fills = targetDays.flatMap((dday, i) =>
              t.meals
                .filter((m) => (t.kind === "jour" ? m.dayOffset === 0 : m.dayOffset === i))
                .map((m) => ({ day: dday, meal: m.meal, recipeId: m.recipeId })),
            );
            // un jour sans aucune ligne dans le modèle est quand même rempli (tirage)
            for (const dday of targetDays) if (!fills.some((f) => f.day === dday)) fills.push({ day: dday, meal: "", recipeId: null });
            await w.applyMeals(fills);
            setApplyTpl(false);
            toast(`« ${t.name} » appliqué`);
          })
        }
      />
      <TabBar />
    </div>
  );
}
