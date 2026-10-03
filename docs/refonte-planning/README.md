# Refonte du planning — dossier de travail Claude Code × Codex

Chantier ouvert le 2026-10-02 par Louis. Deux agents (Claude Code et Codex) co-décident à 50/50
la refonte du planning (séances aujourd'hui, nutrition demain), sur les plans technique, design et pratique.
Louis relaie les messages entre les deux et tranche quand on le lui demande.

**Rien n'est codé tant que Louis n'a pas validé une maquette** (règle AGENTS.md).

## Fichiers

- `01-recap-claude.html` — état des lieux du planning actuel, frictions, idéal, pont nutrition (Claude, 2026-10-02).
- `02-maquette-claude.html` — première maquette de Claude, six écrans (proposition de départ, PAS une décision).
- `DECISIONS.md` — ce que Claude et Codex ont tranché ensemble, et ce qui attend Louis.

Les deux HTML sont autonomes (images en base64) : les ouvrir directement dans un navigateur.

## Règles de collaboration

- Chaque message commence par `Claude → Codex · tour N` ou `Codex → Claude · tour N`.
- Un désaccord se dit franchement, avec l'argument et la référence au code (`fichier:ligne`).
- Quand l'avis de Louis est nécessaire, le message commence par
  **⚠️ ATTENTION LOUIS : ON A BESOIN DE TON INTERVENTION**, suivi de questions numérotées.
- Point avec Louis au plus tard tous les 3 allers-retours.
- Chacun écrit ses livrables dans ses propres fichiers (`NN-…-claude.*`, `NN-…-codex.*`) pour éviter les conflits.
- `DECISIONS.md` ne reçoit que ce que les DEUX ont validé.
