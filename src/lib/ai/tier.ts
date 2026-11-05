/**
 * Quelle clé Gemini utiliser : la gratuite par défaut ; la payante seulement
 * pour l'admin, interrupteur activé, et si la clé existe. Pure, testée.
 */
export function chooseGeminiKey(who: { role: string | null | undefined; aiPaid: boolean | null | undefined }, paidKey: string | undefined): string | undefined {
  return who.role === "admin" && who.aiPaid === true && paidKey ? paidKey : undefined;
}
