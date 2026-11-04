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
 * Rendue vivante le 2026-11-04 (maquette « La vitrine vivante », GO de Louis) :
 * le logo en fond, une conversation qui s'écrit, des phrases qui défilent. Ce
 * fichier écrit toute la page, et `vivant/` ne fait que la jouer : il se charge
 * à part, quand la vitrine est à l'écran, et tout reste lisible sans lui.
 *
 * ⚠️ DÉCISIONS DE LOUIS À NE PAS DÉFAIRE.
 *   · La page dure une journée : la nuit au héros et à la fin, le clair entre
 *     les deux, deux dégradés droits dans l'ordre du logo pour passer de l'un
 *     à l'autre. Couleurs écrites en dur dans le module CSS.
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

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUp, Camera, Check, ChefHat, Dumbbell, MessageCircle, Store, Trophy } from "lucide-react";
import AnimationExercice from "@/components/exercices/AnimationExercice";
import { resolveGuide } from "@/lib/exerciseGuides";
import { RANGS } from "@/lib/aura";
import { PRENOM_GUIDE, roleGuide, voix, type GuideId } from "@/lib/guides";
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

    const cibles = Array.from(el.querySelectorAll<HTMLElement>("[data-reveal]"));
    const pli = window.innerHeight * 0.92;
    const io = new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        if (!e.isIntersecting) continue;
        const t = e.target as HTMLElement;
        requestAnimationFrame(() => t.removeAttribute("data-attente"));
        io.unobserve(t);
      }
    }, { rootMargin: "0px 0px -8% 0px" });

    for (const t of cibles) {
      if (t.getBoundingClientRect().top < pli) continue;
      t.classList.add(s.revele);
      t.setAttribute("data-attente", "");
      io.observe(t);
    }
    return () => io.disconnect();
  }, [racine]);
}

/* ═══════════════ Ce qui vit par script ═══════════════
   `vivant/` se charge à part et seulement quand la vitrine est à l'écran.
   ⚠️ `a-session` la garde masquée chez un membre le temps de lire sa session :
   l'observateur ne répond alors jamais, et un membre ne charge rien. Si le jeton
   était périmé, la classe se lève et la vitrine démarre à ce moment-là. */
function useVivante(racine: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = racine.current;
    if (!el) return;
    let parti = false;
    let arreter: (() => void) | undefined;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      import("./vivant/vitrineVivante")
        .then(({ animerVitrine }) => { if (!parti) arreter = animerVitrine(el, s); })
        .catch((erreur) => console.warn("Vitrine : la page reste sans animation.", erreur));
    });
    io.observe(el);
    return () => {
      parti = true;
      io.disconnect();
      arreter?.();
    };
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

/* ⚠️ CES TROIS MENTIONS SONT DES FAITS, ET CHACUNE EST UN CLAIM AUTORISÉ
   (`docs/positionnement-public-vaiiya.md` §13). Les deux nombres viennent
   de `chiffresPublics`, comptés côté serveur sur `EXERCISE_LIBRARY` et
   `workoutSessions` : ils étaient écrits ici à la main et le catalogue
   avait grandi sans eux (53 séances annoncées pour 80 le 2026-10-27).
   Aucun chiffre d'utilisateurs, jamais. */
const preuves = (c: ChiffresPublics) => [
  `${c.mouvements} mouvements animés`,
  `${c.seances} séances guidées`,
  "Gratuit, sans carte bancaire",
];

function Heros({ chiffres }: { chiffres: ChiffresPublics }) {
  return (
    <section className={s.heros} data-heros data-vivant>
      {/* Le logo en fond (`vivant/fondLogo.ts`). Tant qu'il n'est pas dessiné,
          le canevas est transparent et la nuit du CSS est déjà là. */}
      <canvas className={s.fond} aria-hidden />
      <nav className={s.nav} aria-label="Vaiiya">
        <span className={s.marque}>
          <Image src="/marque/logo-degrade.png" alt="" width={34} height={25} preload />
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
        <h1 className={s.h1}>
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
          {preuves(chiffres).map((p) => <span key={p}>{p}</span>)}
        </p>
      </div>

      {/* L'escalier de lumière qui passait derrière eux est retiré en
          entier (Louis, 2026-10-20) : la scène n'a plus de géométrie. */}
      <div className={s.scene}>
        <div className={s.duoHeros}>
          <div className={`${s.guideHeros} ${s.noraHeros}`}>
            <Image src="/guides/nora-master-v1.webp" alt="Nora, Guide Vaiiya" fill sizes="(min-width: 960px) 420px, 60vw" preload />
          </div>
          <div className={`${s.guideHeros} ${s.sashaHeros}`}>
            <Image src="/guides/sasha-master-v1.webp" alt="Sasha, Guide Vaiiya" fill sizes="(min-width: 960px) 420px, 60vw" preload />
          </div>
        </div>
        <div className={s.jourMonte} data-monte aria-hidden />
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
    <div className={`${s.rail} ${inverse ? s.railInverse : ""}`} style={{ "--cartes": moitie.length } as CSSProperties}>
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
        <h2 className={s.titre}>
          <span className="vy-nombre" style={{ fontWeight: 800 }}>{chiffres.mouvements}</span> mouvements, <span className={s.accent}>montrés et expliqués.</span>
        </h2>
        <p className={s.chapo}>
          Chaque exercice est montré pose après pose. Tu suis une des {chiffres.seances} séances guidées,
          ou tu composes la tienne en deux minutes.
        </p>
      </div>
      <div className={s.bandeau} data-vivant>
        <Rangee noms={RANGEE_1} />
        <Rangee noms={RANGEE_2} inverse />
      </div>
    </section>
  );
}

/* ═══════════════ 3 · LE GUIDE ═══════════════ */

const GUIDES: GuideId[] = ["nora", "sasha"];
const ETATS_VISAGE = ["listen", "think", "explain", "encourage"] as const;
const MOUVEMENTS_PROPOSES = ["Développé militaire haltères", "Rowing haltère", "Élévations latérales", "Curl haltères"];

/* Les trois cartes de la conversation. Elles sont écrites ici, avec le reste
   de la page, et `vivant/conversation.ts` les recopie dans le fil. */
function PieceSeance() {
  return (
    <div className={s.piece} data-piece="seance">
      <div className={s.piecePoses}>
        {MOUVEMENTS_PROPOSES.map((n) => <div key={n}><AnimationExercice nom={n} taille="100%" label={n} /></div>)}
      </div>
      <div className={s.pieceLigne}><b>Haut du corps</b><span className="vy-nombre">30 min</span></div>
      <div className={s.pieceBouton} data-bouton>On y va</div>
    </div>
  );
}

function PieceRepas() {
  return (
    <div className={s.piece} data-piece="repas">
      <div className={s.pieceRepas}>
        <div className={s.pieceRepasPhoto}>
          <Image src="/recipes/poke-bowl-saumon-avocat.jpg" alt="" fill sizes="76px" className="object-cover" />
        </div>
        <div>
          <small>Repas à noter · Déjeuner</small>
          <b>Poke bowl saumon-avocat</b>
          <p>~<span className="vy-nombre">745</span> kcal · <span className="vy-nombre">37</span> g de protéines</p>
        </div>
      </div>
      <div className={s.pieceBouton} data-bouton>Noter le repas</div>
    </div>
  );
}

function PieceDeplacer() {
  return (
    <div className={s.piece} data-piece="deplacer">
      <p className={s.pieceEtiquette}>Ta semaine</p>
      <div className={s.pieceLigne} style={{ marginTop: 0 }}><b>Push</b><span className="vy-nombre">45 min</span></div>
      <div className={s.pieceJours}><s>mercredi</s><ArrowRight size={18} strokeWidth={2.4} aria-hidden /><span>jeudi</span></div>
      <div className={s.pieceBouton} data-bouton>Déplacer à jeudi</div>
    </div>
  );
}

function Conversation() {
  return (
    <div className={s.conv} data-conv data-vivant role="group" aria-label="Exemple de conversation avec ton Guide">
      <div className={s.convHalo} aria-hidden />
      <div className={s.convTete}>
        <div className={s.convVisage} aria-hidden>
          {GUIDES.flatMap((g) => ETATS_VISAGE.map((e) => (
            <Image key={`${g}-${e}`} src={`/guides/${g}-${e}-entete-v1.webp`} alt="" fill sizes="44px"
              data-visage={`${g}-${e}`} className={g === "nora" && e === "listen" ? s.on : undefined} />
          )))}
        </div>
        <div className={s.convNoms}>
          <div className={s.convNom} data-conv-nom>{PRENOM_GUIDE.nora}</div>
          <div className={s.convStatut} data-conv-statut>{roleGuide("nora")} · <b>t’écoute</b></div>
        </div>
      </div>
      <div className={s.convFil} data-conv-fil>
        <div className={s.convPile} data-conv-repli>
          <div className={`${s.bulle} ${s.moi}`}>J’ai 30 minutes ce soir, et des haltères.</div>
          <div className={`${s.bulle} ${s.lui}`}>{voix("nora", "vitrine.seance")}</div>
          <PieceSeance />
        </div>
        <div className={s.convPile} data-conv-pile aria-hidden />
      </div>
      <div className={s.convSaisie} data-conv-saisie>
        <div className={s.convTexte} data-conv-texte><em>Écris à {PRENOM_GUIDE.nora}…</em></div>
        <span className={s.convEnvoi} aria-hidden><ArrowUp size={18} strokeWidth={2.6} /></span>
      </div>
      <div hidden>
        <PieceRepas />
        <PieceDeplacer />
      </div>
    </div>
  );
}

function Guide() {
  return (
    <section className={`${s.section} ${s.guide}`}>
      <div className={`${s.wrap} ${s.guideGrille}`}>
        <div data-reveal>
          <Surtitre>Ton Guide personnel</Surtitre>
          <h2 className={s.titre}>Nora ou Sasha. <span className={s.accent}>Tu choisis qui t’accompagne.</span></h2>
          <p className={s.chapo}>
            Tu lui dis ce que tu as, ce que tu veux, ce que tu as mangé. Il prépare, tu valides :
            rien ne s’écrit sans ton accord.
          </p>
          <div className={s.duo} role="group" aria-label="Choisir le Guide de la conversation">
            {GUIDES.map((g) => (
              <button key={g} type="button" className={s.portrait} data-guide={g} aria-pressed={g === "nora"}>
                <Image src={`/guides/${g}-buste-v1.webp`} alt={`Portrait de ${PRENOM_GUIDE[g]}`} fill sizes="210px" className="object-cover" />
                <span>{PRENOM_GUIDE[g]}</span>
              </button>
            ))}
          </div>
        </div>
        <Conversation />
      </div>
    </section>
  );
}

/* ═══════════════ 3 BIS · LES PHRASES ═══════════════
   Chaque phrase correspond à une action réelle du Guide : ce qu'on écrit ici
   doit rester vrai dans la conversation de l'app. */

const PHRASES = [
  ["J’ai 30 minutes ce soir", "Décale ma séance à demain", "Je mange quoi ce midi ?", "Refais ma semaine", "Mets du dos jeudi", "J’ai mangé un burger ce midi"],
  ["Une recette avec du riz et des œufs", "Note un yaourt à mes repas", "Ajoute une petite séance cardio samedi", "Passe en mode sombre", "Remplace ma séance par Express 12"],
  ["Je n’ai que des haltères à la maison", "Saute ma prochaine étape", "J’ai 20 minutes et pas de matériel", "Évite le Push pendant 10 jours", "Une séance sans saut, mes voisins dorment"],
  ["Au petit-déj, deux œufs", "Retire ma séance de vendredi", "Il me reste du poulet et des courgettes", "Fais-moi une séance jambes de 30 minutes", "Je m’entraîne à la salle maintenant"],
  ["Montre-moi ma progression", "Une idée de dîner léger", "Ce soir je suis à la maison", "Déplace Pull à samedi", "Une séance de mobilité ce soir"],
];

function Parler() {
  return (
    <section className={s.parler}>
      <div className={s.wrap}>
        <div className={s.parlerPanneau} data-vivant data-reveal>
          <div className={s.parlerTete}>
            <h2>Écris-lui comme tu parles.</h2>
            <p>Une phrase suffit. Ton Guide comprend ce que tu veux et prépare une carte à valider.</p>
          </div>
          <div className={s.lignes} aria-hidden>
            {PHRASES.map((liste, i) => (
              <div key={liste[0]} className={`${s.ligne} ${i % 2 ? s.ligneInverse : ""}`} style={{ "--d": `${52 + (i * 13) % 24}s` } as CSSProperties}>
                {[0, 1].map((copie) => (
                  <div key={copie} className={s.ligneMoitie}>
                    {[...liste, ...liste].map((t, k) => <span key={`${k}-${t}`}>{t}</span>)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ 4 · TOUT SE PARLE ═══════════════ */

type Noeud = {
  x: number;
  y: number;
  titre: string;
  texte: string;
  icone: typeof Dumbbell;
  fond: string;
  couleur: string;
  classe: string;
  pouls: string;
  pastilles: { classe: string; contenu: ReactNode }[];
};

const NOEUDS: Noeud[] = [
  { x: 24, y: 20, titre: "Ta séance", texte: "Terminée, elle coche ta mission du jour.", icone: Dumbbell, fond: "#F1EBFF", couleur: "#7C4FE0",
    classe: s.nSeance, pouls: s.pSeance, pastilles: [{ classe: `${s.fait} ${s.tA1}`, contenu: "Séance terminée ✓" }] },
  { x: 76, y: 20, titre: "Tes repas", texte: "Notés, ils tiennent ta série.", icone: ChefHat, fond: "#FFF0E2", couleur: "#E8620C",
    classe: s.nRepas, pouls: s.pRepas, pastilles: [{ classe: `${s.fait} ${s.tB1}`, contenu: "Repas noté ✓" }] },
  { x: 24, y: 80, titre: "Ton Guide", texte: "Il sait tout ça sans que tu recopies.", icone: MessageCircle, fond: "#FBE6FF", couleur: "#C13BC1",
    classe: s.nGuide, pouls: s.pGuide, pastilles: [
      { classe: `${s.sait} ${s.tA2}`, contenu: "Il voit ta séance" },
      { classe: `${s.sait} ${s.tB2}`, contenu: "Il voit ton repas" },
    ] },
  { x: 76, y: 80, titre: "Ton rang", texte: "Ton EXP monte à ton rythme.", icone: Trophy, fond: "#E3FAF2", couleur: "#0B8A68",
    classe: s.nRang, pouls: s.pRang, pastilles: [
      { classe: `${s.exp} ${s.tA2}`, contenu: <><span className="vy-nombre" style={{ fontWeight: 700 }}>+30</span> EXP</> },
      { classe: `${s.exp} ${s.tB2}`, contenu: <><span className="vy-nombre" style={{ fontWeight: 700 }}>+5</span> EXP</> },
    ] },
];

function ToutRelie() {
  return (
    <section className={`${s.section} ${s.relie}`}>
      <div className={`${s.wrap} ${s.centre}`}>
        <div data-reveal>
          <Surtitre>Tout au même endroit</Surtitre>
          <h2 className={s.titre}>Et <span className={s.accent}>tout se parle.</span></h2>
          <p className={s.chapo}>
            Comme les branches du logo qui se rejoignent en un point : une séance terminée fait avancer ta semaine,
            nourrit ton rang, et ton Guide le sait déjà.
          </p>
        </div>
        <div className={s.constellation} data-constellation data-vivant>
          {/* Les fils se tracent en pixels réels, une fois la taille connue
              (`vivant/vitrineVivante.ts`). */}
          <svg aria-hidden>
            <defs>
              <linearGradient id="vitrine-fil" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#A66CF4" />
                <stop offset=".55" stopColor="#E68FC6" />
                <stop offset="1" stopColor="#FEB86E" />
              </linearGradient>
              <linearGradient id="vitrine-pouls" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8B5CF6" />
                <stop offset="1" stopColor="#C13BC1" />
              </linearGradient>
            </defs>
            {NOEUDS.map((n) => (
              <g key={n.titre} data-x={n.x} data-y={n.y}>
                <path className={s.fil} />
                <path className={`${s.pouls} ${n.pouls}`} pathLength={100} />
              </g>
            ))}
          </svg>
          <div className={s.coeur}>
            <Image src="/marque/logo-degrade.png" alt="Le logo Vaiiya" width={173} height={128} />
          </div>
          {NOEUDS.map((n) => {
            const Icone = n.icone;
            return (
              <div key={n.titre} className={`${s.noeud} ${n.classe}`} style={{ left: `${n.x}%`, top: `${n.y}%` }}>
                {n.pastilles.map((p, i) => <em key={i} className={`${s.pastille} ${p.classe}`}>{p.contenu}</em>)}
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
  { quand: "Semaine 1", titre: "Ta série tient, même les jours chargés.", texte: "Une séance ou un repas noté suffit pour la garder.",
    photo: "/entrainement/cardio-saut.webp", repere: "/rangs/rank-02-argent.png",
    pastilles: [{ texte: "7 jours", ton: "feu" }, { texte: "Argent", ton: "violet" }] },
  { quand: "Mois 1", titre: "Tu entraînes un ami avec toi.", texte: "Votre relais révèle une affiche, séance après séance.",
    photo: "/vitrine/course-ville.webp", repere: "/rangs/rank-03-or.png",
    pastilles: [{ texte: "Relais gagné", ton: "teal" }, { texte: "Or", ton: "violet" }] },
  { quand: "Mois 6", titre: "Le dernier rang est à toi.", texte: "Ton pseudo passe en lumière sur ton profil.",
    photo: "/vitrine/coureuse-aube.webp", repere: "/rangs/rank-06-eternel.png",
    pastilles: [{ texte: "Éternel", ton: "violet" }] },
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
          <Surtitre>Dans six mois</Surtitre>
          <h2 className={s.titre}>Tu commences Bronze. <span className={s.accent}>Tu vises Éternel.</span></h2>
          <p className={s.chapo}>
            Une séance à ta mesure, des repas suivis, et quelqu’un pour te relancer au bon moment.
          </p>
        </div>
        <ol className={s.etapes} data-vivant>
          {ETAPES.map((e, i) => (
            <li key={e.quand} className={s.etape} style={{ "--i": i } as CSSProperties} data-reveal>
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
        <p className={s.note}>Exemple de parcours. Le tien ira à ton rythme, et c’est très bien comme ça.</p>
      </div>
    </section>
  );
}

/* ═══════════════ 6 · NUTRITION ═══════════════ */

/* `x` et `y` : le centre de l'aliment sur la photo recadrée, en %.
   ⚠️ CHAQUE ALIMENT DE LA PHOTO EST COMPTÉ (Louis, 2026-11-04 : on ne vend pas
   une estimation qui oublie la moitié de l'assiette). Le total est la somme de
   ce qu'on voit, poids estimés sur la photo, valeurs proches de Ciqual, sauce
   et huile comprises, comme le fait l'analyse de l'app (`calculerRepas`). */
const PLATS = [
  { photo: "/recipes/poke-bowl-saumon-avocat.jpg", kcal: 745, macros: [
    { nom: "Concombre", g: 70, x: 66, y: 21 },
    { nom: "Saumon", g: 130, x: 20, y: 37 },
    { nom: "Avocat", g: 70, x: 56, y: 46 },
    { nom: "Chou rouge", g: 40, x: 80, y: 56 },
    { nom: "Riz", g: 150, x: 30, y: 72 },
    { nom: "Edamame", g: 35, x: 62, y: 79 },
  ] },
  { photo: "/recipes/saumon-roti-et-patate-douce.jpg", kcal: 612, macros: [
    { nom: "Saumon", g: 160, x: 68, y: 30 },
    { nom: "Patate douce", g: 180, x: 26, y: 42 },
    { nom: "Brocoli", g: 130, x: 50, y: 70 },
  ] },
  { photo: "/recipes/steak-hache-patate-douce-rotie-et-haricots-verts.jpg", kcal: 438, macros: [
    { nom: "Patate douce", g: 200, x: 33, y: 29 },
    { nom: "Haricots verts", g: 150, x: 72, y: 50 },
    { nom: "Steak haché", g: 125, x: 36, y: 66 },
  ] },
];

function Nutrition() {
  return (
    <section className={`${s.section} ${s.nutrition}`}>
      <div className={`${s.wrap} ${s.nutriGrille}`}>
        <div className={s.assiette} data-assiette data-vivant role="img"
          aria-label="Trois assiettes analysées l’une après l’autre, avec les aliments reconnus et l’estimation des calories">
          {/* Le premier plat arrive déjà analysé : sans script, il le reste. */}
          {PLATS.map((p, i) => (
            <div key={p.photo} className={`${s.plat} ${i === 0 ? s.on : ""}`} data-plat={p.kcal}>
              <Image src={p.photo} alt="" fill sizes="(min-width: 960px) 460px, 100vw" className="object-cover" />
              {p.macros.map((m) => (
                <span key={m.nom} className={`${s.macro} ${i === 0 ? s.vu : ""}`} data-y={m.y} style={{ left: `${m.x}%`, top: `${m.y}%` }}>
                  {m.nom} · <b className="vy-nombre">{m.g}</b> g
                </span>
              ))}
            </div>
          ))}
          <span className={s.scan} aria-hidden />
          <span className={s.ligneScan} data-ligne-scan aria-hidden />
          <span className={`${s.resultat} ${s.vu}`} data-resultat aria-hidden>
            Estimation · ~<b className="vy-nombre" data-total>{PLATS[0].kcal}</b>kcal
          </span>
        </div>
        <div data-reveal>
          <Surtitre>Tes repas, sans prise de tête</Surtitre>
          <h2 className={s.titre}>Une photo, <span className={s.accent}>et c’est noté.</span></h2>
          <p className={s.chapo}>
            Prends ton assiette en photo : Vaiiya estime les calories et les macros, élément par élément.
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
            Chaque séance et chaque repas noté te rapportent de l’EXP. Personne contre qui te comparer :
            tu montes à ton rythme.
          </p>
        </div>
        <div data-rangs data-vivant>
          <p className={s.compteur} aria-hidden><b className="vy-nombre" data-exp>{rangs[rangs.length - 1].min}</b> EXP</p>
          <ol className={s.escalier} data-escalier>
            {rangs.map((r, i) => (
              <li key={r.id} className={`${s.marche} ${s.atteint}`} data-min={r.min}>
                <div className={s.gemme} style={{ maxWidth: 64 + i * 10 }}>
                  <Image src={r.image!} alt="" fill sizes="120px" style={{ objectFit: "contain", filter: "drop-shadow(0 14px 18px rgba(0,0,0,.3))" }} />
                </div>
                <div className={s.socle} style={{ height: 50 + i * 26 }}>
                  <b>{r.nom}</b>
                  <span className="vy-nombre">{r.min} EXP</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ 8 · LE RELAIS ═══════════════ */

function Relais() {
  return (
    <section className={`${s.section} ${s.relais}`}>
      <div className={`${s.wrap} ${s.relaisGrille}`}>
        <div className={s.affiche} data-vivant aria-label="L’affiche Sillage qui se dévoile en trois temps" role="img">
          {["01", "02", "03", "04"].map((n) => (
            <div key={n}>
              <Image src={`/defis/sillage/${n}.webp`} alt="" fill sizes="300px" className="object-cover" />
            </div>
          ))}
          <span className={s.afficheSignature}>✦ VAIIYA</span>
        </div>
        <div data-reveal>
          <Surtitre>À deux, c’est plus facile</Surtitre>
          <h2 className={s.titre}>Le relais : <span className={s.accent}>une affiche qui se révèle</span> à chaque séance.</h2>
          <p className={s.chapo}>
            Lance-le avec un ami. Vos séances dévoilent l’affiche en trois temps, et elle est à vous deux.
          </p>
          <div className={s.maillons} data-vivant aria-hidden><i /><i /><i /></div>
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
          <p className={s.chapo}>Pas une version bridée le temps d’un essai : le compte gratuit, c’est le produit, pour de vrai.</p>
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
    <section className={s.fin} data-fin data-vivant>
      <Image src="/marque/logo-degrade.png" alt="" width={173} height={128} className={s.finLogo} />
      {/* Le néon : le logo évidé, une lumière qui fait le tour de sa forme. */}
      <canvas className={s.fond} aria-hidden />
      <div className={s.soirDescend} aria-hidden />
      <i className={s.sonde} data-sonde aria-hidden />
      <div className={`${s.wrap} ${s.finCorps}`}>
        <h2 className={s.finTitre}>Commence là où <span className={s.accent}>tu en es.</span></h2>
        <p className={s.finTexte}>Une séance suffit pour savoir si Vaiiya est fait pour toi.</p>
        <Bouton label="Créer mon compte gratuit" />
        <p className={s.finNote}>
          Sans carte bancaire · Déjà un compte ?{" "}
          <Link href="/auth?mode=login">Se connecter</Link>
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
              <Image src="/marque/logo-degrade.png" alt="" width={28} height={21} />
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

/** Le dessous de la page : voir la note de globals.css (« le dessous des pages »).
    Un membre garde son fond : la vitrine est là, masquée, le temps de lire sa session. */
const DESSOUS = "html:not(.a-session){--html-bg:#0B0814;overscroll-behavior:none}html:not(.a-session) body::before{display:none}";

export default function LandingVitrine({ chiffres, avis }: { chiffres: ChiffresPublics; avis: ResumeAvis }) {
  const racine = useRef<HTMLDivElement>(null);
  useRevelation(racine);
  useVivante(racine);
  return (
    <div ref={racine} className={s.page}>
      <style>{DESSOUS}</style>
      <Heros chiffres={chiffres} />
      <div className={s.jour}>
        <Mouvements chiffres={chiffres} />
        <Guide />
        <Parler />
        <ToutRelie />
        <Chemin />
        <Nutrition />
        <Rangs />
        <Relais />
        <Offre />
        <Avis avis={avis} />
      </div>
      <Fin />
      <Pied />
    </div>
  );
}
