"use client";

/* ════════════════════════════════════════════════════════════════════
   « Comprendre la nutrition » : les mini-cours du thème Nutrition, en
   rangée, en bas de l'écran.

   Les cours sont ceux du catalogue (lib/adviceArticles) : même texte, même
   lecteur. Seule l'image change ici, une assiette plutôt qu'une machine de
   salle, parce que la rangée vit au milieu des recettes.

   Un cours Vaiiya+ se voit à son cadre or → magenta, à son cadenas et à sa
   pastille. Toucher un cours verrouillé ouvre son aperçu (l'intro et ses
   trois parties), jamais la page Premium d'un coup : même règle que les
   séances du catalogue. Chez un abonné, c'est simplement un cours.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { getAdviceArticle, type AdviceArticle } from "@/lib/adviceArticles";
import { imageRecette } from "@/lib/collectionsRecettes";
import AdviceReaderSheet from "@/components/AdviceReaderSheet";
import Sheet from "@/components/communaute/Sheet";
import ns from "@/components/nutrition/Nutrition.module.css";

/* Les cours de la rangée, dans l'ordre, et l'assiette qui les illustre. */
const COURS: { id: string; image: string }[] = [
  { id: "conseil-proteines", image: "saumon-roti-et-patate-douce" },
  { id: "conseil-glucides", image: "pates-bolognaise-maison" },
  { id: "conseil-hydratation", image: "citronnade-maison-a-la-menthe" },
  { id: "conseil-perdre-gras", image: "veloute-de-carottes" },
  { id: "conseil-creatine", image: "milkshake-vanille-fraise" },
];

function Cadenas() {
  return (
    <span aria-hidden className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full"
      style={{ background: "#F5B120", color: "#3A2400" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    </span>
  );
}

export default function ComprendreNutrition({ premiumDebloque }: { premiumDebloque: boolean }) {
  const router = useRouter();
  const [lecture, setLecture] = useState<AdviceArticle | null>(null);
  const [apercu, setApercu] = useState<AdviceArticle | null>(null);

  const cours = COURS
    .map((c) => ({ ...c, article: getAdviceArticle(c.id) }))
    .filter((c): c is { id: string; image: string; article: AdviceArticle } => !!c.article);

  return (
    <section id="nutrition-comprendre" className="flex flex-col gap-3" aria-label="Comprendre la nutrition">
      <h2 className="text-[20px]" style={{ color: "var(--text-0)", fontWeight: 750, fontVariationSettings: "var(--w-voix)" }}>
        Comprendre la nutrition
      </h2>

      {/* La rangée va d'un bord à l'autre et garde de la place sous les cartes :
          un conteneur qui défile coupe ce qui dépasse, donc l'ombre aussi. */}
      <div className={`${ns.rail} -mx-4 -mb-5 px-4 pb-6 pt-1 md:mx-0 md:px-0`}>
        {cours.map(({ id, image, article }) => {
          const verrou = article.access === "premium" && !premiumDebloque;
          const ouvrir = () => (verrou ? setApercu(article) : setLecture(article));
          const corps = (
            <>
              <span className="relative block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageRecette(image)} alt="" loading="lazy" decoding="async"
                  className="block w-full object-cover" style={{ height: verrou ? 121 : 124, background: "rgba(var(--accent-rgb),0.10)" }} />
                {verrou && <Cadenas />}
              </span>
              <span className="flex flex-col gap-1.5 px-3.5 pb-3.5 pt-3">
                <span className="text-[16px] font-semibold leading-snug" style={{ color: "var(--text-0)" }}>{article.title}</span>
                {verrou ? (
                  <span className="self-start rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: "#F5B120", color: "#3A2400" }}>
                    Vaiiya+
                  </span>
                ) : (
                  <span className="text-[11px] font-bold" style={{ color: "var(--text-3)" }}>
                    Mini-cours · {article.readingMinutes}&nbsp;min
                  </span>
                )}
              </span>
            </>
          );
          return verrou ? (
            /* Le cadre or → magenta : 3 px, et le rayon intérieur qui va avec
               (20 − 3), sinon les angles s'épaississent. */
            <button key={id} type="button" onClick={ouvrir} aria-label={`${article.title}, réservé à Vaiiya+`}
              className="flex-shrink-0 text-left cursor-pointer" style={{ width: 236, padding: 3, borderRadius: 20, background: "linear-gradient(90deg,#F5B120,#C13BC1)" }}>
              <span className="flex h-full flex-col overflow-hidden" style={{ borderRadius: 17, background: "var(--verre-carte)" }}>
                {corps}
              </span>
            </button>
          ) : (
            <button key={id} type="button" onClick={ouvrir}
              className={`${ns.bloc} flex-shrink-0 overflow-hidden cursor-pointer`} style={{ width: 236 }}>
              {corps}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {lecture && <AdviceReaderSheet key="lecture" article={lecture} onClose={() => setLecture(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {apercu && (
          <Sheet key="apercu" onFermer={() => setApercu(null)} niveau={150}>
            <div className="flex flex-col gap-4 pb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageRecette(COURS.find((c) => c.id === apercu.id)?.image ?? "")} alt=""
                className="block w-full object-cover" style={{ aspectRatio: "16 / 9", borderRadius: "var(--r-bloc)" }} />
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold" style={{ color: "var(--or-encre)" }}>
                  Mini-cours Vaiiya+ · {apercu.readingMinutes}&nbsp;min
                </span>
                <h3 className="text-[20px] font-semibold leading-snug" style={{ color: "var(--text-0)" }}>{apercu.title}</h3>
              </div>
              <p className="vy-corps" style={{ color: "var(--text-1)" }}>{apercu.intro}</p>
              <div className="flex flex-col">
                <span className="mb-1 text-[11px] font-bold" style={{ color: "var(--text-3)" }}>Dans ce mini-cours</span>
                {apercu.sections.slice(0, 3).map((section, i) => (
                  <span key={section.title} className="vy-filet flex items-center gap-2.5 py-2.5">
                    <span className="vy-nombre text-[13px]" style={{ color: "var(--exp-encre)", fontWeight: 700 }}>{i + 1}</span>
                    <span className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>{section.title}</span>
                  </span>
                ))}
              </div>
              <button type="button" onClick={() => { setApercu(null); router.push("/premium"); }} className={ns.pilule}>
                Découvrir Vaiiya+
              </button>
            </div>
          </Sheet>
        )}
      </AnimatePresence>
    </section>
  );
}
