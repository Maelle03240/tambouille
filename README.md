# Le carnet de Tambouille

Appli de recettes perso et familiale : ajout rapide (photo, capture, texte, lien), mode cuisine lisible sur téléphone, tablette et ordinateur, et lecture hors ligne. Référence : [SPEC.md](SPEC.md) · décisions : [docs/DECISIONS.md](docs/DECISIONS.md).

## Essayer tout de suite (mode local)

```bash
npm install
npm run dev
```

Ouvre http://localhost:3000. Sans configuration, l'appli tourne en **mode local** : les recettes restent dans ton navigateur, sans compte. Parfait pour essayer ; pour la vraie utilisation (plusieurs appareils, famille), suis les étapes ci-dessous.

## Mise en ligne (tout est gratuit)

### 1. Supabase — base de données et comptes

1. Crée un compte sur https://supabase.com puis un projet (région Europe, par ex. Paris ou Francfort).
2. **SQL Editor → New query** : colle le contenu des fichiers de [`supabase/migrations/`](supabase/migrations/) dans l'ordre (0001, 0002…) puis **Run**. *(Déjà fait pour le projet « tambouille ».)*
3. **Authentication → Sign In / Providers** : laisse *Email* activé et **désactive « Allow new users to sign up »** (personne ne peut créer de compte à ta place).
4. **Authentication → Users → Add user → Create new user** : ton e-mail + un mot de passe, coche *Auto Confirm User*. **Le premier compte créé devient administrateur.** Les comptes suivants (famille) sont en lecture seule ; pour en passer un en « peut modifier », dans le SQL Editor :
   ```sql
   update profiles set role = 'editor' where display_name = 'prenom';
   ```
5. **Project Settings → API** : note l'*URL* et la clé *anon public* (et la *service_role*, à garder secrète).

### 2. Gemini — lecture automatique des recettes

Crée une clé sur https://aistudio.google.com/apikey (niveau gratuit). Sans clé, l'appli marche quand même : saisie à la main et « coller du JSON ».

### 3. GitHub + Vercel — mise en ligne

1. Mets le dossier sur un dépôt GitHub **privé**.
2. Sur https://vercel.com (plan Hobby gratuit) : **Add New → Project**, importe le dépôt.
3. Dans **Environment Variables**, ajoute celles de [`.env.example`](.env.example) :
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` (les variables Cloudflare sont pour la V2).
4. **Deploy**. Chaque `git push` redéploie tout seul.

En local avec la vraie base : copie `.env.example` en `.env.local` et remplis-le.

### 4. Installer sur le téléphone

- **iPhone / iPad** : ouvre l'adresse Vercel dans **Safari** → bouton Partager → **Sur l'écran d'accueil**. Ouvre ensuite l'appli depuis l'icône (indispensable pour le hors ligne). L'appli l'explique elle-même au premier lancement.
- **Android** : Chrome → menu ⋮ → **Installer l'application**.

## Au quotidien

| Commande | Rôle |
| --- | --- |
| `npm run dev` | développement |
| `npm test` | tests des calculs (quantités, marqueurs, import) |
| `npm run typecheck` / `npm run lint` | vérifications |
| `npm run build` | build de production (génère aussi le service worker) |

## Organisation du code

Voir [CLAUDE.md](CLAUDE.md) : tableau « où changer quoi » et architecture. En résumé : apparence dans `src/styles/theme.css`, réglages dans `src/config/`, logique testée dans `src/lib/recipes/`, données dans `src/lib/data/`, IA dans `src/lib/ai/`, écrans dans `src/components/screens/`. Maquette d'origine : `docs/design/`.
