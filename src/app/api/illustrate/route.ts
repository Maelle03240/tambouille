/**
 * POST /api/illustrate — { title, ingredients: string[] } → { data: { base64, mimeType } }
 * Illustration façon vieux livre de cuisine (style imposé dans
 * src/lib/ai/generateIllustration.ts). Désactivée sans les variables Cloudflare.
 */
import { errorResponse, isAuthorized, unauthorized } from "@/lib/ai/auth";
import { getIllustrationGenerator } from "@/lib/ai/generateIllustration";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isAuthorized(req))) return unauthorized();
  const generator = getIllustrationGenerator();
  if (!generator) return Response.json({ error: "Illustrations non configurées." }, { status: 404 });
  try {
    const { title, ingredients } = (await req.json()) as { title?: string; ingredients?: string[] };
    if (!title) return Response.json({ error: "Titre manquant." }, { status: 400 });
    const subject = `A dish of "${title}"${ingredients?.length ? `, with ${ingredients.slice(0, 5).join(", ")}` : ""}`;
    const bytes = await generator.generate(subject);
    return Response.json({ data: { base64: Buffer.from(bytes).toString("base64"), mimeType: "image/jpeg" } });
  } catch (e) {
    return errorResponse(e);
  }
}
