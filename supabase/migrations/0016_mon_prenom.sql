-- ════════════════════════════════════════════════════════════════════════
-- Chacun peut changer son prénom (Réglages), et rien d'autre de son profil :
-- passer par cette fonction évite d'ouvrir la modification de la ligne, qui
-- permettrait de se donner le rôle admin (docs/DECISIONS.md, 2026-11-05).
-- ════════════════════════════════════════════════════════════════════════

create function public.set_my_name(new_name text) returns void
language plpgsql security definer set search_path = public as $$
declare
  clean text := btrim(new_name);
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if clean is null or length(clean) = 0 or length(clean) > 60 then raise exception 'Prénom invalide'; end if;
  update public.profiles set display_name = clean where id = auth.uid();
end $$;
revoke execute on function public.set_my_name(text) from public, anon;
grant execute on function public.set_my_name(text) to authenticated;
