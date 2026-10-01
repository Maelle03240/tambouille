/**
 * IA côté serveur pour la bibliothèque d'ingrédients perso (V2) :
 *  - lire une étiquette nutritionnelle (photo) → valeurs pour 100 g ;
 *  - recalculer les valeurs par portion d'une recette en utilisant les
 *    vraies valeurs des ingrédients perso liés (et une estimation pour le reste).
 * Même fournisseur que la lecture de recette (interchangeable ici).
 */
import "server-only";
import { z } from "zod";
import { geminiJson, type GeminiPart } from "./providers/gemini";

const num = z.union([z.number(), z.string()]).nullish().transform((v) => (v == null || v === "" ? null : Number(String(v).replace(",", "."))));

export const labelSchema = z.object({
  name: z.string().default(""),
  kcal_100g: num,
  protein_100g: num,
  fat_100g: num,
  carbs_100g: num,
  fiber_100g: num,
});
export type LabelValues = z.infer<typeof labelSchema>;

export const perPortionSchema = z.object({ kcal: num, protein_g: num, fat_g: num, carbs_g: num, fiber_g: num });
export type PerPortion = z.infer<typeof perPortionSchema>;

const LABEL_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    kcal_100g: { type: "NUMBER", nullable: true },
    protein_100g: { type: "NUMBER", nullable: true },
    fat_100g: { type: "NUMBER", nullable: true },
    carbs_100g: { type: "NUMBER", nullable: true },
    fiber_100g: { type: "NUMBER", nullable: true },
  },
  required: ["name"],
};

const PORTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    kcal: { type: "NUMBER", nullable: true },
    protein_g: { type: "NUMBER", nullable: true },
    fat_g: { type: "NUMBER", nullable: true },
    carbs_g: { type: "NUMBER", nullable: true },
    fiber_g: { type: "NUMBER", nullable: true },
  },
};

function key() {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("La lecture automatique n'est pas configurée (clé GEMINI_API_KEY absente).");
  return k;
}

async function withRetry<T>(call: () => Promise<unknown>, schema: z.ZodType<T>): Promise<T> {
  for (let i = 0; i < 2; i++) {
    const res = schema.safeParse(await call());
    if (res.success) return res.data;
  }
  throw new Error("La lecture a échoué deux fois. Réessaie ou saisis les valeurs à la main.");
}

export function readLabel(image: { mimeType: string; base64: string }): Promise<LabelValues> {
  const parts: GeminiPart[] = [
    { text: "Voici l'étiquette." },
    { inline_data: { mime_type: image.mimeType, data: image.base64 } },
  ];
  return withRetry(
    () =>
      geminiJson({
        apiKey: key(),
        system:
          "Tu lis une étiquette nutritionnelle (emballage alimentaire) et renvoies en JSON les valeurs POUR 100 g (ou 100 ml) : énergie en kcal, protéines, lipides, glucides, fibres (g). name = nom court du produit en français (marque comprise si visible). Mets null pour une valeur absente, n'invente rien.",
        schema: LABEL_SCHEMA,
        parts,
      }),
    labelSchema,
  );
}

export interface NutritionRequest {
  title: string;
  yieldQuantity: number | null;
  yieldUnit: string;
  portionSize: number | null;
  ingredients: {
    text: string;
    gramsEstimate: number | null;
    /** Valeurs réelles pour 100 g si l'ingrédient est lié à la bibliothèque. */
    label: Omit<LabelValues, "name"> | null;
  }[];
}

export function computePerPortion(req: NutritionRequest): Promise<PerPortion> {
  const lines = req.ingredients.map((i) => {
    const grams = i.gramsEstimate ? ` (≈ ${i.gramsEstimate} g)` : "";
    const label = i.label
      ? ` — VALEURS RÉELLES pour 100 g : ${i.label.kcal_100g ?? "?"} kcal, ${i.label.protein_100g ?? "?"} g protéines, ${i.label.fat_100g ?? "?"} g lipides, ${i.label.carbs_100g ?? "?"} g glucides, ${i.label.fiber_100g ?? "?"} g fibres`
      : "";
    return `- ${i.text}${grams}${label}`;
  });
  const portions = req.yieldQuantity
    ? `${req.yieldQuantity} ${req.yieldUnit}${req.portionSize && req.portionSize !== 1 ? `, 1 portion = ${req.portionSize} ${req.yieldUnit}` : ""}`
    : "4 portions";
  return withRetry(
    () =>
      geminiJson({
        apiKey: key(),
        system:
          "Tu calcules les valeurs nutritionnelles PAR PORTION d'une recette. Pour les ingrédients marqués VALEURS RÉELLES, utilise exactement ces valeurs (multipliées par leur poids). Pour les autres, utilise des valeurs moyennes usuelles. Renvoie kcal, protein_g, fat_g, carbs_g, fiber_g par portion, arrondis à l'unité.",
        schema: PORTION_SCHEMA,
        parts: [{ text: `Recette : ${req.title}\nRendement : ${portions}\nIngrédients :\n${lines.join("\n")}` }],
      }),
    perPortionSchema,
  );
}
