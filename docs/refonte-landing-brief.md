# Refonte de la landing Vaiiya — brief de discussion

> Statut au 28 juillet 2026 : proposition et maquette à challenger.  
> Aucun GO n’a encore été donné pour modifier la landing de production.

## Pourquoi ce document existe

Louis veut recueillir un second avis critique sur une proposition de refonte complète de la page publique de présentation de Vaiiya.

Avant toute implémentation :

1. lire `AGENTS.md` en entier ;
2. ouvrir visuellement `docs/maquettes/landing-vaiiya-sans-compte.html` ;
3. comparer la proposition à la landing actuelle dans `src/app/page.tsx` et `src/components/Landing/LandingStory.tsx` ;
4. donner un diagnostic argumenté sans modifier le code.

## Constat sur la landing actuelle

La landing actuelle est visuellement propre, mais elle présente encore une version devenue partiellement obsolète du produit :

- héros générique « Devenez inarrêtable » ;
- maquettes fictives en verre dépoli plutôt que vraies interfaces et vrais contenus ;
- ancienne communauté présentée comme un feed public ;
- ancien « score du jour » ;
- partage de programmes et entraînement sur ceux des autres mis en avant ;
- grand volume d’espace décoratif et page très longue ;
- CTA principal « Commencer gratuitement » qui mène immédiatement à l’inscription ;
- bouton principal violet→or, alors que le système D réserve le violet à l’action ;
- peu de preuves concrètes de la profondeur actuelle du catalogue et du tunnel guidé.

La page ne répond pas assez clairement à la question du pivot relance :

> Pourquoi une personne qui arrive seule aurait-elle envie d’utiliser puis de payer Vaiiya ?

## Décision importante : montrer la valeur avant l’inscription

Louis a identifié une friction majeure : demander de créer un compte avant que la personne ait réellement découvert le produit donne envie d’abandonner.

La landing ne doit donc plus avoir pour première conversion « créer un compte ». Sa première conversion devient :

> Faire vivre un premier moment Vaiiya sans compte.

Parcours proposé :

```text
Landing
→ explorer les vraies séances
→ lancer « Express 12 » en mode invité
→ terminer le vrai tunnel guidé
→ proposer de sauvegarder la séance et de commencer son parcours
→ inscription seulement à ce moment
```

Formulation de l’invitation après la séance :

> Belle séance ✓  
> Garde-la dans ton historique et commence ton parcours Vaiiya.

CTA :

> Sauvegarder ma progression

### Accessible sans compte

- parcourir le catalogue réel ;
- voir les collections gratuites et les aperçus Premium ;
- ouvrir les fiches détaillées ;
- effectuer entièrement une première séance gratuite, recommandation actuelle : `Express 12` ;
- découvrir visuellement l’assistant, la nutrition, les missions, les rangs et le relais.

### Inscription demandée uniquement pour conserver ou personnaliser

- sauvegarder une séance terminée ;
- créer l’historique et gagner des EXP ;
- construire un planning ;
- conserver ses repas ;
- utiliser l’assistant avec mémoire et actions personnalisées ;
- lancer un relais ou utiliser la messagerie.

### Principe technique envisagé

La première séance invitée ne crée aucune ligne Supabase anonyme. Son résultat peut rester temporairement dans `sessionStorage` ou `localStorage`, puis être rattaché au compte après authentification.

Le premier essai réel doit être une séance plutôt qu’un appel IA :

- expérience immédiate et représentative du nouveau positionnement Premium ;
- aucun coût variable Mistral ;
- moins de surface d’abus anonyme ;
- le tunnel fonctionne déjà avec des contenus locaux ;
- valeur perçue avant de demander une identité.

La nutrition réelle sans compte et un message IA invité pourront être étudiés plus tard avec limitation par appareil/IP. Ils ne sont pas nécessaires au premier lancement de cette refonte.

## Direction éditoriale proposée

### Idée directrice

> La preuve, pas la promesse.

Une landing plus courte et plus incarnée, construite avec :

- les vraies photos naturelles du catalogue ;
- les vrais personnages-guides ;
- les vraies mécaniques : tunnel, assistant qui agit, nutrition, missions, rangs et relais ;
- aucune fausse statistique, aucun faux témoignage, aucune fausse interface sociale.

### Nouveau héros

Sur-titre :

> Entraînement · Nutrition · Coach IA

Titre :

> Ton sport, enfin relié.

Texte :

> Une séance, un repas, une question : Vaiiya transforme chaque action en un parcours clair, adapté à ta vraie vie.

CTA principal violet :

> Essayer une séance

CTA secondaire :

> Voir Vaiiya en action

Réassurance :

> Sans compte · Sans carte bancaire · Ta première séance est complète

La navigation conserve « Se connecter », mais ne pousse pas immédiatement un gros CTA d’inscription.

## Structure proposée

### 1. Héros : voir immédiatement le produit

- véritable séance `Express 12` ;
- aperçu de l’accueil, du rang et de l’assistant ;
- CTA vers l’expérience invitée ;
- aucun formulaire.

### 2. Preuves de profondeur

Compteurs réels, à dériver des sources lors de l’implémentation et non à hardcoder :

- 53 séances au moment de la maquette ;
- 26 mini-cours ;
- 102 mouvements guidés.

### 3. « Une action. Tout se met à jour. »

Le fil rouge de la vision « tout connecté » :

1. choisir une séance adaptée au temps et au matériel ;
2. se laisser guider dans le tunnel ;
3. voir la séance nourrir les missions, l’EXP et le rang.

### 4. Le vrai catalogue

- photos naturelles ;
- gratuit réellement utile ;
- profondeur et spécialisation côté Premium ;
- cartes Premium lisibles, jamais grisées ou floutées ;
- aperçu avant achat.

### 5. Rupture visuelle : le tunnel

Section sombre et immersive montrant :

- personnages-guides animés ;
- progression segmentée ;
- chrono ;
- récupération ;
- raccourci vers l’étincelle.

Message :

> Tu n’as pas besoin de connaître les mouvements. Vaiiya reste avec toi.

### 6. L’intelligence utile

Deux preuves :

- l’étincelle ne répond pas seulement : elle agit sur la séance, le planning et les recettes ;
- la nutrition comprend le repas depuis une photo et réduit la saisie.

### 7. Constance personnelle

- missions ;
- EXP ;
- rang ;
- aucune comparaison de corps ;
- aucun classement ;
- langage sans culpabilisation.

Message :

> Tu ne compares pas ton corps. Tu construis ta régularité.

### 8. Le relais

Différenciateur et boucle d’acquisition :

> À deux. Pas contre les autres.

- quatre jours sur sept ;
- chacun son tour ;
- affiche qui se révèle ;
- aucun feed public ;
- aucun classement ;
- aucune punition collective.

### 9. Essayer puis conserver

Deux colonnes simples :

- « Sans compte » : explorer et effectuer une séance complète ;
- « Quand tu es prêt » : sauvegarder, planifier, faire grandir son rang.

Ne pas mettre Premium+ en avant sur cette landing tant que sa promesse propre n’est pas définie.

### 10. CTA final

Titre :

> Commence là où tu en es.

Texte :

> Une séance suffit pour découvrir si Vaiiya est fait pour toi.

CTA :

> Essayer sans créer de compte

## Direction visuelle

- mobile-first ;
- hiérarchie plus franche et page plus courte ;
- vraies interfaces et vrais visuels ;
- surfaces claires et éditoriales ;
- une rupture sombre pour le tunnel ;
- violet = action ;
- orange = énergie ;
- teal = corps, progrès et réussite ;
- photos de contenu naturelles ;
- étincelle bicolore officielle, jamais remplacée ;
- animations uniquement lorsqu’elles expliquent une transition réelle ;
- aucune accumulation de particules ou de verre dépoli décoratif.

## Éléments volontairement retirés

- « Devenez inarrêtable » ;
- ancien feed communautaire ;
- ancien score quotidien ;
- fausses maquettes produit ;
- quatre personas génériques ;
- répétition des CTA d’inscription ;
- promesses qui ne correspondent plus au produit ;
- bouton d’action violet→or.

## Questions demandées à Claude Code

Donner un avis critique sans modifier de fichier :

1. La promesse « Ton sport, enfin relié » est-elle comprise immédiatement ?
2. Le parcours d’essai sans inscription fournit-il assez de valeur avant de demander un compte ?
3. Quelles sections sont indispensables, redondantes ou mal ordonnées ?
4. La page explique-t-elle suffisamment pourquoi une personne seule voudrait utiliser puis payer Vaiiya ?
5. Quelles affirmations ou interfaces de la maquette divergent du produit réel ?
6. Quels risques techniques, auth, SEO, analytics ou sécurité faut-il anticiper pour le mode invité ?
7. Quelle serait la version minimale cohérente à implémenter avant d’ajouter des essais anonymes de nutrition ou d’IA ?

## Limite de la mission de revue

Ne rien coder et ne rien modifier avant le retour de Louis sur l’analyse.
