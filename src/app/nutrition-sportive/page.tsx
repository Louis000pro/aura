import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/seo/MarketingShell";

export const metadata: Metadata = {
  title: "Nutrition sportive — calories, protéines et repas équilibrés",
  description:
    "Nutrition sportive : calcul des calories, protéines, glucides et lipides, et repas équilibrés adaptés à tes objectifs. Plans nutrition personnalisés par l'IA Vaiiya.",
  alternates: { canonical: "https://vaiiya.fr/nutrition-sportive" },
  openGraph: {
    title: "Nutrition sportive — Vaiiya",
    description:
      "Calories, macros et repas équilibrés personnalisés par l'IA pour atteindre tes objectifs.",
    url: "https://vaiiya.fr/nutrition-sportive",
    images: ["/og-image.png"],
  },
};

export default function NutritionSportivePage() {
  return (
    <MarketingShell>
      <h1>Nutrition sportive : la moitié de tes résultats</h1>
      <p className="lead">
        Quel que soit ton objectif, la <strong>nutrition</strong> pèse autant que l&apos;entraînement.
        Comprendre tes calories et tes macros — protéines, glucides, lipides — te permet de progresser
        vraiment. Vaiiya calcule tes besoins et te propose des repas équilibrés adaptés.
      </p>

      <h2>Les calories : la base de tout</h2>
      <p>
        Ton corps a un besoin calorique de maintenance. Manger au-dessus favorise la{" "}
        <Link href="/prise-de-masse">prise de masse</Link>, manger en dessous entraîne la{" "}
        <Link href="/perte-de-poids">perte de poids</Link>. Tout part de là&nbsp;: inutile de compliquer avant
        d&apos;avoir ce repère.
      </p>

      <h2>Les macronutriments</h2>
      <ul>
        <li><strong>Protéines</strong> (1,6 à 2,2&nbsp;g/kg) — construction et maintien du muscle, satiété.</li>
        <li><strong>Glucides</strong> — l&apos;énergie de tes séances, à moduler selon l&apos;objectif.</li>
        <li><strong>Lipides</strong> (0,8 à 1&nbsp;g/kg) — hormones et santé générale.</li>
      </ul>

      <h2>Construire des repas équilibrés</h2>
      <p>
        Un repas type associe une <strong>source de protéines</strong> (œufs, poulet, poisson, légumineuses,
        tofu), des <strong>glucides</strong> (riz, pâtes, patate douce, pain complet), des{" "}
        <strong>légumes</strong> et un peu de <strong>bon gras</strong> (huile d&apos;olive, oléagineux,
        avocat). Pas besoin d&apos;aliments « miracle »&nbsp;: la régularité et l&apos;équilibre font le travail.
      </p>

      <h2>Faut-il des compléments ?</h2>
      <p>
        Les compléments ne sont qu&apos;un bonus. La whey aide à atteindre ses protéines, la créatine est
        l&apos;une des rares aux effets prouvés sur la force. Mais ils ne remplacent jamais une alimentation
        solide ni un bon programme d&apos;entraînement.
      </p>

      <h2>Ton plan nutrition personnalisé</h2>
      <p>
        Le <Link href="/coach-ia">coach IA Vaiiya</Link> calcule tes calories et tes macros, puis te suggère
        des repas adaptés à ton objectif et à tes préférences — que tu t&apos;entraînes en salle ou à la{" "}
        <Link href="/musculation-maison">maison</Link>. Crée ton compte gratuit pour commencer.
      </p>
    </MarketingShell>
  );
}
