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
        className="pointer-events-none absolute inset-x-0 top-0 h-[24%]"
        style={{
          background:
            "radial-gradient(120% 100% at 50% -10%, rgba(0,0,0,.62) 0%, rgba(0,0,0,.28) 45%, rgba(0,0,0,0) 78%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[44%]"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,.82) 0%, rgba(0,0,0,.58) 34%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* La marque, centrée en haut : le wordmark puis l'étincelle, à la
          même hauteur de capitale. Elle est volontairement en retrait —
          incrustée dans la photo, pas posée dessus : on doit la lire sans
          qu'elle prenne le pas sur l'image. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center gap-[7px] pt-[5.5%]">
        <span
          className="text-[15px] font-bold uppercase leading-none"
          style={{
            letterSpacing: "0.22em",
            // Le dernier caractère emporte l'interlettrage avec lui :
            // sans ça, le bloc paraît décalé à gauche.
            textIndent: "0.22em",
            color: "rgba(255,255,255,.86)",
            textShadow: "0 1px 10px rgba(0,0,0,.55)",
          }}
        >
          Vaiiya
        </span>
        <Image
          src="/marque/marque-blanc.png"
          alt=""
          width={22}
          height={20}
          /* 11px = la hauteur de capitale d'un texte de 15px. C'est ce
             qui fait que le signe et le mot pèsent pareil à l'œil. */
          className="h-[11px] w-auto"
          style={{ opacity: 0.86, filter: "drop-shadow(0 1px 10px rgba(0,0,0,.55))" }}
        />
      </div>

      {/* Le bas. Quand des prénoms sont là, ce sont EUX le sujet : la
          série passe en étiquette dorée au-dessus. Sans prénoms (page
          d'invitation), c'est la série qui prend la grande taille.
          Aucun prénom n'est jamais coupé — ils s'empilent. */}
      {(titre || noms.length > 0) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-5">
          {titre && (
            <span
              className={
                noms.length > 0
                  ? "block text-[10.5px] font-bold uppercase leading-none"
                  : "block text-[26px] font-bold leading-none text-white"
              }
              style={
                noms.length > 0
                  ? { letterSpacing: "0.3em", color: "#D7A62A", textShadow: "0 1px 10px rgba(0,0,0,.6)" }
                  : { letterSpacing: "-0.01em", textShadow: "0 2px 16px rgba(0,0,0,.6)" }
              }
            >
              {titre}
            </span>
          )}

          {noms.length > 0 && (
            <div className="mt-2 flex flex-col gap-[3px]">
              {noms.map((nom) => (
                <b
                  key={nom}
                  className="block break-words text-[21px] font-bold leading-[1.12] text-white"
                  style={{ letterSpacing: "-0.015em", textShadow: "0 2px 16px rgba(0,0,0,.6)" }}
                >
                  {nom}
                </b>
              ))}
            </div>
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
