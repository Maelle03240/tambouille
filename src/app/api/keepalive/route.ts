/**
 * GET /api/keepalive — appelée le lundi et le jeudi par Vercel (voir `crons` dans
 * vercel.json) pour que Supabase (offre gratuite) ne mette pas le projet en
 * pause après 7 jours sans activité. Une petite lecture suffit ; les règles RLS
 * renvoient une liste vide, mais la base a bien été interrogée.
 * Si CRON_SECRET existe dans Vercel, seul Vercel peut l'appeler.
 */
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return Response.json({ error: "Supabase pas configuré." }, { status: 503 });

  const { error } = await createClient(url, anon, { auth: { persistSession: false } }).from("households").select("id").limit(1);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data: { ok: true, at: new Date().toISOString() } });
}
