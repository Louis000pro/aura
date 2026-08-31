import type { Exercise } from "@/components/WorkoutGuideModal";

/* ════════════════════════════════════════════════════════════════════
   Vague 1 du catalogue — Sans matériel · Débuter.

   Chaque nom ci-dessous correspond volontairement à une règle existante
   de exerciseGuides.ts : les nouvelles séances ont donc toutes un guide
   animé exact dans le tunnel, sans halo de repli.
   ════════════════════════════════════════════════════════════════════ */

export const WAVE_1_EXERCISES: Record<string, Exercise[]> = {
  "express-12": [
    {
      name: "Squat", sets: 2, reps: "15 reps", rest: 30,
      tip: "Pieds largeur d’épaules, talons ancrés. Descends à l’amplitude qui reste confortable.",
      benefit: "Réveille tout le bas du corps avec un mouvement simple et complet.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Pompes", sets: 2, reps: "8 reps", rest: 30,
      tip: "Corps aligné, coudes à 45°. Pose les genoux si tu veux alléger sans perdre le geste.",
      benefit: "Travaille la poussée du haut du corps et la stabilité des épaules.",
      muscles: ["Pectoraux", "Triceps"],
    },
    {
      name: "Fentes", sets: 2, reps: "10 par jambe", rest: 30,
      tip: "Fais un pas assez long pour garder le genou avant stable, puis pousse dans le talon.",
      benefit: "Renforce chaque jambe séparément et fait travailler l’équilibre.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Mountain climbers", sets: 2, reps: "30 sec", rest: 20, auto: 30,
      tip: "Mains sous les épaules, ramène les genoux sans laisser les hanches monter.",
      benefit: "Fait monter le rythme tout en gardant le centre du corps actif.",
      muscles: ["Cardio", "Core"],
    },
    {
      name: "Dead bug", sets: 2, reps: "10 par côté", rest: 20,
      tip: "Garde le bas du dos au sol pendant que bras et jambe opposés s’éloignent.",
      benefit: "Apprend à stabiliser le tronc sans tension inutile dans le dos.",
      muscles: ["Core"],
    },
  ],

  "reprise-douce": [
    {
      name: "Cat-cow", sets: 2, reps: "8 respirations", rest: 15,
      tip: "Fais suivre le mouvement de la colonne par la respiration, sans chercher une grande amplitude.",
      benefit: "Remet doucement la colonne et les épaules en mouvement.",
      muscles: ["Dos", "Mobilité"],
    },
    {
      name: "Squat", sets: 3, reps: "10 reps", rest: 45,
      tip: "Descends tranquillement, marque une courte pause, puis remonte en poussant le sol.",
      benefit: "Reconstruit les bases du bas du corps à un rythme maîtrisé.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Pont fessier", sets: 3, reps: "12 reps", rest: 40,
      tip: "Pieds près des fesses, monte le bassin sans cambrer et serre les fessiers en haut.",
      benefit: "Réactive la chaîne postérieure avec très peu d’impact.",
      muscles: ["Fessiers", "Ischio-jambiers"],
    },
    {
      name: "Bird dog", sets: 3, reps: "8 par côté", rest: 40,
      tip: "Allonge le bras et la jambe opposée sans tourner le bassin.",
      benefit: "Travaille l’équilibre et la stabilité du dos en douceur.",
      muscles: ["Core", "Dos"],
    },
    {
      name: "Pompes", sets: 3, reps: "8 reps", rest: 45,
      tip: "Choisis les genoux ou les pieds selon ton énergie du jour, avec le corps bien aligné.",
      benefit: "Réinstalle progressivement la force de poussée du haut du corps.",
      muscles: ["Pectoraux", "Triceps"],
    },
    {
      name: "Dead bug", sets: 2, reps: "8 par côté", rest: 30,
      tip: "Expire quand tu tends les membres et conserve le bas du dos en contact avec le sol.",
      benefit: "Renforce le centre du corps avec un mouvement contrôlé.",
      muscles: ["Core"],
    },
    {
      name: "Posture de l'enfant", sets: 1, reps: "60 sec", rest: 0, auto: 60,
      tip: "Laisse le buste se déposer et allonge progressivement l’expiration.",
      benefit: "Termine la séance dans une position calme et relâchée.",
      muscles: ["Dos", "Hanches"],
    },
  ],

  "appartement-silencieux": [
    {
      name: "Chaise au mur", sets: 3, reps: "30 sec", rest: 30, auto: 30,
      tip: "Dos au mur, pieds légèrement avancés. Choisis l’angle que tu peux tenir proprement.",
      benefit: "Met les cuisses sous tension sans saut ni bruit.",
      muscles: ["Quadriceps"],
    },
    {
      name: "Pike push-ups", sets: 3, reps: "8 reps", rest: 45,
      tip: "Hanches hautes, tête dirigée entre les mains. Réduis l’amplitude si nécessaire.",
      benefit: "Renforce les épaules au poids du corps, sans impact.",
      muscles: ["Épaules", "Triceps"],
    },
    {
      name: "Fentes", sets: 3, reps: "10 par jambe", rest: 45,
      tip: "Pose les pieds avec contrôle et garde le bassin face à l’avant.",
      benefit: "Travaille les jambes et l’équilibre sans choc au sol.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Donkey kick", sets: 3, reps: "12 par côté", rest: 30,
      tip: "À quatre pattes, pousse le talon vers le plafond sans creuser le dos.",
      benefit: "Cible les fessiers avec un mouvement silencieux et stable.",
      muscles: ["Fessiers"],
    },
    {
      name: "Hollow hold", sets: 3, reps: "25 sec", rest: 30, auto: 25,
      tip: "Plaque le bas du dos au sol. Plie les genoux si la position se dégrade.",
      benefit: "Renforce le gainage antérieur sans déplacement ni impact.",
      muscles: ["Abdominaux", "Core"],
    },
  ],

  "jambes-poids-corps": [
    {
      name: "Squat", sets: 4, reps: "15 reps", rest: 45,
      tip: "Garde les genoux dans l’axe des pieds et remonte en poussant dans tout le pied.",
      benefit: "Installe le volume principal de la séance sur les cuisses et les fessiers.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Fentes", sets: 3, reps: "12 par jambe", rest: 45,
      tip: "Reste grand dans le buste et contrôle la descente avant de repousser.",
      benefit: "Renforce chaque jambe et révèle les différences gauche-droite.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Pont fessier", sets: 4, reps: "15 reps", rest: 40,
      tip: "Monte le bassin jusqu’à aligner épaules, hanches et genoux, sans forcer le bas du dos.",
      benefit: "Ajoute un travail ciblé de la chaîne postérieure.",
      muscles: ["Fessiers", "Ischio-jambiers"],
    },
    {
      name: "Donkey kick", sets: 3, reps: "15 par côté", rest: 35,
      tip: "Garde le ventre engagé et évite de tourner la hanche en montant la jambe.",
      benefit: "Prolonge le travail des fessiers sans charge externe.",
      muscles: ["Fessiers"],
    },
    {
      name: "Chaise au mur", sets: 3, reps: "45 sec", rest: 30, auto: 45,
      tip: "Reste en appui régulier contre le mur et respire pendant toute la tenue.",
      benefit: "Développe l’endurance des cuisses avec une tension continue.",
      muscles: ["Quadriceps"],
    },
    {
      name: "Mollets", sets: 4, reps: "20 reps", rest: 30,
      tip: "Monte haut sur la pointe des pieds et redescends lentement jusqu’au sol.",
      benefit: "Complète la séance en renforçant chevilles et mollets.",
      muscles: ["Mollets"],
    },
  ],

  "haut-corps-sol": [
    {
      name: "Pompes", sets: 4, reps: "10 reps", rest: 60,
      tip: "Garde le corps en bloc et adapte la variante avant que la technique ne se dégrade.",
      benefit: "Construit la base de poussée pour les pectoraux et les triceps.",
      muscles: ["Pectoraux", "Triceps"],
    },
    {
      name: "Pike push-ups", sets: 3, reps: "8 reps", rest: 60,
      tip: "Pousse le sol loin de toi et dirige le sommet du crâne entre les mains.",
      benefit: "Déplace l’effort vers les épaules sans utiliser de charge.",
      muscles: ["Épaules", "Triceps"],
    },
    {
      name: "Pompes diamant", sets: 3, reps: "8 reps", rest: 60,
      tip: "Rapproche les mains sans forcer les poignets et garde les coudes près du corps.",
      benefit: "Accentue le travail des triceps et de la poussée serrée.",
      muscles: ["Triceps", "Pectoraux"],
    },
    {
      name: "Bear crawl", sets: 3, reps: "30 sec", rest: 45, auto: 30,
      tip: "Genoux proches du sol, avance lentement sans balancer les hanches.",
      benefit: "Fait travailler épaules et tronc dans un mouvement coordonné.",
      muscles: ["Épaules", "Core"],
    },
    {
      name: "Bird dog", sets: 3, reps: "10 par côté", rest: 45,
      tip: "Cherche la longueur du bras au talon plutôt que la hauteur.",
      benefit: "Équilibre la poussée avec un travail de stabilité du dos.",
      muscles: ["Dos", "Core"],
    },
    {
      name: "Superman", sets: 3, reps: "12 reps", rest: 45,
      tip: "Décolle légèrement bras et jambes, puis redescends sans élan.",
      benefit: "Renforce l’arrière du tronc et complète le travail au sol.",
      muscles: ["Dos", "Lombaires"],
    },
  ],

  "fullbody-inter": [
    {
      name: "Squats sautés", sets: 4, reps: "12 reps", rest: 60,
      tip: "Saute avec intention, puis amortis silencieusement avant la répétition suivante.",
      benefit: "Ouvre la séance avec un travail de puissance des jambes.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Pompes", sets: 4, reps: "12 reps", rest: 60,
      tip: "Conserve la même ligne du corps du début à la fin de chaque série.",
      benefit: "Apporte un volume solide au haut du corps.",
      muscles: ["Pectoraux", "Triceps"],
    },
    {
      name: "Fentes", sets: 3, reps: "12 par jambe", rest: 60,
      tip: "Contrôle chaque appui même quand le souffle accélère.",
      benefit: "Ajoute un travail unilatéral exigeant pour les jambes.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Mountain climbers", sets: 4, reps: "30 sec", rest: 30, auto: 30,
      tip: "Accélère seulement tant que les épaules restent au-dessus des mains.",
      benefit: "Relance le cardio tout en sollicitant le gainage.",
      muscles: ["Cardio", "Core"],
    },
    {
      name: "Pont fessier", sets: 3, reps: "15 reps", rest: 45,
      tip: "Marque une seconde en haut pour éviter de traverser le mouvement trop vite.",
      benefit: "Redonne du travail à la chaîne postérieure après les mouvements dynamiques.",
      muscles: ["Fessiers", "Ischio-jambiers"],
    },
    {
      name: "Gainage dynamique", sets: 3, reps: "30 sec", rest: 45, auto: 30,
      tip: "Bouge lentement entre les appuis et limite la rotation du bassin.",
      benefit: "Renforce le tronc pendant un changement d’appui.",
      muscles: ["Core", "Épaules"],
    },
    {
      name: "V-ups", sets: 3, reps: "12 reps", rest: 45,
      tip: "Monte bras et jambes ensemble sans lancer le mouvement avec la nuque.",
      benefit: "Termine par un travail dynamique de toute la sangle abdominale.",
      muscles: ["Abdominaux"],
    },
  ],

  "puissance-sans-materiel": [
    {
      name: "Sprint sur place", sets: 4, reps: "30 sec", rest: 30, auto: 30,
      tip: "Reste léger sur l’avant du pied et utilise les bras pour donner le rythme.",
      benefit: "Monte rapidement en intensité sans demander d’espace.",
      muscles: ["Cardio", "Jambes"],
    },
    {
      name: "Fentes sautées", sets: 3, reps: "10 par jambe", rest: 60,
      tip: "Change de jambe en l’air et amortis avant de repartir. Remplace par des fentes si besoin.",
      benefit: "Développe la puissance unilatérale et la coordination.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Pompes explosives", sets: 3, reps: "6 reps", rest: 75,
      tip: "Pousse vite mais réceptionne les mains avec les coudes souples. Garde les pompes classiques en option.",
      benefit: "Travaille la vitesse de poussée du haut du corps.",
      muscles: ["Pectoraux", "Triceps"],
    },
    {
      name: "Skaters", sets: 4, reps: "30 sec", rest: 30, auto: 30,
      tip: "Saute latéralement et stabilise brièvement l’appui avant de repartir.",
      benefit: "Ajoute de la puissance latérale et un travail de stabilité.",
      muscles: ["Fessiers", "Cardio"],
    },
    {
      name: "Burpees", sets: 3, reps: "8 reps", rest: 60,
      tip: "Garde un rythme que tu peux tenir proprement ; le saut final peut rester bas.",
      benefit: "Réunit jambes, poussée et cardio pour conclure la séance.",
      muscles: ["Corps entier", "Cardio"],
    },
  ],
};
