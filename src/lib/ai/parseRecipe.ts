/**
 * Lecture d'une recette par IA — CÔTÉ SERVEUR UNIQUEMENT.
 *
 * Interface stable pour le reste de l'appli : `parseRecipe(input)`.
 * Changer de modèle = écrire un autre `RecipeParser` dans providers/ et le
 * choisir dans `getRecipeParser()`. Rien d'autre ne bouge.
 */
import "server-only";
import { importSchema, type ImportData } from "@/lib/recipes/import-format";
import { fetchPageText } from "./fetchPage";
import { GeminiParser } from "./providers/gemini";

export type ParseInput =
  | { kind: "image"; mimeType: string; base64: string }
  | { kind: "text"; text: string };

export interface RecipeParser {
  readonly name: string;
  /** Renvoie le JSON brut du modèle (validé ensuite ici). */
  parse(input: ParseInput): Promise<unknown>;
}

export function getRecipeParser(): RecipeParser | null {
  const key = process.env.GEMINI_API_KEY;
  if (key) return new GeminiParser(key, process.env.GEMINI_MODEL || undefined);
  return null;
}

export const isRecipeParsingEnabled = () => getRecipeParser() !== null;

export class ParseError extends Error {}

/** Lit la recette, valide le JSON (zod) ; un nouvel essai si invalide. */
export async function parseRecipe(input: ParseInput | { kind: "url"; url: string }): Promise<ImportData> {
  const parser = getRecipeParser();
  if (!parser) throw new ParseError("La lecture automatique n'est pas configurée (clé GEMINI_API_KEY absente).");

  const resolved: ParseInput =
    input.kind === "url" ? { kind: "text", text: await fetchPageText(input.url) } : input;

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await parser.parse(resolved);
    const res = importSchema.safeParse(raw);
    if (res.success) {
      if (!res.data.title.trim() && !res.data.ingredients.length) {
        throw new ParseError("Je n'ai pas trouvé de recette dans ce contenu.");
      }
      return res.data;
    }
    lastError = res.error.issues[0]?.message ?? "format invalide";
  }
  throw new ParseError(`La lecture a échoué deux fois (${lastError}). Réessaie ou saisis la recette à la main.`);
}
