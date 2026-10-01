/**
 * POST /api/parse-recipe
 * Corps : { kind: "image", mimeType, base64 } | { kind: "text", text } | { kind: "url", url }
 * Réponse : { data: ImportData } ou { error: string }
 * Protégée : si Supabase est configuré, il faut être connectée (évite
 * qu'un inconnu consomme le quota gratuit).
 */
import { isAuthorized } from "@/lib/ai/auth";
import { ParseError, parseRecipe } from "@/lib/ai/parseRecipe";

export const maxDuration = 60;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  if (!(await isAuthorized(req))) {
    return Response.json({ error: "Connecte-toi pour utiliser la lecture automatique." }, { status: 401 });
  }

  let body: { kind?: string; mimeType?: string; base64?: string; text?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  try {
    let data;
    if (body.kind === "image" && body.base64 && body.mimeType) {
      if (body.base64.length * 0.75 > MAX_IMAGE_BYTES) {
        return Response.json({ error: "Image trop lourde." }, { status: 413 });
      }
      data = await parseRecipe({ kind: "image", mimeType: body.mimeType, base64: body.base64 });
    } else if (body.kind === "text" && body.text?.trim()) {
      data = await parseRecipe({ kind: "text", text: body.text.slice(0, 30_000) });
    } else if (body.kind === "url" && body.url) {
      data = await parseRecipe({ kind: "url", url: body.url });
    } else {
      return Response.json({ error: "Rien à lire." }, { status: 400 });
    }
    return Response.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    console.error("[parse-recipe]", message);
    return Response.json({ error: message }, { status: e instanceof ParseError ? 422 : 502 });
  }
}
