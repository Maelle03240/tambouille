-- ════════════════════════════════════════════════════════════════════════
-- Le carnet de Tambouille — schéma initial (V1, colonnes V2 déjà prévues)
-- À exécuter une fois dans Supabase : SQL Editor → New query → coller → Run.
-- Les migrations suivantes iront dans 0002_…, 0003_… (ne jamais modifier
-- un fichier déjà exécuté).
-- ════════════════════════════════════════════════════════════════════════

-- ─── Profils et rôles ────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role text not null default 'reader' check (role in ('admin', 'editor', 'reader')),
  created_at timestamptz not null default now()
);

-- Crée le profil à l'inscription. Le tout premier compte devient admin.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), ''),
    case when exists (select 1 from public.profiles) then 'reader' else 'admin' end
  );
  insert into public.settings (user_id) values (new.id);
  return new;
end $$;

-- Rôle de l'utilisateur connecté (utilisé par les règles RLS).
create function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ─── Réglages par utilisateur ────────────────────────────────────────────
create table public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  auto_illustrations boolean not null default false,
  protein_rich_threshold_g numeric not null default 20,
  -- { "kcal": 1800, "proteinMinG": 100, "fatG": [50, 70], "carbsG": null, "fiberG": [25, 35] }
  daily_targets jsonb not null default '{"kcal": null, "proteinMinG": null}',
  updated_at timestamptz not null default now()
);

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Bibliothèque d'ingrédients perso (V2) ───────────────────────────────
create table public.custom_ingredients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete set null default auth.uid(),
  name text not null,
  -- valeurs de l'étiquette pour 100 g
  kcal_100g numeric,
  protein_100g numeric,
  fat_100g numeric,
  carbs_100g numeric,
  fiber_100g numeric,
  created_at timestamptz not null default now()
);

-- ─── Recettes ────────────────────────────────────────────────────────────
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete set null default auth.uid(),
  title text not null,
  -- liste des catégories : src/config/categories.ts (pas de contrainte ici
  -- pour pouvoir en ajouter sans migration)
  category text,
  tags text[] not null default '{}',
  yield_quantity numeric,
  yield_unit text not null default 'personnes',
  portion_size numeric default 1,
  prep_minutes integer,
  cook_minutes integer,
  -- valeurs PAR PORTION, estimées et modifiables
  kcal numeric,
  protein_g numeric,
  fat_g numeric,
  carbs_g numeric,
  fiber_g numeric,
  has_vegetables boolean,
  protein_source text check (protein_source in ('viande', 'poisson', 'oeuf', 'laitier', 'vegetal', 'poudre')),
  nutrition_confidence text not null default 'estimated' check (nutrition_confidence in ('estimated', 'from_labels')),
  total_weight_g numeric,
  is_occasion boolean not null default false,
  rating text check (rating in ('reussie', 'a-refaire', 'ratee')),
  personal_notes text not null default '',
  source_type text not null default 'manuel',
  image_path text,
  image_kind text not null default 'none' check (image_kind in ('none', 'generated', 'personal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position integer not null default 0,
  section text, -- groupe d'affichage facultatif (« Vinaigrette »)
  name text not null,
  quantity numeric,
  unit text not null default '',
  grams_estimate numeric,
  aisle text,
  scalable boolean not null default true,
  raw_text text not null default '',
  custom_ingredient_id uuid references public.custom_ingredients (id) on delete set null
);
create index ingredients_recipe_idx on public.ingredients (recipe_id);

create table public.steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position integer not null default 0,
  -- marqueurs {{ing:<id>}} et {{timer:<minutes>}}
  text text not null,
  timer_minutes numeric
);
create index steps_recipe_idx on public.steps (recipe_id);

create table public.step_ingredients (
  step_id uuid not null references public.steps (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  primary key (step_id, ingredient_id)
);

create table public.review_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  kind text not null check (kind in ('auto', 'manual')),
  field text,
  note text not null default '',
  done boolean not null default false,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index review_items_recipe_idx on public.review_items (recipe_id);

-- ─── V2 : planning et basiques (tables prêtes, pas encore utilisées) ─────
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  day date not null,
  meal text not null, -- petit-dej, dejeuner, gouter, diner
  recipe_id uuid references public.recipes (id) on delete set null,
  portions numeric,
  locked boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  kind text not null check (kind in ('jour', 'semaine')),
  meals jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.pantry_basics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null
);

-- ─── Enregistrement atomique d'une recette (tout ou rien) ────────────────
-- Appelée par l'appli : rpc('save_recipe', { p: { recipe, ingredients, steps, step_ingredients } })
create function public.save_recipe(p jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare
  r jsonb := p -> 'recipe';
  rid uuid := (r ->> 'id')::uuid;
begin
  insert into recipes (
    id, title, category, tags, yield_quantity, yield_unit, portion_size,
    prep_minutes, cook_minutes, kcal, protein_g, fat_g, carbs_g, fiber_g,
    has_vegetables, protein_source, nutrition_confidence, total_weight_g,
    is_occasion, rating, personal_notes, source_type, image_path, image_kind, updated_at
  )
  select
    rid, x.title, x.category, coalesce(x.tags, '{}'), x.yield_quantity, coalesce(x.yield_unit, 'personnes'), x.portion_size,
    x.prep_minutes, x.cook_minutes, x.kcal, x.protein_g, x.fat_g, x.carbs_g, x.fiber_g,
    x.has_vegetables, x.protein_source, coalesce(x.nutrition_confidence, 'estimated'), x.total_weight_g,
    coalesce(x.is_occasion, false), x.rating, coalesce(x.personal_notes, ''), coalesce(x.source_type, 'manuel'),
    x.image_path, coalesce(x.image_kind, 'none'), now()
  from jsonb_populate_record(null::recipes, r) x
  on conflict (id) do update set
    title = excluded.title, category = excluded.category, tags = excluded.tags,
    yield_quantity = excluded.yield_quantity, yield_unit = excluded.yield_unit, portion_size = excluded.portion_size,
    prep_minutes = excluded.prep_minutes, cook_minutes = excluded.cook_minutes,
    kcal = excluded.kcal, protein_g = excluded.protein_g, fat_g = excluded.fat_g,
    carbs_g = excluded.carbs_g, fiber_g = excluded.fiber_g,
    has_vegetables = excluded.has_vegetables, protein_source = excluded.protein_source,
    nutrition_confidence = excluded.nutrition_confidence, total_weight_g = excluded.total_weight_g,
    is_occasion = excluded.is_occasion, rating = excluded.rating, personal_notes = excluded.personal_notes,
    source_type = excluded.source_type, image_path = excluded.image_path, image_kind = excluded.image_kind,
    updated_at = now();

  -- on remplace ingrédients et étapes (les liens étape↔ingrédient suivent en cascade)
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

-- ─── Sécurité (RLS) ──────────────────────────────────────────────────────
-- Tout le monde connecté lit ; editor et admin créent et modifient ;
-- seul admin supprime et gère les rôles.
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.custom_ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.ingredients enable row level security;
alter table public.steps enable row level security;
alter table public.step_ingredients enable row level security;
alter table public.review_items enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_templates enable row level security;
alter table public.pantry_basics enable row level security;

create policy "profil : lecture connectée" on public.profiles for select to authenticated using (true);
create policy "profil : admin gère les rôles" on public.profiles for update to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

create policy "réglages : les siens" on public.settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Recettes et tables liées : même règle pour chacune
do $$
declare t text;
begin
  foreach t in array array['recipes', 'ingredients', 'steps', 'step_ingredients', 'custom_ingredients'] loop
    execute format('create policy "lecture connectée" on public.%I for select to authenticated using (true)', t);
    execute format($p$create policy "écriture editor/admin" on public.%I for insert to authenticated with check (public.my_role() in ('admin', 'editor'))$p$, t);
    execute format($p$create policy "modification editor/admin" on public.%I for update to authenticated using (public.my_role() in ('admin', 'editor'))$p$, t);
  end loop;
end $$;

-- Suppression d'une recette : admin seulement.
create policy "suppression admin" on public.recipes for delete to authenticated using (public.my_role() = 'admin');
create policy "suppression admin" on public.custom_ingredients for delete to authenticated using (public.my_role() = 'admin');
-- Ingrédients / étapes : remplacés à chaque enregistrement → editor/admin.
create policy "remplacement editor/admin" on public.ingredients for delete to authenticated using (public.my_role() in ('admin', 'editor'));
create policy "remplacement editor/admin" on public.steps for delete to authenticated using (public.my_role() in ('admin', 'editor'));
create policy "remplacement editor/admin" on public.step_ingredients for delete to authenticated using (public.my_role() in ('admin', 'editor'));

-- « À revoir » : tout le monde connecté lit ; tout le monde connecté peut
-- signaler (même un lecteur en cuisine) ; editor/admin traitent et suppriment.
create policy "à revoir : lecture" on public.review_items for select to authenticated using (true);
create policy "à revoir : signaler" on public.review_items for insert to authenticated with check (true);
create policy "à revoir : traiter" on public.review_items for update to authenticated using (public.my_role() in ('admin', 'editor'));
create policy "à revoir : supprimer" on public.review_items for delete to authenticated using (public.my_role() in ('admin', 'editor'));

-- V2 : chacun ses plannings, modèles et basiques.
create policy "les siens" on public.meal_plans for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "les siens" on public.meal_templates for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "les siens" on public.pantry_basics for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
