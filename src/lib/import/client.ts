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
