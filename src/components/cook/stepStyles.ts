/**
 * Apparence des étapes du mode cuisine, pour les deux variantes de la
 * maquette. La variante utilisée se choisit dans src/config/ui.ts.
 * `wide:` = iPad / paysage (textes plus grands).
 */
export interface StepLook {
  card: string;
  text: string;
  num: string;
  label: string;
}

type StepState = "current" | "done" | "todo";

const base = "flex cursor-pointer gap-3.5 rounded-[28px] border-2 border-transparent transition-all duration-200 wide:gap-5 scroll-mt-28";
const numBase = "flex flex-none items-center justify-center rounded-full font-heading";

export const STEP_STYLES: Record<"spotlight" | "card", Record<StepState, StepLook>> = {
  // 1b — projecteur sombre
  spotlight: {
    current: {
      card: `${base} -mx-1.5 my-2 bg-neutral-900 px-5 py-[26px] text-neutral-100 shadow-lg wide:px-8 wide:py-8`,
      text: "text-[25px] leading-[1.42] font-medium text-pretty wide:text-[30px]",
      num: `${numBase} size-11 bg-accent-400 text-[22px] text-accent-900 wide:size-[52px] wide:text-[26px]`,
      label: "text-[13px] font-bold tracking-[.06em] text-accent-300 uppercase wide:text-sm",
    },
    done: {
      card: `${base} px-4 py-4 opacity-40 wide:px-[26px] wide:py-[22px]`,
      text: "text-[17px] leading-[1.45] text-neutral-700 text-pretty wide:text-[21px]",
      num: `${numBase} size-[34px] bg-leaf-300 text-leaf-900 wide:size-10`,
      label: "",
    },
    todo: {
      card: `${base} px-4 py-4 opacity-70 wide:px-[26px] wide:py-[22px]`,
      text: "text-lg leading-[1.45] text-pretty wide:text-[23px]",
      num: `${numBase} size-[34px] border-2 border-neutral-500 text-[17px] text-neutral-800 wide:size-10 wide:text-[19px]`,
      label: "",
    },
  },
  // 1a — carte claire en relief
  card: {
    current: {
      card: `${base} border-accent bg-neutral-100 px-[18px] py-5 shadow-md wide:px-[30px] wide:py-7`,
      text: "text-[23px] leading-[1.45] font-medium text-pretty wide:text-[28px]",
      num: `${numBase} size-10 bg-accent-600 text-xl text-neutral-100 wide:size-12 wide:text-2xl`,
      label: "text-[13px] font-bold tracking-[.06em] text-accent-700 uppercase wide:text-sm",
    },
    done: {
      card: `${base} px-4 py-4 opacity-55 wide:px-[26px] wide:py-[22px]`,
      text: "text-lg leading-[1.45] text-neutral-700 text-pretty wide:text-[21px]",
      num: `${numBase} size-[34px] bg-leaf-300 text-leaf-900 wide:size-10`,
      label: "",
    },
    todo: {
      card: `${base} px-4 py-4 wide:px-[26px] wide:py-[22px]`,
      text: "text-[19px] leading-[1.45] text-pretty wide:text-[23px]",
      num: `${numBase} size-[34px] border-2 border-neutral-500 text-[17px] text-neutral-800 wide:size-10 wide:text-[19px]`,
      label: "",
    },
  },
};
