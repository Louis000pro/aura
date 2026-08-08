# Checklist de fusion — mini-lot `seo-security-current`

> Branche partie du `main` du 2026-07-30 (`f29a823`). 3 commits, 5 fichiers,
> 920 lignes ajoutées et 7 supprimées. Aucun SQL, aucune migration.
>
> `hardening-seo-privacy` est une **archive** : elle ne doit jamais être
> fusionnée. Voir le bloc de mise à jour de `rls-audit.md`.

---

## Règle de mise en production (VERROUILLÉE)

**La production ne se fabrique que par une fusion Git vers `main`.** Vercel
produit alors un déploiement Production neuf, construit depuis ce commit.

Interdits, sans exception :

- **« Promote to Production »** sur un déploiement Preview, depuis le tableau
  de bord Vercel ;
- **`vercel --prod`** pour promouvoir un build Preview existant ;
- toute forme de réutilisation d'un artefact de build Preview en Production.

**Pourquoi ce n'est pas une préférence de style.** La protection anti-indexation
de ce lot est décidée par `VERCEL_ENV`, lue **au moment du build** :
`next.config.ts` n'ajoute `X-Robots-Tag` que hors production, et `src/app/robots.ts`
ne renvoie `Disallow: /` que hors production. Un build fabriqué en Preview porte
donc, gravés dedans, un `robots.txt` qui interdit tout et un en-tête `noindex`
sur chaque réponse. **Le promouvoir tel quel mettrait vaiiya.fr hors des moteurs
de recherche**, sans que rien à l'écran ne le montre. Une désindexation se
constate des semaines plus tard et se répare encore plus lentement.

La même règle vaut pour la suite : c'est aussi elle qui garantit qu'une variable
d'environnement propre à la Production est bien celle du build livré.

Rappel du dépôt : tout passe par GitHub, jamais de `vercel --prod` en direct,
sinon la production diverge du repo.

---

## Avant de fusionner

### 1. Test live de la preview (obligatoire, sur le vrai déploiement Vercel)

Sur l'URL de preview de `seo-security-current` :

- [ ] `/` renvoie `X-Robots-Tag: noindex, nofollow`
- [ ] `/robots.txt` contient `User-Agent: *` puis `Disallow: /`
- [ ] `/sitemap.xml` renvoie aussi l'en-tête
- [ ] un asset statique (ex. `/icons/icon-48.png`) renvoie aussi l'en-tête

Vérifié en local et sur deux builds complets, un par valeur de `VERCEL_ENV`.
**Non vérifié sur le déploiement Vercel réel** : ce test reste à faire, il ne
peut pas être remplacé par les mesures locales.

### 2. Test positif du cron

- [ ] avec le bon `CRON_SECRET`, la garde est franchie (toute réponse **autre
      que 401** le prouve)

Les cas négatifs sont déjà prouvés : sans secret, avec un mauvais secret et
avec un secret vide, la route répond 401.

> ⚠️ **Effet de bord à connaître avant de lancer ce test.** Franchir la garde
> exécute le cron **en entier** : il lit `push_subscriptions` et envoie une
> vraie notification push à **tous les comptes abonnés**, quelle que soit
> l'heure. Il n'existe pas de mode d'essai. Ce n'est pas un test neutre, c'est
> un envoi réel. Le choisir en connaissance de cause, ou demander l'ajout d'un
> paramètre d'essai avant.

### 3. Vérifications d'environnement

- [ ] `CRON_SECRET` présent dans la portée **Production** (confirmé)
- [ ] `CRON_SECRET` présent dans la portée **Preview**, si le test positif doit
      être fait avant la fusion. S'il n'est défini qu'en Production, la route
      répond 401 sur la preview **même avec le bon secret**, et le test positif
      y est impossible.
- [ ] Production Stripe en `sk_live_`, Preview et Development en `sk_test_`
      (confirmé)

---

## Après la fusion

- [ ] un déploiement **Production neuf** est bien parti du commit de fusion,
      et non promu depuis la preview
- [ ] `https://vaiiya.fr/robots.txt` est resté normal : `Allow: /` et les sept
      `Disallow` privés, `Host` et `Sitemap` présents
- [ ] `https://vaiiya.fr/` ne renvoie **aucun** `X-Robots-Tag: noindex`
- [ ] le cron de 17 h passe sans 401 (ou test manuel déclenché depuis Vercel)

### Le risque à accepter en fusionnant

Si `CRON_SECRET` venait à disparaître des variables Vercel, les rappels
quotidiens s'arrêteraient **silencieusement** au lieu de partir. C'est le bon
sens du compromis, une porte fermée valant mieux qu'une porte ouverte à tout
internet, mais c'est un changement de comportement réel : avant, l'absence de
la variable laissait simplement passer tout le monde.

---

## Hors périmètre de ce lot

Rien de ceci n'a été touché, et rien ne doit l'être avant un nouvel audit :

- Phase 2 des profils privés (`user_public_profiles`), dont l'inventaire
  applicatif est à refaire entièrement sur le code actuel ;
- `rangs_aura`, la messagerie, les anciennes tables sociales, la console admin ;
- routes privées et noindex applicatif, textes périmés, offre Créateur, SEO
  Premium, analytics avec consentement, accès limité avant inscription.
