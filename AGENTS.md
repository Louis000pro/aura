<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Vaiiya — briefing pour agents IA (Claude, Codex, autres)

Ce fichier est la source de vérité partagée entre tous les agents qui travaillent sur Vaiiya. Lis-le en entier avant d'agir. Quand une décision majeure est tranchée avec Louis, mets ce fichier à jour pour les autres agents.

## Le produit

**Vaiiya** (repo `aura`) : PWA de fitness + nutrition en **français**, mobile-first, déployée sur Vercel avec de vrais utilisateurs. Piliers : **Entraînement** (catalogue de séances photo, planning, séance guidée, progression), **Nutrition**, **Assistant IA** (l'étincelle ✦), **Communauté / profil**.

La vision : « tout connecté » — une seule source de données par concept (fini les doublons localStorage/base), un assistant IA qui connaît tout le site et peut agir, un langage simple et humain, **zéro culpabilisation** : on réagit à la réalité de l'utilisateur, on ne prescrit pas.

## Louis (le fondateur) — comment travailler avec lui

- Il travaille en **français**, souvent en dictée vocale → certains mots arrivent mal transcrits : interpréter le sens, pas la lettre.
- Il est **visuel** : pour tout changement d'interface significatif, **maquette d'abord**, code après validation explicite. Ne jamais coder un redesign sans son GO.
- Il teste **directement sur Vercel** (pas de démo locale à lui proposer). Ne pas lui rappeler d'attendre le build Vercel ni de vider le service worker : il le sait, ça l'agace.
- Sur `dev`, ne pas demander de confirmation pour committer/pousser : faire.
- Carte blanche créative appréciée ; en revanche les décisions marquées VERROUILLÉ ici ne se rediscutent pas.

## Workflow git & déploiement (RÈGLES DURES)

- Branche **`dev`** = collaboration temps réel : **commit + push immédiat après chaque changement cohérent**, sans demander. Messages de commit en français, format `type(scope): description`.
- Branche **`main`** = **PROD**. On n'y merge que des mises à jour cohérentes validées par Louis, jamais des vagues de petits commits. Ne pas proposer de déployer « au fil de l'eau ».
- **Tout passe par GitHub.** Jamais de `vercel --prod` en direct : la prod divergerait du repo (déjà vécu).
- **Toujours `git pull` avant de pousser** : un collaborateur humain (Kisotil) et plusieurs agents IA travaillent en parallèle sur le même repo.
- Des worktrees git existent dans `.claude/worktrees/` (autres agents) : ne pas y toucher.
- **Un seul agent par gros fichier à la fois.** On est plusieurs à écrire sur `dev` en parallèle. Les fichiers monolithiques concentrent le risque de conflit git : `communaute/page.tsx` (~5 500 l.), `progression/page.tsx` (~2 800 l.), `NutritionTab.tsx` (~2 700 l.), `profil/page.tsx` (~2 700 l.), `WorkoutGuideModal.tsx` (~1 400 l.). Avant d'éditer l'un d'eux : `git pull`, travailler en une passe courte, committer + pousser vite pour ne pas garder le fichier « ouvert » longtemps. Si Louis répartit une tâche qui touche un de ces fichiers, il ne devrait pas confier en même temps à un autre agent une tâche qui touche le même fichier. En cas de doute sur qui touche quoi, demander à Louis plutôt que de foncer.

## Stack

- **Next.js 16.2.4 App Router** (breaking changes → lire `node_modules/next/dist/docs/`), React 19, TypeScript, Tailwind v4, lucide-react, framer-motion.
- **Supabase** (`@supabase/ssr`) : base + RLS. ⚠️ **Les migrations SQL ne s'appliquent PAS automatiquement** : tout SQL ajouté au repo doit être collé à la main par Louis dans le SQL Editor Supabase — le lui signaler à chaque migration. Piège RLS vécu : un compteur qui plafonne à 0/1 sur les données d'autrui = policy SELECT trop restrictive au lieu de `USING (true)`.
- **PWA** : service worker maison (HTML réseau-d'abord, timeout 2,5 s) → au test on peut voir un code en retard ; vérifier que le bon commit est « Ready » sur Vercel.
- `/api/chat` (l'assistant) tourne sur **Mistral** — pas Claude, pas OpenAI.
- **PostHog** (région EU) via `instrumentation-client.ts`, actif en prod uniquement. Consentement RGPD + `posthog.identify` restent à faire avant d'aller plus loin.
- Auth Google (next-auth v5 beta), Stripe, web-push. **L'app est auth-gated : non testable en local.** Vérification standard = `npx tsc --noEmit` + build qui passe ; la validation visuelle, c'est Louis sur Vercel.
- Secrets : `.env.local` (`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `COACH_AURA_KEY`) — à demander à Louis, jamais commité.

## Design system « D » (VERROUILLÉ)

3 rôles de couleur FIXES, identiques clair/sombre, chaque couleur a UN sens partout :

- **Violet→magenta `#8B5CF6 → #C13BC1`** = ACTION / marque / navigation (CTA, élément actif, orbe). Le bouton d'action principal est TOUJOURS violet.
- **Orange `#F5B120 → #E8620C`** (anneau de score `#FFD34E → #FF7A1A`) = ÉNERGIE : série 🔥, calories, effort, repos.
- **Teal `#2BD4A0`** = CORPS / PROGRÈS / RÉUSSITE : poids, mesures, « fait ✓ », séance complétée.
- Difficulté = texte neutre (pas de couleur). Intensités vives constantes, jamais de pastels délavés.
- **Photos de contenu = naturelles** (zéro teinte, zéro pastille par-dessus) : la couleur est réservée au chrome et aux actions (verrouillé 2026-07-13). Banque photo dans `public/entrainement/` (webp 750×1000).
- Mode sombre = tokens CSS dans `globals.css` : le rendu clair reste byte-identique, le sombre redéfinit les tokens. Ne jamais hardcoder une couleur de surface/texte.
- `forced-color-adjust: none` UNIQUEMENT sur les marques porteuses de sens (étincelle, pastilles de difficulté…), jamais en blanket sur le site (accessibilité).
- Piège technique : certains accents sont concaténés en code (`${accent}18`) → l'accent doit être un **hex**, jamais `var(--accent)`.
- L'assistant a UN visage : l'étincelle ✦ bicolore violet+or via `src/components/AssistantMark.tsx` (`AssistantSpark` dans la nav, `AssistantAvatar` dans le chat). Ne pas la remplacer.
- Direction visuelle « clarté » : un seul accent = action, hiérarchie franche, typo forte, affordances nettes.

## Chantiers en cours (juillet 2026)

- **Redesign séance « le tunnel »** : CODÉ sur `dev` (commit 2cd2666, `WorkoutGuideModal.tsx` + fiche via `heroImage` dans `progression/page.tsx`). Fiche = affiche photo → player TOUJOURS sombre (barre segmentée stories teal/violet, typo géante, démo vidéo dépliable) → repos = anneau orange auto-démarré → fin teal. Les personnages-guides animés SONT là (commit 6c14713) : **71 exos couverts** (vague 3 du 2026-07-18). La séance « Défi Animations ✦ » du catalogue les enchaîne tous — c'est l'écran de revue quand on ajoute une vague. Le tunnel affiche `<ExerciseGuide name={exo} />` (`src/components/ExerciseGuide.tsx`) qui lit les règles de **`src/lib/exerciseGuides.ts`** (regex nom d'exo → sprite) ; un exo sans règle retombe sur le halo violet épuré — JAMAIS de photo hors-sujet pendant l'effort (VERROUILLÉ).

  **Style du personnage : VERROUILLÉ** — flat vector, perso sans visage, haut lilas frappé de l'étincelle ✦, bas bleu nuit à liseré violet, baskets blanches. Parité femme/homme (deux modèles). Ne pas re-proposer le mi-3D ni le duel A/B : c'est tranché.

  **Ajouter une vague de guides = `npm run guides`** (`scripts/build-guides.mjs`). Louis génère la planche dans ChatGPT (2-3 poses du même perso côte à côte, fond uni ou transparent, poses qui ne se touchent pas), la dépose dans `guides-src/` **en gardant son nommage de prod** (`vaiiya-guide-femme-chaise-mur-chroma-v1.png` → exo `chaisemur`, genre `f` — le script extrait tout seul et **exige** femme/homme dans le nom), lance la commande : le script détoure le fond (auto : alpha existant, sinon couleur médiane des bords + anti-bavure verte), découpe les poses aux colonnes vides, les pose toutes sur un **canevas commun à la clé** (même échelle, même sol — c'est ce qui empêche le perso de sauter au fondu), écrit `public/entrainement/guides/<clé>-<genre>-<n>.png` et dicte la règle à coller. La commande enchaîne ensuite automatiquement `scripts/normalize-guides.mjs` : tous les PNG commités finissent sur le **canevas universel 1024×1024**, grand axe alpha 920 px, ligne de sol y=972. C'est le contrat qui garde la même stature à l'écran entre un exo debout et un exo couché ; ne pas le retirer. Pour post-traiter les PNG sans les planches sources : `npm run guides:normalize` (`-- --check` vérifie sans écrire).

  ⚠️ **`npm run guides -- <option>` ne marche PAS** depuis que la commande enchaîne deux scripts : npm colle les arguments à la FIN de la chaîne, donc l'option part sur `normalize-guides.mjs`, qui l'ignore **en silence** (la planche est rebâtie sans l'option, sans erreur). Pour passer une option de fabrication : `npm run guides:build -- --only=<clé> --slices=2 && npm run guides:normalize`. Options de fabrication : `--loop` (rejoue le retour si la planche ne montre que l'aller), `--only=<clé>`, `--tol=<n>` (si le fond bave ou mange le perso), `--key=<clé>` (si l'extraction tombe à côté — ⚠️ `--key` est **global** : à combiner avec `--only` sur la clé AUTO, sinon il force la même clé sur toutes les planches), `--pose=<n>` (exo de tenue → 1 frame), `--slices=<n>` (planches où le décor relie les poses en continu — rameur, presse, tapis : un rail unique occupe toutes les colonnes et le carve auto recolle tout en 1 frame géante ; `--slices=3` force 3 découpes égales, chacune recentrée sur son perso). Ne PAS refaire de détourage à la main en Python : c'est ce que la commande remplace. L'agent n'a aucun outil de génération d'image — **le dessin reste chez ChatGPT**, la valeur qu'on apporte est l'automatisation autour.

  **Genre :** un exo = un seul genre aujourd'hui (36 femmes, 35 hommes — 71 guides au 2026-07-18), mais le genre est dans le nom du sprite et `Guide.genres` déclare les versions **qui existent**. `pickGenre(guide, want)` rend le genre demandé s'il existe, sinon le seul disponible → jamais d'image cassée. `ExerciseGuide` accepte une prop `genre` que personne ne passe encore : le jour où on offre le choix du personnage au profil, on branche là, on ajoute la 2e planche et son genre dans `genres`. Ne pas re-générer les sprites pour ça.

  ⚠️ **Les règles de `GUIDE_RULES` s'écrivent SANS accent** (`/developpe.*couche/i`) : `resolveGuide` retire les accents du nom avant de tester. Une regex accentuée ne matche plus rien, et l'échec est **muet** (l'exo retombe sur le halo, aucune erreur). Même piège pour la clé : elle nomme les fichiers (`extensiontricepshaltere`), elle ne matche jamais — le vrai nom d'exo a des espaces.
- **Nutrition « On mange où ? »** : CODÉ sur `dev` et en prod — ne pas le réimplémenter. Le héros est la question « On mange où ? » → 3 cartes-images (Maison / Resto & livraison / Sur le pouce), navigation PAR CARTES et SUR PLACE (chaque niveau = 3 grandes cartes). Tout part de `src/components/MealSituationHero.tsx` (monté par `NutritionTab.tsx`). Autour : banque de recettes curée (`lib/recipeBank.ts` → `RecipeSheet`), recette générée à partir des restes (`/api/nutrition/recipe` → `GeneratedRecipeSheet`), estimation de commande (`lib/orderEstimate.ts` + `lib/orderAdvisor.ts` → `OrderRecapSheet`), « Mes classiques » en pastilles à liseré macro, « La carte » du resto (photo → l'IA classe les plats, sans chiffres inventés), scanner code-barres. L'anneau-culpabilité et l'eau ont été retirés — ne pas les faire revenir.
- **Planning unifié** : phase 1 (socle en base, table `planning_days`) faite ; suite = pilotage par l'IA.
- **Carte de perf partageable** (`PerfShareCard` / `PerfShareButton` / `lib/perfShareExport.ts`) : DÉJÀ sur `dev` (poster « aura » + export PNG story, intégré directement dans le feed communauté) — ne pas la réimplémenter.
- Rétro-fit système D + mode sombre : quasi complets sur toute l'app.

## Ce qu'il faut à un nouvel agent

- Le repo GitHub cloné (source de vérité), branche `dev`.
- `.env.local` copié depuis un checkout existant (jamais dans git).
- Rien d'autre : Vercel déploie automatiquement `dev` et `main` depuis GitHub ; Supabase se gère via le dashboard de Louis (lui donner le SQL à coller).
