/* Le texte d'un cours, avec sa typographie française (lib/coursNutrition,
   `typoCours`), et sans coupure au milieu d'un mot composé : à la taille
   d'un titre, « compte-t-il » se coupait en « compte-t- / il ». */

import { Fragment } from "react";
import { typoCours } from "@/lib/coursNutrition";

const COMPOSE = /([\p{L}’]+(?:-[\p{L}’]+)+)/u;

export function Typo({ s }: { s: string }) {
  const morceaux = typoCours(s).split(COMPOSE);
  return (
    <>
      {morceaux.map((m, i) =>
        i % 2 === 1
          ? <span key={i} style={{ whiteSpace: "nowrap" }}>{m}</span>
          : <Fragment key={i}>{m}</Fragment>,
      )}
    </>
  );
}
