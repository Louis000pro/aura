import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/seo/MarketingShell";
import { CHIFFRES_PUBLICS } from "@/lib/chiffresPublics";

/**
 * Le contenu de fond de cette page (calories, macros, repas équilibrés,
 * compléments) est juste et reste intact. Ce qui a changé, c'est la promesse
 * produit : la page vendait des « plans nutrition personnalisés » en
 * description, en titre de section et en conclusion. Vaiiya ne produit aucun
 * plan alimentaire structuré sur plusieurs jours (voir
 * `docs/positionnement-public-vaiiya.md`, §6). Il calcule des objectifs, suit
 * ce qui est réellement mangé et propose des idées. C'est ce qui est écrit
 * maintenant.
 */
export const metadata: Metadata = {
  title: "Nutrition sportive : calories, protéines et repas équilibrés",
  description:
    "Nutrition sportive : calcul des calories, des protéines, des glucides et des lipides, et repas équilibrés adaptés à tes objectifs. Vaiiya suit tes repas par photo, code-barres ou saisie.",
  alternates: { canonical: "https://vaiiya.fr/nutrition-sportive" },
  openGraph: {
    title: "Nutrition sportive · Vaiiya",
    description:
      "Calories, macros et repas équilibrés. Photographie ton assiette, Vaiiya estime et tient le compte.",
    url: "https://vaiiya.fr/nutrition-sportive",
    images: ["/og-image.png"],
  },
};

export default function NutritionSportivePage() {
  return (
    <MarketingShell>
      <h1>Nutrition sportive : la moitié de tes résultats</h1>
      <p className="lead">
        Quel que soit ton objectif, la <strong>nutrition</strong>{" "}pèse autant que l&apos;entraînement.
        Comprendre tes calories et tes macros (protéines, glucides, lipides) te permet de progresser
        vraiment. Vaiiya calcule tes besoins, puis tient le compte de ce que tu manges réellement.
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
        <li><strong>Protéines</strong> (1,6 à 2,2&nbsp;g/kg) pour la construction et le maintien du muscle, et pour la satiété.</li>
        <li><strong>Glucides</strong>, l&apos;énergie de tes séances, à moduler selon l&apos;objectif.</li>
        <li><strong>Lipides</strong> (0,8 à 1&nbsp;g/kg) pour les hormones et la santé générale.</li>
      </ul>

      <h2>Construire des repas équilibrés</h2>
      <p>
        Un repas type associe une <strong>source de protéines</strong> (œufs, poulet, poisson, légumineuses,
        tofu), des <strong>glucides</strong> (riz, pâtes, patate douce, pain complet), des{" "}
        <strong>légumes</strong> et un peu de <strong>bon gras</strong>{" "}(huile d&apos;olive, oléagineux,
        avocat). Pas besoin d&apos;aliments « miracle »&nbsp;: la régularité et l&apos;équilibre font le travail.
      </p>

      <h2>Faut-il des compléments ?</h2>
      <p>
        Les compléments ne sont qu&apos;un bonus. La whey aide à atteindre ses protéines, la créatine est
        l&apos;une des rares aux effets prouvés sur la force. Mais ils ne remplacent jamais une alimentation
        solide ni un bon programme d&apos;entraînement.
      </p>

      <h2>Comment Vaiiya suit ta nutrition</h2>
      <p>
        Vaiiya ne te dicte pas un menu de la semaine. Il calcule tes objectifs de calories et de macros à
        partir de ton profil, puis il t&apos;aide à noter ce que tu manges vraiment, de la façon qui
        t&apos;arrange&nbsp;:
      </p>
      <ul>
        <li><strong>En photo</strong>&nbsp;: tu prends ton assiette, Vaiiya reconnaît le plat et estime les calories et les macros.</li>
        <li><strong>Au code-barres</strong>, pour les produits emballés.</li>
        <li><strong>En écrivant</strong>, ou en le disant à l&apos;assistant («&nbsp;j&apos;ai mangé un burger ce midi&nbsp;»).</li>
        <li><strong>À la main</strong>, si tu préfères saisir toi-même les quantités.</li>
      </ul>
      <p>
        Ces valeurs sont des <strong>estimations</strong>, affichées comme telles et corrigeables en un
        geste. Une photo ne pèse pas ton assiette&nbsp;: elle t&apos;évite surtout d&apos;abandonner le suivi
        au bout de trois jours.
      </p>

      <h2>Des idées quand tu ne sais pas quoi manger</h2>
      <p>
        Vaiiya contient <strong>{CHIFFRES_PUBLICS.recettes} recettes</strong>{" "}écrites et photographiées, avec leurs macros par
        portion. L&apos;assistant peut aussi te proposer une recette à partir de ce qu&apos;il te reste dans
        le frigo. Et parce qu&apos;on ne mange pas toujours chez soi, l&apos;application part de la vraie
        question&nbsp;: on mange où&nbsp;? À la maison, au restaurant ou en livraison, elle t&apos;aide à
        estimer ce que tu commandes plutôt que de faire comme si le repas n&apos;existait pas.
      </p>
      <p>
        Rien de tout cela n&apos;est un régime ni un avis médical. Vaiiya donne des repères et compte pour
        toi&nbsp;; les décisions restent les tiennes.
      </p>

      <h2>Commencer avec Vaiiya</h2>
      <p>
        Le <Link href="/coach-ia">coach IA Vaiiya</Link>{" "}calcule tes calories et tes macros, puis suit tes
        repas au fil des jours, que tu t&apos;entraînes en salle ou à la{" "}
        <Link href="/musculation-maison">maison</Link>. Crée ton compte gratuit pour commencer.
      </p>
    </MarketingShell>
  );
}
