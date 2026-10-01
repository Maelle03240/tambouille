-- Temps réel : la liste de courses et le menu du foyer se mettent à jour
-- chez tous les membres sans recharger (Supabase Realtime, filtré par RLS).
-- Décocher = passer `checked` à faux (pas de suppression) : les suppressions
-- ne sont pas filtrables par foyer en temps réel.

alter table public.shopping_checks add column checked boolean not null default true;
alter table public.shopping_checks add column updated_at timestamptz not null default now();

alter publication supabase_realtime add table
  public.shopping_checks,
  public.shopping_items,
  public.shopping_recipes,
  public.meal_plans;
