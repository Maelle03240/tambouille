/**
 * Recette d'exemple (celle de la maquette), proposée quand le carnet est
 * vide. Écrite dans le format d'import : sert aussi de modèle pour
 * « coller du JSON ».
 */
import type { ImportData } from "./import-format";

export const SAMPLE_RECIPE: ImportData = {
  title: "Salade César",
  category: "entree",
  tags: [],
  yield_quantity: 4,
  yield_unit: "personnes",
  portion_size: 1,
  prep_minutes: 40,
  cook_minutes: 10,
  ingredients: [
    { section: "Croûtons", text: "100 g de pain carré blanc rassis, en dés", quantity: 100, unit: "g", name: "pain rassis en dés", grams_estimate: 100, aisle: "Boulangerie", scalable: true },
    { section: "Croûtons", text: "55 g de beurre", quantity: 55, unit: "g", name: "beurre", grams_estimate: 55, aisle: "Crèmerie", scalable: true },
    { section: "Câpres", text: "30 ml de câpres égouttées", quantity: 30, unit: "ml", name: "câpres égouttées", grams_estimate: 25, aisle: "Épicerie", scalable: true },
    { section: "Câpres", text: "15 ml d'huile d'olive", quantity: 15, unit: "ml", name: "huile d'olive", grams_estimate: 14, aisle: "Épicerie", scalable: true },
    { section: "Vinaigrette", text: "2 jaunes d'œufs", quantity: 2, unit: "", name: "jaunes d'œufs", grams_estimate: 36, aisle: "Crèmerie", scalable: true },
    { section: "Vinaigrette", text: "30 ml de jus de citron", quantity: 30, unit: "ml", name: "jus de citron", grams_estimate: 30, aisle: "Fruits & légumes", scalable: true },
    { section: "Vinaigrette", text: "5 ml de filets d'anchois hachés", quantity: 5, unit: "ml", name: "filets d'anchois hachés", grams_estimate: 5, aisle: "Épicerie", scalable: true },
    { section: "Vinaigrette", text: "1 pointe d'ail haché", quantity: 1, unit: "pointe", name: "ail haché", grams_estimate: 2, aisle: "Fruits & légumes", scalable: true },
    { section: "Vinaigrette", text: "125 ml d'huile d'olive douce", quantity: 125, unit: "ml", name: "huile d'olive douce", grams_estimate: 115, aisle: "Épicerie", scalable: true },
    { section: "Vinaigrette", text: "40 g de parmesan râpé", quantity: 40, unit: "g", name: "parmesan râpé", grams_estimate: 40, aisle: "Crèmerie", scalable: true },
    { section: "Salade", text: "2 cœurs de romaine", quantity: 2, unit: "", name: "cœurs de romaine", grams_estimate: 400, aisle: "Fruits & légumes", scalable: true },
    { section: "Salade", text: "Poivre du moulin", quantity: null, unit: "", name: "poivre du moulin", grams_estimate: null, aisle: "Épicerie", scalable: false },
  ],
  steps: [
    "Dans une poêle, faites fondre {beurre}. Ajoutez {pain rassis en dés} et faites dorer {8 min} en remuant souvent. Égouttez sur du papier.",
    "Dans la même poêle, chauffez {huile d'olive} et faites frire {câpres égouttées} {3 min}, jusqu'à ce qu'elles éclatent.",
    "Dans un bol, fouettez {jaunes d'œufs} avec {jus de citron}, {filets d'anchois hachés} et {ail haché}.",
    "Versez {huile d'olive douce} en mince filet en fouettant sans arrêt, jusqu'à une vinaigrette épaisse. Incorporez {parmesan râpé}.",
    "Couvrez la vinaigrette et laissez-la reposer au frais {30 min}.",
    "Lavez et essorez {cœurs de romaine}, puis déchirez les feuilles en gros morceaux.",
    "Au moment de servir, enrobez la salade de vinaigrette, parsemez de croûtons et de câpres, donnez un tour de {poivre du moulin}. Servez aussitôt.",
  ],
  nutrition_per_portion: { kcal: 420, protein_g: 12, fat_g: 34, carbs_g: 18, fiber_g: 3 },
  has_vegetables: true,
  protein_source: "laitier",
  total_weight_g: null,
  is_occasion: false,
  personal_notes: "Doubler les câpres, elles partent en premier.",
  uncertain: [],
};
