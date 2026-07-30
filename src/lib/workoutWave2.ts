import type { Exercise } from "@/components/WorkoutGuideModal";

/* ════════════════════════════════════════════════════════════════════
   Vague 2 du catalogue — Renforcement · Salle · Masse.

   Les noms correspondent aux règles existantes de exerciseGuides.ts.
   Cette vague privilégie des séances réellement différentes : découverte
   guidée, poussée, quadriceps, chaîne postérieure, épaules/bras et machines.
   ════════════════════════════════════════════════════════════════════ */

export const WAVE_2_EXERCISES: Record<string, Exercise[]> = {
  "salle-decouverte": [
    {
      name: "Presse à cuisses", sets: 3, reps: "12 reps", rest: 60,
      tip: "Place les pieds à mi-hauteur et choisis une charge qui laisse le bassin stable contre le dossier.",
      benefit: "Permet de découvrir le travail des jambes sur une trajectoire guidée.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Développé épaules machine", sets: 3, reps: "10 reps", rest: 60,
      tip: "Règle le siège pour partir avec les poignées près des épaules, sans cambrer le dos.",
      benefit: "Introduit la poussée verticale avec un mouvement facile à contrôler.",
      muscles: ["Épaules", "Triceps"],
    },
    {
      name: "Tirage poitrine", sets: 3, reps: "12 reps", rest: 60,
      tip: "Tire les coudes vers le bas jusqu’au haut de la poitrine, puis laisse remonter avec contrôle.",
      benefit: "Fait découvrir la traction verticale et le travail du grand dorsal.",
      muscles: ["Dos", "Biceps"],
    },
    {
      name: "Rowing assis poulie", sets: 3, reps: "12 reps", rest: 60,
      tip: "Garde le buste stable et rapproche les omoplates avant de relâcher les bras.",
      benefit: "Complète le dos avec une traction horizontale guidée.",
      muscles: ["Dos", "Biceps"],
    },
    {
      name: "Pec deck", sets: 3, reps: "12 reps", rest: 50,
      tip: "Garde les épaules basses et rassemble les bras sans claquer les poignées.",
      benefit: "Apprend à sentir les pectoraux sur une trajectoire simple.",
      muscles: ["Pectoraux"],
    },
    {
      name: "Leg curl assis", sets: 3, reps: "12 reps", rest: 50,
      tip: "Aligne le genou avec l’axe de la machine et ramène le rouleau sans décoller les hanches.",
      benefit: "Équilibre la séance avec un travail ciblé de l’arrière des cuisses.",
      muscles: ["Ischio-jambiers"],
    },
  ],

  "push-salle": [
    {
      name: "Développé couché", sets: 4, reps: "8 reps", rest: 90,
      tip: "Ancre les pieds, rapproche les omoplates et descends la barre avec contrôle vers le milieu de la poitrine.",
      benefit: "Pose le mouvement principal de force pour les pectoraux et les triceps.",
      muscles: ["Pectoraux", "Triceps"],
    },
    {
      name: "Développé incliné haltères", sets: 3, reps: "10 reps", rest: 75,
      tip: "Garde les avant-bras verticaux et rapproche les haltères sans perdre l’appui des épaules sur le banc.",
      benefit: "Ajoute une poussée inclinée et une amplitude libre pour le haut des pectoraux.",
      muscles: ["Pectoraux", "Épaules"],
    },
    {
      name: "Développé militaire haltères", sets: 3, reps: "10 reps", rest: 75,
      tip: "Serre le ventre et pousse au-dessus de la tête sans transformer le mouvement en cambrure.",
      benefit: "Développe la poussée verticale et la force des épaules.",
      muscles: ["Épaules", "Triceps"],
    },
    {
      name: "Élévations latérales", sets: 3, reps: "15 reps", rest: 50,
      tip: "Monte les coudes jusqu’à l’horizontale avec une charge légère et une descente lente.",
      benefit: "Ajoute un travail ciblé du faisceau latéral de l’épaule.",
      muscles: ["Épaules"],
    },
    {
      name: "Extension triceps poulie", sets: 3, reps: "12 reps", rest: 50,
      tip: "Garde les coudes près du buste et termine l’extension sans avancer les épaules.",
      benefit: "Isole les triceps après les mouvements de poussée lourds.",
      muscles: ["Triceps"],
    },
    {
      name: "Dips machine", sets: 3, reps: "10 reps", rest: 60,
      tip: "Descends les poignées en gardant les épaules basses et adapte l’assistance à une exécution fluide.",
      benefit: "Termine la poussée avec un mouvement guidé pour les triceps et les pectoraux.",
      muscles: ["Triceps", "Pectoraux"],
    },
  ],

  "jambes-quadriceps": [
    {
      name: "Squat barre", sets: 4, reps: "8 reps", rest: 100,
      tip: "Crée un appui stable avant chaque répétition et garde les genoux dans l’axe des pieds.",
      benefit: "Installe le mouvement principal de la séance pour tout le bas du corps.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Presse à cuisses", sets: 4, reps: "12 reps", rest: 80,
      tip: "Descends jusqu’à l’amplitude où le bassin reste entièrement posé contre le dossier.",
      benefit: "Ajoute du volume aux quadriceps sur une trajectoire guidée.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Squat bulgare", sets: 3, reps: "10 par jambe", rest: 75,
      tip: "Place le pied avant assez loin pour descendre verticalement et pousse dans tout le pied.",
      benefit: "Renforce chaque jambe séparément et sollicite fortement les cuisses.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Leg extension", sets: 3, reps: "15 reps", rest: 55,
      tip: "Aligne les genoux avec l’axe de la machine et marque une courte contraction en haut.",
      benefit: "Cible directement les quadriceps après les mouvements globaux.",
      muscles: ["Quadriceps"],
    },
    {
      name: "Step up banc", sets: 3, reps: "10 par jambe", rest: 60,
      tip: "Monte en poussant avec la jambe posée sur le banc, sans prendre d’élan avec celle du sol.",
      benefit: "Ajoute un travail unilatéral dans une action proche de la vie quotidienne.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Mollets assis", sets: 4, reps: "15 reps", rest: 45,
      tip: "Descends les talons avec contrôle puis monte le plus haut possible sur l’avant du pied.",
      benefit: "Complète le bas du corps avec un travail ciblé des mollets.",
      muscles: ["Mollets"],
    },
  ],

  "chaine-posterieure": [
    {
      name: "Soulevé de terre roumain", sets: 4, reps: "10 reps", rest: 90,
      tip: "Recule les hanches avec le dos long et garde la barre proche des jambes pendant toute la descente.",
      benefit: "Pose le mouvement principal pour les ischio-jambiers, les fessiers et le dos.",
      muscles: ["Ischio-jambiers", "Fessiers", "Dos"],
    },
    {
      name: "Hip thrust machine", sets: 4, reps: "12 reps", rest: 75,
      tip: "Garde le menton légèrement rentré et termine en serrant les fessiers, sans hyperextension du dos.",
      benefit: "Apporte un travail lourd et stable de l’extension de hanche.",
      muscles: ["Fessiers"],
    },
    {
      name: "Leg curl allongé", sets: 3, reps: "12 reps", rest: 60,
      tip: "Garde le bassin posé et ramène les talons sans accélérer la fin du mouvement.",
      benefit: "Cible les ischio-jambiers en flexion de genou.",
      muscles: ["Ischio-jambiers"],
    },
    {
      name: "Pont fessier", sets: 3, reps: "15 reps", rest: 50,
      tip: "Pousse dans les talons et marque une seconde en haut, côtes rentrées.",
      benefit: "Prolonge le travail des fessiers avec une charge corporelle contrôlée.",
      muscles: ["Fessiers", "Ischio-jambiers"],
    },
    {
      name: "Extensions lombaires banc", sets: 3, reps: "12 reps", rest: 60,
      tip: "Pivote depuis les hanches et remonte jusqu’à l’alignement, sans dépasser la ligne du corps.",
      benefit: "Renforce l’arrière du tronc et le contrôle de la charnière de hanche.",
      muscles: ["Lombaires", "Fessiers"],
    },
    {
      name: "Kickback fessier poulie", sets: 3, reps: "15 par jambe", rest: 45,
      tip: "Garde le bassin face à la machine et pousse la jambe vers l’arrière sans élan.",
      benefit: "Termine par un travail ciblé de chaque fessier.",
      muscles: ["Fessiers"],
    },
  ],

  "epaules-bras": [
    {
      name: "Développé Arnold", sets: 4, reps: "10 reps", rest: 75,
      tip: "Fais tourner les paumes progressivement et garde le buste stable pendant la poussée.",
      benefit: "Ouvre la séance avec un mouvement complet pour les épaules.",
      muscles: ["Épaules", "Triceps"],
    },
    {
      name: "Élévations latérales", sets: 4, reps: "15 reps", rest: 50,
      tip: "Utilise une charge qui permet de contrôler entièrement la descente.",
      benefit: "Accumule du volume sur le faisceau latéral des épaules.",
      muscles: ["Épaules"],
    },
    {
      name: "Oiseau haltères", sets: 3, reps: "15 reps", rest: 50,
      tip: "Buste penché, ouvre les bras en gardant les épaules loin des oreilles.",
      benefit: "Équilibre l’épaule avec un travail de l’arrière des deltoïdes.",
      muscles: ["Épaules", "Haut du dos"],
    },
    {
      name: "Curl barre EZ", sets: 3, reps: "10 reps", rest: 60,
      tip: "Garde les coudes fixes et descends la barre lentement jusqu’à presque tendre les bras.",
      benefit: "Apporte le mouvement principal de flexion pour les biceps.",
      muscles: ["Biceps"],
    },
    {
      name: "Curl marteau", sets: 3, reps: "12 reps", rest: 55,
      tip: "Conserve les paumes face à face et évite de balancer le buste.",
      benefit: "Complète les biceps avec un travail du brachial et des avant-bras.",
      muscles: ["Biceps", "Avant-bras"],
    },
    {
      name: "Extension triceps haltère", sets: 3, reps: "12 reps", rest: 55,
      tip: "Garde les coudes dirigés vers l’avant et descends l’haltère sans ouvrir les bras.",
      benefit: "Travaille les triceps dans une position étirée au-dessus de la tête.",
      muscles: ["Triceps"],
    },
    {
      name: "Extension triceps poulie", sets: 3, reps: "12 reps", rest: 50,
      tip: "Verrouille les coudes près du corps et termine chaque répétition avec contrôle.",
      benefit: "Ajoute une dernière série de tension continue pour les triceps.",
      muscles: ["Triceps"],
    },
  ],

  "fullbody-machines": [
    {
      name: "Presse à cuisses", sets: 4, reps: "12 reps", rest: 75,
      tip: "Garde le bassin posé et pousse la plateforme sans verrouiller brutalement les genoux.",
      benefit: "Donne le principal travail de jambes sur une trajectoire stable.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Développé épaules machine", sets: 3, reps: "10 reps", rest: 65,
      tip: "Règle le siège pour démarrer sans hausser les épaules, puis pousse verticalement.",
      benefit: "Ajoute une poussée guidée pour le haut du corps.",
      muscles: ["Épaules", "Triceps"],
    },
    {
      name: "Tirage poitrine", sets: 4, reps: "10 reps", rest: 70,
      tip: "Amène la barre vers le haut de la poitrine en dirigeant les coudes vers le sol.",
      benefit: "Travaille la largeur du dos avec une charge facile à ajuster.",
      muscles: ["Dos", "Biceps"],
    },
    {
      name: "Rowing assis poulie", sets: 3, reps: "12 reps", rest: 65,
      tip: "Tire vers le nombril et marque une seconde quand les omoplates se rapprochent.",
      benefit: "Complète le dos par une traction horizontale.",
      muscles: ["Dos", "Biceps"],
    },
    {
      name: "Hip thrust machine", sets: 3, reps: "12 reps", rest: 65,
      tip: "Monte le bassin jusqu’à l’alignement et garde les côtes basses.",
      benefit: "Ajoute un mouvement guidé puissant pour les fessiers.",
      muscles: ["Fessiers"],
    },
    {
      name: "Dips machine", sets: 3, reps: "10 reps", rest: 60,
      tip: "Garde les épaules basses et pousse les poignées sans décoller le dos du dossier.",
      benefit: "Renforce les triceps et les pectoraux sur une trajectoire contrôlée.",
      muscles: ["Triceps", "Pectoraux"],
    },
    {
      name: "Abducteurs machine", sets: 3, reps: "15 reps", rest: 50,
      tip: "Ouvre les genoux sans donner d’élan et reviens lentement vers le centre.",
      benefit: "Cible les muscles latéraux des hanches utiles à la stabilité.",
      muscles: ["Fessiers", "Hanches"],
    },
    {
      name: "Mollets assis", sets: 3, reps: "15 reps", rest: 45,
      tip: "Cherche une amplitude complète et une courte pause en haut.",
      benefit: "Termine la séance avec un travail précis des mollets.",
      muscles: ["Mollets"],
    },
  ],
};
