-- ════════════════════════════════════════════════════════════════════════
-- IA payante à la demande (docs/DECISIONS.md, 2026-11-05) : interrupteur dans
-- les réglages de l'admin. Le serveur vérifie aussi le rôle : un membre qui
-- mettrait ce champ à vrai reste sur la clé gratuite.
-- ════════════════════════════════════════════════════════════════════════

alter table public.settings add column ai_paid boolean not null default false;
