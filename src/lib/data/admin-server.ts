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

/**
 * Crée le lien d'invitation SANS envoyer d'e-mail (l'admin l'envoie elle-même
 * par message). Pour un e-mail inconnu, le compte est créé. Avec
 * `existing: true`, un compte déjà confirmé reçoit un lien de connexion.
 * Le lien pointe vers NOTRE page /bienvenue (pas vers Supabase) : un aperçu de
 * lien (Messages, Snap…) ne le « consomme » pas, c'est la page qui le valide.
 */
export async function makeInviteLink(
  admin: SupabaseClient,
  email: string,
  origin: string,
  opts: { displayName?: string; existing?: boolean } = {},
): Promise<{ userId: string; link: string } | { error: string; taken?: boolean }> {
  const redirectTo = `${origin}/bienvenue`;
  let type: "invite" | "magiclink" = "invite";
  let res = await admin.auth.admin.generateLink({
    type,
    email,
    options: { redirectTo, ...(opts.displayName ? { data: { display_name: opts.displayName } } : {}) },
  });
  const taken = !!res.error && /already been registered|already exists/i.test(res.error.message);
  if (taken && opts.existing) {
    type = "magiclink";
    res = await admin.auth.admin.generateLink({ type, email, options: { redirectTo } });
  }
  if (res.error || !res.data.user) return { error: res.error?.message ?? "Lien impossible.", taken: taken && !opts.existing };
  const token = encodeURIComponent(res.data.properties.hashed_token);
  return { userId: res.data.user.id, link: `${redirectTo}?token_hash=${token}&type=${type}` };
}
