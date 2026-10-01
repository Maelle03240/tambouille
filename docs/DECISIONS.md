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

## 2026-09-30 — Moments de repas + étape qui suit le défilement (retours après premier test)

**Validées avec l'utilisatrice**
- **Catégorie = type de plat, « moments » à part** : entrée, plat, dessert, sauce, apéro, cocktail, pain ; et des moments à cocher (petit-déj, déjeuner, goûter, dîner), plusieurs par recette. Un brownie = Dessert + Goûter. Colonne `recipes.moments` (migration 0003) ; « goûter » / « petit-déj » ne sont plus des catégories (conversion automatique des anciennes recettes et des anciens JSON). Serviront au planning V2. Config : `src/config/moments.ts`.
- **Mode cuisine : l'étape en cours suit le défilement** : l'étape qui passe sur la ligne de lecture (40 % de la hauteur) devient « en cours », les précédentes « faites ». Toucher reste possible (toucher l'étape en cours = faite → suivante). Réglable (`cookFollowScroll`, `cookReadingLine` dans `src/config/ui.ts`).

**Autres**
- Import IA : l'article devant un ingrédient cité est retiré (« la {farine} » → « {farine} », affiché « 250 g de farine »).
- `NEXT_PUBLIC_FORCE_LOCAL=1` force le mode local même avec Supabase configuré (tests ; config « tambouille-local » dans `.claude/launch.json`).
- Connexion : gardée (une seule fois par appareil, la session est mémorisée) — protège les recettes et le quota Gemini.

## 2026-09-30 — Alarme, écran allumé, page Astuces

- **Alarme des minuteurs** refaite : sonnerie forte générée (sans fichier), jouée par un élément `<audio>` en boucle jusqu'à l'arrêt (3 min max). Déblocage du son à la fin de chaque toucher (exigence iOS), `navigator.audioSession.type = "playback"` pour ignorer le bouton silencieux. Bouton « Tester l'alarme » dans Réglages. Limite connue : l'appli doit rester ouverte à l'écran (pas de son si elle est en arrière-plan ou l'écran verrouillé).
- **Écran allumé** : témoin dans le mode cuisine (« Écran allumé » / « Veille possible ») ; le verrou est redemandé s'il est relâché par le système.
- **Page « Astuces »** (prévue en V3 dans la spec, avancée car autonome et utile en cuisine) : mesures et équivalences, symboles du four, thermostat, cuissons, air fryer, remplacements. Onglet dédié + lien depuis le mode cuisine. Contenu dans `src/config/kitchen-guide.ts`.

## 2026-10-01 — V2

**Retours d'usage**
- Feuille « Ajouter » : 5 cartes identiques (photo, capture, texte/lien, JSON, à la main) ; « à la main » = fiche vide sans IA (hors ligne IA / quota).
- Plus de témoin « écran allumé » ni de section alarme dans Réglages (on ne peut pas régler le volume du téléphone depuis une page web) ; vibration de l'alarme : Android = vibration, iPhone = retours haptiques (astuce iOS 18+).
- Textes d'aide allégés partout. Bouton « + Ajouter » plus petit.
- Mode cuisine fluide : toutes les étapes ont la même taille (seules les couleurs changent, en fondu) et l'étape en cours suit le défilement en direct (ligne de lecture, sans clignotement).

**V2 livrée**
- **Planning** (onglet Menu) : semaine et jour, tirage avec règles fermes (≥ 1 repas riche en protéines et des légumes chaque jour), objectif prioritaire réglable, kcal et fourchettes en barres « prévu / objectif » (pas un journal), verrous, autre plat au hasard, choix manuel avec effet sur la barre, portions ± ½, modèles jour / semaine (repas vides complétés par le tirage), objectifs du jour fixés par l'utilisatrice. Les repas = les « moments » ; une recette sans moment est proposée selon sa catégorie (`MEAL_FALLBACK_CATEGORIES`). Poids du tirage : `src/config/planning.ts`. Migration 0004.
- **Courses** (onglet) : ingrédients du menu de la semaine (chaque recette une fois, recette entière par défaut, ajustable) + recettes ajoutées depuis la fiche ; additionnés (g/kg, ml/cl/l), rangés par rayon (`src/config/aisles.ts`, inconnu → Autre), basiques masqués (« Mes basiques »), partage Notes / Keep ou copie. Sélection et cases cochées gardées sur l'appareil. Conformément à la spec, pas d'articles perso dans l'appli (ils vont dans Notes) — la maquette en montrait : à rediscuter si besoin.
- **Notation** en fin de recette (réussie / à refaire / ratée, retire « à tester »), note perso en tête du mode cuisine, note visible sur les cartes.
- **Viser environ X kcal / X g de protéines** dans le mode cuisine (parts arrondies au ¼).
- **Impression A4** de la fiche (bouton Imprimer, sur tablette / ordinateur).
- **Mes ingrédients** (Réglages) : étiquette lue en photo par l'IA ou saisie ; liaison automatique à l'import, choix dans l'éditeur ; « Recalculer avec mes étiquettes » (valeurs par portion, confiance « from_labels »).
- **Images** : photo perso ou illustration IA (Cloudflare FLUX, style vieux livre de cuisine — désactivée tant que les variables Cloudflare manquent), WebP 800 px dans Supabase Storage (bucket `recipe-images`, migration 0005), fiche + cartes, « Illustrations automatiques » dans Réglages, images mises en cache hors ligne.
- **Commande vocale** en option (bouton micro du mode cuisine) : suivant, précédent, minuteur X minutes, stop.
- Onglets : Recettes, Menu, Courses, Astuces, Réglages ; « À revoir » en haut de l'accueil et dans Réglages.

## 2026-10-01 — Retours V2

- Mode cuisine : plus d'étiquette « En cours » ; l'étape en cours grossit légèrement par un zoom visuel (`transform`), qui ne pousse pas les autres étapes (défilement toujours fluide). Réglage `zoom` dans `src/components/cook/stepStyles.ts`.
- Planning, vue jour : ajouter un repas à une journée (« + Goûter ») ou en retirer un (« Retirer ce repas de la journée »), sans toucher aux autres jours. Colonne `meal_plans.skipped` (migration 0006).
- Chiffres en rouge au-dessus de l'objectif pour kcal, lipides, glucides seulement (`warnAbove` dans `src/config/planning.ts`) ; couleur `--color-danger` du thème.
- **Articles perso dans les courses** (validé, écart à la spec qui les mettait dans Notes) : champ « Ajouter… » en haut de la liste, rayon deviné (`guessAisle`) et modifiable via ⋯, étiquette « Perso », retirés à la main. Gardés sur l'appareil comme le reste de la liste (`ShoppingState.mine`). Nouveau rayon « Maison & hygiène » (comme la maquette).
- Illustrations IA Cloudflare : activées dès que `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` sont renseignées (marche à suivre dans le README).
- Illustrations : Gemini traduit d'abord la recette en une courte description du plat servi, en anglais (sinon FLUX écrit les noms sur l'image et dessine les ingrédients crus à côté) ; style « aquarelle à l'encre » placé en tête du prompt ; le filtre de Cloudflare refuse parfois au hasard (« apple tart ») → 2 nouveaux essais, le dernier avec le nom seul. `src/lib/ai/generateIllustration.ts`.
- Illustrations sans arrière-plan : dessin simple sur fond blanc uni, affiché en `mix-blend-mode: multiply` (le blanc prend la couleur de la carte / de la fiche), sans cadre arrondi ; les photos perso gardent leur cadre.
- Correctif envoi d'images (« new row violates row-level security policy ») : droit de lecture manquant sur le stockage pour l'envoi avec remplacement (migration 0007).
- **Style des illustrations changé** (à sa demande, d'après ses exemples ; remplace « vieux livre de cuisine, encre et aquarelle » de la spec §8) : gouache détaillée façon livre de cuisine, plat seul sur fond blanc. Modèle Cloudflare `flux-2-klein-9b` (~2 s ; flux-1-schnell trop simple, flux-2-dev trop lent). Recette taguée « Meal prep » → dessinée dans une boîte en verre transparente. Quota gratuit Cloudflare : 10 000 neurons / jour, message clair quand il est atteint.
- Accueil : filtres moments (Petit-déj…Dîner) à la fin de la 2ᵉ ligne, après les tags.
- Courses : étiquette « Ajouté » (au lieu de « Perso ») sur les articles ajoutés à la main.
- Fiche recette : bouton « Testé » / « À tester » (en couleur) au lieu de « Marquer « à tester » » — moins de texte.
- Hors ligne : l'appli s'affiche tout de suite avec les données de l'appareil quand un profil est en cache, sans attendre Supabase (qui, hors ligne, peut bloquer en voulant rafraîchir une session expirée → page blanche sur iPhone).
- Commande vocale plus robuste sur iPhone : lecture des résultats provisoires (Safari ne finalise pas toujours), relance limitée, erreurs affichées (micro refusé, indisponible, coupé).
- **« À tester » devient un sticker « Nouveau »** (id `a-tester` inchangé) : posé à l'ajout, retiré dès qu'on note la recette (Réussie / À refaire / Ratée) ; la note s'affiche ensuite sur la carte. Plus de bouton sur la fiche (le tag reste modifiable dans l'éditeur). Filtre « Nouveau » sur l'accueil.
- Fin du mode cuisine : le bloc « Bon appétit ! » et la notation sont toujours en bas des étapes (on fait défiler, on ne touche pas la dernière étape) ; plus de « Recommencer » / « Retour à la fiche ».
- Commande vocale : plus d'écho de la phrase entendue ; à l'activation, rappel des mots (« suivant », « précédent », « minuteur 5 minutes », « stop »).
- Sticker « NEW » en étoile rouge (SVG, `--color-danger`), au lieu de la pastille « Nouveau ».
- Fin du mode cuisine : seulement « Réussie » (retire NEW) et « À revoir » (demande quoi revoir, ajoute à « À revoir », NEW reste). « À refaire » / « Ratée » ne sont plus proposées (valeurs gardées en base, plus affichées).
- Fiche : plus de bouton « Image » ; toucher l'image (ou son emplacement vide, en pointillés) ouvre photo / IA / supprimer.
- Catégorie « Cocktails & mocktails » renommée « Boissons » (id `cocktail` inchangé).
- Commande vocale : rappel des mots dans une bulle sous le bouton micro (6 s) ; nouveaux mots « pause » / « reprends » pour les minuteurs.
- Sticker NEW du même marron que « + Ajouter » (`--color-accent-600`).
- Mode cuisine : on ne reprend à l'étape où on en était que si on cuisinait vraiment (minuteur en marche ou en pause, ou ingrédients cochés sans être allée au bout) ; sinon on repart du début : étapes, ingrédients décochés et portions d'origine.

## 2026-10-01 — V3

- **Mode frigo vide** : bouton frigo à droite de la recherche (accueil) → page « Mon frigo » (`/frigo`, dispo hors ligne). Je tape ce que j'ai (plusieurs à la fois avec des virgules), l'appli liste les recettes qui l'utilisent, celles où il manque le moins d'abord, avec « Il manque : … » ou « Tout y est ✓ ». Les basiques des courses comptent comme présents. Liste gardée sur l'appareil. Logique testée : `src/lib/recipes/fridge.ts` (pluriels, accents, « oeuf » = « œuf »).
- Mon frigo : interrupteur « J'ai les basiques » (sel, poivre, huile, beurre, farine, sucre, œufs, pâtes, riz, levure, moutarde, épices, lait), le reste s'écrit à la main ; familles (« sucre » couvre cassonade, sucre roux… ; « épices », « pâtes », « fromage »…) ; l'eau toujours disponible ; tri : celles qui utilisent le plus de mes produits d'abord, puis il manque le moins. Réglages : `src/config/fridge.ts`.
