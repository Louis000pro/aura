import type { Exercise } from "@/components/WorkoutGuideModal";

/* ════════════════════════════════════════════════════════════════════
   Vague 3 du catalogue — Mobilité & posture.

   Tous les mouvements utilisent les planches de mobilité déjà validées.
   Les séances se distinguent par leur intention : écrans, hanches,
   épaules, squat, colonne, routine complète et préparation active.
   ════════════════════════════════════════════════════════════════════ */

export const WAVE_3_EXERCISES: Record<string, Exercise[]> = {
  "posture-ecran": [
    {
      name: "Cat-cow", sets: 2, reps: "8 respirations", rest: 15,
      tip: "Fais suivre chaque mouvement de la colonne par une respiration lente.",
      benefit: "Remet doucement la colonne en mouvement après une position fixe.",
      muscles: ["Dos", "Mobilité"],
    },
    {
      name: "Thread the needle", sets: 2, reps: "8 par côté", rest: 15,
      tip: "Glisse l’épaule sous le buste puis ouvre le bras sans déplacer les hanches.",
      benefit: "Mobilise le haut du dos en rotation.",
      muscles: ["Haut du dos", "Épaules"],
    },
    {
      name: "Étirement pectoraux au mur", sets: 2, reps: "30 sec par côté", rest: 10, auto: 30,
      tip: "Tourne le buste doucement jusqu’à sentir l’avant de la poitrine s’ouvrir.",
      benefit: "Relâche l’avant des épaules souvent refermé devant un écran.",
      muscles: ["Pectoraux", "Épaules"],
    },
    {
      name: "Ouverture des épaules", sets: 2, reps: "30 sec", rest: 10, auto: 30,
      tip: "Garde les côtes basses et laisse les épaules s’ouvrir sans forcer.",
      benefit: "Redonne de l’amplitude aux épaules et à la poitrine.",
      muscles: ["Épaules", "Pectoraux"],
    },
    {
      name: "Étirement du cou", sets: 2, reps: "20 sec par côté", rest: 10, auto: 20,
      tip: "Incline la tête avec très peu de pression et garde l’épaule opposée basse.",
      benefit: "Invite la nuque et les trapèzes à se relâcher.",
      muscles: ["Nuque", "Trapèzes"],
    },
    {
      name: "Posture de l'enfant", sets: 1, reps: "60 sec", rest: 0, auto: 60,
      tip: "Laisse le buste se déposer et allonge progressivement l’expiration.",
      benefit: "Termine en relâchant le dos et les épaules.",
      muscles: ["Dos", "Épaules"],
    },
  ],

  "hanches-libres": [
    {
      name: "Cercles de hanches", sets: 2, reps: "10 par sens", rest: 15,
      tip: "Dessine un cercle ample sans bouger les épaules.",
      benefit: "Explore l’amplitude de la hanche dans plusieurs directions.",
      muscles: ["Hanches"],
    },
    {
      name: "World's greatest stretch", sets: 2, reps: "6 par côté", rest: 20,
      tip: "Installe la fente, puis ouvre le bras en suivant la main du regard.",
      benefit: "Réunit hanches, colonne et arrière des jambes dans un même mouvement.",
      muscles: ["Hanches", "Dos", "Ischio-jambiers"],
    },
    {
      name: "Pigeon", sets: 2, reps: "45 sec par côté", rest: 15, auto: 45,
      tip: "Place un support sous la fesse si le bassin ne reste pas stable.",
      benefit: "Travaille la rotation externe et l’ouverture des fessiers.",
      muscles: ["Hanches", "Fessiers"],
    },
    {
      name: "Papillon hanches", sets: 2, reps: "45 sec", rest: 15, auto: 45,
      tip: "Garde le dos long et laisse les genoux descendre par leur propre poids.",
      benefit: "Ouvre progressivement les adducteurs et l’intérieur des hanches.",
      muscles: ["Hanches", "Adducteurs"],
    },
    {
      name: "Étirement chaîne postérieure", sets: 2, reps: "40 sec", rest: 15, auto: 40,
      tip: "Avance le bassin avec le dos long, sans chercher à toucher les pieds.",
      benefit: "Redonne de la longueur à l’arrière des jambes.",
      muscles: ["Ischio-jambiers", "Dos"],
    },
    {
      name: "Torsion allongée", sets: 2, reps: "30 sec par côté", rest: 10, auto: 30,
      tip: "Garde les épaules au sol et laisse le genou descendre sans le pousser.",
      benefit: "Clôture la routine avec une rotation douce du bassin et du dos.",
      muscles: ["Dos", "Hanches"],
    },
  ],

  "epaules-haut-dos-mobilite": [
    {
      name: "Cat-cow", sets: 2, reps: "10 respirations", rest: 15,
      tip: "Laisse la tête suivre la colonne au lieu de créer le mouvement avec la nuque.",
      benefit: "Prépare le dos à bouger dans toute la routine.",
      muscles: ["Dos", "Mobilité"],
    },
    {
      name: "Thread the needle", sets: 3, reps: "8 par côté", rest: 20,
      tip: "Tourne depuis le haut du dos et garde les hanches au-dessus des genoux.",
      benefit: "Travaille la rotation thoracique et l’arrière de l’épaule.",
      muscles: ["Haut du dos", "Épaules"],
    },
    {
      name: "Downward dog / cobra", sets: 2, reps: "8 transitions", rest: 20,
      tip: "Passe d’une position à l’autre lentement, sans écraser le bas du dos.",
      benefit: "Fait alterner ouverture de la poitrine et allongement du dos.",
      muscles: ["Dos", "Pectoraux", "Épaules"],
    },
    {
      name: "Étirement pectoraux au mur", sets: 2, reps: "35 sec par côté", rest: 10, auto: 35,
      tip: "Reste loin de la douleur et garde l’épaule basse.",
      benefit: "Ouvre l’avant du haut du corps.",
      muscles: ["Pectoraux", "Épaules"],
    },
    {
      name: "Ouverture des épaules", sets: 2, reps: "40 sec", rest: 10, auto: 40,
      tip: "Allonge les bras sans faire ressortir les côtes.",
      benefit: "Améliore l’aisance des bras au-dessus de la tête.",
      muscles: ["Épaules", "Pectoraux"],
    },
    {
      name: "Posture de l'enfant", sets: 1, reps: "75 sec", rest: 0, auto: 75,
      tip: "Éloigne les mains et laisse les aisselles descendre vers le sol.",
      benefit: "Relâche le dos et les épaules après les ouvertures.",
      muscles: ["Dos", "Épaules"],
    },
  ],

  "chevilles-squat": [
    {
      name: "Étirement mollet au mur", sets: 3, reps: "35 sec par côté", rest: 10, auto: 35,
      tip: "Garde le talon arrière au sol et dirige doucement le genou vers le mur.",
      benefit: "Travaille l’amplitude de cheville utile à la descente du squat.",
      muscles: ["Mollets", "Chevilles"],
    },
    {
      name: "Cercles de hanches", sets: 2, reps: "10 par sens", rest: 15,
      tip: "Garde les pieds stables pendant que le bassin dessine le cercle.",
      benefit: "Prépare les hanches à accompagner le mouvement de squat.",
      muscles: ["Hanches"],
    },
    {
      name: "World's greatest stretch", sets: 2, reps: "6 par côté", rest: 20,
      tip: "Avance le genou sans lever le talon puis ouvre le haut du dos.",
      benefit: "Relie mobilité de cheville, de hanche et rotation thoracique.",
      muscles: ["Hanches", "Chevilles", "Dos"],
    },
    {
      name: "Étirement quadriceps", sets: 2, reps: "30 sec par jambe", rest: 10, auto: 30,
      tip: "Rentre légèrement le bassin et garde les genoux proches.",
      benefit: "Libère l’avant de la cuisse et de la hanche.",
      muscles: ["Quadriceps", "Hanches"],
    },
    {
      name: "Étirement chaîne postérieure", sets: 2, reps: "40 sec", rest: 10, auto: 40,
      tip: "Garde une légère flexion des genoux si cela aide à conserver le dos long.",
      benefit: "Complète la préparation par l’arrière des jambes.",
      muscles: ["Ischio-jambiers", "Dos"],
    },
  ],

  "colonne-mobile": [
    {
      name: "Cat-cow", sets: 3, reps: "8 respirations", rest: 15,
      tip: "Déroule la colonne progressivement, vertèbre après vertèbre.",
      benefit: "Explore la flexion et l’extension du dos en douceur.",
      muscles: ["Colonne vertébrale"],
    },
    {
      name: "Thread the needle", sets: 2, reps: "8 par côté", rest: 20,
      tip: "Garde le bassin calme pour concentrer la rotation dans le haut du dos.",
      benefit: "Ajoute une rotation thoracique contrôlée.",
      muscles: ["Haut du dos", "Épaules"],
    },
    {
      name: "Downward dog / cobra", sets: 2, reps: "8 transitions", rest: 20,
      tip: "Passe lentement entre les deux positions et respire à chaque transition.",
      benefit: "Fait alterner allongement et ouverture de toute la colonne.",
      muscles: ["Dos", "Épaules"],
    },
    {
      name: "Torsion allongée", sets: 2, reps: "40 sec par côté", rest: 10, auto: 40,
      tip: "Laisse le poids de la jambe guider la rotation sans forcer.",
      benefit: "Propose une rotation au sol avec les épaules soutenues.",
      muscles: ["Colonne vertébrale", "Fessiers"],
    },
    {
      name: "Posture de l'enfant", sets: 1, reps: "75 sec", rest: 0, auto: 75,
      tip: "Cherche de la longueur entre le bassin et les mains.",
      benefit: "Laisse le dos se déposer après les mouvements.",
      muscles: ["Dos", "Hanches"],
    },
    {
      name: "Cohérence cardiaque", sets: 1, reps: "2 min", rest: 0, auto: 120,
      tip: "Inspire cinq secondes puis expire cinq secondes, sans remplir les poumons de force.",
      benefit: "Termine la séance avec un rythme respiratoire régulier.",
      muscles: ["Respiration"],
    },
  ],

  "mobilite-complete": [
    {
      name: "Cercles de hanches", sets: 2, reps: "10 par sens", rest: 15,
      tip: "Dessine le cercle le plus fluide possible sans bouger les épaules.",
      benefit: "Ouvre la routine par une exploration globale des hanches.",
      muscles: ["Hanches"],
    },
    {
      name: "Cat-cow", sets: 2, reps: "10 respirations", rest: 15,
      tip: "Associe une respiration entière à chaque position.",
      benefit: "Mobilise la colonne avant les mouvements plus amples.",
      muscles: ["Dos", "Mobilité"],
    },
    {
      name: "World's greatest stretch", sets: 2, reps: "6 par côté", rest: 20,
      tip: "Prends le temps de stabiliser la fente avant d’ouvrir le bras.",
      benefit: "Relie les principales zones de mobilité du corps.",
      muscles: ["Hanches", "Dos", "Ischio-jambiers"],
    },
    {
      name: "Downward dog / cobra", sets: 2, reps: "8 transitions", rest: 20,
      tip: "Reste fluide et réduis l’amplitude si le bas du dos se crispe.",
      benefit: "Fait travailler l’avant et l’arrière du corps en alternance.",
      muscles: ["Dos", "Épaules", "Pectoraux"],
    },
    {
      name: "Pigeon", sets: 2, reps: "45 sec par côté", rest: 15, auto: 45,
      tip: "Garde le bassin soutenu et choisis une position où tu peux respirer.",
      benefit: "Approfondit le travail des hanches et des fessiers.",
      muscles: ["Hanches", "Fessiers"],
    },
    {
      name: "Étirement chaîne postérieure", sets: 2, reps: "40 sec", rest: 15, auto: 40,
      tip: "Avance depuis les hanches plutôt que d’arrondir le dos.",
      benefit: "Travaille l’arrière des jambes et du bassin.",
      muscles: ["Ischio-jambiers", "Dos"],
    },
    {
      name: "Étirement pectoraux au mur", sets: 2, reps: "30 sec par côté", rest: 10, auto: 30,
      tip: "Tourne doucement jusqu’à une tension confortable.",
      benefit: "Ajoute une ouverture ciblée de la poitrine.",
      muscles: ["Pectoraux", "Épaules"],
    },
    {
      name: "Ouverture des épaules", sets: 2, reps: "35 sec", rest: 10, auto: 35,
      tip: "Garde le ventre légèrement engagé pendant l’ouverture.",
      benefit: "Redonne de l’aisance aux mouvements des bras.",
      muscles: ["Épaules", "Pectoraux"],
    },
    {
      name: "Torsion allongée", sets: 2, reps: "35 sec par côté", rest: 10, auto: 35,
      tip: "Laisse les épaules lourdes au sol et respire dans la rotation.",
      benefit: "Relâche le bassin et le dos avant la fin de séance.",
      muscles: ["Dos", "Hanches"],
    },
    {
      name: "Posture de l'enfant", sets: 1, reps: "90 sec", rest: 0, auto: 90,
      tip: "Installe-toi confortablement et laisse chaque expiration ralentir.",
      benefit: "Clôture la routine complète dans une position calme.",
      muscles: ["Dos", "Hanches"],
    },
  ],

  "mobilite-active": [
    {
      name: "Cercles de hanches", sets: 2, reps: "10 par sens", rest: 10,
      tip: "Reste dynamique et cherche surtout la fluidité.",
      benefit: "Réveille les hanches avant de bouger davantage.",
      muscles: ["Hanches"],
    },
    {
      name: "Cat-cow", sets: 2, reps: "8 respirations", rest: 10,
      tip: "Garde un rythme continu guidé par la respiration.",
      benefit: "Met la colonne en mouvement sans fatigue.",
      muscles: ["Dos", "Mobilité"],
    },
    {
      name: "World's greatest stretch", sets: 2, reps: "6 par côté", rest: 15,
      tip: "Enchaîne la fente et la rotation sans rester longtemps en position.",
      benefit: "Prépare simultanément hanches, jambes et haut du dos.",
      muscles: ["Hanches", "Dos", "Ischio-jambiers"],
    },
    {
      name: "Downward dog / cobra", sets: 2, reps: "8 transitions", rest: 15,
      tip: "Utilise une amplitude confortable et conserve un mouvement continu.",
      benefit: "Active les épaules et toute la chaîne postérieure.",
      muscles: ["Dos", "Épaules"],
    },
    {
      name: "Thread the needle", sets: 2, reps: "8 par côté", rest: 15,
      tip: "Tourne depuis le haut du dos sans déplacer le bassin.",
      benefit: "Prépare la rotation thoracique et les épaules.",
      muscles: ["Haut du dos", "Épaules"],
    },
    {
      name: "Ouverture des épaules", sets: 2, reps: "10 reps", rest: 15,
      tip: "Passe dans l’ouverture sans bloquer la respiration.",
      benefit: "Prépare les bras aux mouvements au-dessus de la tête.",
      muscles: ["Épaules", "Pectoraux"],
    },
    {
      name: "Étirement mollet au mur", sets: 2, reps: "25 sec par côté", rest: 10, auto: 25,
      tip: "Avance légèrement le genou tout en gardant le talon posé.",
      benefit: "Prépare les chevilles aux appuis et aux flexions.",
      muscles: ["Mollets", "Chevilles"],
    },
  ],
};
