# Le planning sur mesure

Chantier ouvert le 2026-10-13 par Louis : passer le planning d'entraînement « au niveau supérieur ».
Beaucoup plus personnalisé, personnalisable et intuitif ; capable de s'adapter pour une semaine ou un mois ;
cibler des zones du corps ; adapter le temps d'entraînement et les zones, au niveau des séances comme des
exercices ; et beau au point de surprendre.

Il fait suite à la refonte du planning d'octobre (`docs/refonte-planning/`, vagues R1 à R9, en production).
Le moteur de cette refonte ne change pas ; ce chantier porte sur ce que la personne règle et voit.

**Rien n'est codé.** Aucune maquette ni aucun code avant le GO de Louis (règle AGENTS.md : maquette d'abord,
code après validation explicite).

## Réorientation du 2026-10-13

Après le récap, Louis : « bien trop compliqué pour quelque chose qui doit être accessible pour tous ».
Les sept questions du récap sont donc caduques. La règle qui les remplace :

- **L'évidence en grand, la personnalisation en plus petit.** Plus un réglage est personnel et niche, plus il
  est discret. Discret ne veut pas dire inaccessible : il reste trouvable par qui le cherche.
- Le modèle cité est Duolingo : on ouvre, c'est guidé, pas une forêt de réglages.
- La grille « Mon plan » du récap (4 réglages × 4 portées) est abandonnée.

Piste proposée, pas encore validée, en trois étages :

1. **En grand** : la séance du jour et la semaine, un bouton, aucun réglage. La plupart des gens s'arrêteront
   là, donc les séances par défaut doivent être excellentes (les écarts du moteur passent en premier).
2. **En petit** : un « Ajuster » discret sur une séance, avec la durée et la zone.
3. **Discret** : tout le reste se demande au Guide ; le réglage à la main reste au fond.

Question ouverte : faire de Nora et Sasha de vrais agents (une demande menée de A à Z). Avis et conditions
dans AGENTS.md, chantier « Le planning sur mesure ». **Mesurée le 2026-10-13** (`test-agent.md`) : sans
contrôle en code, l'agent réussit 0 fois sur 3 ; avec trois garde-fous en code, 3 fois sur 3. Pas tranchée pour autant :
le passage de Groq au palier payant et la levée des verrous de V9 reviennent à Louis.

## Fichiers

- `01-recap.html` : la version courte et visuelle pour Louis (deux minutes, sept réponses à cocher).
  Publiée : https://claude.ai/artifact/UiQHjxkrygGy7pJ4QVAHXk
- `01-recap-detaille.html` : la version complète pour les agents (ce qui existe, concurrents, science,
  design, pistes, onze questions). Autonome, elle s'ouvre dans un navigateur.
- `test-agent.md` : le test « agent » du 2026-10-13 (montage, essais, leçons, ce qui bloque, comment le
  rejouer).
- `recherche/` : les notes de recherche complètes, avec leurs sources.
  - `A1-muscu.md` : applis de musculation et de salle qui adaptent un plan.
  - `A2-guidees.md` : séances guidées, cours, constructeurs de plan, acteurs français.
  - `B-science.md` : la science de la séance adaptée, avec des tableaux de règles pour un moteur.
  - `C-design.md` : motifs d'interface et design visuel des plannings.
  - `ancienne-conversation.md` : synthèse de la conversation du 2 octobre (refonte du planning).
