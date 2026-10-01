-- Planning : repas retiré pour un jour précis (ex. pas de dîner samedi).
-- Les repas en plus (goûter un mercredi) sont simplement des lignes en plus.
alter table public.meal_plans add column skipped boolean not null default false;
