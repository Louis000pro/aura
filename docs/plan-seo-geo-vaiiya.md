# Plan d'action SEO & GEO — Vaiiya

**But :** que Vaiiya soit trouvé sur Google **et** cité par les IA (ChatGPT, Perplexity,
Google AI Overviews), et qu'il se fasse connaître par de **vrais avis**.

⚠️ **À lire avec `docs/positionnement-public-vaiiya.md`.** Rien dans ce plan
n'autorise un claim interdit (plan nutrition, adaptation automatique, iOS/Android,
« abonne-toi », records, réseau social, faux avis, balisage d'étoiles auto-décerné).
Le SEO durable = **contenu vrai et utile**, jamais des astuces.

**Répartition :** 🔵 = moi (code + contenu dans le repo) · 🟠 = Louis (hors-code :
comptes externes, avis, presse, liens). Un chantier qui n'avance pas côté 🟠 plafonne
tout le reste : les étoiles dans Google et les backlinks ne se codent pas.

---

## 1. Le principe (le cadre qui décide tout)

1. **Un seul moteur pour les deux.** Google et les IA récompensent la même chose :
   un contenu clair, structuré, qui répond **directement** à une question précise.
   Une bonne page pilier sert le SEO **et** le GEO d'un coup.
2. **La longue traîne d'abord.** On ne vise pas « musculation » (injouable, gros
   sites). On vise les phrases précises que Louis a listées (« programme musculation
   3 fois par semaine ») : moins de volume, mais une intention nette et une
   concurrence atteignable pour un site jeune.
3. **On ne promet que le vrai.** Nos pages « programme » sont du **contenu éditorial**
   (comment structurer une semaine) qui **montre** ce que Vaiiya fait réellement
   (53 séances guidées, 102 mouvements animés, composer sa séance, l'assistant qui
   propose une carte à valider). On n'écrit **jamais** « Vaiiya génère ton programme
   périodisé qui s'adapte tout seul » (interdit, §5 du positionnement).
4. **Les avis sont un pilier, pas un bonus.** Preuve sociale + contenu frais + (via
   plateformes tierces) des **étoiles dans les résultats Google**.

---

## 2. État des lieux (déjà solide — NE PAS refaire)

- **Technique :** sitemap curé (`app/sitemap.ts`), robots prod-only (`app/robots.ts`),
  `noindex` sur les écrans applicatifs, canonicals, JSON-LD entité/WebApplication
  (`operatingSystem: "Web"`), PWA, Search Console vérifié (Google reconnaît le site).
- **Pages publiques :** accueil (landing) · 5 vitrines (`/coach-ia`, `/prise-de-masse`,
  `/perte-de-poids`, `/musculation-maison`, `/nutrition-sportive`) · `/a-propos`
  (page entité) · `/exercices` (hub) + **8 fiches** exercices · `/premium` · légal.
- **Avis :** système modéré en place (accueil + `/avis`), seuil d'affichage **5 avis
  approuvés**, invite in-app après un moment fort. Aujourd'hui probablement **sous le
  seuil** → invisible pour le SEO tant qu'on n'a pas 5 vrais avis.

**Conclusion :** la fondation technique est faite. On construit dessus, on ne la
refait pas.

---

## 3. Les mots-clés cibles (ce que Louis veut) → où on les joue

| Mot-clé | Intention | Page cible | Statut | Action |
|---|---|---|---|---|
| musculation pour prise de masse | s'informer | `/prise-de-masse` | ✅ existe | Renforcer, ajouter FAQ |
| programme musculation prise de masse | veut un plan | `/prise-de-masse` (section « programme ») | ⚠️ à renforcer | Ajouter un bloc « structurer sa semaine » |
| programme musculation perte de poids | veut un plan | `/perte-de-poids` (section « programme ») | ⚠️ à renforcer | Idem |
| **programme musculation 3 fois par semaine** | veut un plan précis | **nouvelle page pilier** | ❌ manque | **Créer** (le trou le plus net, forte intention) |
| **exercice musculation pour le dos** | cherche des exos | `/exercices/dos` + fiches dos | ❌ manque | Créer des fiches dos, puis la page catégorie |

Décliner ensuite le même schéma sur les autres zones fortes : **pecs, jambes,
épaules, bras, abdos** (« exercice musculation pectoraux », « … jambes », etc.).

---

## 4. Chantier A — LE CONTENU (le plus gros levier) 🔵

### A1. Trois pages piliers « programme musculation »
Une par intention : **prise de masse**, **perte de poids**, **3 fois par semaine**
(profil débutant). Elles réutilisent le gabarit vitrine existant + FAQ.

Contenu type (respecte le contrat de `docs/lot-seo-3-fiches-exercices.md` :
**aucun quota de mots**, aucune programmation présentée comme prescriptive → toujours
« **Exemple** », aucun claim absolu ni sanitaire) :
- réponse directe en 2-3 phrases en tête (pour le GEO),
- comment répartir la semaine (tableau : ex. Full body ×3, ou Haut/Bas, ou Push/Pull/Jambes),
- combien de séries/répétitions selon l'objectif (fourchettes, « exemple »),
- les erreurs fréquentes,
- **comment Vaiiya aide concrètement** : le catalogue de 53 séances guidées, composer
  sa propre séance depuis les 102 mouvements, demander une séance à l'assistant,
- **FAQ** (3-5 questions réelles) + `FAQPage` JSON-LD,
- CTA honnête : « Crée ton compte gratuit, sans carte bancaire ».

### A2. Étendre les fiches exercices : 8 → ~30-40
Les **102 mouvements animés sont le fossé concurrentiel** ; chaque fiche publique
transforme cet atout en contenu indexable. Priorité par volume de recherche :
1. **Dos** : tractions, rowing barre/haltère, tirage poitrine/horizontal, soulevé de terre.
2. **Pectoraux** : développé couché, développé incliné, pompes, écarté/pec deck, dips.
3. **Jambes** : squat, fentes, presse, soulevé de terre roumain, mollets.
4. **Épaules** : développé militaire, élévations latérales/frontales, oiseau.
5. **Bras** : curl biceps, curl marteau, extensions triceps, dips.
6. **Abdos/gainage** : crunch, planche, relevés de jambes, russian twist.

Chaque fiche : même contrat éditorial, animation CSS pure (déjà en place), jointure
par nom canonique dans `lib/exercicesPublics.ts`, slug figé écrit à la main.

### A3. Pages catégories `/exercices/[zone]`
Dès qu'une zone a **4-6 fiches**, publier `/exercices/dos`, `/exercices/pectoraux`,
etc. → cible directe « exercice musculation pour le dos ». Reliées depuis le hub
`/exercices`. (Aujourd'hui bloquées car trop peu de fiches ; A2 lève le blocage.)

---

## 5. Chantier B — GEO (être cité par les IA) 🔵

Les IA extraient ce qui est **factuel, structuré et attribuable**.
- **`FAQPage` JSON-LD** sur les piliers, `/a-propos`, `/premium` (questions/réponses
  vraies — autorisé, ce n'est pas de l'auto-notation d'étoiles).
- **Réponse-définition en tête de page** (« Vaiiya est une application web française
  d'entraînement et de nutrition avec un assistant IA. »), puis le détail.
- **Tableaux et listes** partout où c'est possible (les LLM les recopient).
- `/a-propos` doit répondre net à « c'est quoi Vaiiya / qui / prix / plateformes »
  (déjà bien avancé — vérifier la cohérence exacte du nom et de la description
  partout : même phrase d'accroche sur toutes les surfaces).

---

## 6. Chantier C — LES AVIS & la notoriété 🟠 (surtout Louis) + 🔵

C'est le vœu explicite de Louis (« se faire connaître par les avis »). Deux effets :
preuve sociale sur le site **et** étoiles dans Google.

- **C1 🟠 Créer les profils externes** — c'est CE qui met des ⭐ dans Google, le code
  ne peut pas le faire :
  - **Fiche Google Business Profile** (même pour un service en ligne, permet les avis Google),
  - **Trustpilot** (page entreprise gratuite).
  Ces deux-là sont la **seule** source d'étoiles dans les résultats de recherche.
- **C2 🟠 Récolter de VRAIS avis** : l'invite in-app après un moment fort existe déjà.
  En plus, demander en direct aux premiers utilisateurs contents (message perso).
  **Objectif immédiat : passer 5 avis approuvés** pour activer la section accueil +
  `/avis` (aujourd'hui masqués sous le seuil).
- **C3 🔵** Quand le seuil est atteint : vérifier le rendu de `/avis` et de la section
  d'accueil (déjà codé). **Aucun balisage `AggregateRating`/`Review` auto-décerné**
  (interdit, §17 : Google ne l'affiche pas et pénalise).
- **C4 🟠** Répondre aux avis (montre un projet vivant, bon signal).

---

## 7. Chantier D — HORS-SITE & technique externe 🟠 (Louis)

- **Search Console** : suivre les 5 requêtes cibles (impressions, position, CTR),
  vérifier la couverture, resoumettre le sitemap après chaque vague de contenu.
- **Backlinks** (le plus dur, le plus payant) :
  - annuaires FR (applications fitness, startups FR, « app musculation gratuite »),
  - Reddit (r/Fitness_fr, r/Muscu), forums de muscu, en apportant une vraie réponse
    (jamais du spam),
  - plateformes de lancement (ProductHunt, BetaList, AlternativeTo…),
  - **angle presse** : « deux lycéens lyonnais construisent une app de fitness IA » —
    presse étudiante / locale (respecter §9 : pas de prénoms, pas de « startup »,
    faits evergreen seulement).
- **Cohérence de marque** : même nom, même description, mêmes liens officiels partout
  (le `sameAs` du JSON-LD).

---

## 8. Priorisation (l'ordre d'exécution)

**Sprint 1 (≈2 semaines)**
- 🔵 Page pilier **« programme musculation 3 fois par semaine »** (le trou le plus net)
  + renfort « programme » sur `/prise-de-masse` et `/perte-de-poids` + `FAQPage` schema.
- 🟠 Créer **Google Business Profile** et **Trustpilot** ; demander leurs avis aux
  premiers utilisateurs contents (viser 5).

**Sprint 2**
- 🔵 **+8 fiches** exercices : dos et pectoraux.
- 🟠 5 backlinks annuaires + 1 vraie intervention forum/Reddit.

**Sprint 3**
- 🔵 **+8 fiches** jambes/épaules/bras + pages catégories `/exercices/dos` et `/pectoraux`.
- 🟠 Angle presse locale « 2 lycéens lyonnais ».

**Puis en continu :** compléter les zones restantes, enrichir les piliers, entretenir
les avis.

---

## 9. Mesure (le juge de paix)

- **Google Search Console** = la vérité (impressions, position moyenne, CTR par requête).
- Objectif réaliste pour un site jeune : d'abord **top 20 puis top 10 sur la longue
  traîne** (« programme musculation 3 fois par semaine »), pas sur les têtes de
  requête. Les résultats SEO se comptent en **semaines/mois**, pas en jours.
- **Point mensuel** : quelles requêtes montent, quelles pages performent, quoi écrire
  ensuite.

---

## 10. Garde-fous (ce qu'on ne fera JAMAIS)

- Aucun **faux avis**, aucun témoignage écrit en dur, aucun balisage d'étoiles auto.
- Aucun **claim interdit** (§14 du positionnement) : plan nutrition, adaptation
  automatique, iOS/Android, « abonne-toi » au présent, records, « réseau social »,
  « garantit des résultats ».
- Aucun **bourrage de mots-clés** ni page vide « en préparation » visible du public.
- Une page qui n'a pas de contenu réel **n'est pas publiée** (pas de route, pas de
  sitemap) — règle déjà en vigueur pour les fiches.
