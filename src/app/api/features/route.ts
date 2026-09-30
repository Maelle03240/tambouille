/**
 * GET /api/features — quelles fonctions IA sont disponibles (clé présente).
 * Une clé absente désactive simplement la fonction dans l'interface.
 */
import { isRecipeParsingEnabled } from "@/lib/ai/parseRecipe";
import { isIllustrationEnabled } from "@/lib/ai/generateIllustration";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ai: isRecipeParsingEnabled(), illustrations: isIllustrationEnabled() });
}
