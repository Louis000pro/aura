import type { Exercise } from "@/components/WorkoutGuideModal";

/* ═══════════════════════════════════════════════════════════════════
   Vague 6 du catalogue — Conseils & progresser.

   Ici, le tunnel devient une masterclass active : peu de volume, des
   répétitions contrôlées et un repère technique précis à chaque étape.
   L'utilisateur ne lit pas seulement un conseil, il voit puis pratique.
   ═══════════════════════════════════════════════════════════════════ */

export const WAVE_6_EXERCISES: Record<string, Exercise[]> = {
  "bases-mouvement": [
    {
      name: "Squat", sets: 2, reps: "8 reps lentes", rest: 35,
      tip: "Garde tout le pied posé et laisse les genoux suivre la direction des orteils.",
      benefit: "Découvre le mouvement de base pour s'asseoir, se relever et pousser avec les jambes.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Pompes inclinées", sets: 2, reps: "8 reps", rest: 35,
      tip: "Choisis un support stable qui permet de garder le corps aligné.",
      benefit: "Apprend la poussée du haut du corps avec une difficulté facile à ajuster.",
      muscles: ["Pectoraux", "Triceps"],
    },
    {
      name: "Fentes", sets: 2, reps: "6 par jambe", rest: 35,
      tip: "Pose les pieds sur deux rails imaginaires plutôt que sur une seule ligne.",
      benefit: "Introduit le travail sur une jambe et le contrôle des appuis.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Rowing inversé", sets: 2, reps: "8 reps", rest: 40,
      tip: "Tire la poitrine vers le support en rapprochant d'abord les omoplates.",
      benefit: "Fait découvrir la traction horizontale et l'engagement du dos.",
      muscles: ["Dos", "Biceps"],
    },
    {
      name: "Pont fessier", sets: 2, reps: "10 reps", rest: 30,
      tip: "Pousse dans les talons et termine en serrant les fessiers sans cambrer.",
      benefit: "Enseigne l'extension de hanche dans une position stable au sol.",
      muscles: ["Fessiers", "Ischio-jambiers"],
    },
    {
      name: "Dead bug", sets: 2, reps: "6 par côté", rest: 30,
      tip: "Garde le bas du dos au sol quand le bras et la jambe s'éloignent.",
      benefit: "Pose la base du gainage : résister au mouvement plutôt que crisper tout le corps.",
      muscles: ["Core"],
    },
  ],

  "squat-maitrise": [
    {
      name: "Étirement mollet au mur", sets: 2, reps: "25 sec par côté", rest: 10, auto: 25,
      tip: "Avance doucement le genou en gardant le talon posé.",
      benefit: "Prépare la cheville à avancer pendant la descente du squat.",
      muscles: ["Chevilles", "Mollets"],
    },
    {
      name: "Chaise au mur", sets: 2, reps: "25 sec", rest: 25, auto: 25,
      tip: "Répartis le poids sur tout le pied et garde les genoux dans l'axe.",
      benefit: "Permet de sentir la position basse avec le dos soutenu.",
      muscles: ["Quadriceps"],
    },
    {
      name: "Squat", sets: 3, reps: "8 reps lentes", rest: 40,
      tip: "Descends en trois secondes, marque une pause, puis pousse le sol pour remonter.",
      benefit: "Travaille le squat libre avec assez de temps pour corriger chaque répétition.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Goblet squat", sets: 3, reps: "8 reps", rest: 45,
      tip: "Garde la charge près de la poitrine et les coudes dirigés vers le bas.",
      benefit: "Ajoute une charge devant le corps qui aide à conserver un buste stable.",
      muscles: ["Quadriceps", "Fessiers", "Core"],
    },
    {
      name: "Squat bulgare", sets: 2, reps: "6 par jambe", rest: 45,
      tip: "Place le pied avant assez loin pour descendre verticalement sans perdre l'appui.",
      benefit: "Vérifie le contrôle de chaque jambe séparément.",
      muscles: ["Quadriceps", "Fessiers"],
    },
  ],

  "pompes-maitrise": [
    {
      name: "Ouverture des épaules", sets: 2, reps: "8 passages", rest: 15,
      tip: "Garde les côtes basses et utilise une amplitude sans gêne.",
      benefit: "Prépare les épaules avant les appuis au sol.",
      muscles: ["Épaules", "Pectoraux"],
    },
    {
      name: "Pompes inclinées", sets: 3, reps: "8 reps", rest: 40,
      tip: "Plus le support est haut, plus la variante est accessible.",
      benefit: "Permet de construire le même alignement qu'une pompe au sol.",
      muscles: ["Pectoraux", "Triceps"],
    },
    {
      name: "Pompes", sets: 3, reps: "6 reps propres", rest: 50,
      tip: "Descends le corps en un seul bloc, coudes à environ 45 degrés.",
      benefit: "Met en pratique la poussée horizontale complète.",
      muscles: ["Pectoraux", "Triceps", "Core"],
    },
    {
      name: "Pompes diamant", sets: 2, reps: "6 reps", rest: 50,
      tip: "Rapproche les mains seulement si les poignets restent confortables.",
      benefit: "Montre comment un placement plus serré déplace l'effort vers les triceps.",
      muscles: ["Triceps", "Pectoraux"],
    },
    {
      name: "Pike push-ups", sets: 2, reps: "6 reps", rest: 55,
      tip: "Monte les hanches et dirige le sommet du crâne entre les mains.",
      benefit: "Introduit une poussée plus verticale pour préparer le travail des épaules.",
      muscles: ["Épaules", "Triceps"],
    },
  ],

  "tractions-progression": [
    {
      name: "Ouverture des épaules", sets: 2, reps: "8 passages", rest: 15,
      tip: "Bouge lentement sans pousser les côtes vers l'avant.",
      benefit: "Prépare les épaules à travailler au-dessus de la tête.",
      muscles: ["Épaules", "Pectoraux"],
    },
    {
      name: "Face pull poulie", sets: 3, reps: "12 reps", rest: 40,
      tip: "Tire vers le visage avec les coudes hauts et termine en rapprochant les omoplates.",
      benefit: "Apprend à stabiliser les épaules avant les tractions plus exigeantes.",
      muscles: ["Haut du dos", "Épaules"],
    },
    {
      name: "Rowing inversé", sets: 3, reps: "8 reps", rest: 50,
      tip: "Rends le mouvement plus facile en redressant le corps, plus difficile en avançant les pieds.",
      benefit: "Construit la traction avec une difficulté ajustable par la position du corps.",
      muscles: ["Dos", "Biceps"],
    },
    {
      name: "Tirage poitrine", sets: 3, reps: "10 reps", rest: 55,
      tip: "Dirige les coudes vers le sol et garde le buste presque vertical.",
      benefit: "Renforce le même trajet vertical avec une charge précisément réglable.",
      muscles: ["Dos", "Biceps"],
    },
    {
      name: "Tractions", sets: 4, reps: "3 à 6 reps", rest: 75,
      tip: "Commence chaque répétition épaules basses et arrête la série avant de perdre le contrôle.",
      benefit: "Met en pratique le mouvement complet avec un volume volontairement maîtrisé.",
      muscles: ["Dos", "Biceps"],
    },
    {
      name: "Curl marteau", sets: 2, reps: "10 reps", rest: 40,
      tip: "Garde les coudes fixes et descends les haltères avec contrôle.",
      benefit: "Complète la séance par les fléchisseurs du coude utiles à la traction.",
      muscles: ["Biceps", "Avant-bras"],
    },
  ],

  "charniere-hanche": [
    {
      name: "Cat-cow", sets: 2, reps: "8 respirations", rest: 12,
      tip: "Observe les mouvements de la colonne pour mieux la garder stable ensuite.",
      benefit: "Aide à distinguer le mouvement du dos de celui des hanches.",
      muscles: ["Dos", "Mobilité"],
    },
    {
      name: "Pont fessier", sets: 3, reps: "10 reps", rest: 35,
      tip: "Termine le mouvement avec les fessiers, pas avec une cambrure du bas du dos.",
      benefit: "Fait sentir l'extension de hanche dans une position simple.",
      muscles: ["Fessiers", "Ischio-jambiers"],
    },
    {
      name: "Soulevé de terre roumain", sets: 3, reps: "8 reps lentes", rest: 55,
      tip: "Recule les hanches et garde la charge proche des jambes.",
      benefit: "Enseigne la charnière de hanche avec les genoux légèrement fléchis.",
      muscles: ["Ischio-jambiers", "Fessiers", "Dos"],
    },
    {
      name: "Kettlebell swing", sets: 3, reps: "12 reps", rest: 50,
      tip: "L'élan vient de l'extension rapide des hanches, jamais d'une élévation des bras.",
      benefit: "Transforme la charnière contrôlée en mouvement dynamique.",
      muscles: ["Fessiers", "Ischio-jambiers", "Cardio"],
    },
    {
      name: "Soulevé de terre classique", sets: 3, reps: "6 reps", rest: 75,
      tip: "Crée de la tension avant de décoller la charge et pousse le sol avec les pieds.",
      benefit: "Applique la charnière à un mouvement de force complet depuis le sol.",
      muscles: ["Jambes", "Dos", "Fessiers"],
    },
    {
      name: "Étirement chaîne postérieure", sets: 2, reps: "35 sec", rest: 10, auto: 35,
      tip: "Garde le dos long et avance depuis le bassin.",
      benefit: "Termine en retrouvant le même placement de hanche sans charge.",
      muscles: ["Ischio-jambiers", "Dos"],
    },
  ],

  "gainage-progression": [
    {
      name: "Dead bug", sets: 3, reps: "6 par côté", rest: 30,
      tip: "Expire quand les membres s'éloignent et garde le bas du dos au sol.",
      benefit: "Commence par le contrôle du bassin dans une position soutenue.",
      muscles: ["Core"],
    },
    {
      name: "Bird dog", sets: 3, reps: "6 par côté", rest: 30,
      tip: "Allonge bras et jambe sans tourner le bassin.",
      benefit: "Ajoute une stabilité croisée à quatre appuis.",
      muscles: ["Core", "Dos"],
    },
    {
      name: "Planche frontale", sets: 3, reps: "30 sec", rest: 30, auto: 30,
      tip: "Serre légèrement fessiers et abdominaux pour conserver une ligne droite.",
      benefit: "Installe la tenue de référence pour le gainage antérieur.",
      muscles: ["Core"],
    },
    {
      name: "Planche latérale", sets: 3, reps: "25 sec par côté", rest: 25, auto: 25,
      tip: "Pousse l'avant-bras dans le sol et garde la hanche haute.",
      benefit: "Déplace le travail vers la stabilité latérale du tronc.",
      muscles: ["Obliques", "Core"],
    },
    {
      name: "Hollow hold", sets: 3, reps: "25 sec", rest: 30, auto: 25,
      tip: "Plie les genoux si le bas du dos commence à quitter le sol.",
      benefit: "Augmente le levier tout en conservant le contrôle du bassin.",
      muscles: ["Abdominaux", "Core"],
    },
    {
      name: "Gainage dynamique", sets: 3, reps: "30 sec", rest: 35, auto: 30,
      tip: "Change d'appui lentement et limite au maximum la rotation des hanches.",
      benefit: "Termine en gardant le tronc stable pendant un mouvement des bras.",
      muscles: ["Core", "Épaules"],
    },
  ],

  "epaules-controle": [
    {
      name: "Ouverture des épaules", sets: 2, reps: "10 passages", rest: 15,
      tip: "Utilise une prise assez large pour bouger sans compenser avec le dos.",
      benefit: "Observe l'amplitude disponible avant d'ajouter une charge.",
      muscles: ["Épaules", "Pectoraux"],
    },
    {
      name: "Étirement pectoraux au mur", sets: 2, reps: "30 sec par côté", rest: 10, auto: 30,
      tip: "Tourne doucement le buste en gardant l'épaule basse.",
      benefit: "Ouvre l'avant de l'épaule avant les mouvements de poussée.",
      muscles: ["Pectoraux", "Épaules"],
    },
    {
      name: "Pike push-ups", sets: 3, reps: "6 reps", rest: 50,
      tip: "Pousse le sol loin de toi et garde les avant-bras presque verticaux.",
      benefit: "Apprend à pousser au-dessus de la tête avec le poids du corps.",
      muscles: ["Épaules", "Triceps"],
    },
    {
      name: "Développé militaire haltères", sets: 3, reps: "8 reps", rest: 55,
      tip: "Serre le ventre et termine les haltères au-dessus des épaules.",
      benefit: "Ajoute une poussée verticale avec une trajectoire libre.",
      muscles: ["Épaules", "Triceps"],
    },
    {
      name: "Face pull poulie", sets: 3, reps: "12 reps", rest: 40,
      tip: "Tire vers le front et ouvre les mains de chaque côté du visage.",
      benefit: "Équilibre la poussée avec le travail de l'arrière des épaules.",
      muscles: ["Haut du dos", "Épaules"],
    },
    {
      name: "Élévations latérales", sets: 3, reps: "12 reps", rest: 40,
      tip: "Monte avec les coudes et contrôle entièrement la descente.",
      benefit: "Termine par un mouvement ciblé où la maîtrise compte plus que la charge.",
      muscles: ["Épaules"],
    },
  ],

  "unilateral-maitrise": [
    {
      name: "Bird dog", sets: 2, reps: "6 par côté", rest: 25,
      tip: "Allonge les membres opposés sans déplacer le bassin.",
      benefit: "Commence par un contrôle croisé facile à observer.",
      muscles: ["Core", "Dos"],
    },
    {
      name: "Step up banc", sets: 3, reps: "8 par jambe", rest: 40,
      tip: "Monte grâce à la jambe posée sur le banc, sans pousser fort avec celle du sol.",
      benefit: "Apprend à produire l'effort avec un seul appui principal.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Fentes", sets: 3, reps: "8 par jambe", rest: 45,
      tip: "Garde le bassin face à l'avant et contrôle la pose du pied.",
      benefit: "Travaille le déplacement et la stabilité sur deux appuis décalés.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Squat bulgare", sets: 3, reps: "6 par jambe", rest: 50,
      tip: "Descends verticalement et conserve la pression sur tout le pied avant.",
      benefit: "Augmente la demande sur une jambe tout en gardant un appui arrière.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Donkey kick", sets: 3, reps: "10 par côté", rest: 30,
      tip: "Garde les hanches face au sol et pousse le talon sans creuser le dos.",
      benefit: "Isole chaque hanche dans une position stable.",
      muscles: ["Fessiers"],
    },
    {
      name: "Planche latérale", sets: 2, reps: "25 sec par côté", rest: 25, auto: 25,
      tip: "Compare la qualité des deux côtés sans chercher à battre un chrono.",
      benefit: "Termine par un repère de stabilité latérale droite-gauche.",
      muscles: ["Obliques", "Core"],
    },
  ],

  "tempo-controle": [
    {
      name: "Squat", sets: 3, reps: "8 reps · 3-1-2", rest: 45,
      tip: "Descends trois secondes, reste une seconde en bas, puis remonte en deux secondes.",
      benefit: "Montre comment ralentir transforme un mouvement familier.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Pompes", sets: 3, reps: "6 reps · 3-1-2", rest: 50,
      tip: "Garde le corps aligné pendant les trois secondes de descente.",
      benefit: "Développe le contrôle de la poussée sans ajouter de répétitions.",
      muscles: ["Pectoraux", "Triceps"],
    },
    {
      name: "Fentes", sets: 3, reps: "6 par jambe · lentes", rest: 45,
      tip: "Pose le genou arrière en trois secondes puis remonte sans rebond.",
      benefit: "Rend chaque appui plus lisible et plus stable.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Rowing buste penché haltères", sets: 3, reps: "8 reps · pause en haut", rest: 50,
      tip: "Marque une seconde quand les omoplates sont rapprochées.",
      benefit: "Apprend à finir la traction avant de redescendre la charge.",
      muscles: ["Dos", "Biceps"],
    },
    {
      name: "Soulevé de terre roumain", sets: 3, reps: "8 reps · descente lente", rest: 55,
      tip: "Prends trois secondes pour reculer les hanches, puis remonte avec contrôle.",
      benefit: "Renforce la précision de la charnière de hanche.",
      muscles: ["Ischio-jambiers", "Fessiers", "Dos"],
    },
    {
      name: "Développé militaire haltères", sets: 3, reps: "8 reps · contrôle", rest: 50,
      tip: "Pousse régulièrement puis ralentis la descente jusqu'aux épaules.",
      benefit: "Termine par une poussée verticale où chaque phase reste maîtrisée.",
      muscles: ["Épaules", "Triceps"],
    },
  ],
};
