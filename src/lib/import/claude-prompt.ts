/**
 * Consignes à copier dans une conversation Claude (ou autre IA) pour obtenir
 * une recette au format d'import JSON, à coller ensuite dans l'appli.
 */
import { CATEGORIES } from "@/config/categories";
import { MOMENTS } from "@/config/moments";
import { SAMPLE_RECIPE } from "@/lib/recipes/samples";

export function claudeImportPrompt(): string {
  const example = { ...SAMPLE_RECIPE, ingredients: SAMPLE_RECIPE.ingredients.slice(0, 3), steps: SAMPLE_RECIPE.steps.slice(0, 2).map((text) => ({ text, section: null })) };
  return `Mets cette recette au format JSON ci-dessous pour mon appli de cuisine. Réponds uniquement avec le JSON.

Règles :
- category (type de plat) : une de ${CATEGORIES.map((c) => c.id).join(", ")}
- moments (quand on le mange, plusieurs possibles) : ${MOMENTS.map((m) => m.id).join(", ")}
- ingredients : une entrée par ligne ; name sans quantité ni « de » ; unit parmi g, kg, ml, cl, l, c. à soupe, c. à café, pincée, gousse… ou "" ; section = groupe facultatif.
- steps : { text, section } ; section = partie facultative (« Biscuit », « Crème »), sans la répéter dans text ; dans text, cite chaque ingrédient utilisé entre accolades avec son name exact ({beurre}) et chaque durée de minuteur entre accolades ({8 min}).
- nutrition_per_portion : estimation PAR PORTION.
- uncertain : liste des points douteux ({ "field": "ingredients.2", "question": "…", "options": [] }, options = textes entre guillemets), sinon [].

Exemple :
${JSON.stringify(example, null, 2)}

Recette :
`;
}
