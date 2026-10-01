/**
 * POST /api/admin/invite — { email, name, role, householdId | null }
 * Invite une personne par e-mail (elle choisira son mot de passe sur
 * /bienvenue), fixe son rôle et son foyer : un foyer existant, ou un nouveau
 * « Chez <prénom> ». Réservé à l'admin. Utilise la clé « service role »
 * (SUPABASE_SERVICE_ROLE_KEY), côté serveur uniquement.
 */
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const dynamic = "force-dynamic";

const body = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(60),
  role: z.enum(["editor", "reader"]),
  householdId: z.string().uuid().nullable(),
});

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json({ error: "Invitations pas configurées (clé SUPABASE_SERVICE_ROLE_KEY manquante)." }, { status: 503 });
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // l'appelante doit être admin
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const caller = token ? (await admin.auth.getUser(token)).data.user : null;
  const role = caller ? (await admin.from("profiles").select("role").eq("id", caller.id).maybeSingle()).data?.role : null;
  if (role !== "admin") return Response.json({ error: "Réservé à l'admin." }, { status: 403 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "E-mail ou prénom invalide." }, { status: 400 });
  const { email, name, householdId } = parsed.data;

  const origin = new URL(req.url).origin;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { display_name: name },
    redirectTo: `${origin}/bienvenue`,
  });
  if (error || !data.user) {
    const msg = error?.message ?? "";
    return Response.json(
      { error: /already been registered|already exists/i.test(msg) ? "Cette adresse a déjà un compte." : `Invitation impossible : ${msg}` },
      { status: 400 },
    );
  }
  const uid = data.user.id;

  const fail = (what: string, e: { message: string } | null) =>
    e ? Response.json({ error: `${what} : ${e.message}` }, { status: 500 }) : null;

  const profile = await admin.from("profiles").update({ display_name: name, role: parsed.data.role }).eq("id", uid);
  const r1 = fail("Profil", profile.error);
  if (r1) return r1;

  let hid = householdId;
  if (!hid) {
    const created = await admin.from("households").insert({ name: `Chez ${name}` }).select("id").single();
    const r2 = fail("Foyer", created.error);
    if (r2) return r2;
    hid = created.data!.id as string;
  }
  const member = await admin.from("household_members").insert({ household_id: hid, user_id: uid });
  const r3 = fail("Foyer", member.error);
  if (r3) return r3;

  return Response.json({ data: { userId: uid } });
}
