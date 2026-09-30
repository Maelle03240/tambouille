# Décisions

Journal des choix faits en cours de route, en complément de `SPEC.md`. Le plus récent en haut.
Format : date — décision — pourquoi.

## 2026-09-30 — Démarrage de la V1

**Validées avec l'utilisatrice (écarts à la spec)**
- **Sections d'ingrédients** : colonne `ingredients.section` (facultative) pour les groupes « Pâte », « Vinaigrette » de la maquette.
- **Minuteurs dans le texte** : marqueur `{{timer:<minutes>}}` dans `steps.text`, plusieurs possibles par étape, comme la maquette. `steps.timer_minutes` est gardé = premier minuteur de l'étape.
- **Catégories** : celles de la spec + **Pains**. Les soupes vont dans Entrées.
- **Mode cuisine** : style **1b « projecteur sombre »** (réglable dans `src/config/ui.ts`, le 1a y est aussi).

**Choix techniques (conformes à la spec, à connaître)**
- **Service worker maison** (`scripts/sw.template.js`) au lieu de Serwist : aucune dépendance, compatible Turbopack, stratégie lisible. Version changée à chaque build.
- **Pages recette en `?id=`** (`/recette?id=…`, `/cuisine?id=…`) : pages statiques, donc toutes disponibles hors ligne quelle que soit la recette.
- **Connexion e-mail + mot de passe** (pas de lien magique : il s'ouvrirait dans Safari et pas dans l'appli installée). Comptes créés par l'admin dans Supabase, inscriptions fermées. **Le premier compte créé devient admin**, les suivants « lecture ».
- **Mode local** : sans variables Supabase, l'appli marche entièrement dans le navigateur (utile pour essayer/développer). Même interface, rien à changer.
- **Enregistrement atomique** : fonction SQL `save_recipe` (recette + ingrédients + étapes en une transaction).
- **Un seul format d'import** pour l'IA et le « coller du JSON » (`docs/FORMAT-IMPORT.md`) ; bouton « Copier les consignes pour Claude ».
- **Lien d'une page web** : lecture des données structurées schema.org/Recipe quand elles existent (Ricardo…), sinon du texte. Instagram/TikTok bloquent la lecture de lien → capture d'écran.
- **Arrondis** : quantités affichées telles quelles aux portions d'origine ; arrondies (5 g, ½ œuf…) seulement quand on change les portions.
- **Tags automatiques** (riche en protéines, rapide < 20 min) calculés à l'affichage, jamais stockés. « Fêtes » = colonne `is_occasion`.
- **« À revoir » auto** : régénérés à chaque enregistrement depuis `AUTO_REVIEW_RULES` ; un champ rempli fait disparaître le point.
- **« À revoir » manuel hors ligne** : file d'attente locale envoyée au retour du réseau. Un lecteur (famille) peut aussi signaler.
- **Modèle Gemini** : `gemini-flash-latest` par défaut, modifiable par `GEMINI_MODEL` sans toucher au code.
- **Export JSON** de toutes les recettes dans Réglages (sauvegarde simple).

**Reste à faire en V1** : importer 10 vraies recettes, tester sur iPhone (§11 de la spec), liaison automatique des `custom_ingredients` (table prête, bibliothèque en V2).

## 2026-09-30 — Base Supabase créée

- Projet **tambouille** (organisation « Perso », région Paris `eu-west-3`, plan gratuit), id `diaekldfjimgyinxybeg`. Migrations 0001 et 0002 appliquées.
- `my_role()` déplacée dans un schéma `private` et `handle_new_user()` non appelable par l'API (conseils de sécurité Supabase : 0 alerte).
- L'ancien projet « Maelle03240's Project » (en pause) n'a pas été touché.
