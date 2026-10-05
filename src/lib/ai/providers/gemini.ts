/**
 * Fournisseur Gemini (niveau gratuit) via l'API REST — sans dépendance.
 * Modèle réglable par GEMINI_MODEL (défaut : dernier Flash).
 * `geminiJson` est l'appel générique (consignes + schéma → JSON) ; les
 * usages (recette, étiquette, nutrition) sont dans src/lib/ai/*.ts.
 */
import "server-only";
import type { ParseInput, RecipeParser } from "../parseRecipe";
import { PARSE_INSTRUCTIONS, RESPONSE_SCHEMA } from "../prompt";

const DEFAULT_MODEL = "gemini-flash-latest";
/** Si surchargé : [attente ms, modèle (sinon le même)]. */
const OVERLOAD_RETRIES: [number, string | null][] = [
  [2000, null],
  [1000, "gemini-flash-lite-latest"],
  [3000, "gemini-flash-lite-latest"],
];

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

export async function geminiJson(opts: {
  apiKey: string;
  model?: string;
  system: string;
  schema: object;
  parts: GeminiPart[];
}): Promise<unknown> {
  const model = opts.model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const call = (m: string) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": opts.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts: opts.parts }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: opts.schema },
      }),
      signal: AbortSignal.timeout(60_000),
    });

  // Modèle surchargé (503/500) : on réessaie, puis on passe au modèle léger.
  let res = await call(model);
  for (const [wait, m] of OVERLOAD_RETRIES) {
    if (res.status !== 503 && res.status !== 500) break;
    await new Promise((r) => setTimeout(r, wait));
    res = await call(m ?? model);
  }

  if (res.status === 429) throw new Error("Quota gratuit de Gemini atteint pour l'instant. Réessaie dans quelques minutes.");
  if (res.status === 503 || res.status === 500) throw new Error("Gemini est surchargé en ce moment (côté Google). Réessaie dans quelques minutes.");
  if (!res.ok) throw new Error(`Gemini a répondu ${res.status} : ${(await res.text()).slice(0, 300)}`);

  const body = await res.json();
  const text: string | undefined = body?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
  if (!text) throw new Error("Réponse vide de Gemini.");
  try {
    return JSON.parse(text);
  } catch {
    return null; // → nouvel essai chez l'appelant
  }
}

export class GeminiParser implements RecipeParser {
  readonly name = "gemini";

  constructor(
    private apiKey: string,
    private model?: string,
  ) {}

  parse(input: ParseInput): Promise<unknown> {
    const parts: GeminiPart[] =
      input.kind === "image"
        ? [{ text: "Voici la recette en image." }, { inline_data: { mime_type: input.mimeType, data: input.base64 } }]
        : [{ text: `Voici la recette :\n\n${input.text}` }];
    return geminiJson({ apiKey: this.apiKey, model: this.model, system: PARSE_INSTRUCTIONS, schema: RESPONSE_SCHEMA, parts });
  }
}
