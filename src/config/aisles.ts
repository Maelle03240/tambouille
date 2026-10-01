/**
 * Rayons de la liste de courses : ordre d'affichage, couleur de la pastille,
 * et mots-clés pour ranger un ingrédient dont le rayon n'est pas renseigné.
 * Un ingrédient inconnu va dans « Autre ».
 */
export const AISLES = [
  "Fruits & légumes",
  "Boucherie & poisson",
  "Crèmerie",
  "Boulangerie",
  "Épicerie",
  "Épicerie sucrée",
  "Surgelés",
  "Boissons",
  "Maison & hygiène",
  "Autre",
] as const;

/** Teinte OKLCH de la pastille de chaque rayon. */
export const AISLE_HUES: Record<string, number | null> = {
  "Fruits & légumes": 140,
  "Boucherie & poisson": 25,
  Crèmerie: 90,
  Boulangerie: 70,
  Épicerie: 50,
  "Épicerie sucrée": 355,
  Surgelés: 230,
  Boissons: 260,
  "Maison & hygiène": 300,
  Autre: null,
};

/** Premier motif qui correspond = rayon. L'ordre compte. */
export const AISLE_KEYWORDS: [RegExp, string][] = [
  [/papier|essuie|mouchoir|sopalin|dentifrice|brosse [àa] dent|savon|shampo|gel douche|d[ée]odorant|lessive|adoucissant|liquide vaisselle|pastilles lave|[ée]ponge|sacs? poubelle|javel|nettoyant|coton|rasoir|couches|lingette|papier alu|film [ée]tirable/i, "Maison & hygiène"],
  [/lait de coco|cr[èe]me de coco|lait d'amande|lait d'avoine/i, "Épicerie"],
  [/poulet|b[œo]euf|porc|jambon|poisson|saumon|cabillaud|thon frais|steak|lardon|viande|dinde|veau|agneau|crevette|chorizo|saucisse/i, "Boucherie & poisson"],
  [/lait|yaourt|skyr|cr[èe]me|fromage|beurre|[œo]eufs?|jaunes?|blancs? d|parmesan|emmental|comt[ée]|mozza|ricotta|mascarpone|feta/i, "Crèmerie"],
  [/pomme|banane|tomate|salade|romaine|carotte|citron|orange|oignon|[ée]chalote|ail\b|courgette|aubergine|poivron|poireau|fruit|l[ée]gume|persil|basilic|coriandre|menthe|avocat|poire|brocoli|[ée]pinard|champignon|potimarron|courge|patate|pomme de terre|gingembre|fraise|framboise|myrtille/i, "Fruits & légumes"],
  [/pain|baguette|brioche|p[âa]te feuillet|p[âa]te bris|p[âa]te sabl/i, "Boulangerie"],
  [/chocolat|cacao|sucre|miel|confiture|biscuit|vanille|p[ée]pites|amande|noisette|noix|sirop d'[ée]rable/i, "Épicerie sucrée"],
  [/farine|p[âa]tes|riz|huile|sel\b|poivre|conserve|thon|caf[ée]|c[ée]r[ée]ale|avoine|lentille|pois|haricot|[ée]pice|cumin|curry|paprika|vinaigre|moutarde|levure|bouillon|ma[ïi]zena|semoule|quinoa|c[âa]pres|anchois|sauce/i, "Épicerie"],
  [/surgel|glac/i, "Surgelés"],
  [/^eau|jus|bi[èe]re|vin\b|soda|sirop|rhum/i, "Boissons"],
];

export function guessAisle(name: string): string {
  for (const [re, aisle] of AISLE_KEYWORDS) if (re.test(name)) return aisle;
  return "Autre";
}
