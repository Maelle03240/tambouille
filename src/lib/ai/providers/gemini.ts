/**
 * Fournisseur Gemini (niveau gratuit) via l'API REST — sans dépendance.
 * Modèle réglable par GEMINI_MODEL (défaut : dernier Flash).
 */
import "server-only";
import type { ParseInput, RecipeParser } from "../parseRecipe";
import { PARSE_INSTRUCTIONS, RESPONSE_SCHEMA } from "../prompt";

const DEFAULT_MODEL = "gemini-flash-latest";

export class GeminiParser implements RecipeParser {
  readonly name = "gemini";

  constructor(
    private apiKey: string,
    private model = DEFAULT_MODEL,
  ) {}

  async parse(input: ParseInput): Promise<unknown> {
    const parts =
      input.kind === "image"
        ? [{ text: "Voici la recette en image." }, { inline_data: { mime_type: input.mimeType, data: input.base64 } }]
        : [{ text: `Voici la recette :\n\n${input.text}` }];

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PARSE_INSTRUCTIONS }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (res.status === 429) throw new Error("Quota gratuit de Gemini atteint pour l'instant. Réessaie dans quelques minutes.");
    if (!res.ok) throw new Error(`Gemini a répondu ${res.status} : ${(await res.text()).slice(0, 300)}`);

    const body = await res.json();
    const text: string | undefined = body?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("");
    if (!text) throw new Error("Réponse vide de Gemini.");
    try {
      return JSON.parse(text);
    } catch {
      return null; // → nouvel essai dans parseRecipe
    }
  }
}
