-- V2 planning : réglages du planning, un plat par repas et par jour,
-- basiques uniques par personne.

alter table public.settings
  add column planning jsonb not null default '{"meals": ["dejeuner", "diner"], "priority": "protein"}';

alter table public.meal_plans alter column portions set default 1;
alter table public.meal_plans add constraint meal_plans_owner_day_meal_key unique (owner_id, day, meal);
create index meal_plans_owner_day_idx on public.meal_plans (owner_id, day);

alter table public.pantry_basics add constraint pantry_basics_owner_name_key unique (owner_id, name);
