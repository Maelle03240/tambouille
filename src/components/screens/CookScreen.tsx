"use client";
/**
 * MODE CUISINE (priorité 1, maquette écrans 01b et 02).
 * - toutes les étapes visibles en défilant, jamais une seule à l'écran ;
 * - toucher une étape = en cours ; la toucher encore = faite → suivante ;
 * - quantités recalculées dans le texte selon les portions ;
 * - minuteurs en parallèle, alerte son + vibration ; écran maintenu allumé ;
 * - portrait : une colonne ; iPad / paysage : ingrédients à gauche, étapes à droite.
 */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { OfflineBanner } from "@/components/app/OfflineBanner";
import { unlockAudio } from "@/components/cook/alarm";
import { STEP_STYLES } from "@/components/cook/stepStyles";
import { TimerDial, TimerPill, TimersBar, type DialMode } from "@/components/cook/Timers";
import { remainingSec, useCookSession } from "@/components/cook/useCookSession";
import { useFollowScroll } from "@/components/cook/useFollowScroll";
import { useWakeLock } from "@/components/cook/useWakeLock";
import { AimSheet } from "@/components/cook/AimSheet";
import { useVoiceCommands } from "@/components/cook/useVoiceCommands";
import { timersIn } from "@/lib/recipes/markers";
import { CheckableIngredients } from "@/components/recipe/IngredientList";
import { ReviewNoteSheet } from "@/components/recipe/ReviewNoteSheet";
import { StepText, stepPlainText } from "@/components/recipe/StepText";
import { IconBack, IconBookmark, IconCheck, IconChevronDown, IconMic, IconMinus, IconPlus } from "@/components/ui/icons";
import { EmptyState, Spinner, cx } from "@/components/ui/primitives";
import { getCategory } from "@/config/categories";
import { UI } from "@/config/ui";
import { patchRecipe } from "@/lib/data/actions";
import { RATINGS } from "@/config/ui";
import { useRecipe } from "@/lib/data/hooks";
import { useSearchId } from "@/lib/hooks/useSearchId";
import { formatDuration } from "@/lib/recipes/markers";
import { formatDecimal, servingsStep } from "@/lib/recipes/quantities";
import { totalMinutes } from "@/lib/recipes/tags";
import type { Recipe } from "@/lib/recipes/types";

export function CookScreen() {
  const id = useSearchId();
  const recipe = useRecipe(id);
  if (recipe === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-neutral-600">
        <Spinner />
      </div>
    );
  }
  if (!recipe) {
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
  return <Cook recipe={recipe} />;
}

function Cook({ recipe }: { recipe: Recipe }) {
  useWakeLock();
  const { canEdit, online, toast } = useApp();
  const base = recipe.yieldQuantity || 1;
  const s = useCookSession(recipe.id, base, recipe.steps.length);
  const factor = s.servings / base;
  const look = STEP_STYLES[UI.cookStepStyle];

  const [ingOpen, setIngOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewAdded, setReviewAdded] = useState(false);
  const [aimOpen, setAimOpen] = useState(false);
  const [openedDial, setDial] = useState<{ key: string; stepIndex: number; minutes: number } | null>(null);
  // Un minuteur qui sonne ouvre son cadran
  const ringingTimer = s.ringing ? s.timers[s.ringing] : undefined;
  const dial = ringingTimer
    ? { key: ringingTimer.key, stepIndex: ringingTimer.stepIndex, minutes: ringingTimer.minutes }
    : openedDial;

  const timerList = useMemo(() => Object.values(s.timers).sort((a, b) => a.stepIndex - b.stepIndex), [s.timers]);
  const allDone = recipe.steps.length > 0 && s.current >= recipe.steps.length;

  // L'étape en cours suit le défilement…
  const stepsColumn = useRef<HTMLElement>(null);
  const follow = useFollowScroll({ container: stepsColumn, enabled: !allDone, onStep: s.followStep });

  const scrollToStep = follow.scrollToStep;

  // …et toucher une étape la fait passer (et défiler) : l'étape touchée si
  // elle n'était pas en cours, sinon la suivante (« c'est fait »).
  function onTapStep(i: number) {
    const next = i === s.current ? i + 1 : i;
    s.tapStep(i);
    if (next < recipe.steps.length) scrollToStep(next);
  }

  // Commande vocale (en option)
  const voice = useVoiceCommands((cmd, heard) => {
    toast(`« ${heard.trim()} »`);
    if (cmd.kind === "next" && s.current < recipe.steps.length) onTapStep(s.current);
    else if (cmd.kind === "previous" && s.current > 0) onTapStep(s.current - 1);
    else if (cmd.kind === "stop") {
      if (s.ringing) s.stopTimer(s.ringing);
      s.acknowledge();
      setDial(null);
    } else if (cmd.kind === "timer") {
      const step = recipe.steps[s.current];
      const inStep = step ? timersIn(step.text)[0] : undefined;
      const minutes = cmd.minutes ?? inStep;
      if (!minutes) return toast("Dis par exemple « minuteur 10 minutes »");
      const key = cmd.minutes == null && step ? `${step.id}:0` : `voix:${Date.now()}`;
      unlockAudio();
      s.startTimer(key, Math.min(s.current, recipe.steps.length - 1), minutes, minutes * 60);
    }
  });

  // Reprise d'une cuisson en cours : on revient sur l'étape où on en était
  // (pas à l'ouverture sur l'étape 1 : on laisse voir le titre et les portions)
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (s.current > 0 && s.current < recipe.steps.length) scrollToStep(s.current, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const step = servingsStep(base);
  const total = totalMinutes(recipe);
  const kicker = [
    getCategory(recipe.category).singular,
    total ? formatDuration(total) : null,
    recipe.kcal != null ? `${Math.round(recipe.kcal)} kcal/pers.` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  function openDial(key: string, stepIndex: number, minutes: number) {
    unlockAudio();
    setDial({ key, stepIndex, minutes });
  }

  const dialTimer = dial ? s.timers[dial.key] : undefined;
  const dialMode: DialMode = !dialTimer ? "new" : dialTimer.rang ? "done" : "run";

  function closeDial() {
    if (dialMode === "done" && dial) s.stopTimer(dial.key);
    s.acknowledge();
    setDial(null);
  }

  async function rate(rating: Recipe["rating"]) {
    try {
      await patchRecipe(recipe.id, { rating, tags: recipe.tags.filter((t) => t !== "a-tester") });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Modification impossible");
    }
  }

  async function markTested() {
    try {
      await patchRecipe(recipe.id, { tags: recipe.tags.filter((t) => t !== "a-tester") });
      toast("Recette marquée comme testée");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Modification impossible");
    }
  }

  const reviewButton = (
    <button
      type="button"
      onClick={() => setReviewOpen(true)}
      className={cx(
        "flex h-11 flex-none items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-sm font-bold",
        reviewAdded ? "border-transparent bg-accent-200 text-accent-800" : "border-divider text-neutral-800",
      )}
    >
      <IconBookmark size={16} fill={reviewAdded ? "currentColor" : "none"} />
      {reviewAdded ? "À revoir ✓" : "À revoir"}
    </button>
  );

  return (
    <div className="min-h-dvh wide:flex wide:h-dvh wide:flex-col wide:overflow-hidden" onClickCapture={unlockAudio} onTouchEndCapture={unlockAudio}>
      {/* En-tête */}
      <header className="pt-safe sticky top-0 z-20 bg-bg/95 px-3 pb-1.5 backdrop-blur-sm wide:static wide:flex-none wide:px-6 wide:pb-4">
        <OfflineBanner className="mb-1 wide:hidden" />
        <div className="flex items-center justify-between gap-3 wide:gap-[18px]">
          <Link
            href={`/recette?id=${recipe.id}`}
            aria-label="Retour à la fiche"
            className="flex size-12 flex-none items-center justify-center rounded-full bg-surface wide:size-[52px]"
          >
            <IconBack />
          </Link>
          <div className="hidden flex-1 flex-col wide:flex">
            <div className="text-[13px] font-bold tracking-[.04em] text-accent-700 uppercase">{kicker}</div>
            <h1 className="font-heading text-[34px] leading-[1.1]">{recipe.title}</h1>
          </div>
          <OfflineBanner compact className="hidden wide:flex" />
          {voice.supported && (
            <button
              type="button"
              onClick={voice.toggle}
              aria-label={voice.listening ? "Couper le micro" : "Commande vocale"}
              aria-pressed={voice.listening}
              className={cx(
                "ml-auto flex size-11 flex-none items-center justify-center rounded-full border-[1.5px] wide:ml-0",
                voice.listening ? "animate-pulse border-transparent bg-accent-600 text-neutral-100" : "border-divider text-neutral-800",
              )}
            >
              <IconMic size={20} />
            </button>
          )}
          {reviewButton}
        </div>
      </header>

      <div className="px-3.5 wide:grid wide:min-h-0 wide:flex-1 wide:grid-cols-[minmax(300px,390px)_minmax(0,1fr)] wide:gap-2 wide:pr-4 wide:pl-5">
        {/* Colonne ingrédients */}
        <aside className="wide:no-scrollbar wide:overflow-y-auto wide:rounded-t-[28px] wide:bg-surface wide:px-3 wide:pt-5 wide:pb-10">
          <div className="flex flex-col gap-1.5 px-1.5 pt-2 pb-[18px] wide:hidden">
            <div className="text-sm font-bold tracking-[.04em] text-accent-700 uppercase">{kicker}</div>
            <h1 className="font-heading text-[36px] leading-[1.08]">{recipe.title}</h1>
          </div>

          <div className="flex items-center justify-between px-1.5 pb-4 wide:px-2.5 wide:pb-3">
            <div className="flex flex-col">
              <span className="text-[17px] font-bold">Portions</span>
              <span className="text-sm text-neutral-700">{recipe.yieldUnit}</span>
              {(recipe.kcal != null || recipe.proteinG != null) && (
                <button type="button" onClick={() => setAimOpen(true)} className="mt-0.5 self-start text-sm font-bold text-accent-700">
                  Viser kcal / protéines
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-surface p-[5px] wide:bg-bg">
              <button
                type="button"
                aria-label="Moins"
                onClick={() => s.setServings((v) => Math.max(step, +(v - step).toFixed(2)))}
                className="flex size-[50px] items-center justify-center rounded-full bg-neutral-100 shadow-sm"
              >
                <IconMinus />
              </button>
              <div className="min-w-12 text-center font-heading text-[28px]">{formatDecimal(s.servings)}</div>
              <button
                type="button"
                aria-label="Plus"
                onClick={() => s.setServings((v) => +(v + step).toFixed(2))}
                className="flex size-[50px] items-center justify-center rounded-full bg-neutral-100 shadow-sm"
              >
                <IconPlus />
              </button>
            </div>
          </div>

          <div className="mb-[26px] rounded-[28px] bg-surface wide:mb-0 wide:bg-transparent">
            <button
              type="button"
              onClick={() => setIngOpen((o) => !o)}
              className="flex min-h-16 w-full items-center gap-3 px-5 wide:pointer-events-none wide:min-h-0 wide:px-2.5 wide:pb-1"
              aria-expanded={ingOpen}
            >
              <span className="flex-1 text-left font-heading text-[22px]">Ingrédients</span>
              <span className="text-[15px] font-bold text-neutral-700">
                {s.checked.size}/{recipe.ingredients.length}
              </span>
              <span className={cx("transition-transform wide:hidden", ingOpen && "rotate-180")}>
                <IconChevronDown />
              </span>
            </button>
            <div className={cx("px-2 pb-2.5 wide:block wide:px-0", !ingOpen && "hidden")}>
              <CheckableIngredients
                ingredients={recipe.ingredients}
                factor={factor}
                checked={s.checked}
                onToggle={s.toggleChecked}
              />
              <Link href="/astuces" className="mt-2 flex h-11 items-center justify-center rounded-full text-sm font-bold text-accent-700">
                Mesures, four, cuissons →
              </Link>
            </div>
          </div>
        </aside>

        {/* Colonne étapes */}
        <main ref={stepsColumn} className="wide:no-scrollbar wide:overflow-y-auto wide:px-4 wide:pt-1">
          {recipe.personalNotes && (
            <div className="mb-3 max-w-[720px] rounded-3xl bg-leaf-200 px-4 py-3 text-base leading-relaxed text-leaf-900">
              <strong>Ma note ·</strong> {recipe.personalNotes}
            </div>
          )}
          <h2 className="px-1.5 pb-2.5 font-heading text-[22px] wide:hidden">Étapes</h2>
          <ol className="flex max-w-[720px] flex-col gap-3 pt-2">
            {recipe.steps.map((st, i) => {
              const state = i === s.current ? "current" : i < s.current ? "done" : "todo";
              const L = look[state];
              let timerIdx = 0;
              return (
                <li key={st.id} data-step={i} onClick={() => onTapStep(i)} className={L.card}>
                  <div className={L.num}>{state === "done" ? <IconCheck size={18} stroke={3.5} /> : i + 1}</div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className={L.text}>
                      <StepText
                        text={st.text}
                        ingredients={recipe.ingredients}
                        factor={factor}
                        renderTimer={(minutes) => {
                          const key = `${st.id}:${timerIdx++}`;
                          return (
                            <TimerPill
                              minutes={minutes}
                              timer={s.timers[key]}
                              now={s.now}
                              onOpen={() => openDial(key, i, minutes)}
                            />
                          );
                        }}
                      />
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          {allDone && (
            <div className="mt-6 flex max-w-[720px] flex-col items-center gap-3 rounded-[28px] bg-leaf-200 px-5 py-7 text-center text-leaf-900">
              <p className="font-heading text-[30px]">Bon appétit !</p>
              {canEdit && (
                <div className="flex flex-wrap justify-center gap-2">
                  {RATINGS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      disabled={!online}
                      onClick={() => rate(r.id)}
                      className={cx(
                        "h-11 rounded-full border-[1.5px] px-4 font-bold disabled:opacity-45",
                        recipe.rating === r.id ? "border-leaf-800 bg-leaf-800 text-neutral-100" : "border-leaf-600",
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
              {canEdit && recipe.tags.includes("a-tester") && (
                <button
                  type="button"
                  onClick={markTested}
                  disabled={!online}
                  className="h-12 rounded-full bg-leaf-700 px-5 font-bold text-neutral-100 disabled:opacity-45"
                >
                  Retirer « à tester »
                </button>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={s.reset} className="h-11 rounded-full px-4 font-bold">
                  Recommencer
                </button>
                <Link href={`/recette?id=${recipe.id}`} className="flex h-11 items-center rounded-full px-4 font-bold">
                  Retour à la fiche
                </Link>
              </div>
            </div>
          )}
          <div className="h-[55dvh]" />
        </main>
      </div>

      <TimersBar timers={timerList} now={s.now} onOpen={(key) => {
        const t = s.timers[key];
        if (t) openDial(key, t.stepIndex, t.minutes);
      }} />

      {dial && (
        <TimerDial
          key={`${dial.key}:${dialMode}`}
          mode={dialMode}
          stepIndex={dial.stepIndex}
          stepText={stepPlainText(recipe.steps[dial.stepIndex]?.text ?? "", recipe.ingredients, factor)}
          initialSeconds={dialTimer && !dialTimer.rang ? remainingSec(dialTimer) : dialMode === "done" ? 0 : dial.minutes * 60}
          paused={dialTimer?.endAt == null}
          onPrimary={(sec) => {
            if (dialMode === "new" || (dialMode === "done" && sec > 0)) s.startTimer(dial.key, dial.stepIndex, dial.minutes, sec);
            else if (dialMode === "run") s.setRemaining(dial.key, sec);
            else s.stopTimer(dial.key);
            s.acknowledge();
            setDial(null);
          }}
          onPause={() => {
            s.togglePause(dial.key);
            setDial(null);
          }}
          onStop={() => {
            s.stopTimer(dial.key);
            s.acknowledge();
            setDial(null);
          }}
          onClose={closeDial}
        />
      )}

      {aimOpen && <AimSheet recipe={recipe} open onClose={() => setAimOpen(false)} onApply={(v) => s.setServings(v)} />}

      <ReviewNoteSheet
        recipeId={recipe.id}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onAdded={() => setReviewAdded(true)}
      />
    </div>
  );
}

