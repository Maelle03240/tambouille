/**
 * Routes admin (invitations, comptes) — CÔTÉ SERVEUR UNIQUEMENT : client avec
 * la clé « service role », après avoir vérifié que l'appelante est admin.
 */
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AdminContext = { admin: SupabaseClient; callerId: string };

/** Le contexte admin, ou la réponse d'erreur à renvoyer. */
export async function requireAdmin(req: Request): Promise<AdminContext | Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json({ error: "Comptes pas configurés (clé SUPABASE_SERVICE_ROLE_KEY manquante)." }, { status: 503 });
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const caller = token ? (await admin.auth.getUser(token)).data.user : null;
  const role = caller ? (await admin.from("profiles").select("role").eq("id", caller.id).maybeSingle()).data?.role : null;
  if (!caller || role !== "admin") return Response.json({ error: "Réservé à l'admin." }, { status: 403 });
  return { admin, callerId: caller.id };
}

/** Message lisible pour une erreur d'envoi d'e-mail (Supabase limite l'envoi par heure). */
export function mailError(message: string): string {
  if (/rate limit|too many/i.test(message)) return "Trop d'e-mails envoyés pour l'instant (limite de Supabase). Réessaie dans une heure.";
  return `Envoi impossible : ${message}`;
}
