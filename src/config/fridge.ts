/**
 * Produits « classiques » à cocher d'un geste dans « Mon frigo » (au lieu de
 * tout taper). Ajouter / retirer un produit = modifier cette liste.
 * Écrits comme on les cherche dans les recettes (pluriels et accents gérés).
 */
export const FRIDGE_STAPLES = [
  "sel",
  "poivre",
  "huile",
  "beurre",
  "farine",
  "sucre",
  "œufs",
  "lait",
  "crème",
  "pâtes",
  "riz",
  "oignons",
  "ail",
  "tomates",
  "pommes de terre",
  "levure",
  "chocolat",
  "fromage",
  "jambon",
  "citron",
  "moutarde",
  "vinaigre",
  "bouillon",
  "épices",
] as const;

/** Toujours disponibles, jamais « manquants » (l'eau du robinet). */
export const FRIDGE_ALWAYS = ["eau", "glaçons"] as const;
