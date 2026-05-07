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
  tip: string;
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
    tip: "Visez 30 % protéines · 40 % glucides · 30 % lipides pour optimiser énergie et récupération.",
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
    tip: "2 à 4 séances de force + 7 000 pas/jour = dépense active optimale pour la majorité des objectifs.",
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
    tip: "Préférez les escaliers et garez-vous plus loin — 1 000 pas supplémentaires par habitude s'accumulent très vite !",
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
    tip: "5 min de cohérence cardiaque (inspiration 5 s / expiration 5 s) chaque matin peut abaisser votre FC repos sur le long terme.",
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
    tip: "Buvez 500 mL dès le réveil et 250 mL avant chaque repas — vous atteindrez facilement 2.5 L sans y penser.",
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
    tip: "Évitez les écrans 45 min avant de dormir pour gagner jusqu'à 30 min de sommeil profond par nuit.",
    todayIndex: 3,
  },
];
