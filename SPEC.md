# SPEC — Appli cuisine

Document de référence pour Claude Code. À relire au début de chaque session. Toute décision qui s'en écarte doit être validée avec moi avant d'être codée.

## 1. Objectif

Une appli web de recettes perso, installable sur l'écran d'accueil (PWA), utilisée surtout sur iPhone en cuisinant, aussi sur iPad, et partagée avec ma famille (iPhone et Android).

Critère de réussite : **ajouter une recette en moins d'une minute** et **cuisiner avec, sans chercher ses infos**. Si une fonctionnalité ne sert pas l'un de ces deux points, elle attend.

Priorités : 1. mode cuisine · 2. ajout rapide · 3. planning équilibré (kcal indicatives, protéines, légumes) · 4. liste de courses.

## 2. Contraintes

- **Gratuit** : aucun service payant. Rester dans les niveaux gratuits.
- **Hors ligne** : toutes les recettes consultables sans réseau (lecture seule). Création et modification uniquement en ligne.
- **Appareils** : iPhone (principal), iPad, Android. Pas d'appli native.
- **Langue** : interface et données en français.

## 3. Stack

| Rôle | Choix | Notes |
| --- | --- | --- |
| Front | Next.js (App Router) + TypeScript + Tailwind | Déployé sur Vercel (plan gratuit), dépôt GitHub |
| PWA | Manifest + service worker (Serwist ou équivalent) | Installation « Sur l'écran d'accueil » sur iOS |
| Cache hors ligne | IndexedDB (Dexie) | Copie locale de toutes les recettes |
| Base de données, comptes, fichiers | Supabase (plan gratuit) | Postgres + Auth + Storage + RLS |
| Lecture des recettes (IA) | Gemini Flash, niveau gratuit | Appel côté serveur uniquement |
| Illustrations (IA) | Cloudflare Workers AI, FLUX.1 schnell, quota gratuit quotidien | Appel côté serveur uniquement, désactivable |

Règles :
- Les clés API ne sont **jamais** exposées au navigateur. Tous les appels IA passent par des routes serveur.
- Chaque fournisseur IA est isolé derrière une interface (`lib/ai/parseRecipe.ts`, `lib/ai/generateIllustration.ts`) pour pouvoir changer de modèle (Gemma, Claude…) sans toucher au reste.
- Si une clé est absente dans les variables d'environnement, la fonction correspondante est simplement désactivée dans l'interface, sans erreur.
- Me demander avant d'ajouter une dépendance lourde.

Variables d'environnement : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (ces deux dernières optionnelles).

## 4. Modèle de données

Prévu dès la V1 même si certaines colonnes ne servent qu'en V2 : ajouter une colonne plus tard coûte plus cher que de la prévoir.

- **profiles** : `id`, `display_name`, `role` (`admin` | `editor` | `reader`).
- **recipes** : `id`, `owner_id`, `title`, `category`, `tags[]`, `yield_quantity` et `yield_unit` (rendement : « 4 personnes », « 12 cookies », « 8 crêpes », « 2 verres »), `portion_size` (unités par portion, ex. 1 portion = 2 cookies), `prep_minutes`, `cook_minutes`, valeurs **par portion** : `kcal`, `protein_g`, `fat_g`, `carbs_g`, `fiber_g` (toutes estimées, modifiables), `has_vegetables` (booléen), `protein_source` (viande, poisson, œuf, laitier, végétal, poudre), `nutrition_confidence` (`estimated` | `from_labels`), `total_weight_g` (grands plats : quiches, gâteaux), `is_occasion` (fêtes, exclu du suivi kcal), `rating` (réussie / à refaire / ratée), `personal_notes`, `source_type` (photo, capture, texte, manuel), `image_path`, `image_kind` (`none` | `generated` | `personal`), `created_at`, `updated_at`.
- **ingredients** : `id`, `recipe_id`, `position`, `name`, `quantity` (numérique, nullable), `unit`, `grams_estimate` (nullable), `aisle` (rayon), `scalable` (booléen, faux pour « sel au goût »), `raw_text` (texte d'origine).
- **steps** : `id`, `recipe_id`, `position`, `text` (avec marqueurs d'ingrédients, voir §6), `timer_minutes` (nullable).
- **step_ingredients** : lien étape ↔ ingrédient.
- **review_items** : `id`, `recipe_id`, `kind` (`auto` | `manual`), `field` (ex. `prep_minutes`), `note`, `done`, `created_by`, `created_at`.
- **custom_ingredients** : bibliothèque d'ingrédients perso avec les valeurs de l'étiquette pour 100 g (ex. ma poudre protéinée, mon skyr). `ingredients.custom_ingredient_id` y fait référence ; quand il est renseigné, le calcul utilise ces valeurs et non l'estimation IA.
- **settings** : par utilisateur, dont `auto_illustrations` (booléen), `protein_rich_threshold_g` (seuil du tag « riche en protéines »), et les objectifs quotidiens que je fixe moi-même (`daily_targets` : kcal, protéines minimum, et fourchettes optionnelles lipides / glucides / fibres).
- V2 : **meal_plans**, **pantry_basics** (basiques toujours présents, exclus de la liste de courses).

Catégories : entrée, plat, dessert, sauce, apéro, cocktail / mocktail, petit-déjeuner, goûter. Tags : fêtes, meal prep, one-pot, rapide (< 20 min), sans gluten, **riche en protéines** (automatique selon le seuil), **à tester** (recette jamais cuisinée), etc. (à confirmer avec moi).

Sécurité (RLS) : tout le monde connecté lit les recettes ; `editor` et `admin` créent et modifient ; seul `admin` supprime et gère les rôles. En V1 je suis la seule utilisatrice, mais les règles existent déjà.

## 5. Ajout de recette (V1)

Un seul bouton « Ajouter », trois entrées : **prendre une photo**, **importer une capture**, **coller du texte**. Plus une saisie manuelle et un secours « coller du JSON » (pour une recette structurée ailleurs, par exemple dans une conversation Claude).

1. L'image ou le texte est envoyé à la route serveur `/api/parse-recipe`.
2. Gemini renvoie **uniquement du JSON** respectant un schéma strict (titre, catégorie, portions, temps, ingrédients avec quantité / unité / grammes estimés / rayon, étapes avec ingrédients liés et minuteurs détectés, rendement et unité, kcal / protéines / lipides / glucides / fibres estimés par portion, présence de légumes, source de protéine, liste des champs incertains). Les ingrédients reconnus dans `custom_ingredients` sont reliés automatiquement et leurs vraies valeurs remplacent l'estimation.
3. Le JSON est validé (zod). Si invalide : un nouvel essai, puis message clair.
4. **Écran de vérification** : fiche pré-remplie, champs modifiables, champs incertains signalés. Rien n'est enregistré sans validation.
5. À l'enregistrement : les champs manquants génèrent automatiquement des `review_items` de type `auto`.
6. Si les illustrations sont activées : génération en arrière-plan, sans bloquer l'enregistrement.

La photo d'import n'est pas conservée après la lecture.

## 6. Mode cuisine (V1, priorité 1)

- Toutes les étapes visibles en défilant. **Jamais une étape seule à l'écran.**
- Toucher une étape la rend « en cours » (barre terracotta à gauche), les précédentes passent en « faites » (grisées). Aucune obligation de toucher pour lire.
- **Quantités affichées dans le texte des étapes**, recalculées selon les portions choisies. Format de stockage : marqueurs du type `{{ing:<id>}}` dans `steps.text`, remplacés à l'affichage par « **200 g** de farine ».
- Portions ajustables (− / +) dans l'unité de la recette (« 12 cookies », « 4 personnes ») ; les ingrédients `scalable = false` ne changent pas. Arrondis lisibles (pas de « 1,3333 œuf »).
- Ingrédients repliables et cochables.
- Minuteurs : pastilles cliquables, plusieurs en parallèle, alerte sonore et vibration quand c'est possible.
- Écran maintenu allumé (Screen Wake Lock API), avec repli silencieux si non supporté.
- iPhone portrait : une colonne, ingrédients repliables en haut. iPad / paysage : ingrédients à gauche, étapes à droite.
- Bouton « à revoir » : ajoute une note manuelle, fonctionne **même hors ligne** (mise en file, envoyée au retour du réseau).

## 7. Hors ligne

- Au lancement et à chaque modification, toutes les recettes (texte, pas les images en haute définition) sont copiées dans IndexedDB.
- Sans réseau : l'appli s'ouvre, liste, recherche et mode cuisine fonctionnent depuis le cache. Bandeau « hors ligne ». Boutons d'ajout et d'édition désactivés avec explication.
- Images : miniatures mises en cache, le reste au mieux.
- Sur iOS, afficher au premier lancement dans Safari une aide « Ajouter à l'écran d'accueil » (nécessaire pour un stockage fiable hors ligne).

## 8. Images (V2, emplacement prévu en V1)

Priorité d'affichage : photo perso > illustration générée > couverture typographique (titre en serif sur aplat couleur de la catégorie).

- Illustrations : style unique imposé dans le prompt (encre ou aquarelle façon vieux livre de cuisine, fond crème, jamais photoréaliste).
- Réglage global « Illustrations automatiques » ; par recette : régénérer, supprimer, remplacer par ma photo.
- Images compressées (WebP, largeur max ~800 px) dans Supabase Storage.
- Désactiver complètement = retirer les variables Cloudflare : l'appli continue avec les couvertures typographiques.

## 9. Liste de courses (V2)

- Additionne les ingrédients des recettes choisies (même nom + même unité ; conversions simples g/kg, ml/cl/l).
- Exclut les basiques (`pantry_basics`), avec possibilité de les réafficher.
- Groupée par rayon ; ingrédient inconnu → rayon « Autre ».
- Export par le menu de partage du système (Web Share API) → Notes sur iPhone, Keep sur Android. Repli : bouton « Copier ».
- Pas de gestion de liste dans l'appli : les articles perso s'ajoutent dans Notes.

## 10. Découpage et critères de fin

**V1 — « je cuisine avec »**
- [ ] Auth Supabase, rôles, RLS
- [ ] CRUD recettes + édition simple de chaque champ
- [ ] Import photo / capture / texte → vérification → enregistrement
- [ ] Kcal et protéines estimées par portion (IA), modifiables à la main ; tags « riche en protéines » et « à tester »
- [ ] Mode cuisine complet (§6)
- [ ] Liste « à revoir » (auto + manuel)
- [ ] PWA installable + lecture hors ligne (§7)
- [ ] Recherche et filtres par catégorie / tag
- [ ] Couverture typographique

Terminée quand : j'ai importé 10 vraies recettes (carnet + Insta) et cuisiné 3 fois avec, dont une fois en mode avion.

**V2 — « je planifie »**
- [ ] Illustrations IA (§8)
- [ ] Planning semaine : repas activables (petit-déj, goûter…), recettes « fêtes » exclues. Tirage aléatoire avec deux règles fermes : **au moins un repas riche en protéines** et **des légumes à au moins un repas**, chaque jour. En plus, un **objectif prioritaire** au choix dans les réglages (par défaut : grammes de protéines par jour) que le tirage cherche à atteindre en premier. Les autres valeurs (kcal, lipides, glucides, fibres) sont affichées en barres de progression par jour, sans optimisation forcée. Ces barres montrent ce qui est **prévu** au menu, pas ce qui est mangé : pas de journal alimentaire. Toucher un repas propose : **tirer un autre plat au hasard** (qui respecte les règles et l'objectif), ou **choisir soi-même** (recherche et filtres, avec l'effet du plat sur les barres du jour affiché avant de valider). Les barres se mettent à jour.
- [ ] Verrouillage : un cadenas sur un repas le garde en place quand on relance le tirage de la journée ou de la semaine.
- [ ] Journées types et semaines types : enregistrer une journée ou une semaine sous un nom (« journée sport », « semaine chargée »), puis l'appliquer au planning. Les repas laissés vides dans un modèle sont complétés par le tirage. Table `meal_templates` (nom, type jour/semaine, repas).
- [ ] Taille de portion affichée dans l'unité de la recette (« 2 cookies »), ajustable par le planning selon les objectifs du jour
- [ ] Mode « viser environ X kcal » ou « environ X g de protéines » : ajuste les quantités d'une recette, avec arrondis utilisables (pas de 1,33 œuf)
- [ ] Bibliothèque d'ingrédients perso, **optionnelle** : uniquement pour les quelques produits où l'estimation se trompe (poudre protéinée, skyr…). Ajout d'une entrée en photographiant l'étiquette nutritionnelle, l'IA lit les valeurs.
- [ ] Liste de courses + export (§9)
- [ ] Notation et notes perso mises en avant
- [ ] Impression A4 propre d'une recette (CSS print)
- [ ] Commande vocale en option (« suivant », « minuteur 10 minutes »), sans en dépendre

**V3 — « j'explore »**
- [ ] Onglet découverte (swipe, filtres)
- [ ] Mode frigo vide (ingrédients disponibles → recettes possibles)
- [ ] Page conseils (cuissons four / poêle / air fryer, équivalences cuillères, pots de yaourt)
- [ ] Ouverture à la famille en écriture

## 11. À tester dès la première semaine sur un vrai iPhone

1. Écran maintenu allumé dans l'appli installée sur l'écran d'accueil.
2. Données toujours présentes hors ligne après plusieurs jours sans ouvrir l'appli.
3. Qualité de lecture de Gemini sur une page de carnet manuscrite et sur une capture Insta.
4. Partage vers Notes depuis l'appli installée.
5. Quotas gratuits de Gemini et de Cloudflare visibles dans leurs consoles.
