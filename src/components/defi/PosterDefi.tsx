"use client";

/* ─────────────────────────────────────────────────────────────
   L'affiche qui se dévoile.

   Quatre états fixes, du vide au complet. Aucun texte n'est
   incrusté dans les images : la signature et les prénoms sont
   dessinés ici, par-dessus, pour rester nets à toutes les
   tailles et pouvoir changer sans regénérer les images.

   La transition ne joue QU'AU moment où un maillon vient d'être
   franchi (prop `devoile`). Le reste du temps l'affiche est
   simplement à son état : une animation qu'on voit dix fois par
   jour devient du bruit.
   ───────────────────────────────────────────────────────────── */

import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { imageEtat, NB_ETATS } from "@/lib/defi";

type Props = {
  serie: string;
  etat: number;
  /** Prénoms affichés en bas de l'affiche. */
  noms?: string[];
  /** Nom de la série (« Sillage »), affiché en bas au-dessus des prénoms. */
  titre?: string;
  /** true juste après un maillon franchi → l'affiche bascule sous les yeux. */
  devoile?: boolean;
  /** Hauteur maximale de l'affiche. Indispensable sur mobile : en 9/16,
   *  une affiche pleine largeur dépasse la hauteur de l'écran et pousse
   *  le compteur et le bouton hors champ. */
  hauteurMax?: string;
  className?: string;
};

export default function PosterDefi({
  serie, etat, noms = [], titre, devoile = false, hauteurMax = "52vh", className = "",
}: Props) {
  const sobre = useReducedMotion();
  const complet = etat >= NB_ETATS;

  // L'arrivée à l'affiche complète mérite un temps plus long : c'est
  // le moment où le poster devient le leur.
  const duree = sobre ? 0 : complet ? 1.9 : 1.2;

  return (
    <div
      className={`relative overflow-hidden rounded-[26px] ${className}`}
      style={{
        aspectRatio: "9 / 16",
        // On prend toute la largeur disponible, sauf si ça dépasse la
        // hauteur autorisée — auquel cas c'est la hauteur qui commande.
        width: `min(100%, calc(${hauteurMax} * 9 / 16))`,
        marginInline: "auto",
      }}
    >
      {/* Les couches d'affiche. Le fondu croisé vient du fait que
          l'ancienne et la nouvelle coexistent pendant la sortie. */}
      <AnimatePresence initial={false}>
        <motion.div
          key={etat}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: sobre ? 1 : complet ? 1.07 : 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: duree * 0.75, ease: "easeInOut" },
            scale:   { duration: duree, ease: [0.22, 0.61, 0.36, 1] },
          }}
        >
          <Image
            src={imageEtat(serie, etat)}
            alt=""
            fill
            sizes="(max-width: 768px) 92vw, 420px"
            priority
            className="object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* On réchauffe l'état suivant pour que la prochaine bascule
          soit instantanée, sans clignotement de chargement. */}
      {etat < NB_ETATS && (
        <Image
          src={imageEtat(serie, etat + 1)}
          alt=""
          fill
          sizes="1px"
          aria-hidden
          className="pointer-events-none object-cover opacity-0"
        />
      )}

      {/* Voiles de lecture : dessinés ici, jamais cuits dans l'image.
          Celui du haut n'est plus une bande mais une ombre douce centrée
          sous la marque : elle donne le contraste juste là où il faut,
          sans poser un bandeau noir en travers du ciel. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[22%]"
        style={{
          background:
            "radial-gradient(110% 100% at 50% -10%, rgba(0,0,0,.44) 0%, rgba(0,0,0,.18) 48%, rgba(0,0,0,0) 80%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%]"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,.76) 0%, rgba(0,0,0,.46) 36%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* La marque, centrée en haut. Minuscule, très interlettrée, en
          crème translucide et SANS ombre portée : c'est ce qui la fait
          appartenir à l'image au lieu d'être une étiquette posée
          dessus. Le contraste vient du voile, pas d'un contour. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center gap-[6px] pt-[5.5%]">
        <span
          className="text-[10.5px] font-bold uppercase leading-none"
          style={{
            letterSpacing: "0.38em",
            // Le dernier caractère emporte son interlettrage avec lui :
            // sans ça, le bloc paraît décalé à gauche.
            textIndent: "0.38em",
            color: "rgba(251,244,230,.58)",
          }}
        >
          Vaiiya
        </span>
        <Image
          src="/marque/marque-blanc.png"
          alt=""
          width={22}
          height={20}
          /* 8px = la hauteur de capitale d'un texte de 10,5px. C'est ce
             qui fait que le signe et le mot pèsent pareil à l'œil. */
          className="h-[8px] w-auto"
          style={{ opacity: 0.55 }}
        />
      </div>

      {/* Le bas, centré. Le nom de la série en grandes capitales
          largement espacées, les prénoms en petit dessous : c'est un
          bloc d'affiche, pas une légende de photo. Tout est en crème
          (#FBF4E6) et non en blanc pur, le blanc pur reste en surface,
          le crème se pose dans l'image.

          Les prénoms sont assez petits pour tenir sans jamais être
          coupés ; s'ils débordent malgré tout, ils passent à la ligne.
          Un « … » sur le prénom de quelqu'un, jamais. */}
      {(titre || noms.length > 0) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-[6.5%] text-center">
          {titre && (
            <span
              className="block text-[27px] font-extrabold uppercase leading-none"
              style={{
                letterSpacing: "0.18em",
                textIndent: "0.18em",
                color: "#FBF4E6",
                textShadow: "0 2px 18px rgba(0,0,0,.45)",
              }}
            >
              {titre}
            </span>
          )}

          {noms.length > 0 && (
            <span
              className="mt-2.5 block text-[9.5px] font-semibold uppercase leading-[1.6]"
              style={{
                letterSpacing: "0.3em",
                textIndent: "0.3em",
                color: "rgba(251,244,230,.66)",
                overflowWrap: "anywhere",
              }}
            >
              {noms.join(" · ")}
            </span>
          )}
        </div>
      )}

      {/* Éclat unique à l'arrivée de l'affiche complète. */}
      <AnimatePresence>
        {devoile && complet && !sobre && (
          <motion.div
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, times: [0, 0.35, 1], ease: "easeOut" }}
            style={{
              background:
                "radial-gradient(120% 60% at 50% 78%, rgba(255,211,78,.55) 0%, rgba(255,211,78,0) 62%)",
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
