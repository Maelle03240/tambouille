-- V2 images des recettes : photos perso et illustrations IA, compressées
-- (WebP, 800 px max) dans un espace de stockage lisible par tous, modifiable
-- par editor / admin (mêmes règles que les recettes).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-images', 'recipe-images', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "images : ajout editor/admin" on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-images' and private.my_role() in ('admin', 'editor'));
create policy "images : remplacement editor/admin" on storage.objects for update to authenticated
  using (bucket_id = 'recipe-images' and private.my_role() in ('admin', 'editor'));
create policy "images : suppression editor/admin" on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-images' and private.my_role() in ('admin', 'editor'));
