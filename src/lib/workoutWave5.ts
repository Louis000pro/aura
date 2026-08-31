import type { Exercise } from "@/components/WorkoutGuideModal";

/* ═══════════════════════════════════════════════════════════════════
   Vague 5 du catalogue — Récupération.

   Huit nouveaux tunnels complètent la séance « Récupération active » :
   deux portes d’entrée gratuites, puis six usages Premium spécialisés.
   Les formulations restent honnêtes — relâcher, retrouver de l’aisance,
   faire redescendre le rythme — sans promesse médicale.
   ═══════════════════════════════════════════════════════════════════ */

export const WAVE_5_EXERCISES: Record<string, Exercise[]> = {
  "retour-au-calme": [
    {
      name: "Cohérence cardiaque", sets: 1, reps: "2 min", rest: 0, auto: 120,
      tip: "Inspire cinq secondes puis expire cinq secondes, sans chercher à remplir les poumons de force.",
      benefit: "Crée une transition nette entre l’effort et le retour au calme.",
      muscles: ["Respiration"],
    },
    {
      name: "Cat-cow", sets: 2, reps: "8 respirations", rest: 10,
      tip: "Fais suivre chaque mouvement de la colonne par une respiration entière.",
      benefit: "Remet doucement le dos en mouvement après la séance.",
      muscles: ["Dos", "Mobilité"],
    },
    {
      name: "Étirement chaîne postérieure", sets: 2, reps: "35 sec", rest: 10, auto: 35,
      tip: "Avance depuis les hanches et arrête-toi à une tension confortable.",
      benefit: "Laisse l’arrière des jambes et le bas du dos retrouver de la longueur.",
      muscles: ["Ischio-jambiers", "Dos"],
    },
    {
      name: "Étirement quadriceps", sets: 2, reps: "30 sec par jambe", rest: 10, auto: 30,
      tip: "Garde les genoux proches et le bassin légèrement rentré.",
      benefit: "Relâche l’avant des cuisses après les mouvements de jambes.",
      muscles: ["Quadriceps"],
    },
    {
      name: "Posture de l'enfant", sets: 1, reps: "75 sec", rest: 0, auto: 75,
      tip: "Pose le front et laisse chaque expiration détendre les épaules.",
      benefit: "Termine dans une position stable et calme.",
      muscles: ["Dos", "Hanches"],
    },
  ],

  "pause-detente": [
    {
      name: "Étirement du cou", sets: 2, reps: "25 sec par côté", rest: 8, auto: 25,
      tip: "Incline doucement la tête sans tirer avec la main.",
      benefit: "Redonne du mouvement à la nuque après une position fixe.",
      muscles: ["Nuque"],
    },
    {
      name: "Ouverture des épaules", sets: 2, reps: "30 sec", rest: 8, auto: 30,
      tip: "Garde les côtes basses et cherche une ouverture progressive.",
      benefit: "Déplie le haut du corps sans demander d’effort intense.",
      muscles: ["Épaules", "Pectoraux"],
    },
    {
      name: "Thread the needle", sets: 2, reps: "6 par côté", rest: 10,
      tip: "Tourne depuis le haut du dos tout en gardant le bassin stable.",
      benefit: "Mobilise la zone entre les omoplates avec un mouvement lent.",
      muscles: ["Haut du dos", "Épaules"],
    },
    {
      name: "Torsion allongée", sets: 2, reps: "35 sec par côté", rest: 8, auto: 35,
      tip: "Laisse les épaules lourdes au sol pendant la rotation.",
      benefit: "Invite le bassin et la colonne à se relâcher.",
      muscles: ["Dos", "Hanches"],
    },
    {
      name: "Cohérence cardiaque", sets: 1, reps: "2 min", rest: 0, auto: 120,
      tip: "Choisis une respiration silencieuse et régulière.",
      benefit: "Referme la pause avec un rythme plus posé.",
      muscles: ["Respiration"],
    },
  ],

  "recup-jambes": [
    {
      name: "Cercles de hanches", sets: 2, reps: "10 par sens", rest: 10,
      tip: "Dessine des cercles fluides sans déplacer les épaules.",
      benefit: "Commence par redonner de la mobilité au bassin.",
      muscles: ["Hanches"],
    },
    {
      name: "Étirement quadriceps", sets: 2, reps: "40 sec par jambe", rest: 10, auto: 40,
      tip: "Reste grand dans le buste et garde les genoux alignés.",
      benefit: "Cible l’avant des cuisses après une séance de jambes.",
      muscles: ["Quadriceps"],
    },
    {
      name: "Étirement chaîne postérieure", sets: 2, reps: "45 sec", rest: 10, auto: 45,
      tip: "Incline le bassin avant de chercher à rapprocher le buste des jambes.",
      benefit: "Travaille doucement l’arrière des cuisses.",
      muscles: ["Ischio-jambiers", "Dos"],
    },
    {
      name: "Étirement mollet au mur", sets: 2, reps: "35 sec par côté", rest: 10, auto: 35,
      tip: "Garde le talon posé et avance le bassin sans écraser l’appui.",
      benefit: "Redonne de l’aisance aux mollets et aux chevilles.",
      muscles: ["Mollets", "Chevilles"],
    },
    {
      name: "Papillon hanches", sets: 2, reps: "45 sec", rest: 10, auto: 45,
      tip: "Laisse les genoux descendre par leur propre poids.",
      benefit: "Ajoute une ouverture douce de l’intérieur des cuisses.",
      muscles: ["Hanches", "Adducteurs"],
    },
    {
      name: "Pigeon", sets: 2, reps: "40 sec par côté", rest: 10, auto: 40,
      tip: "Soutiens le bassin si nécessaire et conserve une respiration facile.",
      benefit: "Propose un relâchement plus ciblé des hanches et des fessiers.",
      muscles: ["Hanches", "Fessiers"],
    },
    {
      name: "Posture de l'enfant", sets: 1, reps: "75 sec", rest: 0, auto: 75,
      tip: "Laisse le bassin reculer et les épaules se déposer.",
      benefit: "Termine la récupération des jambes dans une position calme.",
      muscles: ["Dos", "Hanches"],
    },
  ],

  "recup-haut-corps": [
    {
      name: "Étirement du cou", sets: 2, reps: "30 sec par côté", rest: 8, auto: 30,
      tip: "Garde l’épaule opposée basse pendant l’inclinaison.",
      benefit: "Commence par relâcher la zone entre la nuque et les épaules.",
      muscles: ["Nuque", "Épaules"],
    },
    {
      name: "Cat-cow", sets: 2, reps: "8 respirations", rest: 10,
      tip: "Bouge lentement et laisse la respiration dicter le rythme.",
      benefit: "Remet toute la colonne en mouvement sans charge.",
      muscles: ["Dos", "Mobilité"],
    },
    {
      name: "Thread the needle", sets: 2, reps: "8 par côté", rest: 10,
      tip: "Fais glisser le bras loin sous le buste sans déplacer les hanches.",
      benefit: "Travaille la rotation du haut du dos et l’arrière de l’épaule.",
      muscles: ["Haut du dos", "Épaules"],
    },
    {
      name: "Étirement pectoraux au mur", sets: 2, reps: "35 sec par côté", rest: 10, auto: 35,
      tip: "Tourne le buste jusqu’à sentir une ouverture douce de la poitrine.",
      benefit: "Ouvre l’avant du haut du corps après les mouvements de poussée.",
      muscles: ["Pectoraux", "Épaules"],
    },
    {
      name: "Ouverture des épaules", sets: 2, reps: "35 sec", rest: 10, auto: 35,
      tip: "Garde le ventre légèrement engagé pendant l’ouverture.",
      benefit: "Redonne de l’amplitude aux bras au-dessus de la tête.",
      muscles: ["Épaules", "Pectoraux"],
    },
    {
      name: "Torsion allongée", sets: 2, reps: "35 sec par côté", rest: 10, auto: 35,
      tip: "Garde les deux épaules au sol et respire dans la rotation.",
      benefit: "Relie le relâchement du haut du corps à celui de la colonne.",
      muscles: ["Dos", "Hanches"],
    },
    {
      name: "Cohérence cardiaque", sets: 1, reps: "2 min", rest: 0, auto: 120,
      tip: "Allonge l’expiration sans forcer l’inspiration.",
      benefit: "Clôture la séance avec une respiration régulière.",
      muscles: ["Respiration"],
    },
  ],

  "dos-relache": [
    {
      name: "Cat-cow", sets: 2, reps: "10 respirations", rest: 10,
      tip: "Explore une amplitude facile plutôt que de forcer les extrêmes.",
      benefit: "Fait alterner flexion et extension de la colonne.",
      muscles: ["Dos", "Mobilité"],
    },
    {
      name: "Thread the needle", sets: 2, reps: "8 par côté", rest: 10,
      tip: "Tourne depuis le haut du dos et garde le bassin au-dessus des genoux.",
      benefit: "Ajoute une rotation ciblée entre les omoplates.",
      muscles: ["Haut du dos", "Épaules"],
    },
    {
      name: "Downward dog / cobra", sets: 2, reps: "8 transitions", rest: 12,
      tip: "Passe d’une position à l’autre avec une amplitude confortable.",
      benefit: "Fait alterner allongement de l’arrière du corps et ouverture de l’avant.",
      muscles: ["Dos", "Épaules", "Pectoraux"],
    },
    {
      name: "Étirement chaîne postérieure", sets: 2, reps: "40 sec", rest: 10, auto: 40,
      tip: "Garde le dos long et avance depuis les hanches.",
      benefit: "Travaille la continuité entre l’arrière des jambes et le dos.",
      muscles: ["Ischio-jambiers", "Dos"],
    },
    {
      name: "Torsion allongée", sets: 2, reps: "45 sec par côté", rest: 10, auto: 45,
      tip: "Laisse le poids de la jambe guider doucement la rotation.",
      benefit: "Propose un temps de relâchement au sol pour la colonne.",
      muscles: ["Dos", "Hanches"],
    },
    {
      name: "Posture de l'enfant", sets: 1, reps: "90 sec", rest: 0, auto: 90,
      tip: "Trouve une position où le front et les bras peuvent vraiment se poser.",
      benefit: "Termine avec le dos soutenu et sans effort.",
      muscles: ["Dos", "Hanches"],
    },
  ],

  "soir-calme": [
    {
      name: "Étirement du cou", sets: 2, reps: "25 sec par côté", rest: 8, auto: 25,
      tip: "Relâche la mâchoire et garde la respiration fluide.",
      benefit: "Ouvre la routine par un mouvement très doux de la nuque.",
      muscles: ["Nuque"],
    },
    {
      name: "Papillon hanches", sets: 2, reps: "45 sec", rest: 10, auto: 45,
      tip: "Assieds-toi sur un support si cela aide le dos à rester confortable.",
      benefit: "Installe une position calme et relâchée pour les hanches.",
      muscles: ["Hanches", "Adducteurs"],
    },
    {
      name: "Pigeon", sets: 2, reps: "40 sec par côté", rest: 10, auto: 40,
      tip: "Choisis la variante où tu peux garder le visage et les épaules détendus.",
      benefit: "Prolonge le relâchement du bassin sans chercher une amplitude maximale.",
      muscles: ["Hanches", "Fessiers"],
    },
    {
      name: "Torsion allongée", sets: 2, reps: "45 sec par côté", rest: 10, auto: 45,
      tip: "Laisse les bras ouverts et le regard partir du côté opposé.",
      benefit: "Amène toute la séance au sol et ralentit les transitions.",
      muscles: ["Dos", "Hanches"],
    },
    {
      name: "Posture de l'enfant", sets: 1, reps: "90 sec", rest: 0, auto: 90,
      tip: "Laisse les épaules devenir lourdes à chaque expiration.",
      benefit: "Offre une dernière position stable avant la respiration.",
      muscles: ["Dos", "Hanches"],
    },
    {
      name: "Cohérence cardiaque", sets: 1, reps: "3 min", rest: 0, auto: 180,
      tip: "Reste sur un rythme simple de cinq secondes à l’inspiration et cinq à l’expiration.",
      benefit: "Termine la routine sans mouvement, avec un souffle régulier.",
      muscles: ["Respiration"],
    },
  ],

  "lendemain-seance": [
    {
      name: "Cercles de hanches", sets: 2, reps: "10 par sens", rest: 10,
      tip: "Commence petit puis agrandis le cercle si le mouvement reste fluide.",
      benefit: "Réveille le bassin sans entrer directement dans un étirement long.",
      muscles: ["Hanches"],
    },
    {
      name: "Cat-cow", sets: 2, reps: "8 respirations", rest: 10,
      tip: "Associe une respiration entière à chaque position.",
      benefit: "Remet la colonne en mouvement à faible intensité.",
      muscles: ["Dos", "Mobilité"],
    },
    {
      name: "World's greatest stretch", sets: 2, reps: "5 par côté", rest: 15,
      tip: "Stabilise la fente avant d’ajouter la rotation du buste.",
      benefit: "Relie hanches, jambes et haut du dos dans un seul mouvement.",
      muscles: ["Hanches", "Dos", "Ischio-jambiers"],
    },
    {
      name: "Downward dog / cobra", sets: 2, reps: "6 transitions", rest: 12,
      tip: "Garde le mouvement continu et réduis l’amplitude si nécessaire.",
      benefit: "Mobilise alternativement l’avant et l’arrière du corps.",
      muscles: ["Dos", "Épaules", "Pectoraux"],
    },
    {
      name: "Étirement quadriceps", sets: 2, reps: "30 sec par jambe", rest: 10, auto: 30,
      tip: "Reste droit et garde le genou dirigé vers le sol.",
      benefit: "Ajoute un temps calme pour l’avant des cuisses.",
      muscles: ["Quadriceps"],
    },
    {
      name: "Ouverture des épaules", sets: 2, reps: "30 sec", rest: 10, auto: 30,
      tip: "Cherche une ouverture douce sans pousser les côtes vers l’avant.",
      benefit: "Complète la routine par le haut du corps.",
      muscles: ["Épaules", "Pectoraux"],
    },
    {
      name: "Cohérence cardiaque", sets: 1, reps: "2 min", rest: 0, auto: 120,
      tip: "Laisse le souffle redevenir calme avant de terminer.",
      benefit: "Ferme la séance active avec une transition posée.",
      muscles: ["Respiration"],
    },
  ],

  "recup-complete": [
    {
      name: "Cohérence cardiaque", sets: 1, reps: "2 min", rest: 0, auto: 120,
      tip: "Commence par ralentir le souffle avant de chercher de l’amplitude.",
      benefit: "Installe un rythme calme pour toute la routine.",
      muscles: ["Respiration"],
    },
    {
      name: "Cat-cow", sets: 2, reps: "10 respirations", rest: 10,
      tip: "Laisse la respiration guider chaque mouvement de la colonne.",
      benefit: "Mobilise le dos progressivement.",
      muscles: ["Dos", "Mobilité"],
    },
    {
      name: "Cercles de hanches", sets: 2, reps: "10 par sens", rest: 10,
      tip: "Garde le haut du corps stable et cherche un cercle fluide.",
      benefit: "Prépare le bassin aux ouvertures plus longues.",
      muscles: ["Hanches"],
    },
    {
      name: "World's greatest stretch", sets: 2, reps: "6 par côté", rest: 15,
      tip: "Prends le temps de poser la fente avant de tourner le buste.",
      benefit: "Relie mobilité des hanches, des jambes et du haut du dos.",
      muscles: ["Hanches", "Dos", "Ischio-jambiers"],
    },
    {
      name: "Étirement chaîne postérieure", sets: 2, reps: "45 sec", rest: 10, auto: 45,
      tip: "Avance depuis le bassin avec le dos long.",
      benefit: "Travaille doucement toute la face arrière du corps.",
      muscles: ["Ischio-jambiers", "Dos"],
    },
    {
      name: "Étirement quadriceps", sets: 2, reps: "35 sec par jambe", rest: 10, auto: 35,
      tip: "Garde le bassin légèrement rentré et le genou sous la hanche.",
      benefit: "Équilibre la routine avec l’avant des cuisses.",
      muscles: ["Quadriceps"],
    },
    {
      name: "Étirement pectoraux au mur", sets: 2, reps: "35 sec par côté", rest: 10, auto: 35,
      tip: "Tourne lentement le buste sans pousser sur l’épaule.",
      benefit: "Ouvre la poitrine après les exercices de poussée ou les écrans.",
      muscles: ["Pectoraux", "Épaules"],
    },
    {
      name: "Thread the needle", sets: 2, reps: "8 par côté", rest: 10,
      tip: "Garde le bassin stable et tourne depuis le haut du dos.",
      benefit: "Ajoute une rotation contrôlée pour la colonne thoracique.",
      muscles: ["Haut du dos", "Épaules"],
    },
    {
      name: "Torsion allongée", sets: 2, reps: "45 sec par côté", rest: 10, auto: 45,
      tip: "Laisse les épaules posées et la jambe guider la rotation.",
      benefit: "Ramène la routine au sol dans une position soutenue.",
      muscles: ["Dos", "Hanches"],
    },
    {
      name: "Posture de l'enfant", sets: 1, reps: "2 min", rest: 0, auto: 120,
      tip: "Ajuste l’écartement des genoux pour trouver une position vraiment confortable.",
      benefit: "Clôture la récupération complète avec un temps long et calme.",
      muscles: ["Dos", "Hanches"],
    },
  ],
};
