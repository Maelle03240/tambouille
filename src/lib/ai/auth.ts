/**
 * Routes IA : si Supabase est configuré, il faut être connectée (évite
 * qu'un inconnu consomme le quota gratuit). En mode local : ouvert.
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";

export async function isAuthorized(req: Request): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return true;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data, error } = await createClient(url, anon).auth.getUser(token);
  return !error && !!data.user;
}

export const unauthorized = () => Response.json({ error: "Connecte-toi pour utiliser la lecture automatique." }, { status: 401 });

export function errorResponse(e: unknown, status = 502) {
  const message = e instanceof Error ? e.message : "Erreur inconnue";
  console.error("[ia]", message);
  return Response.json({ error: message }, { status });
}
