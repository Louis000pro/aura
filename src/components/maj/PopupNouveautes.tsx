"use client";

/* ════════════════════════════════════════════════════════════════════
   Le récap de la grande mise à jour, en feuille presque plein écran.

   Il s'ouvre UNE fois par compte, à la première visite après la mise en
   ligne, et se retrouve ensuite dans Paramètres → Nouveautés.

   Règles de ton (verrouillées) : on ne critique jamais Vaiiya, et on ne
   se félicite jamais. On montre ce qui existe, c'est tout.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useGuidedTour } from "@/context/GuidedTourContext";
import { dejaVue, marquerVue, EVENEMENT_OUVRIR } from "@/lib/nouveautes";
import { RANGS } from "@/lib/aura";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import styles from "./PopupNouveautes.module.css";

/* Les gestes du bandeau. Tous vérifiés animés : une vignette au halo
   violet dans un écran qui annonce 102 mouvements animés serait un
   mensonge à l'écran. Si on en change, revérifier.
   Pas d'exercice à agrès haut ici (tractions) : la barre occupe toute la
   hauteur de la planche, donc le personnage rapetisse et la vignette
   devient illisible. Même précaution que la vitrine des mouvements. */
const BANDEAU = ["Fentes", "Mollets debout", "Squat", "Jumping jacks", "Pompes"];
const TRIO = ["Squat", "Burpees", "Pompes"];

const CHIFFRES: [string, string][] = [
  ["102", "mouvements animés"],
  ["53", "séances"],
  ["78", "recettes"],
  ["26", "mini-cours"],
];

/* Les six gemmes viennent de `RANGS` (src/lib/aura.ts). Elles étaient recopiées
   ici avec leurs chemins : deux listes à tenir d'accord pour une seule échelle. */
const RANGS_APERCU = RANGS.filter((r) => r.image);

/* Une page qui s'ouvre par dessus tout doit rendre le défilement à la
   page en dessous quand elle se ferme, même si elle est démontée vite. */
function useScrollBloque(actif: boolean) {
  useEffect(() => {
    if (!actif) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = avant; };
  }, [actif]);
}

function Chapitre({ n, titre, children }: { n: string; titre: string; children: React.ReactNode }) {
  return (
    <section className={styles.chap}>
      <div className={styles.chapH}>
        <span className={styles.chapN}>{n}</span>
        <h3 className={styles.chapT}>{titre}</h3>
      </div>
      {children}
    </section>
  );
}

export default function PopupNouveautes() {
  const { user } = useAuth();
  const { isOpen: visiteEnCours } = useGuidedTour();
  const pathname = usePathname() ?? "";
  const reduce = useReducedMotion();
  const [monte, setMonte] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const feuille = useRef<HTMLDivElement>(null);
  const rendu = useRef<HTMLButtonElement>(null);

  useEffect(() => setMonte(true), []);
  useScrollBloque(ouvert);

  /* Ouverture automatique : une seule fois, et jamais tout de suite. On
     laisse l'écran d'arrivée se poser d'abord, on ne passe jamais par
     dessus la visite guidée, et on laisse tranquilles les deux écrans
     publics où l'on arrive de l'extérieur. */
  const pageExclue = pathname.startsWith("/auth") || pathname.startsWith("/rejoindre");

  useEffect(() => {
    if (!user || visiteEnCours || pageExclue || dejaVue(user.id)) return;
    const t = setTimeout(() => setOuvert(true), 1100);
    return () => clearTimeout(t);
  }, [user, visiteEnCours, pageExclue]);

  /* Réouverture à la demande (Paramètres, carte de la cloche). */
  useEffect(() => {
    const ouvrir = () => setOuvert(true);
    window.addEventListener(EVENEMENT_OUVRIR, ouvrir);
    return () => window.removeEventListener(EVENEMENT_OUVRIR, ouvrir);
  }, []);

  const fermer = useCallback(() => {
    if (user) marquerVue(user.id);
    setOuvert(false);
  }, [user]);

  /* Échap ferme, et le focus reste dans la feuille tant qu'elle est là. */
  useEffect(() => {
    if (!ouvert) return;
    rendu.current?.focus();
    const clavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") { fermer(); return; }
      if (e.key !== "Tab" || !feuille.current) return;
      const cibles = feuille.current.querySelectorAll<HTMLElement>("button, a[href]");
      if (!cibles.length) return;
      const premier = cibles[0];
      const dernier = cibles[cibles.length - 1];
      if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
    };
    document.addEventListener("keydown", clavier);
    return () => document.removeEventListener("keydown", clavier);
  }, [ouvert, fermer]);

  if (!monte || !user) return null;

  const contenu = (
    <AnimatePresence>
      {ouvert && (
        <motion.div
          className={styles.voile}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            ref={feuille}
            role="dialog"
            aria-modal="true"
            aria-label="Les nouveautés de Vaiiya"
            className={styles.feuille}
            initial={reduce ? { opacity: 0 } : { y: "6%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: "4%", opacity: 0 }}
            transition={{ type: "spring", bounce: 0.14, duration: 0.5 }}
          >
            <button ref={rendu} onClick={fermer} className={styles.croix} aria-label="Fermer">
              <X size={15} strokeWidth={2.3} />
            </button>

            <div className={styles.corps}>

              {/* ── hero ── */}
              <div className={styles.hero}>
                <svg className={styles.spark} viewBox="0 0 24 24" aria-hidden="true">
                  <defs>
                    <linearGradient id="maj-spark" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#C4A9FF" />
                      <stop offset="100%" stopColor="#E8C97A" />
                    </linearGradient>
                  </defs>
                  <path d="M12 1.4 14 9.1 21.6 11.1 14 13.1 12 20.8 10 13.1 2.4 11.1 10 9.1Z" fill="url(#maj-spark)" />
                </svg>
                <p className={styles.kick}>Mise à jour · 30 juillet 2026</p>
                <h2 className={styles.titre}>Voilà ce qui est nouveau</h2>
                <p className={styles.sous}>Prends une minute, il y a de quoi faire.</p>
                <div className={styles.bandeau} aria-hidden="true">
                  {BANDEAU.map((nom, i) => (
                    <ExerciseThumb key={nom} name={nom} size={74} delay={i * 180} />
                  ))}
                </div>
              </div>

              {/* ── chiffres ── */}
              <div className={styles.chiffres}>
                {CHIFFRES.map(([n, quoi]) => (
                  <div key={quoi} className={styles.chiffre}>
                    <b>{n}</b>
                    <span>{quoi}</span>
                  </div>
                ))}
              </div>

              <div className={styles.pad}>

                <Chapitre n="01" titre="L’entraînement">
                  <div className={styles.visuel}>
                    <div className={styles.trio} aria-hidden="true">
                      {TRIO.map((nom, i) => (
                        <ExerciseThumb key={nom} name={nom} size={92} delay={i * 240} />
                      ))}
                    </div>
                    <div className={styles.legende}>Chaque exercice a son personnage</div>
                  </div>
                  <p className={styles.txt}>
                    <b>102 mouvements animés</b> : tu vois le geste avant de le faire, et pendant. Le
                    catalogue monte à <b>53 séances</b>, du sans matériel à la salle, en passant par la
                    mobilité, le cardio et la récupération.
                  </p>
                  <p className={styles.txt}>
                    Tu peux aussi <b>composer ta séance</b> en piochant dans la bibliothèque, la garder,
                    et la poser sur un jour de ta semaine. Et <b>26 mini-cours</b> de trois minutes
                    expliquent ce que tu fais et pourquoi.
                  </p>
                </Chapitre>

                <Chapitre n="02" titre="La nutrition, repensée en entier">
                  <div className={styles.visuel}>
                    <div className={styles.duo} aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/recipes/poke-bowl-saumon-avocat.jpg" alt="" loading="lazy" decoding="async" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/recipes/curry-de-lentilles-corail-et-epinards.jpg" alt="" loading="lazy" decoding="async" />
                    </div>
                    <div className={styles.legende}>78 recettes, en photo</div>
                  </div>
                  <p className={styles.txt}>
                    Tout part d&apos;une question : <b>on mange où ?</b> À la maison, au resto ou sur le
                    pouce. L&apos;écran s&apos;adapte à ta réponse au lieu de te dicter un menu.
                  </p>
                  <p className={styles.txt}>
                    Photographie ton assiette pour l&apos;analyser, ou la carte d&apos;un restaurant pour
                    savoir quoi commander. Scanne un code-barres. Dis ce qu&apos;il te reste dans le frigo
                    et reçois une recette. Tes classiques reviennent en un geste, et le menu de la semaine
                    tient compte de tes goûts, de ton régime et de tes allergies.
                  </p>
                </Chapitre>

                <Chapitre n="03" titre="L’étincelle">
                  <p className={styles.txt}>
                    L&apos;assistant ne se contente plus de répondre, il <b>agit</b>. Il te prépare une
                    séance et te la montre avec ses mouvements, avant que tu valides. Il note un repas,
                    déplace un jour de ta semaine, te trouve une recette.
                  </p>
                  <p className={styles.txt}>
                    Quand il lui manque une information, il propose des <b>réponses à toucher</b> plutôt
                    que de te faire tout retaper. Et il retient ce qui compte pour toi.
                  </p>
                </Chapitre>

                <Chapitre n="04" titre="Ton rang">
                  <div className={styles.visuel}>
                    <div className={styles.rangs} aria-hidden="true">
                      {RANGS_APERCU.map((rang) => (
                        <span key={rang.id}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={rang.image} alt="" loading="lazy" decoding="async" />
                          <b>{rang.nom}</b>
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className={styles.txt}>
                    Tes séances, tes repas et ta présence donnent de l&apos;<b>EXP</b>. Six rangs, de
                    Bronze à Éternel, avec des <b>missions du jour</b> à cocher.
                  </p>
                  <p className={styles.txt}>
                    Chaque palier débloque une décoration qui se voit sur ton profil et dans tes
                    conversations : gemme, cadre doré, anneau animé, titre, pseudo lumineux. Rien qui donne
                    un avantage, tout qui se voit.
                  </p>
                </Chapitre>

                <Chapitre n="05" titre="Le relais, à deux">
                  <div className={styles.visuel}>
                    <div className={styles.affiche} aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/defis/sillage/04.webp" alt="" loading="lazy" decoding="async" />
                    </div>
                    <div className={styles.legende}>L&apos;affiche se dévoile maillon par maillon</div>
                  </div>
                  <p className={styles.txt}>
                    Un défi à deux : <b>quatre jours validés sur sept</b>, jamais deux jours de suite par
                    la même personne. À chaque maillon franchi, l&apos;affiche se découvre un peu plus, et
                    le fil de votre conversation s&apos;éclaircit avec elle.
                  </p>
                  <p className={styles.txt}>
                    À la fin, elle est à vous, avec une carte à partager et un badge sur le profil. On peut
                    l&apos;arrêter à tout moment, sans avoir à se justifier.
                  </p>
                </Chapitre>

                <Chapitre n="06" titre="La messagerie">
                  <p className={styles.txt}>
                    La communauté, c&apos;est <b>tes conversations et tes amis</b>. On s&apos;ajoute par
                    lien ou par pseudo, en duo ou en petit groupe.
                  </p>
                  <ul className={styles.puces}>
                    <li>Photos privées</li>
                    <li>Réactions et réponses citées</li>
                    <li>Épingler un fil</li>
                    <li>Mettre en sourdine</li>
                    <li>Archiver</li>
                    <li>Le défi épinglé en haut</li>
                  </ul>
                </Chapitre>

                <Chapitre n="07" titre="Et aussi">
                  <div className={styles.grille}>
                    <span>Un accueil qui montre ta journée</span>
                    <span>Une visite guidée en sept étapes</span>
                    <span>Le mode sombre partout</span>
                    <span>Les paramètres refaits</span>
                    <span>Le profil en tiroir personnel</span>
                    <span>Ton planning sur tous tes appareils</span>
                  </div>
                </Chapitre>

                {/* ── ce qui change ── */}
                <div className={`${styles.boite} ${styles.boiteO}`}>
                  <div className={styles.boiteH}>
                    <span style={{ background: "#E8620C" }} />
                    <p>Ce qui change</p>
                  </div>
                  <ul>
                    <li>
                      La communauté, c&apos;est désormais tes conversations : le fil, les likes, les
                      commentaires et les stories n&apos;y sont plus. Tes affiches de performance restent
                      sur ton profil.
                    </li>
                    <li><b>L&apos;envoi de photos à l&apos;assistant</b> est retiré.</li>
                    <li>
                      <b>Vaiiya est gratuit.</b> L&apos;abonnement n&apos;est pas encore ouvert : aucun
                      paiement n&apos;est possible et aucun moyen de paiement ne t&apos;est demandé.
                    </li>
                  </ul>
                </div>

                {/* ── bon à savoir ── */}
                <div className={`${styles.boite} ${styles.boiteT}`}>
                  <div className={styles.boiteH}>
                    <span style={{ background: "#2BD4A0" }} />
                    <p>Bon à savoir</p>
                  </div>
                  <ul>
                    <li>
                      <b>Ça continue de bouger.</b> Des maintenances, des ralentissements ou des coupures
                      peuvent arriver sur n&apos;importe quelle partie de l&apos;app.
                    </li>
                    <li>Un souci, une idée ? <b>bonjour@vaiiya.fr</b></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className={styles.pied}>
              <button onClick={fermer} className={styles.cta}>Je vais voir</button>
              <p className={styles.note}>Tu retrouveras ce récap dans Paramètres.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(contenu, document.body);
}
