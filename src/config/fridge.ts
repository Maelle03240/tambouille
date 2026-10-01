/**
 * Réglages de « Mon frigo ».
 * Écrits comme on les cherche dans les recettes (pluriels et accents gérés).
 */

/** « J'ai les basiques » : tout ça compte comme présent d'un seul geste. */
export const FRIDGE_BASICS = [
  "sel",
  "poivre",
  "huile",
  "beurre",
  "farine",
  "sucre",
  "œufs",
  "pâtes",
  "riz",
  "levure",
  "moutarde",
  "épices",
  "lait",
] as const;

/** Toujours disponibles, jamais « manquants » (l'eau du robinet). */
export const FRIDGE_ALWAYS = ["eau", "glaçons"] as const;

/**
 * Familles : avoir « sucre » couvre aussi la cassonade, etc. (en plus des
 * noms qui contiennent le mot : « sucre en poudre », « huile d'olive »).
 */
export const FRIDGE_FAMILIES: Record<string, string[]> = {
  sucre: ["cassonade", "vergeoise", "sucre roux", "sucre glace", "sucre vanillé"],
  épices: ["cumin", "paprika", "curry", "curcuma", "cannelle", "muscade", "piment", "gingembre moulu", "herbes de provence", "origan", "thym", "quatre-épices", "ras el hanout", "garam masala", "cardamome", "clou de girofle"],
  pâtes: ["spaghetti", "tagliatelle", "penne", "fusilli", "macaroni", "coquillettes", "lasagne", "linguine", "farfalle", "nouilles"],
  riz: ["basmati", "risotto", "arborio"],
  fromage: ["gruyère", "emmental", "parmesan", "comté", "mozzarella", "feta", "chèvre", "cheddar", "ricotta", "mascarpone", "reblochon", "raclette"],
  levure: ["bicarbonate"],
  crème: ["crème fraîche", "crème liquide"],
};
