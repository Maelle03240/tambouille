/** Appel de la route serveur /api/parse-recipe depuis le navigateur. */
import { getRepository } from "@/lib/data";
import { importSchema, type ImportData } from "@/lib/recipes/import-format";

export type ParseRequest =
  | { kind: "image"; mimeType: string; base64: string }
  | { kind: "text"; text: string }
  | { kind: "url"; url: string };

export async function requestParse(body: ParseRequest): Promise<ImportData> {
  const session = await getRepository().getSession();
  const res = await fetch("/api/parse-recipe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ error: `Erreur ${res.status}` }));
  if (!res.ok || !json.data) throw new Error(json.error ?? "La lecture a échoué.");
  return importSchema.parse(json.data);
}

/** Le texte collé est-il juste un lien ? */
export function extractUrl(text: string): string | null {
  const t = text.trim();
  return /^https?:\/\/\S+$/i.test(t) ? t : null;
}

/* ───────────── Ingrédients perso / nutrition (V2) ───────────── */

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const session = await getRepository().getSession();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ error: `Erreur ${res.status}` }));
  if (!res.ok || !json.data) throw new Error(json.error ?? "La lecture a échoué.");
  return json.data as T;
}

export interface LabelResult {
  name: string;
  kcal_100g: number | null;
  protein_100g: number | null;
  fat_100g: number | null;
  carbs_100g: number | null;
  fiber_100g: number | null;
}

export const requestLabel = (image: { mimeType: string; base64: string }) => postJson<LabelResult>("/api/read-label", image);

export interface PerPortionResult {
  kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  fiber_g: number | null;
}

export const requestNutrition = (body: unknown) => postJson<PerPortionResult>("/api/nutrition", body);

export const requestIllustration = (title: string, ingredients: string[], mealPrep = false) =>
  postJson<{ base64: string; mimeType: string }>("/api/illustrate", { title, ingredients, mealPrep });
