/**
 * POST /api/admin/invite — { email, name, role, householdId | null }
 * Crée le compte d'une personne et renvoie un lien d'invitation que l'admin
 * lui envoie elle-même (aucun e-mail envoyé). Avec ce lien, elle choisit son
 * mot de passe sur /bienvenue. Fixe son rôle et son foyer : un foyer existant,
 * ou un nouveau « Chez <prénom> ». Réservé à l'admin. Utilise la clé « service role »
 * (SUPABASE_SERVICE_ROLE_KEY), côté serveur uniquement.
 */
import { z } from "zod";
import { makeInviteLink, requireAdmin } from "@/lib/data/admin-server";

export const dynamic = "force-dynamic";

const body = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(60),
  role: z.enum(["editor", "reader"]),
  householdId: z.string().uuid().nullable(),
});

export async function POST(req: Request) {
  // l'appelante doit être admin
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;
  const { admin } = ctx;

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "E-mail ou prénom invalide." }, { status: 400 });
  const { email, name, householdId } = parsed.data;

  const made = await makeInviteLink(admin, email, new URL(req.url).origin, { displayName: name });
  if ("error" in made) {
    return Response.json({ error: made.taken ? "Cette adresse a déjà un compte." : `Lien impossible : ${made.error}` }, { status: 400 });
  }
  const uid = made.userId;

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

  return Response.json({ data: { userId: uid, link: made.link } });
}
