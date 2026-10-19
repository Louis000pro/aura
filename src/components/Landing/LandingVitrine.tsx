"use client";

/**
 * LandingVitrine : vaiiya.fr pour un visiteur non connecté.
 *
 * Refaite le 2026-10-12 à la demande de Louis (« une landing magnifique,
 * bluffante, qui ne bugge pas quand on rentre dedans »), avec la skill
 * ui-ux-pro-max pour la structure, le mouvement et la checklist. Ses
 * propositions de couleurs et de polices n'ont PAS été reprises : la
 * palette, Archivo et Martian Mono sont verrouillés.
 *
 * ⚠️ DÉCISIONS DE LOUIS À NE PAS DÉFAIRE.
 *   · Toujours CLAIRE : couleurs écrites en dur dans le module CSS.
 *   · Les mots d'accent prennent le dégradé du LOGO ; le bouton reste violet.
 *   · Les photos de `/public/vitrine/` sont retouchées aux couleurs du logo :
 *     exception réservée à cette page.
 *
 * ⚠️ LE « BUG À L'ENTRÉE » : rien ne doit apparaître puis disparaître.
 *   · L’intro au logo (`SplashIntro`) est supprimée (Louis, 2026-10-14).
 *   · Le héros (titre géant, puis Nora et Sasha) entre en CSS pur, dès le
 *     premier octet de HTML. Maquette : `docs/maquettes/vitrine-nora-sasha.html`.
 *   · `useRevelation` ne cache que ce qui est SOUS le pli quand il s'arme :
 *     ce qu'on voit au premier affichage ne clignote jamais.
 *
 * ⚠️ POSITIONNEMENT PUBLIC (`docs/positionnement-public-vaiiya.md`) : aucun
 * chiffre d'utilisateurs, aucun faux avis, aucune promesse sur le corps,
 * aucun « abonne-toi ». La conversation et le parcours décrivent
 * l'app, pas une personne réelle.
 */

import { useEffect, useId, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, Check, ChefHat, Dumbbell, MessageCircle, Store, Trophy } from "lucide-react";
import AnimationExercice from "@/components/exercices/AnimationExercice";
import { resolveGuide } from "@/lib/exerciseGuides";
import { RANGS } from "@/lib/aura";
import { PLANS, formatPrice } from "@/lib/plans";
import { SEO_PAGES, LEGAL_PAGES } from "@/lib/seoPages";
import { SEUIL_AVIS_PUBLIC, type ResumeAvis } from "@/lib/avisTypes";
import type { ChiffresPublics } from "@/lib/chiffresPublics";
import s from "./LandingVitrine.module.css";

/** Ancre de la section qui suit le héros (le lien « Voir ce qu'il y a dedans »). */
export const DISCOVER_ANCHOR = "decouvrir";

/* ═══════════════ La révélation au défilement ═══════════════
   Un seul observateur pour toute la page. Il ne cache QUE ce qui est sous
   le pli au moment où il s'arme : un élément déjà à l'écran ne passe jamais
   par l'invisible, donc la page ne clignote pas à l'arrivée. */
function useRevelation(racine: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = racine.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const cibles = Array.from(el.querySelectorAll<HTMLElement>("[data-reveal], [data-conversation]"));
    const pli = window.innerHeight * 0.92;
    const io = new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        if (!e.isIntersecting) continue;
        const t = e.target as HTMLElement;
        if (t.hasAttribute("data-conversation")) t.setAttribute("data-vu", "");
        else requestAnimationFrame(() => t.removeAttribute("data-attente"));
        io.unobserve(t);
      }
    }, { rootMargin: "0px 0px -8% 0px" });

    for (const t of cibles) {
      if (t.getBoundingClientRect().top < pli) {
        // Déjà visible : on la joue tout de suite, sans jamais la masquer.
        if (t.hasAttribute("data-conversation")) t.setAttribute("data-vu", "");
        continue;
      }
      if (t.hasAttribute("data-conversation")) t.setAttribute("data-armee", "");
      else { t.classList.add(s.revele); t.setAttribute("data-attente", ""); }
      io.observe(t);
    }
    return () => io.disconnect();
  }, [racine]);
}

/* ═══════════════ Petites briques ═══════════════ */

function Bouton({ label, href = "/auth?mode=signup" }: { label: string; href?: string }) {
  return (
    <Link href={href} className={s.bouton}>
      {label}
      <ArrowRight size={18} strokeWidth={2.4} aria-hidden />
    </Link>
  );
}

function Surtitre({ children }: { children: React.ReactNode }) {
  return <p className={s.surtitre}>{children}</p>;
}

/* ═══════════════ 1 · LE HÉROS ═══════════════ */

/* Les deux lignes du titre s'écartent un peu au défilement. Elles partent
   de leur place : rien n'est déplacé au premier affichage. */
function useTitreQuiSouvre(titre: React.RefObject<HTMLHeadingElement | null>) {
  useEffect(() => {
    const h1 = titre.current;
    if (!h1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lignes = Array.from(h1.querySelectorAll<HTMLElement>("[data-sens]"));
    let attente = false;
    const bouger = () => {
      attente = false;
      const k = Math.min(window.scrollY / window.innerHeight, 1);
      for (const l of lignes) l.style.transform = `translate3d(${Number(l.dataset.sens) * k * 18}vw,0,0)`;
    };
    const auDefilement = () => { if (!attente) { attente = true; requestAnimationFrame(bouger); } };
    window.addEventListener("scroll", auDefilement, { passive: true });
    return () => window.removeEventListener("scroll", auDefilement);
  }, [titre]);
}

/* ── L'ESCALIER DE LUMIÈRE ──
   Des marches descendent des deux bords vers le centre et désignent le
   bouton. Ce ne sont PAS des aplats : ce qui dessine la forme, ce sont
   les arêtes, un filet violet → magenta et son halo, posés sur des
   paliers à peine teintés. Modèle de disposition donné par Louis le
   2026-10-19, maquette `docs/maquettes/vitrine-heros-v3.html` (piste A).

   ⚠️ TOUT EST CALCULÉ AU RENDU, donc présent dès le premier octet de
   HTML. Une forme construite en JavaScript après coup, c'est exactement
   le « bug à l'entrée » qu'on a supprimé : une page qui se remplit.

   ⚠️ `vector-effect="non-scaling-stroke"` est obligatoire. Le SVG est
   étiré en largeur (`preserveAspectRatio="none"`) pour que les marches
   touchent les deux bords quelle que soit la fenêtre : sans lui, les
   arêtes verticales maigrissent pendant que les horizontales épaississent. */
const ESC_L = 1440;
const ESC_H = 460;

/** Un escalier symétrique : du bord vers le centre, `marches` paliers qui
 *  descendent, un plat au milieu, puis le miroir. */
function cheminEscalier(haut: number, bas: number, marches: number, plat: number) {
  const pas = (ESC_L - plat) / 2 / marches;
  const chute = (bas - haut) / marches;
  let d = `M 0 ${haut}`;
  for (let i = 0; i < marches; i++) d += ` h ${pas} v ${chute}`;
  d += ` h ${plat}`;
  for (let i = 0; i < marches; i++) d += ` v ${-chute} h ${pas}`;
  return d;
}

/* Deux niveaux, pas trois : au-delà, les arêtes se lisent comme des
   créneaux et la forme cesse de désigner quoi que ce soit. */
const NIVEAUX = [
  { haut: 26, bas: 292, marches: 4, plat: 300, opacite: 0.9, trait: 1.3 },
  { haut: 182, bas: 404, marches: 3, plat: 520, opacite: 0.38, trait: 0.9 },
];

function Escalier() {
  // Les dégradés et le filtre prennent leur identifiant ici : deux SVG
  // qui partageraient les leurs prendraient les couleurs du premier.
  const k = `esc${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg className={s.escalierHeros} viewBox={`0 0 ${ESC_L} ${ESC_H}`} preserveAspectRatio="none" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${k}t`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8B5CF6" stopOpacity=".25" />
          <stop offset=".25" stopColor="#8B5CF6" />
          <stop offset=".5" stopColor="#C13BC1" />
          <stop offset=".75" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#8B5CF6" stopOpacity=".25" />
        </linearGradient>
        <linearGradient id={`${k}a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8B5CF6" stopOpacity=".055" />
          <stop offset="1" stopColor="#C13BC1" stopOpacity=".02" />
        </linearGradient>
        <filter id={`${k}h`} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      {NIVEAUX.map((n) => {
        const d = cheminEscalier(n.haut, n.bas, n.marches, n.plat);
        return (
          <g key={n.haut}>
            <path d={`${d} V ${ESC_H} H 0 Z`} fill={`url(#${k}a)`} opacity={n.opacite * 0.9} />
            <path d={d} fill="none" stroke={`url(#${k}t)`} strokeWidth={n.trait * 4} vectorEffect="non-scaling-stroke" filter={`url(#${k}h)`} opacity={n.opacite * 0.42} />
            <path d={d} fill="none" stroke={`url(#${k}t)`} strokeWidth={n.trait} vectorEffect="non-scaling-stroke" opacity={n.opacite} />
          </g>
        );
      })}
    </svg>
  );
}

/* ⚠️ CES TROIS MENTIONS SONT DES FAITS, ET CHACUNE EST UN CLAIM AUTORISÉ
   (`docs/positionnement-public-vaiiya.md` §13). Les deux nombres ont été
   recomptés dans le code le 2026-10-19 : `workoutSessions` en porte 53 et
   `EXERCISE_LIBRARY` 102. Les modules ne sont pas importés ici pour ne pas
   charger leurs données sur une page publique ; à revérifier avant d'y
   toucher. Aucun chiffre d'utilisateurs, jamais. */
const PREUVES = ["102 mouvements animés", "53 séances guidées", "Gratuit, sans carte bancaire"];

function Heros() {
  const titre = useRef<HTMLHeadingElement>(null);
  useTitreQuiSouvre(titre);
  return (
    <section className={s.heros}>
      <nav className={s.nav} aria-label="Vaiiya">
        <span className={s.marque}>
          <Image src="/marque/logo-degrade.png" alt="" width={34} height={34} priority />
          Vaiiya
        </span>
        <Link href="/auth?mode=login" className={s.connexion}>
          Se connecter
          <span aria-hidden><ArrowRight size={15} strokeWidth={2.5} /></span>
        </Link>
      </nav>

      {/* Le bloc de texte ne grandit jamais au point de pousser les Guides
          sous le pli : c'est le défaut de la version d'avant, où le titre
          se réglait sur la largeur seule. */}
      <div className={s.herosBloc}>
        <h1 ref={titre} className={s.h1}>
          <span data-sens="-1"><span className={s.mot}>Deviens</span></span>
          <span data-sens="1"><span className={s.mot} style={{ animationDelay: ".1s" }}>qui tu veux</span></span>
        </h1>
        <p className={s.herosTexte}>
          Tes séances, tes repas et <b>un Guide qui te connaît</b>, dans une seule appli.
          Tu choisis Nora ou Sasha, et tu y vas.
        </p>
        {/* Le bouton et son lien passent l'un SOUS l'autre : côte à côte,
            ils se disputaient la ligne et le lien se lisait comme un second
            bouton. Le violet plein reste la seule action. */}
        <div className={s.herosActions}>
          <Bouton label="Commencer gratuitement" />
          <a href={`#${DISCOVER_ANCHOR}`} className={s.lienDoux}>Voir ce qu’il y a dedans</a>
        </div>
        <p className={s.preuve}>
          {PREUVES.map((p) => <span key={p}>{p}</span>)}
        </p>
      </div>

      <div className={s.scene}>
        <Escalier />
        <div className={s.duoHeros}>
          <div className={`${s.guideHeros} ${s.noraHeros}`}>
            <Image src="/guides/nora-master-v1.webp" alt="Nora, Guide Vaiiya" fill sizes="(min-width: 960px) 420px, 60vw" priority />
          </div>
          <div className={`${s.guideHeros} ${s.sashaHeros}`}>
            <Image src="/guides/sasha-master-v1.webp" alt="Sasha, Guide Vaiiya" fill sizes="(min-width: 960px) 420px, 60vw" priority />
          </div>
        </div>
        <div className={s.prenoms} aria-hidden><span>Nora</span><span>Sasha</span></div>
      </div>
    </section>
  );
}

/* ═══════════════ 2 · LES MOUVEMENTS ═══════════════ */

const RANGEE_1 = ["Squat", "Pompes", "Gainage", "Fentes", "Jumping jacks", "Burpees", "Développé couché", "Soulevé de terre classique"];
const RANGEE_2 = ["Rowing barre", "Élévations latérales", "Kettlebell swing", "Crunch", "Mountain climbers", "Hip thrust", "Dead bug", "Superman"];
const anime = (n: string) => !!resolveGuide(n);

/* ⚠️ Une MOITIÉ du rail doit être plus large que l'écran, sinon la fin du
   rail entre à l'écran avant le raccord et la boucle saute. Huit cartes
   font 1 312 px : c'était moins qu'un écran d'ordinateur, d'où un vide qui
   grandissait à droite puis un saut (Louis, 2026-10-13). Deux tours par
   moitié font 2 624 px. */
const TOURS_PAR_MOITIE = 2;

function Rangee({ noms, inverse = false }: { noms: string[]; inverse?: boolean }) {
  const liste = noms.filter(anime);
  const moitie = Array.from({ length: TOURS_PAR_MOITIE }, () => liste).flat();
  return (
    <div className={`${s.rail} ${inverse ? s.railInverse : ""}`} style={{ "--cartes": moitie.length } as React.CSSProperties}>
      {/* Deux moitiés identiques : le rail recule d'exactement une moitié, puis
          repart du début sans raccord. Seul le premier tour se lit à voix haute. */}
      {[0, 1].map((copie) => (
        <div key={copie} className={s.railMoitie} aria-hidden={copie === 1 || undefined}>
          {moitie.map((nom, i) => {
            const lu = copie === 0 && i < liste.length;
            return (
              <div key={`${i}-${nom}`} className={s.mvt} aria-hidden={(copie === 0 && !lu) || undefined}>
                <div className={s.mvtImage}>
                  <AnimationExercice nom={nom} taille="100%" label={lu ? nom : ""} />
                </div>
                <b>{nom}</b>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Mouvements({ chiffres }: { chiffres: ChiffresPublics }) {
  return (
    <section id={DISCOVER_ANCHOR} className={`${s.mouvements} scroll-mt-4`}>
      <div className={`${s.wrap} ${s.centre}`} data-reveal>
        <Surtitre>Montrés, pas expliqués</Surtitre>
        <h2 className={s.titre}>
          <span className="vy-nombre" style={{ fontWeight: 800 }}>{chiffres.mouvements}</span> mouvements <span className={s.accent}>qui bougent.</span>
        </h2>
        <p className={s.chapo}>
          Chaque exercice est montré pose après pose. Tu suis une des {chiffres.seances} séances guidées,
          ou tu composes la tienne en deux minutes.
        </p>
      </div>
      <div className={s.bandeau}>
        <Rangee noms={RANGEE_1} />
        <Rangee noms={RANGEE_2} inverse />
      </div>
    </section>
  );
}

/* ═══════════════ 3 · LE GUIDE ═══════════════ */

function Guide() {
  return (
    <section className={`${s.section} ${s.guide}`}>
      <div className={`${s.wrap} ${s.guideGrille}`}>
        <div data-reveal>
          <Surtitre>Ton Guide personnel</Surtitre>
          <h2 className={s.titre}>Nora ou Sasha. <span className={s.accent}>Tu choisis qui t’accompagne.</span></h2>
          <p className={s.chapo}>
            Tu lui dis ce que tu as, ce que tu veux, ce que tu as mangé. Il prépare, tu valides :
            rien ne s’écrit sans ton accord.
          </p>
          <div className={s.duo}>
            {(["nora", "sasha"] as const).map((g) => (
              <div key={g} className={s.portrait}>
                <Image src={`/guides/${g}-buste-v1.webp`} alt={`Portrait de ${g === "nora" ? "Nora" : "Sasha"}`} fill sizes="210px" className="object-cover" />
                <span>{g === "nora" ? "Nora" : "Sasha"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={s.conversation} data-conversation aria-label="Exemple de conversation avec ton Guide">
          <div className={`${s.message} ${s.moi}`} data-pas="1">J’ai 30 minutes ce soir, et des haltères.</div>
          <div className={`${s.message} ${s.lui}`} data-pas="2">
            <span className={s.avatarGuide} style={{ width: 32, height: 40 }}><Image src="/guides/nora-buste-v1.webp" alt="" width={64} height={80} /></span>
            <p>Parfait, de quoi faire une belle séance. Je te prépare ça.</p>
          </div>
          <div className={s.carteProp} data-pas="3">
            <div className={s.carteCorps}>
              <small>Séance proposée · 30 min</small>
              <b>Haut du corps · Haltères</b>
              <div className={s.carteMvts}>
                {["Développé couché", "Rowing barre", "Élévations latérales", "Pompes"].map((n) => (
                  <div key={n} style={{ aspectRatio: "1" }}>
                    <AnimationExercice nom={n} taille="100%" label="" />
                  </div>
                ))}
              </div>
              <span className={s.carteBouton}>Garder la séance <Check size={14} strokeWidth={3} /></span>
              <span className={s.carteNote}>Tu valides, il l’ajoute.</span>
            </div>
          </div>
          <div className={`${s.message} ${s.moi}`} data-pas="4">Top, je la fais maintenant.</div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ 4 · TOUT EST RELIÉ ═══════════════ */

const NOEUDS = [
  { x: 24, y: 20, titre: "Ta séance", texte: "Terminée, elle coche ta mission du jour.", icone: Dumbbell, fond: "#F1EBFF", couleur: "#7C4FE0" },
  { x: 76, y: 20, titre: "Tes repas", texte: "Notés, ils tiennent ta série.", icone: ChefHat, fond: "#FFF0E2", couleur: "#E8620C" },
  { x: 24, y: 80, titre: "Ton Guide", texte: "Il sait tout ça sans que tu recopies.", icone: MessageCircle, fond: "#FBE6FF", couleur: "#C13BC1" },
  { x: 76, y: 80, titre: "Ton rang", texte: "Ton EXP monte à ton rythme.", icone: Trophy, fond: "#E3FAF2", couleur: "#0B8A68" },
];

function ToutRelie() {
  return (
    <section className={`${s.section} ${s.relie}`}>
      <div className={`${s.wrap} ${s.centre}`}>
        <div data-reveal>
          <Surtitre>Tout au même endroit</Surtitre>
          <h2 className={s.titre}>Et <span className={s.accent}>tout se parle.</span></h2>
          <p className={s.chapo}>
            Comme les branches du logo qui se rejoignent en un point : une séance terminée fait avancer ta semaine,
            nourrit ton rang, et ton Guide le sait déjà.
          </p>
        </div>
        <div className={s.constellation} data-reveal>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="vitrine-fil" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#A66CF4" />
                <stop offset=".55" stopColor="#E68FC6" />
                <stop offset="1" stopColor="#FEB86E" />
              </linearGradient>
            </defs>
            {NOEUDS.map((n) => {
              const d = `M${n.x} ${n.y} Q ${(n.x + 50) / 2} ${n.y < 50 ? 50 : 50} 50 50`;
              return (
                <g key={n.titre}>
                  <path className={s.fil} d={d} vectorEffect="non-scaling-stroke" />
                  <path className={s.flux} d={d} vectorEffect="non-scaling-stroke" pathLength={242} />
                </g>
              );
            })}
          </svg>
          <div className={s.coeur}>
            <Image src="/marque/logo-degrade.png" alt="Le logo Vaiiya" width={120} height={120} />
          </div>
          {NOEUDS.map((n) => {
            const Icone = n.icone;
            return (
              <div key={n.titre} className={s.noeud} style={{ left: `${n.x}%`, top: `${n.y}%` }}>
                <b><i style={{ background: n.fond, color: n.couleur }}><Icone size={15} /></i>{n.titre}</b>
                <span>{n.texte}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ 5 · LE CHEMIN ═══════════════ */

type Etape = {
  quand: string;
  titre: string;
  texte: string;
  photo: string;
  repere: string;
  pastilles: { texte: string; ton: "violet" | "feu" | "teal" }[];
};

const ETAPES: Etape[] = [
  { quand: "Jour 1", titre: "12 minutes dans ton salon.", texte: "Ta première séance, sans matériel. Tu la fais en entier.",
    photo: "/entrainement/cat-sansmateriel.webp", repere: "/rangs/rank-01-bronze.png",
    pastilles: [{ texte: "+30 EXP", ton: "violet" }, { texte: "Bronze", ton: "violet" }] },
  { quand: "Semaine 2", titre: "Ta série tient, même les jours chargés.", texte: "Une séance ou un repas noté suffit pour la garder.",
    photo: "/entrainement/cardio-saut.webp", repere: "/rangs/rank-02-argent.png",
    pastilles: [{ texte: "10 jours", ton: "feu" }, { texte: "Argent", ton: "violet" }] },
  { quand: "Mois 1", titre: "Tu entraînes un ami avec toi.", texte: "Votre relais révèle une affiche, séance après séance.",
    photo: "/vitrine/course-ville.webp", repere: "/defis/sillage/04.webp",
    pastilles: [{ texte: "Relais gagné", ton: "teal" }] },
  { quand: "Mois 3", titre: "Tu y vas sans te poser la question.", texte: "C’est devenu une partie de toi.",
    photo: "/vitrine/coureuse-aube.webp", repere: "/rangs/rank-03-or.png",
    pastilles: [{ texte: "Or", ton: "violet" }, { texte: "63 jours", ton: "feu" }] },
];

const TON = {
  violet: { background: "#F3EEFF", color: "#5B3FC4" },
  feu: { background: "#FFF0E2", color: "#B4570C" },
  teal: { background: "#E3FAF2", color: "#0B7A5C" },
};

function Chemin() {
  return (
    <section className={`${s.section} ${s.chemin}`}>
      <div className={s.wrap}>
        <div className={s.centre} data-reveal>
          <Surtitre>Dans trois mois</Surtitre>
          <h2 className={s.titre}>Tu iras t’entraîner <span className={s.accent}>sans y penser.</span></h2>
          <p className={s.chapo}>
            Vaiiya transforme l’envie en habitude : une séance à ta mesure, des repas suivis,
            et quelqu’un pour te relancer au bon moment.
          </p>
        </div>
        <ol className={s.etapes}>
          {ETAPES.map((e, i) => (
            <li key={e.quand} className={s.etape} data-derniere={i === ETAPES.length - 1 || undefined} data-reveal>
              <div className={s.etapePhoto}>
                <Image src={e.photo} alt="" fill sizes="(min-width: 960px) 25vw, 78vw" className="object-cover" />
                <span className={s.etapeRepere}>
                  <Image src={e.repere} alt="" width={40} height={40} style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 8 }} />
                </span>
              </div>
              <div className={s.etapeCorps}>
                <span className="vy-nombre" style={{ fontSize: 13, color: "#B4570C" }}>{e.quand}</span>
                <h3>{e.titre}</h3>
                <p>{e.texte}</p>
                <div className={s.pastilles}>
                  {e.pastilles.map((p) => <span key={p.texte} style={TON[p.ton]}>{p.texte}</span>)}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-center text-[13px]" style={{ color: "#7B7389" }}>
          Exemple de parcours. Le tien ira à ton rythme, et c’est très bien comme ça.
        </p>
      </div>
    </section>
  );
}

/* ═══════════════ 6 · NUTRITION ═══════════════ */

function Nutrition() {
  return (
    <section className={`${s.section} ${s.nutrition}`}>
      <div className={`${s.wrap} ${s.nutriGrille}`}>
        <div className={s.assiette} data-reveal>
          <Image src="/recipes/poke-bowl-saumon-avocat.jpg" alt="Un poke bowl au saumon et à l’avocat, analysé par Vaiiya" fill sizes="(min-width: 960px) 460px, 100vw" className="object-cover" />
          <span className={s.scan} aria-hidden />
          <span className={s.ligneScan} aria-hidden />
          <span className={`${s.macro} ${s.macroA}`} aria-hidden>Riz · <b className="vy-nombre">150</b> g</span>
          <span className={`${s.macro} ${s.macroB}`} aria-hidden>Saumon · <b className="vy-nombre">120</b> g</span>
          <span className={`${s.macro} ${s.macroC}`} aria-hidden>Avocat · <b className="vy-nombre">60</b> g</span>
          <span className={s.resultat} aria-hidden>Estimation · ~<b className="vy-nombre">640</b>kcal</span>
        </div>
        <div data-reveal>
          <Surtitre>Tes repas, sans prise de tête</Surtitre>
          <h2 className={s.titre}>Une photo, <span className={s.accent}>et c’est noté.</span></h2>
          <p className={s.chapo}>
            Prends ton assiette en photo : Vaiiya estime les calories et les macros, élément par élément.
          </p>
          <ul className={s.listeNutri}>
            <li><i style={{ background: "#FFF0E2", color: "#E8620C" }}><Camera size={17} /></i><div><b>Ton assiette en photo</b><span>Calories et macros estimées.</span></div></li>
            <li><i style={{ background: "#F1EBFF", color: "#7C4FE0" }}><ChefHat size={17} /></i><div><b>Une recette avec tes restes</b><span>Tu dis ce que tu as, il propose.</span></div></li>
            <li><i style={{ background: "#E3FAF2", color: "#0B8A68" }}><Store size={17} /></i><div><b>La carte du resto</b><span>Les plats rangés selon ton objectif.</span></div></li>
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ 7 · LES RANGS ═══════════════ */

function Rangs() {
  const rangs = RANGS.filter((r) => r.image);
  return (
    <section className={`${s.section} ${s.rangs}`}>
      <div className={`${s.wrap} ${s.centre}`}>
        <div data-reveal>
          <Surtitre>Ta progression</Surtitre>
          <h2 className={s.titre}>Six rangs. <span className={s.accent}>Chacun se mérite en revenant.</span></h2>
          <p className={s.chapo}>
            Chaque séance et chaque repas noté te rapportent de l’EXP. Personne contre qui te comparer :
            tu montes à ton rythme.
          </p>
        </div>
        <ol className={s.escalier} data-reveal>
          {rangs.map((r, i) => (
            <li key={r.id} className={s.marche}>
              <div className={s.gemme} style={{ maxWidth: 64 + i * 10 }}>
                <Image src={r.image!} alt="" fill sizes="120px" style={{ objectFit: "contain", filter: "drop-shadow(0 14px 18px rgba(0,0,0,.35))" }} />
              </div>
              <div className={s.socle} style={{ height: 50 + i * 26 }}>
                <b>{r.nom}</b>
                <span className="vy-nombre">{r.min} EXP</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ═══════════════ 8 · LE RELAIS ═══════════════ */

function Relais() {
  return (
    <section className={`${s.section} ${s.relais}`}>
      <div className={`${s.wrap} ${s.relaisGrille}`}>
        <div className={s.affiche} data-reveal aria-label="L’affiche Sillage qui se dévoile en quatre étapes" role="img">
          {["01", "02", "03", "04"].map((n) => (
            <div key={n}>
              <Image src={`/defis/sillage/${n}.webp`} alt="" fill sizes="300px" className="object-cover" />
            </div>
          ))}
          <span className={s.afficheSignature}>✦ VAIIYA</span>
        </div>
        <div data-reveal>
          <Surtitre>À deux, c’est plus facile</Surtitre>
          <h2 className={s.titre}>Le relais : <span className={s.accent}>une affiche qui se révèle</span> à chaque séance.</h2>
          <p className={s.chapo}>
            Lance-le avec un ami. Quatre séances à vous deux dans la semaine, et l’affiche est à vous.
            Pas de classement, pas de reproche : on avance ensemble.
          </p>
          <div className={s.maillons} aria-hidden><i /><i /><i /><i /></div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ 9 · L'OFFRE ═══════════════ */

const INCLUS = [
  "Les séances guidées du catalogue",
  "Les mouvements animés, pour composer les tiennes",
  "Ton Guide, Nora ou Sasha",
  "La nutrition par photo",
  "Ton planning de la semaine",
  "Ton rang, ton EXP et tes missions",
  "Le relais à deux avec un proche",
  "Zéro pub",
];

function Offre() {
  return (
    <section className={`${s.section} ${s.offre}`}>
      <div className={s.wrap}>
        <div className={s.centre} data-reveal>
          <Surtitre>Le compte gratuit</Surtitre>
          <h2 className={s.titre}>Tu commences avec <span className={s.accent}>tout ça.</span></h2>
          <p className={s.chapo}>Pas une version bridée le temps d’un essai : le compte gratuit, c’est le produit, pour de vrai.</p>
        </div>
        <div className={s.offreGrille}>
          <div className={s.offreCarte} data-reveal>
            <h3>Gratuit</h3>
            <ul>
              {INCLUS.map((b) => (
                <li key={b}><span className={s.coche}><Check size={12} color="#04150F" strokeWidth={3.5} /></span>{b}</li>
              ))}
            </ul>
          </div>
          <div className={`${s.offreCarte} ${s.plus}`} data-reveal>
            <h3>Vaiiya+</h3>
            <span className={s.bientot}>Arrive bientôt</span>
            <ul>
              <li><span className={s.coche} style={{ background: "#F5B120" }}><Check size={12} color="#3A2600" strokeWidth={3.5} /></span>Les séances spécialisées</li>
              <li><span className={s.coche} style={{ background: "#F5B120" }}><Check size={12} color="#3A2600" strokeWidth={3.5} /></span>Les missions en plus</li>
              <li><span className={s.coche} style={{ background: "#F5B120" }}><Check size={12} color="#3A2600" strokeWidth={3.5} /></span>Le Guide sans limite</li>
            </ul>
            <p className={s.prix}><b className="vy-nombre">{formatPrice(PLANS.premium.priceCents)}</b><span>par mois, à l’ouverture</span></p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ 10 · AVIS, FIN, PIED ═══════════════ */

function Etoiles({ note }: { note: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={15} height={15} viewBox="0 0 24 24" aria-hidden
          fill={n <= note ? "#F5B120" : "transparent"} stroke={n <= note ? "#F5B120" : "#D9CFEF"} strokeWidth={1.6} strokeLinejoin="round">
          <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.9l-5.8 3 1.1-6.45-4.7-4.6 6.5-.95z" />
        </svg>
      ))}
    </span>
  );
}

function Avis({ avis }: { avis: ResumeAvis }) {
  if (avis.total < SEUIL_AVIS_PUBLIC) return null;
  return (
    <section className={`${s.section} ${s.avis}`}>
      <div className={`${s.wrap} ${s.centre}`}>
        <div data-reveal>
          <Surtitre>Les avis</Surtitre>
          <h2 className={s.titre}>Ils utilisent Vaiiya <span className={s.accent}>au quotidien.</span></h2>
          <p className="mt-4 flex items-center justify-center gap-3" style={{ color: "#5C5468" }}>
            <b className="vy-nombre" style={{ fontSize: 26, color: "#1C1626" }}>{avis.moyenne.toFixed(1).replace(".", ",")}</b>
            <Etoiles note={Math.round(avis.moyenne)} />
            <span className="text-[13px]">sur {avis.total} avis</span>
          </p>
        </div>
        <div className={s.avisGrille}>
          {avis.apercu.map((a) => (
            <div key={a.id} className={s.avisCarte} data-reveal>
              <div className="flex items-center gap-2.5 mb-2">
                {a.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.avatar_url} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <span className="w-9 h-9 rounded-full grid place-items-center text-white font-bold" style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)" }}>
                    {a.pseudo.charAt(0).toUpperCase()}
                  </span>
                )}
                <b className="text-[16px]">{a.pseudo}</b>
              </div>
              <Etoiles note={a.note} />
              {a.texte.trim() && <p>{a.texte}</p>}
            </div>
          ))}
        </div>
        <div className="mt-8"><Link href="/avis" className={s.lienDoux}>Voir tous les avis</Link></div>
      </div>
    </section>
  );
}

function Fin() {
  return (
    <section className={s.fin}>
      <div className={s.wrap} data-reveal>
        <Image src="/marque/logo-degrade.png" alt="" width={76} height={76} className={s.finLogo} />
        <h2 className={s.finTitre}>Commence là où <span className={s.accent}>tu en es.</span></h2>
        <p className={s.chapo} style={{ margin: "18px auto 30px" }}>Une séance suffit pour savoir si Vaiiya est fait pour toi.</p>
        <Bouton label="Créer mon compte gratuit" />
        <p className="mt-4 text-[13px]" style={{ color: "#7B7389" }}>
          Sans carte bancaire · Déjà un compte ?{" "}
          <Link href="/auth?mode=login" style={{ color: "#5B3FC4", fontWeight: 700 }}>Se connecter</Link>
        </p>
      </div>
    </section>
  );
}

function Pied() {
  return (
    <footer className={s.pied}>
      <div className={s.wrap}>
        <div className={s.piedGrille}>
          <div>
            <span className={s.marque}>
              <Image src="/marque/logo-degrade.png" alt="" width={28} height={28} />
              Vaiiya
            </span>
            <p>Tes séances, tes repas et ton Guide au même endroit. Application web, en français.</p>
          </div>
          <div>
            <h4>Comprendre</h4>
            <ul>{SEO_PAGES.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}</ul>
          </div>
          <div>
            <h4>Vaiiya</h4>
            <ul>
              <li><Link href="/auth?mode=login">Se connecter</Link></li>
              <li><Link href="/premium">Vaiiya+</Link></li>
              {LEGAL_PAGES.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
            </ul>
          </div>
        </div>
        <p className={s.copyright}>© {new Date().getFullYear()} Vaiiya · Entraînement · Nutrition · Guide IA</p>
      </div>
    </footer>
  );
}

export default function LandingVitrine({ chiffres, avis }: { chiffres: ChiffresPublics; avis: ResumeAvis }) {
  const racine = useRef<HTMLDivElement>(null);
  useRevelation(racine);
  return (
    <div ref={racine} className={s.page}>
      <Heros />
      <Mouvements chiffres={chiffres} />
      <Guide />
      <ToutRelie />
      <Chemin />
      <Nutrition />
      <Rangs />
      <Relais />
      <Offre />
      <Avis avis={avis} />
      <Fin />
      <Pied />
    </div>
  );
}
