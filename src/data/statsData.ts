import type { ElementType } from "react";
import { Flame, Activity, Footprints, Heart, Droplet, Moon } from "lucide-react";

export type SubItem = { title: string; amount: string };

export type StatData = {
  icon: ElementType;
  label: string;
  value: string;
  unit: string;
  target: string;
  progress: number;
  trend: string;
  trendUp: boolean;
  iconColor: string;
  barGradient: string;
  cardClass: string;
  description: string;
  importance: string;
  weekData: (number | null)[];
  weekMax: number;
  breakdown: SubItem[];
  tips: string[];
  todayIndex: number;
};

export const stats: StatData[] = [
  {
    icon: Flame,
    label: "Calories",
    value: "1 847",
    unit: "kcal",
    target: "/ 2 200",
    progress: 0.84,
    trend: "+5%",
    trendUp: true,
    iconColor: "#A78BFA",
    barGradient: "linear-gradient(90deg, #A78BFA 0%, #D4C0FF 100%)",
    cardClass: "lg-rose",
    description: "Mesure l'énergie totale apportée à votre corps via vos repas et collations depuis le début de la journée.",
    importance: "Un apport calorique adapté à votre dépense totale (TDEE) est la clé de la composition corporelle. Un léger déficit favorise la perte de masse grasse ; un léger surplus soutient la prise musculaire.",
    weekData: [1820, 2100, 1950, 1847, null, null, null],
    weekMax: 2200,
    breakdown: [
      { title: "Petit-déjeuner", amount: "420 kcal" },
      { title: "Déjeuner", amount: "780 kcal" },
      { title: "Collation", amount: "180 kcal" },
      { title: "Dîner (estimé)", amount: "467 kcal" },
    ],
    tips: [
      "Visez 30 % protéines · 40 % glucides · 30 % lipides pour optimiser énergie et récupération.",
      "Répartissez vos calories en 4-5 prises par jour pour stabiliser la glycémie et limiter les fringales.",
      "Les protéines rassasient 2× plus que les glucides : viser 1.6-2 g/kg de poids corporel aide à rester en déficit sans faim.",
      "Peser vos aliments crus au moins 2 semaines vous calibre mieux que n'importe quelle appli sur le long terme.",
      "Un repas de fin de journée plus riche en glucides favorise la récupération musculaire et améliore la qualité du sommeil.",
      "Ne sautez pas le petit-déjeuner si vous vous entraînez le matin — 20-30 g de protéines à jeun limitent le catabolisme.",
      "Un journal alimentaire de 3 jours révèle souvent des calories « oubliées » (sauces, huiles, boissons) qui représentent +300-500 kcal.",
    ],
    todayIndex: 3,
  },
  {
    icon: Activity,
    label: "Dépense",
    value: "612",
    unit: "kcal",
    target: "active",
    progress: 0.7,
    trend: "+12%",
    trendUp: true,
    iconColor: "#D4A843",
    barGradient: "linear-gradient(90deg, #D4A843 0%, #F5E6A3 100%)",
    cardClass: "lg-turquoise",
    description: "Représente les calories brûlées lors de vos activités physiques, en dehors de votre métabolisme de base.",
    importance: "S'ajoute à votre métabolisme de repos (BMR) pour former votre dépense totale (TDEE). Plus vous bougez, plus vous pouvez manger tout en restant en forme et en progressant.",
    weekData: [540, null, 720, 612, null, null, null],
    weekMax: 900,
    breakdown: [
      { title: "Musculation 45 min", amount: "380 kcal" },
      { title: "Marche 30 min", amount: "145 kcal" },
      { title: "Étirements 15 min", amount: "87 kcal" },
    ],
    tips: [
      "2 à 4 séances de force + 7 000 pas/jour = dépense active optimale pour la majorité des objectifs.",
      "Le HIIT de 20 min brûle autant de calories totales qu'un cardio de 40 min, avec un effet afterburn de 12-24 h.",
      "La dépense calorique d'une séance de musculation varie peu selon les exercices ; c'est le volume (séries × reps) qui compte.",
      "Le non-exercise activity thermogenesis (NEAT) — gesticuler, faire les courses, cuisiner — peut représenter 300-500 kcal de plus par jour.",
      "Plus vous êtes en forme, plus votre corps devient efficace : la même séance brûlera moins de calories au fil du temps, d'où l'importance de progresser.",
      "Marcher 10 min après chaque repas réduit la glycémie postprandiale de 30 % et augmente la dépense journalière sans effort perçu.",
    ],
    todayIndex: 3,
  },
  {
    icon: Footprints,
    label: "Pas",
    value: "8 234",
    unit: "",
    target: "/ 10 000",
    progress: 0.82,
    trend: "+3%",
    trendUp: true,
    iconColor: "#A78BFA",
    barGradient: "linear-gradient(90deg, #A78BFA 0%, #F5E6A3 100%)",
    cardClass: "lg-bicolor",
    description: "Comptabilise chaque pas effectué depuis minuit via l'accéléromètre de votre appareil.",
    importance: "Marcher 7 500 à 10 000 pas/jour réduit le risque cardiovasculaire de ~50 %. C'est l'une des habitudes santé les plus accessibles et les plus solidement étayées par la science.",
    weekData: [9200, 7800, 11200, 8234, null, null, null],
    weekMax: 12000,
    breakdown: [
      { title: "Matin (6h – 12h)", amount: "2 100 pas" },
      { title: "Midi (12h – 14h)", amount: "3 400 pas" },
      { title: "Après-midi (14h – 20h)", amount: "2 734 pas" },
    ],
    tips: [
      "Préférez les escaliers et garez-vous plus loin — 1 000 pas supplémentaires par habitude s'accumulent très vite !",
      "Une marche de 30 min à jeun le matin oxyde davantage de graisses qu'un cardio intense après repas.",
      "Dépasser 10 000 pas/jour réduit de façon notable le risque de diabète de type 2, même sans autre activité sportive.",
      "Fractionner ses pas (3 × 10 min) donne les mêmes bénéfices cardiovasculaires qu'une seule marche de 30 min.",
      "Écouter un podcast ou un audiobook pendant votre marche rend l'activité plus durable sur le long terme.",
      "Après une longue période assis, 5 min de marche toutes les heures suffisent à relancer la circulation et baisser la glycémie.",
      "Les zones montagneuses ou la marche sur sable brûlent 20-30 % de calories de plus que la marche sur terrain plat.",
    ],
    todayIndex: 3,
  },
  {
    icon: Heart,
    label: "FC moyenne",
    value: "68",
    unit: "bpm",
    target: "Repos",
    progress: 0.4,
    trend: "-2%",
    trendUp: false,
    iconColor: "#A78BFA",
    barGradient: "linear-gradient(90deg, #D4C0FF 0%, #A78BFA 100%)",
    cardClass: "lg-rose",
    description: "Fréquence cardiaque au repos, mesurée en battements par minute sur l'ensemble de la journée.",
    importance: "Une FC repos entre 50 et 70 bpm reflète un cœur efficace. Chaque baisse de 10 bpm au repos est associée à une meilleure santé cardiovasculaire, une récupération plus rapide et une plus grande longévité.",
    weekData: [71, 70, 69, 68, null, null, null],
    weekMax: 80,
    breakdown: [
      { title: "Au réveil", amount: "72 bpm" },
      { title: "Après-midi", amount: "66 bpm" },
      { title: "Soirée", amount: "67 bpm" },
    ],
    tips: [
      "5 min de cohérence cardiaque (inspiration 5 s / expiration 5 s) chaque matin peut abaisser votre FC repos sur le long terme.",
      "Une FC repos qui diminue de semaine en semaine est le signe le plus fiable d'une progression cardiovasculaire.",
      "Le café augmente temporairement la FC de 5-10 bpm — mesurez toujours votre FC repos avant votre première tasse.",
      "La déshydratation fait monter la FC de 5 à 10 bpm au repos ; hydrater correctement c'est aussi préserver son cœur.",
      "La variabilité de la fréquence cardiaque (VFC), mesurable avec certaines montres, est un meilleur indicateur de récupération que la FC seule.",
      "Plus votre FC repos est basse, plus votre cœur pompe de sang à chaque battement — signe d'un muscle cardiaque fort et efficace.",
    ],
    todayIndex: 3,
  },
  {
    icon: Droplet,
    label: "Hydratation",
    value: "1.6",
    unit: "L",
    target: "/ 2.5 L",
    progress: 0.64,
    trend: "-8%",
    trendUp: false,
    iconColor: "#D4A843",
    barGradient: "linear-gradient(90deg, #F5E6A3 0%, #D4A843 100%)",
    cardClass: "lg-turquoise",
    description: "Volume d'eau total consommé depuis ce matin, toutes boissons confondues.",
    importance: "Une déshydratation de seulement 2 % du poids corporel réduit performances cognitives et physiques de ~20 %. L'eau régule la température, transporte les nutriments et élimine les déchets métaboliques.",
    weekData: [2.1, 1.8, 2.4, 1.6, null, null, null],
    weekMax: 2.5,
    breakdown: [
      { title: "Au réveil", amount: "0.5 L" },
      { title: "Avant séance", amount: "0.3 L" },
      { title: "Après séance", amount: "0.5 L" },
      { title: "Après-midi", amount: "0.3 L" },
    ],
    tips: [
      "Buvez 500 mL dès le réveil et 250 mL avant chaque repas — vous atteindrez facilement 2.5 L sans y penser.",
      "La soif est un signal tardif de déshydratation : si vous avez soif, vous avez déjà perdu ~1 % de votre masse hydrique.",
      "Ajouter une pincée de sel rose himalaya et un filet de citron à votre eau du matin améliore son absorption cellulaire.",
      "Les fruits et légumes représentent 20-30 % de l'apport hydrique total — ne comptez pas que les boissons.",
      "Une urine jaune pâle (paille) indique une bonne hydratation ; jaune foncé signale un manque d'eau.",
      "Pendant l'effort, buvez 150-250 mL toutes les 15-20 min plutôt qu'une grande quantité d'un coup.",
      "Le café et le thé comptent dans l'hydratation : leur léger effet diurétique est largement compensé par leur contenu en eau.",
    ],
    todayIndex: 3,
  },
  {
    icon: Moon,
    label: "Sommeil",
    value: "7h24",
    unit: "",
    target: "+18 min",
    progress: 0.92,
    trend: "+6%",
    trendUp: true,
    iconColor: "#D4A843",
    barGradient: "linear-gradient(90deg, #D4C0FF 0%, #F5E6A3 100%)",
    cardClass: "lg-bicolor",
    description: "Durée totale du sommeil de la nuit précédente, tous cycles confondus.",
    importance: "Le sommeil est le pilier de la récupération musculaire, de la régulation hormonale (GH, cortisol, testostérone) et de la consolidation mémorielle. 7 à 9 h est la fenêtre optimale pour un adulte actif.",
    weekData: [6.5, 7.8, 8.1, 7.4, null, null, null],
    weekMax: 9,
    breakdown: [
      { title: "Endormissement", amount: "23h12" },
      { title: "Sommeil profond", amount: "2h18" },
      { title: "Sommeil paradoxal", amount: "1h45" },
      { title: "Réveil", amount: "06h36" },
    ],
    tips: [
      "Évitez les écrans 45 min avant de dormir pour gagner jusqu'à 30 min de sommeil profond par nuit.",
      "Une température de chambre entre 16 et 19 °C accélère l'endormissement et augmente les phases de sommeil profond.",
      "Le magnésium (bisglycinate, 200-400 mg le soir) réduit le temps d'endormissement et améliore la qualité du sommeil profond.",
      "Se lever à heure fixe 7 j/7 — même le week-end — est le levier n°1 pour réguler votre horloge biologique.",
      "Une alimentation riche en tryptophane (dinde, banane, œufs) le soir favorise la production de mélatonine naturelle.",
      "Évitez l'alcool : il peut vous endormir plus vite mais fragmente les cycles et réduit le sommeil paradoxal de 20-40 %.",
      "20 min d'exposition à la lumière naturelle le matin synchronise votre rythme circadien et améliore l'endormissement le soir.",
    ],
    todayIndex: 3,
  },
];
