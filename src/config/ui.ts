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

  /** Onglets de la barre du bas (possibles : recettes, menu, courses, astuces, a-revoir, reglages). */
  tabs: ["recettes", "menu", "courses", "astuces", "reglages"] as ("recettes" | "menu" | "courses" | "astuces" | "a-revoir" | "reglages")[],
};

/** Unités de rendement proposées dans l'éditeur (le champ reste libre). */
export const YIELD_UNITS = ["personnes", "parts", "cookies", "crêpes", "pièces", "verres", "pots", "tranches"];

/** Rayons : voir src/config/aisles.ts (ordre, couleurs, mots-clés). */
export { AISLES } from "./aisles";

export const PROTEIN_SOURCES = [
  { id: "viande", label: "Viande" },
  { id: "poisson", label: "Poisson" },
  { id: "oeuf", label: "Œuf" },
  { id: "laitier", label: "Laitier" },
  { id: "vegetal", label: "Végétal" },
  { id: "poudre", label: "Poudre" },
] as const;

/*
 * Plus de note (Réussie / À refaire / Ratée) affichée : en fin de mode
 * cuisine, « Réussie » et « À revoir » retirent seulement le sticker NEW
 * (« À revoir » ajoute aussi la recette à la liste À revoir). La colonne
 * `rating` reste en base, inutilisée.
 */

/** Libellés des rôles (id stockés en base : admin, editor, reader). */
export const ROLE_LABELS = { admin: "Admin", editor: "Membre", reader: "Lecture seule" } as const;
