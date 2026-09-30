-- « Moments » de repas (petit-déj, déjeuner, goûter, dîner), plusieurs par
-- recette, séparés du type de plat (catégorie). Voir docs/DECISIONS.md.
-- Un brownie = catégorie Dessert + moment Goûter.

alter table public.recipes add column moments text[] not null default '{}';

-- Anciennes catégories devenues des moments
update public.recipes set moments = array['gouter'], category = 'dessert' where category = 'gouter';
update public.recipes set moments = array['petit-dejeuner'], category = null where category = 'petit-dejeuner';

-- save_recipe enregistre aussi les moments
create or replace function public.save_recipe(p jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare
  r jsonb := p -> 'recipe';
  rid uuid := (r ->> 'id')::uuid;
begin
  insert into recipes (
    id, title, category, moments, tags, yield_quantity, yield_unit, portion_size,
    prep_minutes, cook_minutes, kcal, protein_g, fat_g, carbs_g, fiber_g,
    has_vegetables, protein_source, nutrition_confidence, total_weight_g,
    is_occasion, rating, personal_notes, source_type, image_path, image_kind, updated_at
  )
  select
    rid, x.title, x.category, coalesce(x.moments, '{}'), coalesce(x.tags, '{}'), x.yield_quantity, coalesce(x.yield_unit, 'personnes'), x.portion_size,
    x.prep_minutes, x.cook_minutes, x.kcal, x.protein_g, x.fat_g, x.carbs_g, x.fiber_g,
    x.has_vegetables, x.protein_source, coalesce(x.nutrition_confidence, 'estimated'), x.total_weight_g,
    coalesce(x.is_occasion, false), x.rating, coalesce(x.personal_notes, ''), coalesce(x.source_type, 'manuel'),
    x.image_path, coalesce(x.image_kind, 'none'), now()
  from jsonb_populate_record(null::recipes, r) x
  on conflict (id) do update set
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
