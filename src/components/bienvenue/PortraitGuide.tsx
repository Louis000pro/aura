"use client";

/* ════════════════════════════════════════════════════════════════════
   Le portrait de Nora ou de Sasha.

   Il pose la LUMIÈRE autour du personnage et découpe la fenêtre qui le
   montre. Rien d'autre : ni fond, ni bordure, ni ombre au sol. Ce qui
   empêche la zone de se lire comme une carte, ce sont trois choses qui
   ne dessinent aucune forme : une lumière beaucoup plus large que lui et
   sans contour, un bas qui se dissout dans la page, et le fait qu'il
   touche les bords de l'écran.

   ── UN SEUL FICHIER, TROIS CADRAGES ──────────────────────────────
   Les trois formes montrent le MÊME fichier 3:4. Deux le montrent en
   entier, une le recadre :

     scene    · le fichier entier, sur l'écran de choix
     fin      · le fichier entier, plus petit, sur la conclusion
     presence · un BUSTE, recadré dans le haut du fichier, pendant les
                questions

   Le recadrage n'est pas une commodité, c'est le seul moyen d'avoir un
   vrai buste sans manger l'écran. Dans ce cadrage, la tête tient dans
   ~21 % de la hauteur : à 175 px de haut elle ferait 37 px, donc une
   icône. Il faudrait une boîte de 400 px pour lui donner 85 px, et
   400 px de portrait au-dessus d'un formulaire, ce n'est plus une
   présence, c'est un obstacle. Recadré à 235 %, le même fichier donne
   une tête d'environ 94 px dans une boîte de 175.

   La mécanique est dans le CSS (`.pg_presence .pgImage`) : la boîte
   coupe, l'image est dessinée à 235 % de sa largeur et remontée pour ne
   garder que le haut du fichier.

   ⚠️ CE QUI TIENT LE RECADRAGE : les deux fichiers posent le haut du
   crâne sur la MÊME ligne, à 5,6 % de leur hauteur. Ce n'est pas un
   hasard de dessin, c'est `scripts/build-portraits.mjs` qui l'impose
   (Sasha arrivait à 1,2 %, et la fenêtre lui coupait les cheveux). Une
   nouvelle illustration passe par ce script, jamais directement dans
   `public/guides/`.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import type { GuideId } from "@/lib/guides";
import s from "./bienvenue.module.css";

const FORME = {
  /** La scène de l'écran de choix. C'est elle qui fixe le ratio du
   *  fichier, et sa hauteur vient du `flex: 1` du CSS. */
  scene: s.pg_scene,
  /** Le buste qui conduit chaque étape du questionnaire. */
  presence: s.pg_presence,
  /** Le portrait de l'écran de conclusion. */
  fin: s.pg_fin,
} as const;

export default function PortraitGuide({
  guide,
  forme,
  anime = true,
}: {
  guide: GuideId;
  forme: keyof typeof FORME;
  /** Coupé quand le mouvement est refusé par le système. */
  anime?: boolean;
}) {
  /* ⚠️ PAS de transition partagée entre la scène et le buste, et c'est un
     choix, pas un oubli.

     Un `layoutId` partagé anime la BOÎTE, pas ce qu'elle contient. Or
     ces deux boîtes ne montrent pas la même chose : l'une le fichier
     entier, l'autre son quart supérieur agrandi 2,35 fois. Le morphing
     ferait donc sauter le cadrage à l'instant du départ, puis animerait
     une image déjà fausse.

     À la place, une arrivée simple et sûre : le portrait monte et se
     révèle. Ce qui porte vraiment la continuité, c'est que le Guide soit
     là, grand, immédiatement, avec son prénom et sa phrase. */
  return (
    <motion.div
      className={`${s.pg} ${FORME[forme]}`}
      aria-hidden="true"
      initial={anime ? { opacity: 0, y: 8, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.34, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {/* La lumière. Ce n'est pas un fond derrière le personnage : c'est
          une ambiance beaucoup plus large que lui, sans contour, qui
          déborde jusque sous le texte. Le détail est dans le CSS, avec
          la raison pour laquelle son opacité ne doit pas remonter. */}
      <span className={s.pgHalo} />
      {/* ⚠️ PLUS D'OMBRE AU SOL. Le personnage ne pose plus sur une
          surface, son bas se dissout dans la page. Les deux ensemble se
          contrediraient, et l'ombre redessinait une limite là où on
          cherche justement à n'en laisser aucune. */}
      <span className={s.pgBoite}>
        {/* ⚠️ `<img>` et pas `next/image` : ces fichiers sont déjà en
            WebP, à la taille exacte du plus grand usage, et servis en
            statique. Les faire passer par l'optimiseur coûterait une
            transformation par format sans rien gagner, et compliquerait
            le recadrage, qui a besoin d'une image plus large que sa
            fenêtre. Même choix que les sprites d'exercice. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={s.pgImage}
          src={`/guides/${guide}-master-v1.webp`}
          alt=""
          decoding="async"
          fetchPriority={forme === "scene" ? "high" : "auto"}
        />
      </span>
    </motion.div>
  );
}
