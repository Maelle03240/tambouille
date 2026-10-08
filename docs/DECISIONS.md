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
- **Planning** (onglet Menu) : semaine et jour, tirage avec règles fermes (≥ 1 repas riche en protéines et des légumes chaque jour), objectif prioritaire réglable, kcal et fourchettes en barres « prévu / objectif » (pas un journal), verrous, autre plat au hasard, choix manuel avec effet sur la barre, portions ± ½, modèles jour / semaine (repas vides complétés par le tirage), objectifs du jour fixés par l'utilisatrice. Les repas = les « moments » ; une recette sans moment n'est jamais tirée (2026-10-08, avant : repli selon sa catégorie) mais reste choisissable à la main. Poids du tirage : `src/config/planning.ts`. Migration 0004.
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
- Mon frigo : interrupteur « J'ai les basiques » (sel, poivre, huile, beurre, farine, sucre, œufs, pâtes, riz, levure, moutarde, épices, lait), le reste s'écrit à la main ; familles (« épices » couvre cumin…, « pâtes » couvre spaghetti…) mais « sucre » ≠ sucre roux / glace / cassonade, « pâtes » ≠ pâte brisée, pas de famille fromage (`FRIDGE_NOT_SAME`) ; l'eau toujours disponible ; tri : celles qui utilisent le plus de mes produits d'abord, puis il manque le moins. Réglages : `src/config/fridge.ts`.
- Plus de note affichée (ni carte, ni fiche, ni éditeur) : en fin de mode cuisine, « Réussie » retire seulement le NEW ; « À revoir » retire le NEW et ajoute la recette à « À revoir ». Colonne `rating` gardée en base, inutilisée.

## À faire plus tard (idées validées, pas encore codées)

- **Découverte (swipe)** — usage visé : « je veux faire un gâteau mais je ne sais pas lequel ». Je filtre (ex. Desserts), les recettes défilent une par une : swipe à gauche = écartée, swipe à droite = gardée (« like »). À la fin, la liste de ce que j'ai gardé, pour choisir entre elles. Emplacement proposé : bouton sur l'accueil à côté du frigo (pas un 6ᵉ onglet).

## 2026-10-01 — Famille : comptes, foyers, propositions (validé)

Remplace « ouverture à la famille en écriture » (spec V3). Deux étapes : **1. comptes et foyers**, puis **2. recettes perso et propositions**.

**Comptes et foyers (étape 1)**
- 1 compte = 1 personne. À la création d'un compte, son foyer est créé automatiquement (« Chez <prénom> ») ; l'admin peut ajouter quelqu'un à un autre foyer. Un compte peut être dans plusieurs foyers ; le sélecteur n'apparaît que dans ce cas ; le dernier foyer utilisé est retenu (sur l'appareil). Le hors ligne ne garde que ce foyer.
- Inscriptions publiques fermées : l'admin invite par e-mail, la personne choisit son mot de passe une fois.
- Rôles : admin, membre (`editor`), lecture seule (`reader`).
- Rattachés au **foyer** : menu, modèles, objectifs (le tirage en dépend), liste de courses (partagée, cochable hors ligne, synchronisée), basiques. Foyer supprimé ⇒ tout ce qui va avec aussi.
- Le frigo reste sur l'appareil (usage du moment, rien de partagé).
- Admin : section « Admin » dans Réglages (propositions avec leur nombre, membres et foyers, invitations) — rien sur l'accueil.
- Toutes les règles appliquées par la RLS Supabase. Routes IA : comptes connectés seulement (déjà le cas). Quota IA épuisé ⇒ simple message.

**Recettes perso et propositions (étape 2)**
- Bibliothèque commune : ce que l'admin crée ou modifie y va directement.
- Ce qu'un membre crée ou modifie devient sa version perso (visible par les membres de ses foyers, utilisable tout de suite, il peut y mettre une image et la supprimer) et envoie une proposition. Une seule proposition en cours par personne et par recette (re-modifier met à jour la proposition).
- Si l'admin a modifié l'originale entre-temps, sa version reste la base : accepter n'applique que les changements de la personne (fusion par champ).
- Plusieurs propositions sur la même recette : une seule fiche, les versions côte à côte ; accepter l'une, les deux ou aucune.
- Accepter = fusionner : la version perso rejoint la bibliothèque, menus / courses / « À revoir » qui l'utilisaient pointent vers la recette commune.
- Refus : la version perso reste chez son auteur (pas de message).
- Originale supprimée ⇒ les versions perso restent à leurs auteurs. Un membre peut supprimer sa version et revenir à l'originale. Un membre ne supprime rien dans la bibliothèque.
- Temps réel (migration 0009) : courses et menu du foyer se mettent à jour chez tous les membres sans recharger. Décocher = `checked` à faux (pas de suppression, non filtrable par foyer en temps réel).
- « À revoir » : l'accueil (et l'onglet) montrent seulement mes points (notés par moi, ou points auto de mes recettes) ; Réglages → « À revoir (tous) » pour l'admin seulement.
- Réglages : « Illustrations automatiques » et seuil « riche en protéines » réservés à l'admin ; plus de bouton « Synchroniser maintenant » (synchro au lancement, au retour sur l'appli, au retour du réseau et en direct).

**Étape 2 livrée (migration 0010)**
- `recipes.status` (library / personal), `forked_from_id`, `fork_base` (l'originale au moment de la version + correspondance des ids), `proposal_status` (pending / refused). Règles RLS : lecture = bibliothèque, les miennes, celles des membres de mes foyers, tout pour l'admin ; écriture membre = ses recettes perso seulement (ingrédients, étapes, images suivent la recette). `retire_fork()` : version acceptée ou abandonnée ⇒ menus, modèles, courses, à revoir de tous les foyers repassent sur l'originale.
- Listes : ma version remplace l'originale pour moi ; les recettes perso des membres de mes foyers apparaissent à côté (« De Léa ») ; l'admin voit les autres dans Admin → Propositions (`src/lib/recipes/visibility.ts`).
- Fusion par blocs (titre, catégorie et moments, tags, portions, temps, valeurs nutritionnelles, notes, image, ingrédients et étapes) : `src/lib/recipes/proposals.ts` (testée). Blocs cochés par défaut sauf conflit avec une modif de l'admin.
- Enregistrer sans rien changer ne crée pas de version vide. Un membre qui finit une recette de la bibliothèque ne retire pas son NEW (sinon ça créerait une version juste pour ça).
- Propositions déplacées dans **Réglages → Propositions** (à la place de « À revoir (tous) », supprimé) : une liste, puis chaque proposition ouverte en entier (nouvelle recette : tout son contenu ; modification : avant / après par bloc) avec Accepter / Refuser. L'écran Admin ne garde que invitations, foyers, comptes.
- Accepter (création ou modification) remet le sticker NEW sur la recette de la bibliothèque : à vérifier en la cuisinant.
- Réglages : foyers affichés comme des profils (pastille de couleur avec initiale, `src/config/households.ts`), bouton « Renommer » ; « Propositions » affiche toujours le nombre (0 compris) ; « Mes ingrédients » renommé « Étiquettes nutritionnelles » avec une phrase qui dit à quoi ça sert ; pied de page et écran de connexion : seulement « Le carnet de Tambouille ».
- Accueil : « À revoir » réduit à l'icône + le nombre.
- Lecture d'étiquette en photo testée (Gemini) : nom, kcal, protéines, lipides, glucides, fibres lus correctement.
- Courses : bouton corbeille « Tout enlever » (avec confirmation) : retire les recettes du menu, les ajouts, les articles perso et les cases cochées. Une recette remise au menu revient dans la liste.

## 2026-10-08 — Retours après quelques jours d'utilisation (validé)

- **Moments = tirage du menu** : une recette sans moment n'est **jamais tirée** (avant : repli selon sa catégorie) ; elle reste choisissable à la main (« Tout » dans le choix d'un plat inclut aussi les recettes de fête). Indiqué sous le champ (« pour le tirage du menu — vide : jamais tirée ») et dans la consigne de l'IA (vide pour pâtisserie de fête, bases, sauces, pains, boissons). Les recettes déjà sans moment étaient justement celles-là : aucune donnée modifiée.
- **Parties dans les étapes** (« Biscuit », « Crème »), comme pour les ingrédients : titre au-dessus des étapes, affiché sur la fiche et en mode cuisine ; numérotation continue. Migration 0011 (`steps.section`, `save_recipe` v5). L'IA et le format JSON renvoient `steps: [{ text, section }]` (une simple chaîne reste acceptée).
- **Éditeur** : poignée ⠿ pour glisser une étape ou un ingrédient (souris et doigt, la page défile près des bords) ; glisser sous un autre titre change de partie ; bouton « + Partie » (la première fois, le titre se place au-dessus de ce qui est déjà écrit) ; titre renommable sur place, × pour le retirer. Fini les flèches et le champ « Groupe » dans « ⋯ ». Logique : `src/lib/recipes/sections.ts` (testée), `src/components/ui/useSortable.ts`.
- Pastilles (filtres, ingrédients à insérer) : défilent sur le côté à la molette, fine barre visible à la souris.
- Minuteur « 1 min 30 » ; virgules acceptées dans tous les champs nombre ; JSON : `options` en nombres acceptées.
- IA : 75 s max (la route a 90 s), essai sur le modèle léger si Gemini est lent ou surchargé, message clair au lieu de « 504 ».
- Illustrations : consignes précisées (cake = moule rectangulaire, ingrédients visibles comme les pépites, rien saupoudré sans raison, plat farci montré ouvert).
- **Astuces → Saisons** : fruits et légumes du mois (mois en cours d'abord, on peut changer de mois). Contenu : `src/config/seasons.ts`. Rien d'autre (pas de tag « de saison », pas d'effet sur le tirage).
- **Idées à ajouter** (Ajouter → « Idées à ajouter (n) ») : juste des noms de recettes, à moi seule (table `recipe_ideas`, migration 0012). Toucher une idée ouvre une fiche vide avec ce titre ; enregistrée, l'idée disparaît.
- **Secours si l'IA échoue** : bouton « Faire avec Claude ou Gemini » sur l'erreur : copie les consignes (et le texte collé s'il y en a), puis ouvre « Coller du JSON » avec la marche à suivre.
