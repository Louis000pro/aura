import type { Exercise } from "@/components/WorkoutGuideModal";

/* ════════════════════════════════════════════════════════════════════
   Vague 7 du catalogue : les séances par zone (lot 1 de la banque de
   séances, GO de Louis le 2026-10-27). Abdos, fessiers, jambes, pecs,
   dos, épaules et bras.

   ⚠️ CHAQUE NOM EST UN NOM DE LA BIBLIOTHÈQUE (exerciseLibrary.ts). Le
   lecteur ouvre la fiche d'un mouvement par son nom exact : une variante
   écrite à la main (« Pont fessier tenu ») aurait son personnage animé,
   mais plus de fiche. La variante se dit donc dans les répétitions et
   dans la consigne, jamais dans le nom.

   ⚠️ LE LECTEUR FAIT TOUTES LES SÉRIES D'UN EXERCICE AVANT LE SUIVANT.
   Les formats qui tournent (circuit, échelle, pyramide, EMOM, supersets)
   attendent le lot 2. Deux façons d'écrire ce qu'il sait faire :
   · une tenue « par côté » s'écrit en séries qui alternent (planche
     latérale 2 × 20 s par côté = 4 séries de 20 s, 10 s pour changer de
     côté) : le chrono ne compte qu'un côté à la fois ;
   · une tenue qui s'allonge s'écrit en lignes d'une série (gainage 20,
     30 puis 40 s).
   ════════════════════════════════════════════════════════════════════ */

const GAINAGE_MUSCLES = ["Core", "Abdominaux"];

export const WAVE_7_EXERCISES: Record<string, Exercise[]> = {
  /* ── Abdos & gainage ─────────────────────────────────────────────── */
  "gainage-bases": [
    {
      name: "Gainage", sets: 1, reps: "20 sec", rest: 30, auto: 20,
      tip: "Avant-bras sous les épaules, corps aligné des talons à la tête, fessiers serrés.",
      benefit: "Une première tenue courte pour placer le bassin avant d’allonger le temps.",
      muscles: GAINAGE_MUSCLES,
    },
    {
      name: "Gainage", sets: 1, reps: "30 sec", rest: 30, auto: 30,
      tip: "Même position, dix secondes de plus, avec un souffle lent et régulier.",
      benefit: "La tenue s’allonge sans que la position change.",
      muscles: GAINAGE_MUSCLES,
    },
    {
      name: "Gainage", sets: 1, reps: "40 sec", rest: 45, auto: 40,
      tip: "Si le bas du dos se creuse, pose les genoux au sol et termine la série.",
      benefit: "Quarante secondes bien tenues posent la base de tout le travail du tronc.",
      muscles: GAINAGE_MUSCLES,
    },
    {
      name: "Planche latérale", sets: 4, reps: "20 sec", rest: 10, auto: 20,
      tip: "Une série sur chaque côté en alternant, coude sous l’épaule et hanche haute.",
      benefit: "Renforce les côtés du tronc, que la planche de face travaille peu.",
      muscles: ["Obliques", "Core"],
    },
    {
      name: "Hollow hold", sets: 3, reps: "15 sec", rest: 30, auto: 15,
      tip: "Bas du dos collé au sol, genoux pliés si les jambes tendues tirent sur les lombaires.",
      benefit: "Apprend à garder la sangle serrée pendant que les bras et les jambes s’éloignent.",
      muscles: ["Abdominaux"],
    },
  ],

  "abdos-nuque": [
    {
      name: "Dead bug", sets: 3, reps: "10 par côté", rest: 30,
      tip: "Sur le dos, bras vers le plafond, tends un bras et la jambe opposée sans décoller le bas du dos.",
      benefit: "Fait travailler les abdominaux avec la tête posée au sol.",
      muscles: ["Abdominaux", "Core"],
    },
    {
      name: "Reverse crunch", sets: 3, reps: "12 reps", rest: 30,
      tip: "Tête au sol, ramène les genoux vers la poitrine en décollant un peu le bassin, sans élan.",
      benefit: "Travaille le bas de la sangle sans rien demander à la nuque.",
      muscles: ["Abdominaux"],
    },
    {
      name: "Gainage", sets: 3, reps: "30 sec", rest: 30, auto: 30,
      tip: "Regard vers le sol entre les mains, nuque dans le prolongement du dos.",
      benefit: "Un gainage où la tête reste dans l’axe, sans tension dans le cou.",
      muscles: GAINAGE_MUSCLES,
    },
    {
      name: "Bird dog", sets: 2, reps: "8 par côté", rest: 30,
      tip: "À quatre pattes, tends un bras et la jambe opposée, tiens une seconde, puis change.",
      benefit: "Apprend à garder le dos stable pendant que les bras et les jambes bougent.",
      muscles: ["Lombaires", "Core"],
    },
    {
      name: "Planche latérale", sets: 4, reps: "20 sec", rest: 10, auto: 20,
      tip: "Une série sur chaque côté en alternant, la tête posée dans l’alignement du corps.",
      benefit: "Termine par les côtés du tronc, toujours sans tirer sur la nuque.",
      muscles: ["Obliques", "Core"],
    },
  ],

  "tronc-sens": [
    {
      name: "Reverse crunch", sets: 3, reps: "15 reps", rest: 40,
      tip: "Enroule le bassin vers les côtes et contrôle la descente, sans balancer les jambes.",
      benefit: "Enrouler, le premier des cinq gestes du tronc dans cette séance.",
      muscles: ["Abdominaux"],
    },
    {
      name: "Hollow hold", sets: 3, reps: "25 sec", rest: 40, auto: 25,
      tip: "Bas du dos plaqué au sol, bras et jambes tendus juste assez bas pour tenir la position.",
      benefit: "Résister à la cambrure, le premier rôle de la sangle abdominale.",
      muscles: ["Abdominaux", "Core"],
    },
    {
      name: "Russian twist", sets: 3, reps: "20 reps", rest: 40,
      tip: "Buste incliné en arrière, dos long, compte une répétition à chaque côté touché.",
      benefit: "Tourner le buste, ce qui fait travailler les obliques.",
      muscles: ["Obliques", "Abdominaux"],
    },
    {
      name: "Planche latérale", sets: 6, reps: "30 sec", rest: 10, auto: 30,
      tip: "Trois séries par côté en alternant, bassin haut et épaules l’une au-dessus de l’autre.",
      benefit: "Tenir sur le côté sans que la hanche descende.",
      muscles: ["Obliques", "Core"],
    },
    {
      name: "Superman", sets: 3, reps: "15 reps", rest: 40,
      tip: "Sur le ventre, décolle les bras et les jambes ensemble, regard vers le sol, puis repose doucement.",
      benefit: "Redresser le dos, le geste qui équilibre tout le travail d’enroulement.",
      muscles: ["Lombaires", "Fessiers"],
    },
  ],

  "abdos-souffle": [
    {
      name: "Mountain climbers", sets: 2, reps: "40 sec", rest: 20, auto: 40,
      tip: "Mains sous les épaules, ramène les genoux vite sans laisser les hanches monter.",
      benefit: "Le souffle monte pendant que la sangle tient le bassin.",
      muscles: ["Cardio", "Core"],
    },
    {
      name: "Bicycle crunch", sets: 2, reps: "40 sec", rest: 20, auto: 40,
      tip: "Coude vers le genou opposé, mains légères derrière la tête sans tirer dessus.",
      benefit: "Enroulement et rotation à un rythme soutenu.",
      muscles: ["Abdominaux", "Obliques"],
    },
    {
      name: "Gainage dynamique", sets: 2, reps: "40 sec", rest: 20, auto: 40,
      tip: "Passe des avant-bras aux mains puis reviens, en gardant le bassin immobile.",
      benefit: "Un gainage en mouvement qui garde le cœur haut.",
      muscles: ["Core", "Épaules"],
    },
    {
      name: "Burpees", sets: 2, reps: "40 sec", rest: 20, auto: 40,
      tip: "Garde un rythme que tu tiens sur toute la série, le saut final est facultatif.",
      benefit: "Le moment le plus intense de la séance, tout le corps travaille.",
      muscles: ["Corps entier", "Cardio"],
    },
    {
      name: "Crunch", sets: 2, reps: "40 sec", rest: 20, auto: 40,
      tip: "Décolle les épaules en expirant, menton loin de la poitrine, nuque relâchée.",
      benefit: "Un enroulement plus calme, le temps de reprendre son souffle.",
      muscles: ["Abdominaux"],
    },
    {
      name: "Montées de genoux", sets: 2, reps: "40 sec", rest: 20, auto: 40,
      tip: "Genoux à hauteur de hanches, buste droit, bras actifs.",
      benefit: "Termine sur le cardio, la sangle gainée.",
      muscles: ["Cardio", "Abdominaux"],
    },
  ],

  "esprit-pilates": [
    {
      name: "Dead bug", sets: 3, reps: "8 par côté", rest: 30,
      tip: "Expire en tendant le bras et la jambe opposés, bas du dos posé du début à la fin.",
      benefit: "Le contrôle du centre, avec des gestes lents comme dans le Pilates.",
      muscles: ["Abdominaux", "Core"],
    },
    {
      name: "Bird dog", sets: 3, reps: "8 par côté", rest: 30,
      tip: "Allonge le bras et la jambe loin du corps, sans tourner le bassin, et tiens deux secondes.",
      benefit: "Stabilise le dos pendant que les bras et les jambes bougent.",
      muscles: ["Lombaires", "Core"],
    },
    {
      name: "Pont fessier", sets: 3, reps: "10 reps", rest: 30,
      tip: "Monte le bassin vertèbre par vertèbre, tiens trois secondes en haut, redescends lentement.",
      benefit: "Relie le travail des fessiers à celui du tronc.",
      muscles: ["Fessiers", "Lombaires"],
    },
    {
      name: "Hollow hold", sets: 3, reps: "20 sec", rest: 30, auto: 20,
      tip: "Souffle long par la bouche, côtes basses, bas du dos collé au sol.",
      benefit: "La position creuse, qui apprend à garder la sangle active.",
      muscles: ["Abdominaux"],
    },
    {
      name: "Planche latérale", sets: 4, reps: "30 sec", rest: 10, auto: 30,
      tip: "Une série sur chaque côté en alternant, le corps aligné comme une planche.",
      benefit: "Renforce les côtés du tronc en tenue longue.",
      muscles: ["Obliques", "Core"],
    },
    {
      name: "Cat-cow", sets: 1, reps: "60 sec", rest: 0, auto: 60,
      tip: "À quatre pattes, arrondis le dos en expirant puis creuse-le en inspirant, au rythme du souffle.",
      benefit: "Remet la colonne en mouvement pour finir la séance.",
      muscles: ["Colonne vertébrale", "Dos"],
    },
  ],

  /* ── Fessiers ────────────────────────────────────────────────────── */
  "fessiers-essentiel": [
    {
      name: "Pont fessier", sets: 3, reps: "15 reps", rest: 45,
      tip: "Pieds à plat près des fessiers, pousse dans les talons et serre les fessiers en haut.",
      benefit: "Le geste de base des fessiers, sans charge sur le dos.",
      muscles: ["Fessiers", "Ischio-jambiers"],
    },
    {
      name: "Donkey kick", sets: 2, reps: "15 par côté", rest: 30,
      tip: "À quatre pattes, pousse le talon vers le plafond, genou plié, sans creuser le dos.",
      benefit: "Isole chaque fessier, un côté à la fois.",
      muscles: ["Fessiers"],
    },
    {
      name: "Squat", sets: 3, reps: "12 reps", rest: 45,
      tip: "Pousse les hanches vers l’arrière comme pour t’asseoir, genoux dans l’axe des pieds.",
      benefit: "Fait travailler les fessiers avec les cuisses.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Fentes", sets: 2, reps: "10 par jambe", rest: 45,
      tip: "Un grand pas, le genou arrière descend vers le sol, le buste reste droit.",
      benefit: "Chaque jambe porte le corps seule, ce qui charge davantage le fessier.",
      muscles: ["Fessiers", "Quadriceps"],
    },
  ],

  "pont-quatre-facons": [
    {
      name: "Pont fessier", sets: 2, reps: "10 reps", rest: 30,
      tip: "Tiens trois secondes en haut à chaque répétition, puis redescends lentement.",
      benefit: "Le tempo lent rend le mouvement plus dur sans ajouter de charge.",
      muscles: ["Fessiers"],
    },
    {
      name: "Pont fessier", sets: 2, reps: "40 sec", rest: 30, auto: 40,
      tip: "Monte et reste en haut, fessiers serrés, sans cambrer le bas du dos.",
      benefit: "La tenue garde les fessiers sous tension pendant toute la série.",
      muscles: ["Fessiers"],
    },
    {
      name: "Pont fessier", sets: 2, reps: "20 pulsations", rest: 30,
      tip: "Reste en haut et fais de petites pulsations de quelques centimètres.",
      benefit: "Des répétitions courtes dans la partie la plus difficile du mouvement.",
      muscles: ["Fessiers"],
    },
    {
      name: "Pont fessier", sets: 2, reps: "15 reps", rest: 30,
      tip: "Pieds plus écartés que les hanches, genoux poussés vers l’extérieur.",
      benefit: "Les genoux ouverts font aussi travailler le côté de la hanche.",
      muscles: ["Fessiers"],
    },
  ],

  "fessiers-300": [
    {
      name: "Pont fessier", sets: 3, reps: "30 reps", rest: 30,
      tip: "Rythme régulier, une seconde pour monter, une pour descendre, fessiers serrés en haut.",
      benefit: "La série longue qui ouvre les 300 répétitions.",
      muscles: ["Fessiers", "Ischio-jambiers"],
    },
    {
      name: "Squat", sets: 3, reps: "20 reps", rest: 30,
      tip: "Descends à la hauteur que tu contrôles et pousse dans les talons pour remonter.",
      benefit: "Vingt répétitions qui fatiguent les fessiers et les cuisses ensemble.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Donkey kick", sets: 3, reps: "15 par côté", rest: 30,
      tip: "Le bassin reste face au sol, seule la jambe monte.",
      benefit: "Isole chaque fessier quand ils sont déjà fatigués.",
      muscles: ["Fessiers"],
    },
    {
      name: "Fentes", sets: 3, reps: "10 par jambe", rest: 30,
      tip: "Fais les dix d’un côté puis de l’autre, buste droit.",
      benefit: "La dernière série, celle qui complète les 300.",
      muscles: ["Fessiers", "Quadriceps"],
    },
  ],

  "fessiers-lourds": [
    {
      name: "Hip thrust machine", sets: 5, reps: "6 reps", rest: 120,
      tip: "Charge lourde, menton rentré, pousse les hanches jusqu’à l’alignement et tiens une seconde en haut.",
      benefit: "Le mouvement lourd de la séance, placé en premier.",
      muscles: ["Fessiers"],
    },
    {
      name: "Soulevé de terre roumain", sets: 4, reps: "8 reps", rest: 90,
      tip: "Genoux un peu fléchis, recule les hanches et descends la barre le long des cuisses, dos plat.",
      benefit: "Étire les fessiers et l’arrière des cuisses sous charge.",
      muscles: ["Ischio-jambiers", "Fessiers"],
    },
    {
      name: "Squat bulgare", sets: 3, reps: "10 par jambe", rest: 75,
      tip: "Pied arrière posé sur le banc, buste un peu penché vers l’avant pour charger le fessier.",
      benefit: "Une jambe à la fois, chaque fessier travaille sans compensation.",
      muscles: ["Fessiers", "Quadriceps"],
    },
    {
      name: "Abducteurs machine", sets: 2, reps: "20 reps", rest: 60,
      tip: "Pousse les genoux vers l’extérieur sans élan et contrôle le retour.",
      benefit: "Des séries longues pour le côté de la hanche.",
      muscles: ["Fessiers"],
    },
    {
      name: "Kickback fessier poulie", sets: 2, reps: "15 par jambe", rest: 45,
      tip: "Pousse le talon vers l’arrière sans cambrer le dos, le bassin face à la machine.",
      benefit: "Une fin de séance plus légère, sur une trajectoire guidée.",
      muscles: ["Fessiers"],
    },
  ],

  "fessiers-halteres": [
    {
      name: "Soulevé de terre roumain", sets: 4, reps: "10 reps", rest: 75,
      tip: "Un haltère dans chaque main, recule les hanches, haltères près des jambes, dos plat.",
      benefit: "Travaille l’arrière des cuisses et les fessiers avec deux haltères.",
      muscles: ["Ischio-jambiers", "Fessiers"],
    },
    {
      name: "Squat bulgare", sets: 3, reps: "10 par jambe", rest: 60,
      tip: "Pied arrière posé sur un banc ou un canapé, haltères le long du corps.",
      benefit: "Chaque jambe travaille seule, sans machine.",
      muscles: ["Fessiers", "Quadriceps"],
    },
    {
      name: "Pont fessier", sets: 3, reps: "15 reps", rest: 45,
      tip: "Pose un haltère sur le bassin et tiens-le à deux mains pendant toute la série.",
      benefit: "La charge posée sur les hanches rend le pont plus dur.",
      muscles: ["Fessiers"],
    },
    {
      name: "Goblet squat", sets: 3, reps: "12 reps", rest: 60,
      tip: "Haltère tenu contre la poitrine, descends entre les genoux, buste droit.",
      benefit: "La charge devant aide à garder le buste droit en descendant bas.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Donkey kick", sets: 2, reps: "20 par côté", rest: 30,
      tip: "Sans haltère, en contrôlant chaque montée.",
      benefit: "Une fin de séance qui isole les fessiers.",
      muscles: ["Fessiers"],
    },
  ],

  /* Deux blocs de huit intervalles (20 s d'effort, 10 s de repos), une
     minute de pause entre les deux : la transition du pont la porte. */
  "tabata-fessiers": [
    {
      name: "Squat", sets: 4, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Rythme vif mais contrôlé, cuisses parallèles au sol si tu peux.",
      benefit: "Le premier bloc commence par les jambes entières.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Pont fessier", sets: 4, reps: "20 sec effort", rest: 0, restAfter: 60, hiit: true,
      tip: "Monte et descends sans pause, fessiers serrés en haut.",
      benefit: "Termine le premier bloc, puis une minute de pause.",
      muscles: ["Fessiers"],
    },
    {
      name: "Fentes", sets: 4, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Alterne les jambes à chaque répétition, genou arrière vers le sol.",
      benefit: "Le second bloc, une jambe après l’autre.",
      muscles: ["Fessiers", "Quadriceps"],
    },
    {
      name: "Donkey kick", sets: 4, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Change de jambe à chaque intervalle, dos plat.",
      benefit: "Termine la séance en isolant les fessiers.",
      muscles: ["Fessiers"],
    },
  ],

  /* ── Jambes ──────────────────────────────────────────────────────── */
  "jambes-essentiel": [
    {
      name: "Squat", sets: 3, reps: "12 reps", rest: 30,
      tip: "Pieds largeur d’épaules, descends en gardant les talons au sol.",
      benefit: "Le mouvement de base des jambes, pour commencer.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Fentes", sets: 2, reps: "8 par jambe", rest: 30,
      tip: "Un grand pas en avant, les deux genoux pliés à angle droit en bas.",
      benefit: "Chaque jambe travaille seule, et l’équilibre avec.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Chaise au mur", sets: 2, reps: "30 sec", rest: 20, auto: 30,
      tip: "Dos contre le mur, cuisses parallèles au sol, genoux au-dessus des chevilles.",
      benefit: "Une tenue qui fait travailler les cuisses sans mouvement.",
      muscles: ["Quadriceps"],
    },
    {
      name: "Mollets", sets: 2, reps: "20 reps", rest: 20,
      tip: "Monte sur la pointe des pieds, tiens une seconde en haut, redescends lentement.",
      benefit: "Termine par le bas de la jambe, souvent oublié.",
      muscles: ["Mollets"],
    },
  ],

  "jambes-force": [
    {
      name: "Squat bulgare", sets: 5, reps: "5 par jambe", rest: 90,
      tip: "Descends en trois secondes, genou arrière près du sol, puis remonte franchement.",
      benefit: "Cinq répétitions lentes par jambe, assez dures pour travailler la force sans charge.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Squats sautés", sets: 4, reps: "5 reps", rest: 90,
      tip: "Saute le plus haut possible à chaque répétition et amortis la réception.",
      benefit: "Peu de sauts, tous à fond, pour la puissance des jambes.",
      muscles: ["Quadriceps", "Fessiers", "Mollets"],
    },
    {
      name: "Chaise au mur", sets: 3, reps: "60 sec", rest: 90, auto: 60,
      tip: "Cuisses parallèles au sol, mains loin des genoux, souffle régulier.",
      benefit: "Une minute de tenue qui charge les cuisses en continu.",
      muscles: ["Quadriceps"],
    },
    {
      name: "Fentes", sets: 3, reps: "8 par jambe", rest: 90,
      tip: "Descends en trois secondes, marque une pause en bas, remonte sans élan.",
      benefit: "Le tempo lent rend la fente plus difficile qu’une charge légère.",
      muscles: ["Quadriceps", "Fessiers"],
    },
  ],

  "jambes-5x5": [
    {
      name: "Squat barre", sets: 5, reps: "5 reps", rest: 150,
      tip: "Une charge que tu soulèves cinq fois proprement, avec encore une ou deux répétitions en réserve.",
      benefit: "Cinq séries de cinq, le format classique pour gagner en force.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Presse à cuisses", sets: 3, reps: "10 reps", rest: 90,
      tip: "Pieds à mi-hauteur du plateau, descends tant que le bassin reste collé au dossier.",
      benefit: "Du volume sur les cuisses après le travail lourd.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Leg curl allongé", sets: 3, reps: "12 reps", rest: 60,
      tip: "Hanches plaquées sur le banc, ramène le rouleau vers les fessiers sans élan.",
      benefit: "Équilibre la séance avec l’arrière des cuisses.",
      muscles: ["Ischio-jambiers"],
    },
    {
      name: "Leg extension", sets: 2, reps: "20 reps", rest: 60,
      tip: "Charge légère, tends les jambes et tiens une seconde en haut.",
      benefit: "Une série longue pour finir les quadriceps.",
      muscles: ["Quadriceps"],
    },
    {
      name: "Mollets assis", sets: 3, reps: "15 reps", rest: 45,
      tip: "Descends les talons au plus bas, monte au plus haut, sans rebond.",
      benefit: "Le bas de la jambe, en fin de séance.",
      muscles: ["Mollets"],
    },
  ],

  /* ── Pectoraux ───────────────────────────────────────────────────── */
  "pecs-maison": [
    {
      name: "Pompes inclinées", sets: 3, reps: "12 reps", rest: 45,
      tip: "Mains sur une table ou un canapé, corps gainé, descends la poitrine vers le bord.",
      benefit: "La pompe la plus accessible, pour préparer les pectoraux.",
      muscles: ["Pectoraux", "Triceps"],
    },
    {
      name: "Pompes", sets: 3, reps: "Max moins 2", rest: 60,
      tip: "Arrête-toi deux répétitions avant de ne plus pouvoir, genoux au sol si besoin.",
      benefit: "Chaque série va près de l’effort maximal sans aller jusqu’à l’échec.",
      muscles: ["Pectoraux", "Triceps", "Épaules"],
    },
    {
      name: "Pompes diamant", sets: 2, reps: "6 reps", rest: 60,
      tip: "Mains rapprochées sous la poitrine, coudes le long du corps.",
      benefit: "Fait travailler l’intérieur des pectoraux et les triceps.",
      muscles: ["Triceps", "Pectoraux"],
    },
    {
      name: "Gainage", sets: 2, reps: "30 sec", rest: 30, auto: 30,
      tip: "Avant-bras au sol, corps aligné, fessiers serrés.",
      benefit: "Le tronc qui tient les pompes, travaillé pour finir.",
      muscles: GAINAGE_MUSCLES,
    },
  ],

  "pecs-lourds": [
    {
      name: "Développé couché", sets: 5, reps: "5 reps", rest: 150,
      tip: "Omoplates serrées, pieds ancrés, descends la barre au milieu de la poitrine puis pousse.",
      benefit: "Le mouvement lourd de la séance, en cinq séries de cinq.",
      muscles: ["Pectoraux", "Triceps"],
    },
    {
      name: "Développé incliné haltères", sets: 4, reps: "8 reps", rest: 90,
      tip: "Banc incliné à 30 degrés environ, avant-bras verticaux, rapproche les haltères en haut.",
      benefit: "Le haut des pectoraux, avec une charge encore lourde.",
      muscles: ["Pectoraux", "Épaules"],
    },
    {
      name: "Écarté à la poulie", sets: 3, reps: "15 reps", rest: 60,
      tip: "Coudes un peu fléchis, ramène les mains devant la poitrine et serre une seconde.",
      benefit: "Des séries longues sur une trajectoire guidée.",
      muscles: ["Pectoraux"],
    },
    {
      name: "Pompes", sets: 2, reps: "Max", rest: 60,
      tip: "Autant de pompes propres que possible, corps gainé jusqu’à la dernière.",
      benefit: "Une dernière série au poids du corps.",
      muscles: ["Pectoraux", "Triceps"],
    },
  ],

  "pecs-halteres": [
    {
      name: "Développé couché haltères", sets: 4, reps: "10 reps", rest: 75,
      tip: "Sur un banc ou au sol, descends les haltères à hauteur de poitrine et pousse en les rapprochant.",
      benefit: "Chaque bras pousse sa charge, ce qui équilibre les deux côtés.",
      muscles: ["Pectoraux", "Triceps"],
    },
    {
      name: "Développé incliné haltères", sets: 3, reps: "12 reps", rest: 75,
      tip: "Dossier relevé, coudes un peu sous les épaules, contrôle la descente.",
      benefit: "Le haut des pectoraux et l’avant des épaules.",
      muscles: ["Pectoraux", "Épaules"],
    },
    {
      name: "Pullover haltère", sets: 3, reps: "12 reps", rest: 60,
      tip: "Un haltère à deux mains au-dessus de la poitrine, descends-le derrière la tête, bras presque tendus.",
      benefit: "Étire les pectoraux et fait travailler le dos avec.",
      muscles: ["Pectoraux", "Dos"],
    },
    {
      name: "Pompes", sets: 2, reps: "15 reps", rest: 60,
      tip: "Garde le même rythme jusqu’à la quinzième, genoux au sol si la forme se perd.",
      benefit: "Une finition au poids du corps.",
      muscles: ["Pectoraux", "Triceps"],
    },
  ],

  /* ── Dos ─────────────────────────────────────────────────────────── */
  "dos-posture": [
    {
      name: "Superman", sets: 3, reps: "15 reps", rest: 30,
      tip: "Sur le ventre, décolle les bras et les jambes, regard vers le sol, et repose sans laisser tomber.",
      benefit: "Renforce les muscles le long de la colonne.",
      muscles: ["Lombaires", "Dos"],
    },
    {
      name: "Bird dog", sets: 3, reps: "8 par côté", rest: 30,
      tip: "Tends le bras et la jambe opposée en gardant le dos plat comme une table.",
      benefit: "Apprend à garder le dos stable.",
      muscles: ["Lombaires", "Core"],
    },
    {
      name: "Cat-cow", sets: 2, reps: "40 sec", rest: 15, auto: 40,
      tip: "Arrondis le dos en expirant, creuse-le en inspirant, au rythme du souffle.",
      benefit: "Remet la colonne en mouvement, vertèbre par vertèbre.",
      muscles: ["Colonne vertébrale", "Dos"],
    },
    {
      name: "Thread the needle", sets: 2, reps: "8 par côté", rest: 15,
      tip: "À quatre pattes, glisse un bras sous l’autre en tournant les épaules, puis ouvre-le vers le plafond.",
      benefit: "Fait tourner le haut du dos, qui se raidit devant un écran.",
      muscles: ["Haut du dos", "Épaules"],
    },
  ],

  "dos-large": [
    {
      name: "Tirage poitrine", sets: 4, reps: "8 reps", rest: 90,
      tip: "Tire la barre vers le haut de la poitrine en descendant les coudes, buste un peu incliné.",
      benefit: "Le tirage vertical lourd, pour la largeur du dos.",
      muscles: ["Dos", "Biceps"],
    },
    {
      name: "Rowing assis poulie", sets: 4, reps: "10 reps", rest: 75,
      tip: "Buste droit, ramène la poignée vers le ventre en serrant les omoplates.",
      benefit: "Le tirage horizontal, pour l’épaisseur du dos.",
      muscles: ["Dos", "Biceps"],
    },
    {
      name: "Pullover haltère", sets: 3, reps: "12 reps", rest: 60,
      tip: "Bras presque tendus, descends l’haltère derrière la tête en contrôlant, puis ramène-le au-dessus de la poitrine.",
      benefit: "Fait travailler le grand dorsal sans les biceps.",
      muscles: ["Dos", "Pectoraux"],
    },
    {
      name: "Face pull poulie", sets: 3, reps: "15 reps", rest: 45,
      tip: "Corde à hauteur du visage, tire vers les yeux en écartant les mains.",
      benefit: "L’arrière des épaules et le haut du dos, pour la posture.",
      muscles: ["Épaules", "Haut du dos"],
    },
    {
      name: "Tractions", sets: 2, reps: "Max", rest: 90,
      tip: "Fais autant de tractions propres que possible, avec un élastique d’assistance si besoin.",
      benefit: "Une dernière série au poids du corps pour le dos.",
      muscles: ["Dos", "Biceps"],
    },
  ],

  "dos-halteres": [
    {
      name: "Rowing haltère", sets: 4, reps: "10 par bras", rest: 60,
      tip: "Une main et un genou sur un banc, tire l’haltère vers la hanche, coude près du corps.",
      benefit: "Chaque côté du dos travaille seul, avec une grande amplitude.",
      muscles: ["Dos", "Biceps"],
    },
    {
      name: "Rowing buste penché haltères", sets: 3, reps: "12 reps", rest: 60,
      tip: "Buste penché à 45 degrés, dos plat, tire les deux haltères vers le bas des côtes.",
      benefit: "Les deux côtés ensemble, avec le gainage du dos.",
      muscles: ["Dos", "Lombaires"],
    },
    {
      name: "Pullover haltère", sets: 3, reps: "12 reps", rest: 60,
      tip: "Bras presque tendus, descends l’haltère derrière la tête en contrôlant, puis ramène-le au-dessus de la poitrine.",
      benefit: "Le grand dorsal sur une autre trajectoire.",
      muscles: ["Dos", "Pectoraux"],
    },
    {
      name: "Oiseau haltères", sets: 3, reps: "15 reps", rest: 45,
      tip: "Buste penché, bras un peu fléchis, ouvre les bras sur les côtés sans élan.",
      benefit: "L’arrière des épaules et le haut du dos.",
      muscles: ["Épaules", "Haut du dos"],
    },
    {
      name: "Superman", sets: 2, reps: "15 reps", rest: 30,
      tip: "Sur le ventre, décolle les bras et les jambes et tiens une seconde.",
      benefit: "Termine par le bas du dos.",
      muscles: ["Lombaires"],
    },
  ],

  "souleve-force": [
    {
      name: "Soulevé de terre classique", sets: 5, reps: "3 reps", rest: 180,
      tip: "Barre contre les tibias, dos plat, pousse le sol avec les jambes et garde la barre près du corps.",
      benefit: "Trois répétitions lourdes par série, la charge monte tant que la technique reste propre.",
      muscles: ["Dos", "Fessiers", "Ischio-jambiers"],
    },
    {
      name: "Rowing barre", sets: 4, reps: "6 reps", rest: 120,
      tip: "Buste penché, dos plat, tire la barre vers le nombril sans te redresser.",
      benefit: "Le tirage lourd qui complète le soulevé de terre.",
      muscles: ["Dos", "Biceps"],
    },
    {
      name: "Extensions lombaires banc", sets: 3, reps: "12 reps", rest: 60,
      tip: "Bassin calé sur le support, descends le buste puis remonte jusqu’à l’alignement, sans cambrer.",
      benefit: "Renforce le bas du dos après le travail lourd.",
      muscles: ["Lombaires", "Fessiers"],
    },
    {
      name: "Face pull poulie", sets: 3, reps: "15 reps", rest: 45,
      tip: "Corde à hauteur du visage, tire vers les yeux en écartant les mains.",
      benefit: "L’arrière des épaules, pour finir avec une charge légère.",
      muscles: ["Épaules", "Haut du dos"],
    },
  ],

  /* ── Épaules ─────────────────────────────────────────────────────── */
  "epaules-volume": [
    {
      name: "Développé militaire haltères", sets: 4, reps: "8 reps", rest: 90,
      tip: "Sur un banc ou debout, pousse les haltères au-dessus de la tête sans cambrer le bas du dos.",
      benefit: "La poussée verticale lourde, en début de séance.",
      muscles: ["Épaules", "Triceps"],
    },
    {
      name: "Élévations latérales", sets: 3, reps: "21 (7 + 7 + 7)", rest: 60,
      tip: "Sept répétitions sur le bas du mouvement, sept sur le haut, puis sept complètes, sans pause.",
      benefit: "Vingt et une répétitions qui gardent le milieu de l’épaule sous tension.",
      muscles: ["Épaules"],
    },
    {
      name: "Oiseau haltères", sets: 3, reps: "15 reps", rest: 45,
      tip: "Buste penché, bras un peu fléchis, ouvre les bras sur les côtés sans élan.",
      benefit: "L’arrière de l’épaule, souvent moins travaillé que l’avant.",
      muscles: ["Épaules", "Haut du dos"],
    },
    {
      name: "Face pull poulie", sets: 3, reps: "15 reps", rest: 45,
      tip: "Corde à hauteur du visage, tire vers les yeux en écartant les mains.",
      benefit: "Encore l’arrière de l’épaule, sur une trajectoire guidée.",
      muscles: ["Épaules", "Haut du dos"],
    },
    {
      name: "Développé Arnold", sets: 2, reps: "10 reps", rest: 60,
      tip: "Pars paumes vers toi et tourne les poignets en poussant, jusqu’à paumes vers l’avant en haut.",
      benefit: "Une dernière poussée qui fait travailler l’avant et le milieu de l’épaule.",
      muscles: ["Épaules"],
    },
  ],

  "epaules-sans-materiel": [
    {
      name: "Pike push-ups", sets: 4, reps: "6 reps", rest: 60,
      tip: "Bassin haut, corps en V inversé, descends la tête entre les mains et pousse.",
      benefit: "La poussée au-dessus de la tête, sans charge.",
      muscles: ["Épaules", "Triceps"],
    },
    {
      name: "Pompes", sets: 3, reps: "10 reps", rest: 60,
      tip: "Mains un peu plus larges que les épaules, corps aligné.",
      benefit: "Les pectoraux et l’avant des épaules ensemble.",
      muscles: ["Pectoraux", "Épaules", "Triceps"],
    },
    {
      name: "Bear crawl", sets: 3, reps: "30 sec", rest: 30, auto: 30,
      tip: "Genoux à quelques centimètres du sol, avance la main et le pied opposés, dos plat.",
      benefit: "Le poids du corps sur les mains, en mouvement.",
      muscles: ["Épaules", "Core"],
    },
    {
      name: "Gainage dynamique", sets: 3, reps: "30 sec", rest: 30, auto: 30,
      tip: "Passe des avant-bras aux mains et reviens, bassin stable.",
      benefit: "Les épaules et le tronc travaillent ensemble pour finir.",
      muscles: ["Core", "Épaules"],
    },
  ],

  "cent-elevations": [
    {
      name: "Élévations latérales", sets: 4, reps: "25 reps", rest: 30,
      tip: "Charge légère, bras jusqu’à l’horizontale, et si une série casse, souffle dix secondes et termine-la.",
      benefit: "Cent répétitions pour finir une séance d’épaules.",
      muscles: ["Épaules"],
    },
  ],

  /* ── Bras ────────────────────────────────────────────────────────── */
  "bras-sans-materiel": [
    {
      name: "Dips sur chaise", sets: 3, reps: "12 reps", rest: 45,
      tip: "Mains au bord d’une chaise stable, coudes vers l’arrière, descends jusqu’à l’angle droit.",
      benefit: "Les triceps portent le poids du corps.",
      muscles: ["Triceps", "Épaules"],
    },
    {
      name: "Pompes diamant", sets: 3, reps: "6 reps", rest: 60,
      tip: "Mains rapprochées sous la poitrine, genoux au sol si les six ne passent pas.",
      benefit: "La pompe qui charge le plus les triceps.",
      muscles: ["Triceps", "Pectoraux"],
    },
    {
      name: "Pompes inclinées", sets: 3, reps: "12 reps", rest: 45,
      tip: "Mains serrées sur le bord d’une table, coudes le long du corps.",
      benefit: "Encore les triceps, avec moins de poids à pousser.",
      muscles: ["Triceps", "Pectoraux"],
    },
    {
      name: "Gainage", sets: 2, reps: "30 sec", rest: 30, auto: 30,
      tip: "Avant-bras au sol, corps aligné, fessiers serrés.",
      benefit: "Le tronc pour finir, les bras au repos.",
      muscles: GAINAGE_MUSCLES,
    },
  ],

  "les-21": [
    {
      name: "Curl haltères", sets: 3, reps: "21 (7 + 7 + 7)", rest: 75,
      tip: "Sept répétitions du bas jusqu’à mi-course, sept de mi-course jusqu’en haut, puis sept complètes, sans pause.",
      benefit: "Vingt et une répétitions qui gardent les biceps sous tension sur toute l’amplitude.",
      muscles: ["Biceps"],
    },
    {
      name: "Extension triceps haltère", sets: 3, reps: "12 reps", rest: 60,
      tip: "Haltère tenu à deux mains derrière la tête, coudes pointés vers le plafond.",
      benefit: "Étire et renforce l’arrière du bras.",
      muscles: ["Triceps"],
    },
    {
      name: "Curl marteau", sets: 3, reps: "15 reps", rest: 60,
      tip: "Paumes face à face, coudes collés au corps, monte sans balancer le buste.",
      benefit: "Le biceps et l’avant-bras ensemble.",
      muscles: ["Biceps", "Avant-bras"],
    },
    {
      name: "Dips sur chaise", sets: 2, reps: "Max", rest: 60,
      tip: "Autant de répétitions propres que possible, épaules basses.",
      benefit: "Une dernière série pour les triceps.",
      muscles: ["Triceps"],
    },
  ],

  "bras-lourds": [
    {
      name: "Dips barres parallèles", sets: 5, reps: "5 reps", rest: 120,
      tip: "Buste droit, descends jusqu’à ce que les coudes forment un angle droit, et ajoute du lest si les cinq passent facilement.",
      benefit: "Le mouvement lourd des triceps, en cinq séries de cinq.",
      muscles: ["Triceps", "Pectoraux"],
    },
    {
      name: "Curl barre EZ", sets: 5, reps: "6 reps", rest: 90,
      tip: "Coudes fixes le long du corps, monte sans élan et redescends en deux secondes.",
      benefit: "Une charge lourde pour les biceps.",
      muscles: ["Biceps"],
    },
    {
      name: "Extension triceps poulie", sets: 3, reps: "12 reps", rest: 60,
      tip: "Coudes serrés contre le corps, tends les bras vers le bas et contrôle la remontée.",
      benefit: "Des séries plus longues pour les triceps.",
      muscles: ["Triceps"],
    },
    {
      name: "Curl marteau", sets: 3, reps: "12 reps", rest: 60,
      tip: "Paumes face à face, coudes collés au corps, monte sans balancer le buste.",
      benefit: "Le biceps et l’avant-bras, pour finir.",
      muscles: ["Biceps", "Avant-bras"],
    },
  ],
};
