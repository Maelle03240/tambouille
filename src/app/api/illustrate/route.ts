/**
 * POST /api/illustrate — { title, ingredients: string[], mealPrep } → { data: { base64, mimeType } }
 * Illustration façon vieux livre de cuisine (style imposé dans
 * src/lib/ai/generateIllustration.ts). Désactivée sans les variables Cloudflare.
 */
import { errorResponse, isAuthorized, unauthorized } from "@/lib/ai/auth";
import { getIllustrationGenerator, illustrateRecipe } from "@/lib/ai/generateIllustration";

export const maxDuration = 300;

export async function POST(req: Request) {
  if (!(await isAuthorized(req))) return unauthorized();
  const generator = getIllustrationGenerator();
  if (!generator) return Response.json({ error: "Illustrations non configurées." }, { status: 404 });
  try {
    const { title, ingredients, mealPrep } = (await req.json()) as { title?: string; ingredients?: string[]; mealPrep?: boolean };
    if (!title) return Response.json({ error: "Titre manquant." }, { status: 400 });
    const bytes = await illustrateRecipe(generator, { title, ingredients, mealPrep });
    return Response.json({ data: { base64: Buffer.from(bytes).toString("base64"), mimeType: "image/jpeg" } });
  } catch (e) {
    return errorResponse(e);
  }
}
