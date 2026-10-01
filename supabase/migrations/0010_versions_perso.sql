-- ════════════════════════════════════════════════════════════════════════
-- Famille, étape 2 : recettes perso et propositions (docs/DECISIONS.md).
-- - status 'library' : bibliothèque commune (l'admin y écrit directement) ;
-- - status 'personal' : recette d'un membre, ou sa version d'une recette de
--   la bibliothèque (forked_from_id + fork_base = l'originale à ce moment-là),
--   visible par lui, les membres de ses foyers et l'admin ; proposée à
--   l'admin (proposal_status).
-- ════════════════════════════════════════════════════════════════════════

alter table public.recipes
  add column status text not null default 'library' check (status in ('library', 'personal')),
  add column forked_from_id uuid references public.recipes (id) on delete set null,
  add column fork_base jsonb,
  add column proposal_status text check (proposal_status in ('pending', 'refused'));
create index recipes_owner_status_idx on public.recipes (owner_id, status);
create index recipes_forked_from_idx on public.recipes (forked_from_id);

-- ─── Fonctions utilisées par les règles ─────────────────────────────────
-- Partageons-nous un foyer ?
create function private.shares_household(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members a
    join public.household_members b on b.household_id = a.household_id
    where a.user_id = auth.uid() and b.user_id = uid
  )
$$;

-- Puis-je lire cette recette ?
create function private.can_read_recipe(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.recipes r
    where r.id = rid
      and (r.status = 'library' or r.owner_id = auth.uid() or private.my_role() = 'admin' or private.shares_household(r.owner_id))
  )
$$;

-- Puis-je la modifier ? admin : tout ; membre : ses recettes perso.
create function private.can_write_recipe(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select private.my_role() = 'admin' or (
    private.my_role() = 'editor' and exists (
      select 1 from public.recipes r where r.id = rid and r.owner_id = auth.uid() and r.status = 'personal'
    )
  )
$$;

create function private.can_write_step(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select private.can_write_recipe((select recipe_id from public.steps where id = sid))
$$;

-- Images : dossier = id de la recette (« <recipe_id>/<horodatage>.webp »)
create function private.can_write_image(object_name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  return private.can_write_recipe(split_part(object_name, '/', 1)::uuid);
exception when others then
  return private.my_role() = 'admin';
end $$;

do $$
declare f text;
begin
  foreach f in array array['shares_household(uuid)', 'can_read_recipe(uuid)', 'can_write_recipe(uuid)', 'can_write_step(uuid)', 'can_write_image(text)'] loop
    execute format('revoke execute on function private.%s from public, anon', f);
    execute format('grant execute on function private.%s to authenticated', f);
  end loop;
end $$;

-- ─── Recettes ───────────────────────────────────────────────────────────
drop policy "lecture connectée" on public.recipes;
drop policy "écriture editor/admin" on public.recipes;
drop policy "modification editor/admin" on public.recipes;
drop policy "suppression admin" on public.recipes;

create policy "recettes : lecture" on public.recipes for select to authenticated
  using (status = 'library' or owner_id = auth.uid() or private.my_role() = 'admin' or private.shares_household(owner_id));
create policy "recettes : ajout" on public.recipes for insert to authenticated
  with check (private.my_role() = 'admin' or (private.my_role() = 'editor' and status = 'personal' and owner_id = auth.uid()));
create policy "recettes : modification" on public.recipes for update to authenticated
  using (private.my_role() = 'admin' or (private.my_role() = 'editor' and status = 'personal' and owner_id = auth.uid()))
  with check (private.my_role() = 'admin' or (status = 'personal' and owner_id = auth.uid()));
create policy "recettes : suppression" on public.recipes for delete to authenticated
  using (private.my_role() = 'admin' or (private.my_role() = 'editor' and status = 'personal' and owner_id = auth.uid()));

-- ─── Ingrédients, étapes : suivent leur recette ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['ingredients', 'steps'] loop
    execute format('drop policy "lecture connectée" on public.%I', t);
    execute format('drop policy "écriture editor/admin" on public.%I', t);
    execute format('drop policy "modification editor/admin" on public.%I', t);
    execute format('drop policy "remplacement editor/admin" on public.%I', t);
    execute format('create policy "suivent la recette : lecture" on public.%I for select to authenticated using (private.can_read_recipe(recipe_id))', t);
    execute format('create policy "suivent la recette : ajout" on public.%I for insert to authenticated with check (private.can_write_recipe(recipe_id))', t);
    execute format('create policy "suivent la recette : modification" on public.%I for update to authenticated using (private.can_write_recipe(recipe_id))', t);
    execute format('create policy "suivent la recette : suppression" on public.%I for delete to authenticated using (private.can_write_recipe(recipe_id))', t);
  end loop;
end $$;

drop policy "lecture connectée" on public.step_ingredients;
drop policy "écriture editor/admin" on public.step_ingredients;
drop policy "modification editor/admin" on public.step_ingredients;
drop policy "remplacement editor/admin" on public.step_ingredients;
create policy "suivent l'étape : lecture" on public.step_ingredients for select to authenticated
  using (private.can_read_recipe((select recipe_id from public.steps s where s.id = step_id)));
create policy "suivent l'étape : ajout" on public.step_ingredients for insert to authenticated with check (private.can_write_step(step_id));
create policy "suivent l'étape : suppression" on public.step_ingredients for delete to authenticated using (private.can_write_step(step_id));

-- ─── Images ─────────────────────────────────────────────────────────────
drop policy "images : ajout editor/admin" on storage.objects;
drop policy "images : remplacement editor/admin" on storage.objects;
drop policy "images : suppression editor/admin" on storage.objects;
create policy "images : ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-images' and private.can_write_image(name));
create policy "images : remplacement" on storage.objects for update to authenticated
  using (bucket_id = 'recipe-images' and private.can_write_image(name));
create policy "images : suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-images' and private.can_write_image(name));

-- ─── Enregistrement : statut et version perso ───────────────────────────
-- (le statut, l'originale et le point de départ ne changent pas en
-- modifiant : seule la proposition repart « en attente »)
create or replace function public.save_recipe(p jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare
  r jsonb := p -> 'recipe';
  rid uuid := (r ->> 'id')::uuid;
begin
  insert into recipes (
    id, status, forked_from_id, fork_base, proposal_status,
    title, category, moments, tags, yield_quantity, yield_unit, portion_size,
    prep_minutes, cook_minutes, kcal, protein_g, fat_g, carbs_g, fiber_g,
    has_vegetables, protein_source, nutrition_confidence, total_weight_g,
    is_occasion, rating, personal_notes, source_type, image_path, image_kind, updated_at
  )
  select
    rid, coalesce(x.status, 'library'), x.forked_from_id, x.fork_base, x.proposal_status,
    x.title, x.category, coalesce(x.moments, '{}'), coalesce(x.tags, '{}'), x.yield_quantity, coalesce(x.yield_unit, 'personnes'), x.portion_size,
    x.prep_minutes, x.cook_minutes, x.kcal, x.protein_g, x.fat_g, x.carbs_g, x.fiber_g,
    x.has_vegetables, x.protein_source, coalesce(x.nutrition_confidence, 'estimated'), x.total_weight_g,
    coalesce(x.is_occasion, false), x.rating, coalesce(x.personal_notes, ''), coalesce(x.source_type, 'manuel'),
    x.image_path, coalesce(x.image_kind, 'none'), now()
  from jsonb_populate_record(null::recipes, r) x
  on conflict (id) do update set
    proposal_status = excluded.proposal_status,
    title = excluded.title, category = excluded.category, moments = excluded.moments, tags = excluded.tags,
    yield_quantity = excluded.yield_quantity, yield_unit = excluded.yield_unit, portion_size = excluded.portion_size,
    prep_minutes = excluded.prep_minutes, cook_minutes = excluded.cook_minutes,
    kcal = excluded.kcal, protein_g = excluded.protein_g, fat_g = excluded.fat_g,
    carbs_g = excluded.carbs_g, fiber_g = excluded.fiber_g,
    has_vegetables = excluded.has_vegetables, protein_source = excluded.protein_source,
    nutrition_confidence = excluded.nutrition_confidence, total_weight_g = excluded.total_weight_g,
    is_occasion = excluded.is_occasion, rating = excluded.rating, personal_notes = excluded.personal_notes,
    source_type = excluded.source_type, image_path = excluded.image_path, image_kind = excluded.image_kind,
    updated_at = now();

  delete from steps where recipe_id = rid;
  delete from ingredients where recipe_id = rid;

  insert into ingredients (id, recipe_id, position, section, name, quantity, unit, grams_estimate, aisle, scalable, raw_text, custom_ingredient_id)
  select x.id, rid, x.position, x.section, x.name, x.quantity, coalesce(x.unit, ''), x.grams_estimate, x.aisle,
         coalesce(x.scalable, true), coalesce(x.raw_text, ''), x.custom_ingredient_id
  from jsonb_populate_recordset(null::ingredients, coalesce(p -> 'ingredients', '[]')) x;

  insert into steps (id, recipe_id, position, text, timer_minutes)
  select x.id, rid, x.position, x.text, x.timer_minutes
  from jsonb_populate_recordset(null::steps, coalesce(p -> 'steps', '[]')) x;

  insert into step_ingredients (step_id, ingredient_id)
  select distinct x.step_id, x.ingredient_id
  from jsonb_populate_recordset(null::step_ingredients, coalesce(p -> 'step_ingredients', '[]')) x;
end $$;

-- ─── Retirer une version perso ──────────────────────────────────────────
-- Acceptée par l'admin (fusionnée dans l'originale) ou abandonnée par son
-- auteur : menus, modèles, courses et « à revoir » de TOUS les foyers
-- repassent sur l'originale, puis la version perso est supprimée.
create function public.retire_fork(fork uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  f public.recipes;
  target uuid;
begin
  select * into f from public.recipes where id = fork;
  if not found then return; end if;
  if f.status <> 'personal' then raise exception 'Pas une version perso'; end if;
  if not (private.my_role() = 'admin' or f.owner_id = auth.uid()) then raise exception 'Non autorisé'; end if;
  target := f.forked_from_id;
  if target is not null then
    update public.meal_plans set recipe_id = target where recipe_id = fork;
    delete from public.shopping_recipes s
      where s.recipe_id = fork and exists (select 1 from public.shopping_recipes t where t.household_id = s.household_id and t.recipe_id = target);
    update public.shopping_recipes set recipe_id = target where recipe_id = fork;
    update public.review_items set recipe_id = target where recipe_id = fork;
    update public.meal_templates set meals = replace(meals::text, fork::text, target::text)::jsonb
      where meals::text like '%' || fork::text || '%';
  end if;
  delete from public.recipes where id = fork;
end $$;
revoke execute on function public.retire_fork(uuid) from public, anon;
grant execute on function public.retire_fork(uuid) to authenticated;
