-- ════════════════════════════════════════════════════════════════════════
-- Plusieurs plats dans un repas (entrée, dessert, pain…) : slot 0 = le plat
-- tiré au sort, slot 1, 2… = ajoutés à la main (docs/DECISIONS.md, 2026-10-08).
-- ════════════════════════════════════════════════════════════════════════

alter table public.meal_plans add column slot smallint not null default 0;
alter table public.meal_plans drop constraint meal_plans_household_day_meal_key;
alter table public.meal_plans add constraint meal_plans_household_day_meal_slot_key unique (household_id, day, meal, slot);
