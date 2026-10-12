# Mini-chantiers à partir des prompts de Louis

## Cadre décidé le 12 octobre 2026

Louis souhaite améliorer Vaiiya progressivement, à partir des prompts qu'il
transmettra, notamment ceux trouvés sur [Build IA](https://build-ia.com).

- Branche dédiée : `codex/mini-chantiers-build-ia`.
- Base initiale : `origin/main`, commit `43d5f6e0`.
- Chaque prompt reçu ouvre un mini-chantier avec un périmètre précis.
- Adapter les recommandations à Vaiiya, au code existant et aux décisions de
  Louis consignées dans `AGENTS.md`.
- Pour un changement d'interface significatif : maquette, puis validation
  explicite de Louis avant l'implémentation.
- Vérifier chaque changement avec les contrôles adaptés ; conserver ici les
  résultats et les limites de vérification.
- Sauvegarder les changements cohérents dans des commits distincts, en
  français, puis les pousser sur cette branche après synchronisation.
- Une intégration dans `main` attend la validation de Louis sur un ensemble
  cohérent.

## Journal

### 000 — Préparation du chantier

- **Date :** 12 octobre 2026.
- **Demande :** réserver une branche séparée pour une série de mini-chantiers
  pilotés par les prompts de Louis.
- **Réalisé :** branche créée depuis la production à jour et journal initialisé.
- **Vérification :** dépôt propre avant création ; référence `origin/main`
  actualisée. Documentation uniquement, aucun changement fonctionnel.
- **Suite :** réception du premier prompt.

## Informations à conserver pour chaque mini-chantier

1. Prompt reçu et objectif retenu.
2. Diagnostic fondé sur le code et périmètre des corrections.
3. Décisions ou maquette validées, si nécessaire.
4. Changements réalisés et commits correspondants.
5. Vérifications effectuées, résultats et points à tester sur Vercel.
