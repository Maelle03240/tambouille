/**
 * GET /api/features — fonctions disponibles selon les clés présentes (IA,
 * illustrations, invitations).
 * Une clé absente désactive simplement la fonction dans l'interface.
 */
import { isRecipeParsingEnabled } from "@/lib/ai/parseRecipe";
import { isIllustrationEnabled } from "@/lib/ai/generateIllustration";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    ai: isRecipeParsingEnabled(),
    illustrations: isIllustrationEnabled(),
    invites: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
