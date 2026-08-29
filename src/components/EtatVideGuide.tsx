"use client";

/* ════════════════════════════════════════════════════════════════════
   EtatVideGuide — ce que le Guide dit quand un écran n'a rien à montrer.

   Un écran vide tombe précisément sur quelqu'un qui ne sait pas quoi
   faire, et jusqu'ici il lui répondait par un pictogramme gris dans un
   cadre en pointillés : un cul-de-sac. C'est pourtant le seul endroit de
   l'app où la troisième condition du Guide (« rien ne le dit mieux »)
   est remplie par construction, puisqu'il n'y a rien d'autre à lire.

   ⚠️ NI CARTE, NI CADRE, NI PASTILLE. C'est la règle posée le
   2026-08-18 sur /bienvenue (« enfermés dans une zone pâle qui fait
   post-it ») et reprise dans la conversation : le bas du personnage se
   DISSOUT dans la page, et la lumière autour de lui est une ambiance
   large, pas un disque. Le cadre en pointillés qui vivait ici est donc
   parti avec le texte gris : on remplace, on n'empile pas.

   ⚠️ UNE PORTE, JAMAIS DEUX. La phrase (dans `guides.ts`, comme toute
   parole de Guide) propose une seule suite, et `action` ouvre exactement
   celle-là. Deux boutons, c'est de nouveau un choix à faire pour
   quelqu'un qui n'en avait déjà pas.

   Sans Guide résolu (choix pas fait, `20260818_guide_id.sql` pas collée,
   hors ligne), `BusteGuide` retombe sur l'étincelle ✦ et `voix` sur le
   texte commun : l'écran reste complet, il n'a simplement pas de visage.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { BusteGuide } from "@/components/AssistantMark";
import { useGuideActif } from "@/context/GuideContext";
import { voix, type CleVoix } from "@/lib/guides";

export default function EtatVideGuide({
  cle,
  action,
}: {
  /** La clé de la phrase. Elle vit dans `guides.ts`, jamais ici. */
  cle: CleVoix;
  /** La porte unique. Son libellé est un mot de l'app, pas du Guide :
   *  il reste donc écrit par l'écran qui l'affiche. */
  action?: { libelle: string; onClick: () => void };
}) {
  const { guide } = useGuideActif();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center text-center"
      style={{ paddingTop: 18, paddingBottom: 34 }}
    >
      {/* Le personnage. La phrase remonte ensuite DANS sa dissolution
          (marge négative) : c'est ce qui l'empêche de redevenir une
          vignette posée au-dessus d'un texte. Sans Guide il n'y a rien à
          dissoudre, donc la marge redevient positive. */}
      <BusteGuide guide={guide} hauteur={168} />

      <p
        className="relative text-[14.5px] font-light leading-relaxed"
        style={{
          marginTop: guide ? -22 : 16,
          maxWidth: 320,
          paddingInline: 20,
          color: "var(--text-2)",
        }}
      >
        {voix(guide, cle)}
      </p>

      {action && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={action.onClick}
          type="button"
          className="relative mt-5 cursor-pointer rounded-2xl px-6 py-3 text-[13.5px] font-semibold"
          style={{
            // Violet plein = l'action, partout dans l'app (système D).
            background: "linear-gradient(135deg,var(--violet-mid),var(--accent))",
            color: "#fff",
            boxShadow: "0 8px 24px -8px rgba(var(--accent-rgb),0.7)",
          }}
        >
          {action.libelle}
        </motion.button>
      )}
    </motion.div>
  );
}
