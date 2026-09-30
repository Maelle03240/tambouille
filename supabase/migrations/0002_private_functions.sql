-- Sécurité (conseils Supabase) : les fonctions internes ne doivent pas être
-- appelables depuis l'API publique.
-- - handle_new_user : utilisée uniquement par le déclencheur d'inscription.
-- - my_role : utilisée par les règles RLS → déplacée dans un schéma privé
--   (les règles existantes suivent automatiquement la fonction).

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create schema if not exists private;
grant usage on schema private to authenticated;
alter function public.my_role() set schema private;
revoke execute on function private.my_role() from public, anon;
grant execute on function private.my_role() to authenticated;
