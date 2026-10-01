-- ════════════════════════════════════════════════════════════════════════
-- Famille, étape 1 : comptes et foyers (docs/DECISIONS.md, 2026-10-01).
-- Un foyer regroupe des comptes ; menu, modèles, objectifs, basiques et
-- liste de courses appartiennent au FOYER (plus à la personne).
-- Les recettes ne changent pas ici (étape 2 : recettes perso, propositions).
-- ════════════════════════════════════════════════════════════════════════

-- ─── Foyers et membres ───────────────────────────────────────────────────
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- objectifs du jour et réglages du planning (le tirage du menu en dépend)
  daily_targets jsonb not null default '{"kcal": null, "proteinMinG": null}',
  planning jsonb not null default '{"meals": ["dejeuner", "diner"], "priority": "protein"}',
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index household_members_user_idx on public.household_members (user_id);

-- Suis-je membre de ce foyer ? (utilisée par les règles RLS)
create function private.is_member(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members where household_id = hid and user_id = auth.uid())
$$;
revoke execute on function private.is_member(uuid) from public, anon;
grant execute on function private.is_member(uuid) to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;

create policy "foyers : les miens, ou admin" on public.households for select to authenticated
  using (private.is_member(id) or private.my_role() = 'admin');
create policy "foyers : création admin" on public.households for insert to authenticated
  with check (private.my_role() = 'admin');
create policy "foyers : réglages par les membres" on public.households for update to authenticated
  using (private.is_member(id) or private.my_role() = 'admin');
create policy "foyers : suppression admin" on public.households for delete to authenticated
  using (private.my_role() = 'admin');

create policy "membres : de mes foyers, ou admin" on public.household_members for select to authenticated
  using (user_id = auth.uid() or private.is_member(household_id) or private.my_role() = 'admin');
create policy "membres : ajout admin" on public.household_members for insert to authenticated
  with check (private.my_role() = 'admin');
create policy "membres : retrait admin, ou je pars" on public.household_members for delete to authenticated
  using (private.my_role() = 'admin' or user_id = auth.uid());

-- ─── Un foyer pour chaque compte existant, avec ses données ─────────────
do $$
declare
  p record;
  hid uuid;
begin
  for p in select pr.id, pr.display_name, s.daily_targets, s.planning
           from public.profiles pr left join public.settings s on s.user_id = pr.id loop
    insert into public.households (name, daily_targets, planning)
    values (
      'Maison',
      coalesce(p.daily_targets, '{"kcal": null, "proteinMinG": null}'),
      coalesce(p.planning, '{"meals": ["dejeuner", "diner"], "priority": "protein"}')
    )
    returning id into hid;
    insert into public.household_members (household_id, user_id) values (hid, p.id);
  end loop;
end $$;

-- ─── Menu, modèles, basiques : rattachés au foyer ────────────────────────
alter table public.meal_plans add column household_id uuid references public.households (id) on delete cascade;
alter table public.meal_templates add column household_id uuid references public.households (id) on delete cascade;
alter table public.pantry_basics add column household_id uuid references public.households (id) on delete cascade;

update public.meal_plans t set household_id = m.household_id from public.household_members m where m.user_id = t.owner_id;
update public.meal_templates t set household_id = m.household_id from public.household_members m where m.user_id = t.owner_id;
update public.pantry_basics t set household_id = m.household_id from public.household_members m where m.user_id = t.owner_id;

alter table public.meal_plans alter column household_id set not null;
alter table public.meal_templates alter column household_id set not null;
alter table public.pantry_basics alter column household_id set not null;

-- owner_id devient « qui l'a ajouté » : facultatif, gardé si le compte disparaît
alter table public.meal_plans alter column owner_id drop not null;
alter table public.meal_templates alter column owner_id drop not null;
alter table public.pantry_basics alter column owner_id drop not null;
alter table public.meal_plans drop constraint meal_plans_owner_id_fkey,
  add constraint meal_plans_owner_id_fkey foreign key (owner_id) references auth.users (id) on delete set null;
alter table public.meal_templates drop constraint meal_templates_owner_id_fkey,
  add constraint meal_templates_owner_id_fkey foreign key (owner_id) references auth.users (id) on delete set null;
alter table public.pantry_basics drop constraint pantry_basics_owner_id_fkey,
  add constraint pantry_basics_owner_id_fkey foreign key (owner_id) references auth.users (id) on delete set null;

alter table public.meal_plans drop constraint meal_plans_owner_day_meal_key;
drop index public.meal_plans_owner_day_idx;
alter table public.meal_plans add constraint meal_plans_household_day_meal_key unique (household_id, day, meal);
create index meal_plans_household_day_idx on public.meal_plans (household_id, day);

alter table public.pantry_basics drop constraint pantry_basics_owner_name_key;
alter table public.pantry_basics add constraint pantry_basics_household_name_key unique (household_id, name);
create index meal_templates_household_idx on public.meal_templates (household_id);

drop policy "les siens" on public.meal_plans;
drop policy "les siens" on public.meal_templates;
drop policy "les siens" on public.pantry_basics;
create policy "mon foyer" on public.meal_plans for all to authenticated
  using (private.is_member(household_id)) with check (private.is_member(household_id));
create policy "mon foyer" on public.meal_templates for all to authenticated
  using (private.is_member(household_id)) with check (private.is_member(household_id));
create policy "mon foyer" on public.pantry_basics for all to authenticated
  using (private.is_member(household_id)) with check (private.is_member(household_id));

-- ─── Liste de courses du foyer (partagée, cochable hors ligne) ───────────
-- Recettes de la liste : ajoutées à la main (extra), retirées du menu
-- (excluded), quantité modifiée (servings).
create table public.shopping_recipes (
  household_id uuid not null references public.households (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  extra boolean not null default false,
  extra_servings numeric,
  excluded boolean not null default false,
  servings numeric,
  updated_at timestamptz not null default now(),
  primary key (household_id, recipe_id)
);

-- Articles cochés (une ligne = coché ; clé calculée par l'appli).
create table public.shopping_checks (
  household_id uuid not null references public.households (id) on delete cascade,
  item_key text not null,
  created_at timestamptz not null default now(),
  primary key (household_id, item_key)
);

-- Articles ajoutés à la main (papier toilette…).
create table public.shopping_items (
  id uuid primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  text text not null,
  aisle text not null default 'Autre',
  created_at timestamptz not null default now()
);
create index shopping_items_household_idx on public.shopping_items (household_id);

alter table public.shopping_recipes enable row level security;
alter table public.shopping_checks enable row level security;
alter table public.shopping_items enable row level security;
create policy "mon foyer" on public.shopping_recipes for all to authenticated
  using (private.is_member(household_id)) with check (private.is_member(household_id));
create policy "mon foyer" on public.shopping_checks for all to authenticated
  using (private.is_member(household_id)) with check (private.is_member(household_id));
create policy "mon foyer" on public.shopping_items for all to authenticated
  using (private.is_member(household_id)) with check (private.is_member(household_id));

-- ─── Nouveaux comptes : prénom donné à l'invitation ──────────────────────
-- Le foyer et le rôle sont fixés par la route d'invitation (côté serveur,
-- clé service) : jamais à partir de données que l'inscrit pourrait choisir.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), ''),
    case when exists (select 1 from public.profiles) then 'reader' else 'admin' end
  );
  insert into public.settings (user_id) values (new.id);
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
