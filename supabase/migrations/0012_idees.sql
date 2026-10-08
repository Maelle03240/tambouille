-- ════════════════════════════════════════════════════════════════════════
-- Idées de recettes à ajouter plus tard (« lasagnes de mamie ») : juste un
-- nom, propre à chaque personne (docs/DECISIONS.md, 2026-10-08).
-- ════════════════════════════════════════════════════════════════════════

create table public.recipe_ideas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  text text not null,
  created_at timestamptz not null default now()
);
create index recipe_ideas_owner_idx on public.recipe_ideas (owner_id);

alter table public.recipe_ideas enable row level security;
create policy "idées : les siennes" on public.recipe_ideas for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
