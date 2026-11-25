# Les sons du booster

Version du 2026-11-25, en essai dans « Ouvrir à blanc » (administrateurs). Le code : `src/lib/sonsBooster.ts`. Les
fichiers : `public/sons/booster/` (284 Ko en tout, chargés seulement au toucher qui prépare le sachet).

| Moment | Fichier | D'où il vient |
|---|---|---|
| Le film se déchire | `dechirure` (boucle), `detache` | Ouverture de vrais paquets d'autocollants en film alu, MrFossy : 590340, 590342, 590353, 590331, 590344 |
| Les cartes sortent | `cartes` | Glissements de cartes à jouer, el_boss : 571574, 571581, 571576 |
| La dernière carte | `rare`, `epique`, `legendaire`, `chromatique` | Kalimba, nemaavla : 441142, 441140, 441135, 441133, 441139, 441141, 441137, 441143 |
| L'EXP monte | `exp1`, `exp2`, `exp3` | Le même kalimba : sol, si, ré |

Les numéros sont ceux de Freesound (`https://freesound.org/s/<numéro>/`). Les seize pages affichaient la licence
CC0 le 2026-11-25 : usage commercial permis, sans crédit obligatoire.

## Le traitement

- Déchirure : graves retirés (sous 1 500 Hz), craquements ramenés au niveau moyen, aigus adoucis, quatre prises
  raccordées en une boucle de 0,97 s. Dans l'app, son volume suit la vitesse du doigt.
- Notes : accordées (le kalimba avait jusqu'à 21 cents d'écart), attaque adoucie, aigus coupés à 3 kHz, salle courte.
  Toutes sont dans la même gamme (sol pentatonique), donc rien ne frotte quand deux sons se recouvrent.
- Une rareté ajoute des notes : deux pour une rare, trois pour une épique, cinq pour une légendaire, six pour une
  chromatique.
