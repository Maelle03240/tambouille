/**
 * Comptes (admin) :
 * GET → e-mail de chacun et invitation en attente ou non ;
 * POST { action: "resend", userId } → renvoie l'invitation ;
 * POST { action: "delete", userId } → supprime le compte. Ses recettes perso
 * repartent dans Propositions (rien n'est perdu), son foyer disparaît s'il y
 * était seul. On ne supprime ni soi-même ni un autre admin.
 */
import { z } from "zod";
import { mailError, requireAdmin } from "@/lib/data/admin-server";

export const dynamic = "force-dynamic";

const body = z.object({ action: z.enum(["resend", "delete"]), userId: z.string().uuid() });

export async function GET(req: Request) {
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;
  const { data, error } = await ctx.admin.auth.admin.listUsers({ perPage: 200 });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({
    data: data.users.map((u) => ({ id: u.id, email: u.email ?? "", pending: !u.last_sign_in_at })),
  });
}

export async function POST(req: Request) {
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;
  const { admin, callerId } = ctx;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Requête invalide." }, { status: 400 });
  const { action, userId } = parsed.data;

  const { data: found, error: findError } = await admin.auth.admin.getUserById(userId);
  if (findError || !found.user) return Response.json({ error: "Compte introuvable." }, { status: 404 });

  if (action === "resend") {
    if (found.user.last_sign_in_at) return Response.json({ error: "Ce compte a déjà accepté son invitation." }, { status: 400 });
    const { error } = await admin.auth.admin.inviteUserByEmail(found.user.email!, { redirectTo: `${new URL(req.url).origin}/bienvenue` });
    if (error) return Response.json({ error: mailError(error.message) }, { status: 400 });
    return Response.json({ data: { ok: true } });
  }

  if (userId === callerId) return Response.json({ error: "Tu ne peux pas supprimer ton propre compte." }, { status: 400 });
  const { data: profile } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role === "admin") return Response.json({ error: "On ne supprime pas un compte admin." }, { status: 400 });

  // ses recettes perso : l'admin décide (même celles refusées, qui n'auraient plus d'auteur)
  const kept = await admin.from("recipes").update({ proposal_status: "pending" }).eq("owner_id", userId).eq("status", "personal");
  if (kept.error) return Response.json({ error: kept.error.message }, { status: 500 });

  // les foyers où il était seul
  const { data: mine } = await admin.from("household_members").select("household_id").eq("user_id", userId);
  const ids = (mine ?? []).map((m) => m.household_id as string);
  const { data: others } = ids.length
    ? await admin.from("household_members").select("household_id").in("household_id", ids).neq("user_id", userId)
    : { data: [] };
  const shared = new Set((others ?? []).map((m) => m.household_id as string));
  const alone = ids.filter((id) => !shared.has(id));

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (alone.length) await admin.from("households").delete().in("id", alone);
  return Response.json({ data: { ok: true } });
}
