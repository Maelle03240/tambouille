/**
 * Apparence des étapes du mode cuisine, pour les deux variantes de la
 * maquette. La variante utilisée se choisit dans src/config/ui.ts.
 *
 * IMPORTANT (fluidité) : toutes les étapes ont exactement la même taille
 * (texte, marges, pastille) quel que soit leur état. Seules les couleurs
 * changent, en fondu. Sinon, quand l'étape en cours suit le défilement, les
 * étapes qui grossissent / rétrécissent font sauter la page.
 * `wide:` = iPad / paysage (textes plus grands).
 */
export interface StepLook {
  card: string;
  text: string;
  num: string;
  /** Étiquette « En cours », posée sur le bord de la carte (ne prend pas de place). */
  label: string;
}

type StepState = "current" | "done" | "todo";

const base =
  "relative flex cursor-pointer gap-3.5 rounded-[28px] px-4 py-5 transition-[background-color,color,opacity,box-shadow] duration-300 ease-out wide:gap-5 wide:px-7 wide:py-6";
const text = "text-[21px] leading-[1.45] text-pretty wide:text-[26px]";
const num = "flex size-10 flex-none items-center justify-center rounded-full font-heading text-[19px] transition-colors duration-300 wide:size-12 wide:text-[22px]";
const label =
  "pointer-events-none absolute -top-2.5 left-4 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-[.06em] uppercase wide:left-7";

export const STEP_STYLES: Record<"spotlight" | "card", Record<StepState, StepLook>> = {
  // 1b — projecteur sombre
  spotlight: {
    current: {
      card: `${base} bg-neutral-900 text-neutral-100 shadow-lg`,
      text,
      num: `${num} bg-accent-400 text-accent-900`,
      label: `${label} bg-accent-400 text-accent-900`,
    },
    done: {
      card: `${base} opacity-40`,
      text: `${text} text-neutral-700`,
      num: `${num} bg-leaf-300 text-leaf-900`,
      label: "",
    },
    todo: {
      card: `${base} opacity-80`,
      text,
      num: `${num} border-2 border-neutral-500 text-neutral-800`,
      label: "",
    },
  },
  // 1a — carte claire en relief
  card: {
    current: {
      card: `${base} bg-neutral-100 shadow-md ring-2 ring-accent`,
      text,
      num: `${num} bg-accent-600 text-neutral-100`,
      label: `${label} bg-accent-600 text-neutral-100`,
    },
    done: {
      card: `${base} opacity-55`,
      text: `${text} text-neutral-700`,
      num: `${num} bg-leaf-300 text-leaf-900`,
      label: "",
    },
    todo: {
      card: base,
      text,
      num: `${num} border-2 border-neutral-500 text-neutral-800`,
      label: "",
    },
  },
};
