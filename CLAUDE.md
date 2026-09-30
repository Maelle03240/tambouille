@AGENTS.md

# Le carnet de Tambouille — guide pour Claude

**À lire en début de session : `SPEC.md` (la référence), puis `docs/DECISIONS.md` (ce qui a été tranché depuis).**
Toute décision qui s'écarte de la spec se valide avec l'utilisatrice avant d'être codée, puis s'ajoute à `docs/DECISIONS.md`.
Elle parle français : interface, textes, commentaires et messages de commit en français.

## Commandes

- `npm run dev` — développement (http://localhost:3000). Sans `.env.local` : **mode local** (données dans le navigateur).
- `npm test` — tests des calculs (quantités, marqueurs, import). À lancer après toute modif dans `src/lib/recipes/`.
- `npm run typecheck` · `npm run lint` · `npm run build` (génère aussi `public/sw.js`).

## Où changer quoi

| Je veux changer… | Fichier |
| --- | --- |
| Couleurs, arrondis, ombres | `src/styles/theme.css` (tokens) — jamais de couleur en dur dans les composants |
| Polices | `src/app/layout.tsx` (next/font) |
| Nom, sous-titre, couleur de barre | `src/config/brand.ts` |
| Logo / icônes | `public/icons/*` (source : `docs/Logo@1x.png`) |
| Catégories (libellé, couleur) | `src/config/categories.ts` — ne jamais renommer un `id` stocké |
| Tags | `src/config/tags.ts` (+ calcul auto dans `src/lib/recipes/tags.ts`) |
| Onglets du bas, style du mode cuisine (1a/1b), unités, rayons | `src/config/ui.ts` |
| Seuil « deux colonnes » (iPad/paysage) | `@custom-variant wide` dans `src/app/globals.css` |
| Arrondis des quantités, lecture « 200 g de farine » | `src/lib/recipes/quantities.ts` (+ tests) |
| Points « à revoir » automatiques | `src/lib/recipes/review.ts` (`AUTO_REVIEW_RULES`) |
| Consignes données à l'IA | `src/lib/ai/prompt.ts` |
| Modèle d'IA | `src/lib/ai/parseRecipe.ts` → `getRecipeParser()` + `src/lib/ai/providers/` |
| Colonnes de la base | nouvelle migration `supabase/migrations/000N_….sql` + `src/lib/data/supabase-mapping.ts` + `src/lib/recipes/types.ts` |
| Pages disponibles hors ligne | `ROUTES` dans `scripts/build-sw.mjs` |

## Architecture (couches, du bas vers le haut)

1. **`src/config/`** — réglages modifiables sans toucher à la logique.
2. **`src/lib/recipes/`** — modèle et logique pure (sans React ni réseau), testée : types, quantités, marqueurs d'étapes, format d'import, tags, recherche.
3. **`src/lib/data/`** — données. L'interface **lit toujours le cache IndexedDB** (`db.ts`, `hooks.ts`) ; les écritures passent par `actions.ts` (serveur puis cache). `repository.ts` = contrat, implémenté par `supabase-repository.ts` (vraie base) et `local-repository.ts` (mode local). `sync.ts` recopie le serveur dans le cache.
4. **`src/lib/ai/`** — IA côté serveur uniquement (`import "server-only"`), derrière des interfaces. Clé absente ⇒ fonction désactivée (`/api/features`).
5. **`src/components/`** — `ui/` (briques), `recipe/`, `cook/` (mode cuisine), `editor/`, `app/` (état global, onglets, hors ligne), `screens/` (un écran = un fichier).
6. **`src/app/`** — routes minces qui affichent un écran. Recettes par `?id=` (pas de `[id]`) pour que chaque page soit statique et dispo hors ligne.

Données d'une étape : texte stocké avec marqueurs `{{ing:<uuid>}}` et `{{timer:<minutes>}}` ; saisie et IA utilisent des jetons lisibles `{farine}` / `{8 min}` convertis par `src/lib/recipes/markers.ts`.

## Règles

- Clés API jamais côté navigateur ; seules les variables `NEXT_PUBLIC_*` y vont.
- Demander avant d'ajouter une dépendance lourde.
- Une migration SQL déjà exécutée ne se modifie plus : on en ajoute une nouvelle.
- Tester sur mobile (375 px), iPad paysage (1180×820) et le mode cuisine après toute modif d'écran.
- Ne pas committer/pousser sans que l'utilisatrice le demande.
