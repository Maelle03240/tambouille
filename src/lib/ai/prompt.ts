/**
 * Consignes données à l'IA pour lire une recette. Indépendant du fournisseur
 * (Gemini, Claude, Gemma…). Modifier ici pour changer le comportement de
 * lecture ; le format de sortie est celui de src/lib/recipes/import-format.ts.
 */
import { AISLES } from "@/config/ui";
import { CATEGORIES } from "@/config/categories";

export const PARSE_INSTRUCTIONS = `Tu lis une recette de cuisine (photo de livre, fiche manuscrite, capture d'écran, texte ou page web) et tu la renvoies en JSON strict, en français.

Règles :
- Recopie fidèlement ; ne complète pas ce qui manque (mets null). Traduis en français si besoin.
- category : une de ${CATEGORIES.map((c) => `"${c.id}"`).join(", ")} (les soupes vont dans "entree").
- yield_quantity + yield_unit : le rendement (« 4 » + « personnes », « 12 » + « cookies »). portion_size : unités par portion (1 par défaut ; 2 si « 1 portion = 2 cookies »).
- prep_minutes / cook_minutes : entiers, null si absents (0 si pas de cuisson du tout).
- ingredients : une entrée par ligne. text = la ligne telle qu'écrite. quantity (nombre, ex. 1.5), unit (g, kg, ml, cl, l, c. à soupe, c. à café, pincée, gousse, tranche, sachet… ou "" si aucune), name sans quantité ni « de » (« farine », « huile d'olive »). Convertis tasses/cups et onces en g ou ml. section : titre du groupe s'il y en a (« Pâte », « Garniture »), sinon null. grams_estimate : poids estimé en grammes. aisle : un de ${AISLES.map((a) => `"${a}"`).join(", ")}. scalable : false pour « sel au goût », « poivre », « un filet de… ».
- steps : une chaîne par étape. Quand l'étape utilise un ingrédient de la liste, écris-le entre accolades avec son name EXACT : « Faites fondre {beurre} ». Le jeton sera remplacé par « 55 g de beurre » : supprime donc l'article devant (écris « Versez {lait} », jamais « Versez le {lait} » ni « dans l'{huile} »). N'utilise le jeton que là où la quantité est utile, pas pour « le reste de la farine ». Si deux ingrédients ont le même name, écris {name#2} pour le second. Pour chaque durée qui mérite un minuteur (cuisson, repos, dorer…), écris-la entre accolades : « Enfournez {35 min} », « {1 h 30} ». Ne mets pas d'accolades sur les durées vagues.
- nutrition_per_portion : estime kcal, protein_g, fat_g, carbs_g, fiber_g PAR PORTION à partir des grammes estimés. has_vegetables : vrai si la recette contient des légumes en quantité notable. protein_source : principale source parmi viande, poisson, oeuf, laitier, vegetal, poudre (null si négligeable).
- total_weight_g : poids total pour les grands plats (quiche, gâteau), sinon null.
- uncertain : pour chaque élément mal lisible ou ambigu, { field, question, options }. field = "ingredients.<index>", "steps.<index>" (index depuis 0) ou le nom du champ ("prep_minutes"). question courte (« Mal lu : 80 g ou 90 g ? »). options = 2 ou 3 propositions complètes (pour un ingrédient : la ligne entière, ex. « 80 g de beurre »), ou [] si tu n'as pas de proposition.
- Si l'image ou le texte ne contient pas de recette, renvoie title = "" et des listes vides.`;

/** Schéma de réponse (sous-ensemble OpenAPI accepté par Gemini). */
export const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    category: { type: "STRING", nullable: true, enum: CATEGORIES.map((c) => c.id) },
    yield_quantity: { type: "NUMBER", nullable: true },
    yield_unit: { type: "STRING" },
    portion_size: { type: "NUMBER", nullable: true },
    prep_minutes: { type: "INTEGER", nullable: true },
    cook_minutes: { type: "INTEGER", nullable: true },
    ingredients: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          section: { type: "STRING", nullable: true },
          text: { type: "STRING" },
          quantity: { type: "NUMBER", nullable: true },
          unit: { type: "STRING" },
          name: { type: "STRING" },
          grams_estimate: { type: "NUMBER", nullable: true },
          aisle: { type: "STRING", nullable: true },
          scalable: { type: "BOOLEAN" },
        },
        required: ["text", "name", "unit", "scalable"],
      },
    },
    steps: { type: "ARRAY", items: { type: "STRING" } },
    nutrition_per_portion: {
      type: "OBJECT",
      nullable: true,
      properties: {
        kcal: { type: "NUMBER", nullable: true },
        protein_g: { type: "NUMBER", nullable: true },
        fat_g: { type: "NUMBER", nullable: true },
        carbs_g: { type: "NUMBER", nullable: true },
        fiber_g: { type: "NUMBER", nullable: true },
      },
    },
    has_vegetables: { type: "BOOLEAN", nullable: true },
    protein_source: {
      type: "STRING",
      nullable: true,
      enum: ["viande", "poisson", "oeuf", "laitier", "vegetal", "poudre"],
    },
    total_weight_g: { type: "NUMBER", nullable: true },
    uncertain: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          field: { type: "STRING" },
          question: { type: "STRING" },
          options: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["field", "question"],
      },
    },
  },
  required: ["title", "ingredients", "steps"],
} as const;
