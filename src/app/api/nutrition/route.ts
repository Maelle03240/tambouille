/** POST /api/nutrition — recette + valeurs des ingrédients perso → valeurs par portion. */
import { errorResponse, isAuthorized, unauthorized } from "@/lib/ai/auth";
import { computePerPortion, type NutritionRequest } from "@/lib/ai/nutrition";

export const maxDuration = 300;

export async function POST(req: Request) {
  if (!(await isAuthorized(req))) return unauthorized();
  try {
    const body = (await req.json()) as NutritionRequest;
    if (!body?.ingredients?.length) return Response.json({ error: "Aucun ingrédient." }, { status: 400 });
    return Response.json({ data: await computePerPortion(body) });
  } catch (e) {
    return errorResponse(e);
  }
}
