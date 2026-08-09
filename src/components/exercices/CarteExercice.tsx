import Link from "next/link";
import AnimationExercice, { labelAnimation } from "./AnimationExercice";
import { EQUIPS, ZONES, type LibExercise } from "@/lib/exerciseLibrary";

/* ════════════════════════════════════════════════════════════════════
   La carte d'un exercice dans une grille publique.

   Elle montre l'animation en grand pour sa taille, et presque rien
   d'autre : le nom, la zone, le matériel. C'est délibéré. Ce qui donne
   envie de cliquer ici, c'est le personnage qui bouge, pas une phrase
   d'accroche de plus.

   Une carte SANS destination ne devient jamais un lien mort : elle reste
   une carte, un peu en retrait, et dit franchement que la fiche n'est
   pas encore écrite. Annoncer huit fiches quand une seule existe serait
   la version web de la promesse sans carte.
   ════════════════════════════════════════════════════════════════════ */

function meta(lib: LibExercise): string {
  const zone = ZONES.find((z) => z.id === lib.zone)?.label ?? lib.zone;
  const equip = EQUIPS.find((e) => e.id === lib.equip)?.label ?? lib.equip;
  return `${zone} · ${equip}`;
}

export default function CarteExercice({
  lib,
  href,
  taille = 148,
  priorite = false,
}: {
  lib: LibExercise;
  /** La fiche publiée, ou rien si elle n'est pas encore écrite. */
  href?: string;
  taille?: number;
  /** À réserver aux cartes visibles sans défiler. Sur le hub, les
      vignettes SONT le contenu : la première rangée doit s'afficher tout
      de suite, sinon la page s'ouvre sur des cases vides. Tout le reste
      attend le défilement, et c'est très bien. */
  priorite?: boolean;
}) {
  const corps = (
    <>
      <div
        className="flex items-center justify-center rounded-2xl mb-3"
        style={{
          height: taille,
          background: "radial-gradient(circle at 50% 45%, rgba(139,92,246,0.13), rgba(139,92,246,0) 68%)",
        }}
      >
        <AnimationExercice nom={lib.name} taille={taille} label={labelAnimation(lib.name)} priorite={priorite} />
      </div>
      <p className="text-[15px] font-semibold leading-snug" style={{ color: "#1A1535" }}>
        {lib.name}
      </p>
      <p className="mt-0.5 text-[12px]" style={{ color: "#8B84A8" }}>
        {href ? meta(lib) : "Fiche en préparation"}
      </p>
    </>
  );

  const style = {
    background: "#fff",
    border: "1px solid rgba(167,139,250,0.16)",
    boxShadow: "0 6px 24px rgba(90,60,180,0.07)",
  } as const;

  if (!href) {
    return (
      <div className="rounded-3xl p-4" style={{ ...style, opacity: 0.62 }}>
        {corps}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="block rounded-3xl p-4 transition-transform hover:-translate-y-0.5"
      style={style}
    >
      {corps}
    </Link>
  );
}
