"use client";

/* ════════════════════════════════════════════════════════════════════
   Le portrait de Nora ou de Sasha.

   Il pose la LUMIÈRE autour du personnage et découpe la fenêtre qui le
   montre. Rien d'autre : ni fond, ni bordure, ni ombre au sol. Ce qui
   empêche la zone de se lire comme une carte, ce sont trois choses qui
   ne dessinent aucune forme : une lumière beaucoup plus large que lui et
   sans contour, un bas qui se dissout dans la page, et le fait qu'il
   touche les bords de l'écran.

   ── DEUX FICHIERS, TROIS FORMES ──────────────────────────────────
     scene    · le portrait entier 3:4, sur l'écran de choix
     fin      · le même fichier, plus petit, sur la conclusion
     presence · le BUSTE 4:5, pendant les questions

   ⚠️ LE BUSTE EST UN FICHIER, PLUS UN RECADRAGE CSS, et c'est la
   correction du 2026-08-19. Le CSS dessinait le portrait entier à 235 %
   de sa fenêtre et le remontait de 2 %, donc il cadrait au centre du
   FICHIER. Or les deux têtes n'y sont pas peintes au même endroit : le
   crâne de Nora est 81 px à droite du centre de sa toile, et la fenêtre
   lui coupait la mèche droite. Un cadrage à l'aveugle ne pouvait pas
   faire mieux : il ne sait ni où est la tête, ni quelle largeur elle
   fait.

   `scripts/build-portraits.mjs` MESURE donc la tête (haut du crâne et
   base du cou, lus dans le profil de largeur du dessin) et taille
   `<guide>-buste-v1.webp` autour d'elle : centrée, 12 % d'air au-dessus,
   et la tête occupe au plus 76 % de la largeur. Le contrat vaut pour les
   deux Guides et pour toute illustration future ; le CSS n'a plus qu'à
   remplir sa boîte. Une nouvelle illustration passe par ce script,
   jamais directement dans `public/guides/`.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { fichierMoment } from "@/components/AssistantMark";
import type { GuideId, MomentGuide } from "@/lib/guides";
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

/** Le fichier que chaque forme montre PAR DÉFAUT. Le buste a le sien,
 *  cadré sur la tête à la génération : voir l'en-tête.
 *
 *  ⚠️ `presence` est la seule forme qui peut être remplacée par un
 *  moment. La scène et l'écran de conclusion montrent le portrait ENTIER
 *  (`master`), qui est la pose de présentation du Guide : c'est celle
 *  qu'on choisit à l'écran 0, et la revoir à la fin ferme le parcours sur
 *  la même image. Les cinq questions du milieu, elles, n'ont aucune
 *  raison de la remontrer cinq fois. */
const FICHIER: Record<keyof typeof FORME, string> = {
  scene: "master",
  presence: "buste",
  fin: "master",
};

export default function PortraitGuide({
  guide,
  forme,
  moment,
  anime = true,
}: {
  guide: GuideId;
  forme: keyof typeof FORME;
  /** La pose écrite pour CE passage du questionnaire. Tant que sa planche
   *  n'existe pas, c'est le buste historique qui s'affiche, donc l'écran
   *  est exactement celui d'aujourd'hui. Ignoré sur `scene` et `fin`, qui
   *  montrent volontairement le portrait entier. */
  moment?: MomentGuide;
  /** Coupé quand le mouvement est refusé par le système. */
  anime?: boolean;
}) {
  /* ⚠️ LE PORTRAIT BASCULE SEC D'UNE SECTION À L'AUTRE, ET C'EST VOULU
     (décision de Louis, 2026-08-30 : « pourquoi faire des animations
     forcément ? »). Le titre, la phrase du Guide et les champs changent
     tous au même instant, sans transition : donner au seul portrait une
     arrivée à lui le singulariserait, et un mouvement à côté d'un champ
     tire l'œil hors de la question qui vient d'être posée.

     Ce qui remplace la transition, c'est `prechargerMoments` côté
     parcours : les cinq bustes sont déjà en cache, donc le changement est
     instantané au lieu de laisser un trou. */
  const fichier = forme === "presence"
    ? fichierMoment(guide, moment, "buste", FICHIER.presence)
    : FICHIER[forme];
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
            transformation par format sans rien gagner. Même choix que
            les sprites d'exercice. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={s.pgImage}
          src={`/guides/${guide}-${fichier}-v1.webp`}
          alt=""
          decoding="async"
          fetchPriority={forme === "scene" ? "high" : "auto"}
        />
      </span>
    </motion.div>
  );
}
