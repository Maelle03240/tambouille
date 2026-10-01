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
 * Familles : avoir « épices » couvre aussi le cumin, etc. (en plus des noms
 * qui contiennent le mot : « huile d'olive »). Pas de famille pour le sucre
 * ni le fromage : ce sont des produits différents.
 */
export const FRIDGE_FAMILIES: Record<string, string[]> = {
  épices: ["cumin", "paprika", "curry", "curcuma", "cannelle", "muscade", "piment", "gingembre moulu", "herbes de provence", "origan", "thym", "quatre-épices", "ras el hanout", "garam masala", "cardamome", "clou de girofle"],
  pâtes: ["spaghetti", "tagliatelle", "penne", "fusilli", "macaroni", "coquillettes", "lasagne", "linguine", "farfalle", "nouilles"],
  riz: ["basmati", "risotto", "arborio"],
  levure: ["bicarbonate"],
  crème: ["crème fraîche", "crème liquide"],
};

/**
 * Variantes qui ne sont PAS le produit de base : « sucre » ne couvre pas le
 * sucre roux ni le sucre glace (« sucre en poudre » oui).
 */
export const FRIDGE_NOT_SAME: Record<string, string[]> = {
  sucre: ["roux", "glace", "vanille", "vanillé", "coco", "complet", "muscovado", "perlé", "canne", "candi"],
  farine: ["complète", "complet", "sarrasin", "riz", "maïs", "châtaigne", "coco", "amande", "pois chiche", "seigle", "épeautre"],
  lait: ["coco", "amande", "avoine", "soja", "riz", "concentré", "poudre"],
  beurre: ["cacahuète", "cacahuètes", "karité"],
  levure: ["boulanger", "fraîche"],
  pâtes: ["brisée", "feuilletée", "sablée", "pizza", "curry", "amande", "tartiner", "fruits"],
};
