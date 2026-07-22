# Audit RLS Supabase — Vaiiya (lecture seule)

> **Portée & limites.** Cet audit s'appuie sur les fichiers de migration du repo
> (`supabase/migrations/`). ⚠️ **La prod peut différer** : plusieurs colonnes
> existent en base sans être dans le repo (ex. `profiles.is_certified`,
> `is_banned`, `is_premium`, et probablement `email`, insérée par
> `/api/me/ensure-profile`). Les migrations `notifications` et `direct_messages`
> utilisent `CREATE POLICY IF NOT EXISTS`, **syntaxe inexistante en PostgreSQL**
> → si jouées telles quelles elles échouent. **Rien n'a été exécuté ni modifié.**
> Toute correction doit être validée puis vérifiée dans le dashboard Supabase.

## Matrice des politiques (d'après le repo)

| Table | SELECT (lecture) | Écriture | Verdict |
|---|---|---|---|
| **`profiles`** | **`USING (true)` → TOUT LE MONDE (anon inclus)** | UPDATE owner | 🔴 **Critique** (données perso lisibles sans compte) |
| `followers` | `USING (true)` → tout le monde | INSERT/DELETE owner | 🟠 graphe social public |
| `posts` | public (viewable by everyone) | owner | 🟠 contenu public |
| `stories`, `highlights`, `highlight_items` | `USING (true)` | owner | 🟠 contenu public |
| `post_likes`/`comments`/`reposts`/`comment_likes` | `USING (true)` | owner | 🟠 social public |
| `ai_memories` | owner (`auth.uid() = user_id`) | owner | 🟢 correct |
| `daily_stats`, `nutrition_logs` | owner | owner | 🟢 correct |
| `workout_sessions`, `body_measurements`, `personal_records` | owner | owner | 🟢 correct |
| `custom_sessions`, `planning_days`, `post_saves` | owner | owner | 🟢 correct |
| `notifications` | destinataire (`auth.uid() = user_id`) | INSERT `from_user_id` | ⚠️ policies en `IF NOT EXISTS` (vérifier prod) |
| `direct_messages` | participants | expéditeur | ⚠️ même syntaxe + dormante (remplacée à la MAJ) |
| `storage.objects` (avatars) | `TO public` (lecture publique) | dossier perso (authenticated) | 🟢 ok pour avatars ; ⚠️ voir note photos privées |
| `increment_post_views()` | `GRANT EXECUTE TO anon` | — | 🟡 anon peut gonfler les vues (mineur) |

---

## 🔴 Finding critique — `profiles` lisible sans authentification

**Table** : `public.profiles`
**Opération** : `SELECT`
**Politique actuelle** : `CREATE POLICY "Profiles lisibles par tous" ON public.profiles FOR SELECT USING (true);`
**Qui peut lire** : **n'importe qui**, y compris un visiteur non connecté, via la
**clé anon** (publique, embarquée dans le bundle navigateur). Exemple d'accès
direct, sans passer par l'app :
`GET https://<projet>.supabase.co/rest/v1/profiles?select=*` avec l'`apikey` anon.

**Données exposées** (colonnes présentes) : `pseudo`, `full_name`, `bio`,
`avatar_url`, et surtout les champs d'onboarding **sensibles** :
`onboarding_age`, `onboarding_height`, `onboarding_weight`, `onboarding_gender`,
`onboarding_goals`, `onboarding_level`, `onboarding_diet`, `onboarding_meals_day`,
`onboarding_sessions_week`. **À vérifier en prod** : présence d'une colonne
`email` (insérée par `ensure-profile`) → si elle existe, **les emails sont
lisibles publiquement**.

**Risque** : fuite de données personnelles et de santé sans authentification.
Le `noindex` / `robots.txt` **ne protège pas** de ça (scraping direct de l'API
REST). Contradiction directe avec la décision « profils privés ».

**Impact produit d'une correction** : l'app lit aujourd'hui `profiles`
publiquement (pseudo/avatar affichés sur les posts, listes d'abonnés, profils
`/profil/[username]`). Restreindre brutalement casserait ces affichages — mais
ces surfaces sociales passent justement en privé/sommeil (pivot). À concevoir
avec soin.

**Corrections possibles (à valider, NON exécutées)** :

**Option A — Restreindre toute lecture aux utilisateurs authentifiés** (simple,
aligné « profils privés ») :
```sql
-- ⚠️ NE PAS EXÉCUTER sans validation. Vérifier d'abord les surfaces qui lisent
-- profiles sans session (SSR public, pages non connectées).
DROP POLICY IF EXISTS "Profiles lisibles par tous" ON public.profiles;
CREATE POLICY "Profiles lisibles par les membres connectés"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);
```
Conséquence : plus aucune lecture anonyme. Impact : toute surface publique qui
affichait un pseudo/avatar sans session cesse de fonctionner (à recenser avant).

**Option B — Séparer données publiques et sensibles via une vue** (plus fin) :
lecture publique limitée à `pseudo`/`avatar_url` via une vue dédiée, table
`profiles` réservée à l'owner + membres connectés. Plus de travail, mais garde
l'affichage minimal des identités tout en protégeant la donnée sensible.
```sql
-- Esquisse à affiner et valider (NON exécutée) :
DROP POLICY IF EXISTS "Profiles lisibles par tous" ON public.profiles;
CREATE POLICY "profiles: owner"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
-- + vue publique en lecture seule n'exposant QUE pseudo/avatar, si un affichage
--   public d'identité reste nécessaire.
```

**Recommandation** : **Option A** si les profils deviennent entièrement privés
(cohérent avec la décision), en recensant d'abord les lectures anonymes de
`profiles` côté app. Décider colonne par colonne pour les champs onboarding.

---

## 🟠 Tables sociales `USING (true)`

`followers`, `posts`, `stories`, `highlights`, `highlight_items`, `post_likes`,
`post_comments`, `post_reposts`, `comment_likes` sont **lisibles par tous**.
Moins sensible que `profiles` (pas de données de santé), mais le **graphe social**
et les contenus sont scrappables sans compte. Comme la couche sociale est refondue
en messagerie privée à la MAJ, **corriger de préférence avec cette refonte** (pas
en urgence ici), sauf si une de ces tables expose une donnée personnelle.

## ⚠️ Divergence repo ↔ prod (à vérifier au dashboard)

`notifications` et `direct_messages` définissent leurs policies avec
`CREATE POLICY IF NOT EXISTS` — **non supporté par PostgreSQL**. Si joué verbatim,
le script échoue à la première policy → RLS actif **sans** policy = table
inaccessible. Or les notifications fonctionnent en prod → les policies y ont été
posées autrement. **Action** : vérifier l'état réel des policies de ces deux
tables dans le dashboard (Authentication → Policies), car le repo n'est pas fiable
ici. `direct_messages` est de toute façon dormante (remplacée par la messagerie).

## 🗂️ Note — futures photos privées (avant/après)

Le bucket `avatars` est en **lecture publique** (`SELECT TO public`), ce qui
convient aux avatars. La future fonctionnalité « photos privées avant/après »
(pivot) **ne doit pas** utiliser un bucket public : prévoir un **bucket privé**
avec lecture réservée à l'owner (URLs signées), sinon les photos seraient
accessibles publiquement.

---

## Conclusion

- **Priorité** : le finding `profiles` (🔴) est le vrai « données accessibles
  sans authentification » signalé par les fondateurs, et il est **indépendant**
  du travail noindex/robots.
- **Aucune policy modifiée.** Le SQL ci-dessus est une **proposition** : attendre
  validation explicite, puis vérifier l'impact produit et l'état réel en prod
  avant toute exécution dans le SQL Editor Supabase.
- **Étape suivante recommandée** : recenser dans le code toutes les lectures
  anonymes de `profiles`, puis trancher Option A vs B.
