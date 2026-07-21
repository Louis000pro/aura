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
  /** true juste après un maillon franchi → l'affiche bascule sous les yeux. */
  devoile?: boolean;
  /** Hauteur maximale de l'affiche. Indispensable sur mobile : en 9/16,
   *  une affiche pleine largeur dépasse la hauteur de l'écran et pousse
   *  le compteur et le bouton hors champ. */
  hauteurMax?: string;
  className?: string;
};

export default function PosterDefi({
  serie, etat, noms = [], devoile = false, hauteurMax = "52vh", className = "",
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

      {/* Voile de lecture : dessiné ici, jamais cuit dans l'image. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%]"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,.62), rgba(0,0,0,0))" }}
      />

      {/* Signature */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <Image
            src="/marque/marque-blanc.png"
            alt=""
            width={22}
            height={20}
            className="h-[18px] w-auto opacity-95"
          />
          <span
            className="text-[15px] font-medium lowercase text-white/95"
            style={{ letterSpacing: "0.14em" }}
          >
            vaiiya
          </span>
        </div>

        {noms.length > 0 && (
          <span
            className="max-w-[55%] truncate text-right text-[11px] uppercase text-white/70"
            style={{ letterSpacing: "0.16em" }}
          >
            {noms.join(" · ")}
          </span>
        )}
      </div>

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
