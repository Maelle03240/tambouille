/**
 * Choix d'interface faciles à changer.
 */
export const UI = {
  /**
   * Style de l'étape en cours dans le mode cuisine (maquette 1a / 1b) :
   * - "spotlight" : projecteur sombre (1b, choisi)
   * - "card"      : carte claire en relief (1a)
   */
  cookStepStyle: "spotlight" as "spotlight" | "card",

  /**
   * Mode cuisine : l'étape en cours suit le défilement (celle qui passe sur
   * la ligne de lecture devient « en cours »). Toucher une étape marche aussi.
   */
  cookFollowScroll: true,
  /** Position de la ligne de lecture, en fraction de la hauteur visible (0 = haut). */
  cookReadingLine: 0.4,

  // Le seuil « deux colonnes » (iPad / paysage) est dans globals.css (@custom-variant wide).

  /** Onglets de la barre du bas. Ajouter « menu » / « courses » en V2. */
  tabs: ["recettes", "astuces", "a-revoir", "reglages"] as const,
};

/** Unités de rendement proposées dans l'éditeur (le champ reste libre). */
export const YIELD_UNITS = ["personnes", "parts", "cookies", "crêpes", "pièces", "verres", "pots", "tranches"];

/** Rayons de supermarché (liste de courses V2, déjà renseignés à l'import). */
export const AISLES = [
  "Fruits & légumes",
  "Boucherie & poisson",
  "Crèmerie",
  "Épicerie",
  "Épicerie sucrée",
  "Boulangerie",
  "Surgelés",
  "Boissons",
  "Autre",
] as const;

export const PROTEIN_SOURCES = [
  { id: "viande", label: "Viande" },
  { id: "poisson", label: "Poisson" },
  { id: "oeuf", label: "Œuf" },
  { id: "laitier", label: "Laitier" },
  { id: "vegetal", label: "Végétal" },
  { id: "poudre", label: "Poudre" },
] as const;

export const RATINGS = [
  { id: "reussie", label: "Réussie" },
  { id: "a-refaire", label: "À refaire" },
  { id: "ratee", label: "Ratée" },
] as const;
