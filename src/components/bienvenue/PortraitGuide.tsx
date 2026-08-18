"use client";

/* ════════════════════════════════════════════════════════════════════
   L'emplacement du portrait de Nora ou Sasha.

   ⚠️ AUCUN VISUEL N'EXISTE ENCORE. Ce composant ne dessine donc ni
   visage, ni initiale, ni silhouette, rien qui ressemble à un avatar.
   Il pose la SCÈNE autour du futur fichier (un halo qui déborde, une
   ombre au sol) et réserve sa boîte au liseré pointillé, pour qu'on
   puisse juger de la taille, du cadrage et de la respiration sur le
   composant réel plutôt que sur une estimation.

   Le halo n'est pas de la décoration : c'est lui qui empêche la zone de
   se lire comme une carte. Un aplat plein dans un rectangle fermé
   ramènerait exactement la sensation de tuile qu'on vient de retirer.

   Les deux Guides reçoivent la même scène, la même taille et la même
   couleur. Rien ne doit distinguer Nora de Sasha visuellement tant que
   les portraits n'existent pas : une nuance suffirait à donner un
   avantage à l'un des deux pendant les tests.

   ── UN SEUL FICHIER, TROIS CADRAGES ──────────────────────────────
   Les trois formes montrent le MÊME fichier 3:4 (mi-corps). Deux le
   montrent en entier, une le recadre :

     scene    · le fichier entier, mi-corps, sur l'écran de choix
     fin      · le fichier entier, plus petit, sur la conclusion
     presence · un BUSTE, recadré dans le haut du fichier, pendant les
                questions

   Le recadrage n'est pas une commodité, c'est le seul moyen d'avoir un
   vrai buste sans manger l'écran. Dans un cadre mi-corps, la tête tient
   dans ~23 % de la hauteur : à 140 px de haut elle ferait 32 px, donc
   une icône. Il faudrait une boîte de 210 px pour lui donner 48 px, et
   210 px de portrait au-dessus d'un formulaire, sur un écran de 640, ce
   n'est plus une présence, c'est un obstacle. Recadré à 235 %, le même
   fichier donne une tête de ~80 px dans une boîte de 140.

   La mécanique est dans le CSS (`.pg_presence .pgCadre`) : la boîte
   coupe, le cadre intérieur est dessiné à 235 % de sa largeur et remonté
   pour ne garder que le haut du fichier. Le liseré pointillé montre donc
   le fichier ENTIER en train d'être coupé, ce qui rend le recadrage
   mesurable dès maintenant, avant que les images existent.

   Le jour où les fichiers arrivent, c'est le seul fichier à toucher :
   `.pgCadre` devient une <Image>, les boîtes ne bougent pas.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import s from "./bienvenue.module.css";

const FORME = {
  /** La scène de l'écran de choix. C'est elle qui fixe le ratio du
   *  fichier à produire, et sa hauteur vient du `flex: 1` du CSS. */
  scene: s.pg_scene,
  /** Le buste qui conduit chaque étape du questionnaire. */
  presence: s.pg_presence,
  /** Le portrait de l'écran de conclusion. */
  fin: s.pg_fin,
} as const;

export default function PortraitGuide({
  forme,
  anime = true,
}: {
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
     une image déjà fausse. C'est le genre d'effet qui se répare en le
     regardant tourner, et l'animation n'est justement pas observable
     dans cet environnement.

     À la place, une arrivée simple et sûre : le buste monte et se révèle.
     Ce qui porte vraiment la continuité, c'est que le Guide soit là,
     grand, immédiatement, avec son prénom et sa phrase. */
  return (
    <motion.div
      className={`${s.pg} ${FORME[forme]}`}
      aria-hidden="true"
      initial={anime ? { opacity: 0, y: 8, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.34, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <span className={s.pgHalo} />
      {/* Le buste ne pose sur rien : une ombre au sol sous un cadrage
          coupé à la poitrine dessinerait un sol qui n'est pas dans
          l'image. */}
      {forme !== "presence" && <span className={s.pgSol} />}
      <span className={s.pgBoite}>
        {/* La géométrie du futur fichier. Pour `presence` elle déborde
            de la boîte : c'est le recadrage, et il est donc mesurable
            avant que les images existent. */}
        <span className={s.pgCadre} />
        {/* Le mot est centré dans la FENÊTRE, pas dans le fichier :
            sinon, sur le buste, il tomberait sous la ligne de coupe. */}
        {forme !== "fin" && (
          <span className={s.pgMot}>{forme === "scene" ? "portrait" : "buste"}</span>
        )}
      </span>
    </motion.div>
  );
}
