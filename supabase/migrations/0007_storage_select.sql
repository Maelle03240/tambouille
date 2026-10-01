-- Correctif images : l'envoi avec remplacement (upsert) a aussi besoin du
-- droit de lecture sur storage.objects, sinon « new row violates row-level
-- security policy ». Le bucket est déjà public (lecture des images par URL).

create policy "images : lecture" on storage.objects for select to authenticated
  using (bucket_id = 'recipe-images');
