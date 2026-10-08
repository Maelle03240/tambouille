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
const LITE_MODEL = "gemini-flash-lite-latest";
/** Temps total accordé à Gemini (la route a maxDuration = 90 s). */
const BUDGET_MS = 75_000;
/** Essais si surchargé (503/500) ou trop lent : [attente ms, modèle léger ?, délai max ms]. */
const ATTEMPTS: [number, boolean, number][] = [
  [0, false, 40_000],
  [1500, true, 30_000],
  [1500, true, 30_000],
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
  const start = Date.now();
  const call = (m: string, ms: number) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": opts.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts: opts.parts }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: opts.schema },
      }),
      signal: AbortSignal.timeout(ms),
    }).catch((e) => {
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) return null; // trop lent
      throw e;
    });

  // Surchargé ou trop lent : on réessaie avec le modèle léger, dans la limite du budget.
  let res: Response | null = null;
  for (const [wait, lite, max] of ATTEMPTS) {
    const left = BUDGET_MS - (Date.now() - start) - wait;
    if (left < 8000) break;
    if (wait) await new Promise((r) => setTimeout(r, wait));
    res = await call(lite ? LITE_MODEL : model, Math.min(max, left));
    if (res && res.status !== 503 && res.status !== 500) break;
  }

  if (!res) throw new Error("L'IA met trop de temps à répondre aujourd'hui. Réessaie dans un moment.");
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
