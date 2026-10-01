/** POST /api/read-label — { mimeType, base64 } → valeurs pour 100 g lues sur l'étiquette. */
import { errorResponse, isAuthorized, unauthorized } from "@/lib/ai/auth";
import { readLabel } from "@/lib/ai/nutrition";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isAuthorized(req))) return unauthorized();
  try {
    const { mimeType, base64 } = await req.json();
    if (!mimeType || !base64) return Response.json({ error: "Image manquante." }, { status: 400 });
    return Response.json({ data: await readLabel({ mimeType, base64 }) });
  } catch (e) {
    return errorResponse(e);
  }
}
