/**
 * Routes IA : si Supabase est configuré, il faut être connectée (évite
 * qu'un inconnu consomme le quota gratuit). En mode local : ouvert.
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { chooseGeminiKey } from "./tier";

export async function isAuthorized(req: Request): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return true;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data, error } = await createClient(url, anon).auth.getUser(token);
  return !error && !!data.user;
}

/**
 * La clé payante si l'admin a activé « IA payante » (lu en base, pas envoyé par
 * le navigateur), sinon undefined = clé gratuite. Au moindre doute : gratuite.
 */
export async function paidKeyFor(req: Request): Promise<string | undefined> {
  const paidKey = process.env.GEMINI_API_KEY_PAID;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!paidKey || !url || !anon || !token) return undefined;
  try {
    const client = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    // les règles de la base ne laissent lire que ses propres réglages
    const { data: mine } = await client.from("settings").select("user_id, ai_paid").maybeSingle();
    if (!mine?.ai_paid) return undefined;
    const { data: profile } = await client.from("profiles").select("role").eq("id", mine.user_id).maybeSingle();
    return chooseGeminiKey({ role: profile?.role, aiPaid: mine.ai_paid }, paidKey);
  } catch {
    return undefined;
  }
}

export const unauthorized = () => Response.json({ error: "Connecte-toi pour utiliser la lecture automatique." }, { status: 401 });

export function errorResponse(e: unknown, status = 502) {
  const message = e instanceof Error ? e.message : "Erreur inconnue";
  console.error("[ia]", message);
  return Response.json({ error: message }, { status });
}
