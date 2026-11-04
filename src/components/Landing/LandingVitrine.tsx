"use client";

/**
 * LandingVitrine : vaiiya.fr pour un visiteur non connecté.
 *
 * Refaite le 2026-10-12 à la demande de Louis (« une landing magnifique,
 * bluffante, qui ne bugge pas quand on rentre dedans »), rendue vivante le
 * 2026-11-04 (maquette « La vitrine vivante »), puis recomposée le même jour
 * (Louis : « moins de blocs en dessous de mêmes blocs », « sortir du vibe
 * coding », « prends l'exemple des deux extrémités de la page »). Ce fichier
 * écrit toute la page, et `vivant/` ne fait que la jouer : il se charge à part,
 * quand la vitrine est à l'écran, et tout reste lisible sans lui.
 *
 * ⚠️ DÉCISIONS DE LOUIS À NE PAS DÉFAIRE.
 *   · La page dure une journée. La nuit n'existe qu'aux deux bouts, le héros et la
 *     fin (Louis, 2026-11-04 : « ça change de couleur en plein milieu », « c'est
 *     mieux que les tarifs soient sur fond clair »). Tout le reste est le jour.
 *   · Deux dégradés droits dans l'ordre du logo pour passer de la nuit au jour et
 *     du jour à la nuit. Couleurs écrites en dur dans le module CSS.
 *   · Le bouton reste violet.
 *
 * ⚠️ CE QUI FAIT UNE PAGE GÉNÉRÉE, ET QUI N'A PLUS SA PLACE ICI : un surtitre
 * au-dessus de chaque titre, un titre centré suivi d'un paragraphe puis d'une
 * grille, une carte avec une icône dans un carré teinté, une pastille colorée,
 * un pavé blanc autour d'une phrase, le même fondu vers le haut partout. Chaque
 * section a sa propre structure. Le titre parle comme celui du héros.
 *
 * ⚠️ LE « BUG À L'ENTRÉE » : rien ne doit apparaître puis disparaître.
 *   · Le héros (titre géant, puis Nora et Sasha) entre en CSS pur, dès le
 *     premier octet de HTML.
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
import { ArrowRight, ArrowUp } from "lucide-react";
import AnimationExercice from "@/components/exercices/AnimationExercice";
import { frameSrc, pickGenre, resolveGuide } from "@/lib/exerciseGuides";
import { RANGS } from "@/lib/aura";
import { PRENOM_GUIDE, roleGuide, voix, type GuideId } from "@/lib/guides";
import { PLANS, formatPrice } from "@/lib/plans";
import { SEO_PAGES, LEGAL_PAGES } from "@/lib/seoPages";
import { SEUIL_AVIS_PUBLIC, type ResumeAvis } from "@/lib/avisTypes";
import type { ChiffresPublics } from "@/lib/chiffresPublics";
import s from "./LandingVitrine.module.css";

/** Ancre de la section qui suit le héros (le lien « Voir ce qu'il y a dedans »). */
export const DISCOVER_ANCHOR = "decouvrir";

/* ═══════════════ La révélation des titres ═══════════════
   Un seul observateur pour toute la page. Il ne cache QUE ce qui est sous
   le pli au moment où il s'arme : un élément déjà à l'écran ne passe jamais
   par l'invisible, donc la page ne clignote pas à l'arrivée. */
function useRevelation(racine: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = racine.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const cibles = Array.from(el.querySelectorAll<HTMLElement>("[data-titre]"));
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
      /* ⚠️ Rien n'attend ici : le V du héros dessine sa première image dès que ce
         module arrive, et chaque centaine de millisecondes se voit. */
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

/** Le titre de section parle comme celui du héros. Chaque ligne monte depuis
    sous sa propre ligne de base, une seule fois. */
function Grand({ lignes, className = "" }: { lignes: ReactNode[]; className?: string }) {
  return (
    <h2 className={`${s.grand} ${className}`} data-titre>
      {lignes.map((l, i) => (
        <span key={i} className={s.titreLigne} style={{ "--l": i } as CSSProperties}><span>{l}</span></span>
      ))}
    </h2>
  );
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
      <div className={s.fondCadre}><canvas className={s.fond} aria-hidden /></div>
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
          <span data-sens="1"><span className={`${s.mot} ${s.orNuit}`} style={{ animationDelay: ".1s" }}>qui tu veux</span></span>
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

/* ═══════════════ 2 · LES MOUVEMENTS ═══════════════
   ⚠️ UN MOUVEMENT N'EST NI UNE VIGNETTE NI UNE CARTE (Louis, 2026-11-04 : « ça
   fait un peu enfantin et bâclé, c'est dévalorisant »). Une frise de silhouettes
   sur l'horizon, puis un mouvement à la fois, en très grand, son nom derrière
   lui et sa consigne dessous : « montrés et expliqués ». */

const FRISE = [
  "Squat", "Kettlebell swing", "Pompes", "Burpees", "Fentes", "Développé couché", "Jumping jacks",
  "Soulevé de terre classique", "Hip thrust", "Rowing barre", "Mountain climbers", "Élévations latérales",
];

/* ⚠️ Les consignes sont celles de `EXERCISE_LIBRARY`, mot pour mot : elles sont
   recopiées ici pour ne pas envoyer toute la bibliothèque à chaque visiteur, et
   `check:vitrine` refuse la moindre différence. */
const VEDETTES = [
  { nom: "Squat", mot: "Squat", l: 2.41, muscles: "Quadriceps, fessiers",
    consigne: "Pieds largeur d’épaules, talons ancrés. Descends à l’amplitude qui reste confortable." },
  { nom: "Fentes", mot: "Fentes", l: 2.71, muscles: "Quadriceps, fessiers",
    consigne: "Un pas assez long pour garder le genou avant stable, puis pousse dans le talon." },
  { nom: "Pompes", mot: "Pompes", l: 3.08, muscles: "Pectoraux, triceps, épaules",
    consigne: "Corps aligné des talons à la tête, coudes à 45°. Pose les genoux pour alléger sans perdre le geste." },
  { nom: "Burpees", mot: "Burpees", l: 3.32, muscles: "Corps entier, cardio",
    consigne: "Trouve un rythme que tu peux tenir sur toute la série, sans t’arrêter à mi-parcours." },
  { nom: "Développé couché", mot: "Développé", l: 4.21, muscles: "Pectoraux, triceps, épaules",
    consigne: "Omoplates serrées, barre au niveau du bas des pectoraux, pieds ancrés." },
  { nom: "Soulevé de terre classique", mot: "Soulevé", l: 3.3, muscles: "Dos, fessiers, ischio-jambiers",
    consigne: "Barre contre les tibias, dos plat, pousse le sol avec les jambes." },
];

/** Une silhouette de la frise : la pose du milieu, celle où le geste se lit. */
function Silhouette({ nom }: { nom: string }) {
  const guide = resolveGuide(nom);
  if (!guide) return null;
  return (
    <i className={s.silhouette} style={{ "--img": `url(${frameSrc(guide, pickGenre(guide), Math.floor(guide.frames / 2))})` } as CSSProperties} />
  );
}

/** Les poses en grand. Chacune s'allume d'un coup puis laisse une trace qui
    s'éteint : le geste se lit comme une chronophotographie. */
function Poses({ nom, label }: { nom: string; label: string }) {
  const guide = resolveGuide(nom);
  if (!guide) return null;
  const genre = pickGenre(guide);
  return (
    <div className={s.poses} data-n={guide.frames} style={{ "--n": guide.frames } as CSSProperties} role="img" aria-label={label}>
      {Array.from({ length: guide.frames }).map((_, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={frameSrc(guide, genre, i)} alt="" width={1024} height={1024} loading="lazy" decoding="async"
          style={{ "--i": i } as CSSProperties} />
      ))}
    </div>
  );
}

function Mouvements({ chiffres }: { chiffres: ChiffresPublics }) {
  return (
    <section id={DISCOVER_ANCHOR} className={`${s.mouvements} scroll-mt-4`}>
      <div className={s.frise} data-vivant aria-hidden>
        <div className={s.friseRail} style={{ "--n": FRISE.length } as CSSProperties}>
          {[0, 1].map((copie) => (
            <div key={copie} className={s.friseMoitie}>
              {FRISE.map((n) => <Silhouette key={n} nom={n} />)}
            </div>
          ))}
        </div>
      </div>

      <div className={`${s.wrap} ${s.mvtGrille}`}>
        <div className={s.mvtTete}>
          <Grand className={s.mvtTitre} lignes={[<b key="n" className={s.or}>{chiffres.mouvements}</b>, "mouvements", <span key="s" className={s.mvtSuite}>montrés et expliqués.</span>]} />
          <p className={s.texte}>
            Tu suis une des <b>{chiffres.seances} séances guidées</b>, ou tu composes la tienne en deux minutes.
          </p>
        </div>

        <div className={s.plateau} data-plateau data-vivant>
          <div className={s.vedettes}>
            {VEDETTES.map((v, i) => (
              <figure key={v.nom} className={`${s.vedette} ${i === 0 ? s.on : ""}`} data-vedette>
                <span className={s.motFond} style={{ "--l": v.l } as CSSProperties} aria-hidden>{v.mot}</span>
                <Poses nom={v.nom} label={`${v.nom}, pose après pose`} />
                <i className={s.sol} aria-hidden />
                <figcaption>
                  <b>{v.nom}</b>
                  <p>{v.consigne}</p>
                  <small>{v.muscles}</small>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className={s.noms} data-noms role="group" aria-label="Choisir un mouvement">
            {VEDETTES.map((v, i) => (
              <button key={v.nom} type="button" data-nom={i} aria-pressed={i === 0}>
                {v.mot}<i aria-hidden />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ 3 · LE GUIDE ═══════════════
   Nora ou Sasha se tient en grand, et change de pose avec la conversation. Les
   deux prénoms du titre sont les commandes : plus de portraits à toucher. */

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
      <div className={s.pieceLigne}><b>Haut du corps</b><span className="vy-nombre">30 min</span></div>
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
          <p>~<span className="vy-nombre">745</span> kcal · <span className="vy-nombre">37</span> g de protéines</p>
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
      <div className={s.pieceLigne} style={{ marginTop: 0 }}><b>Push</b><span className="vy-nombre">45 min</span></div>
      <div className={s.pieceJours}><s>mercredi</s><ArrowRight size={18} strokeWidth={2.4} aria-hidden /><span>jeudi</span></div>
      <div className={s.pieceBouton} data-bouton>Déplacer à jeudi</div>
    </div>
  );
}

/* ⚠️ CHAQUE LIGNE EST UNE ACTION RÉELLE DU GUIDE, avec ce qu'elle donne : ce
   qu'on écrit ici doit rester vrai dans la conversation de l'app. */
const PHRASES: [string, string][][] = [
  [["J’ai 30 minutes ce soir", "Séance de 30 min"], ["Décale ma séance à demain", "Déplacée à demain"], ["Refais ma semaine", "Semaine reposée"],
    ["Mets du dos jeudi", "Dos, jeudi"], ["J’ai mangé un burger ce midi", "Repas à noter"]],
  [["Une recette avec du riz et des œufs", "Recette prête"], ["Ajoute une petite séance cardio samedi", "Cardio, samedi"],
    ["Remplace ma séance par Express 12", "Express 12, aujourd’hui"], ["Note un yaourt à mes repas", "Yaourt à noter"]],
  [["J’ai 20 minutes et pas de matériel", "Séance sans matériel"], ["Évite le Push pendant 10 jours", "Adaptation de 10 jours"],
    ["Saute ma prochaine étape", "Étape passée"], ["Une séance sans saut, mes voisins dorment", "Séance sans saut"]],
  [["Il me reste du poulet et des courgettes", "Une recette avec ça"], ["Retire ma séance de vendredi", "Vendredi libéré"],
    ["Fais-moi une séance jambes de 30 minutes", "Jambes, 30 min"], ["Au petit-déj, deux œufs", "Repas à noter"]],
];

function Parler() {
  return (
    /* La grande bulle est un message de toi : même encre, même coin que tes bulles
       dans la conversation juste au-dessus, et sur ordinateur le Guide à côté d'elle. */
    <div className={s.grandeBulle} data-vivant>
          <div className={s.parlerTete}>
            <Grand lignes={["Écris-lui", <span key="s" className={s.orNuit}>comme tu parles.</span>]} />
            <p>Une phrase suffit. Ton Guide comprend ce que tu veux et prépare une carte à valider.</p>
          </div>
          <div className={s.lignes} aria-hidden>
            {PHRASES.map((liste, i) => (
              <div key={liste[0][0]} className={`${s.ligne} ${i % 2 ? s.ligneInverse : ""}`} style={{ "--d": `${64 + (i * 13) % 24}s` } as CSSProperties}>
                {[0, 1].map((copie) => (
                  <div key={copie} className={s.ligneMoitie}>
                    {[...liste, ...liste].map(([dit, fait], k) => <span key={`${k}-${dit}`}>{dit}<i>{fait}</i></span>)}
                  </div>
                ))}
              </div>
            ))}
          </div>
    </div>
  );
}

function Conversation() {
  return (
    <div className={s.conv} data-conv data-vivant role="group" aria-label="Exemple de conversation avec ton Guide">
      <div className={s.convScene}>
      <div className={s.geant} aria-hidden>
        {GUIDES.flatMap((g) => ETATS_VISAGE.map((e) => (
          <Image key={`${g}-${e}`} src={`/guides/${g}-${e}-scene-v1.webp`} alt="" fill sizes="(min-width: 960px) 800px, 441px"
            data-visage={`${g}-${e}`} className={g === "nora" && e === "listen" ? s.on : undefined} />
        )))}
      </div>
      <div className={s.convColonne}>
        <p className={s.convStatut} data-conv-statut>
          <span data-conv-nom>{PRENOM_GUIDE.nora}</span>, {roleGuide("nora").charAt(0).toLowerCase() + roleGuide("nora").slice(1)} · <b>t’écoute</b>
        </p>
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
      </div>
      </div>
      <Parler />
      <div hidden>
        <PieceRepas />
        <PieceDeplacer />
      </div>
    </div>
  );
}

function Guide() {
  return (
    <section className={s.guide}>
      <div className={s.wrap}>
        <div className={s.guideTete}>
          <h2 className={`${s.grand} ${s.guideTitre}`} data-titre>
            <span className={s.titreLigne}><span>
              <button type="button" className={s.prenom} data-guide="nora" aria-pressed="true">Nora</button>
              {" ou "}
              <button type="button" className={s.prenom} data-guide="sasha" aria-pressed="false">Sasha</button>.
            </span></span>
          </h2>
          <p className={s.texte}>Tu lui dis ce que tu as, ce que tu veux, ce que tu as mangé. <b>Il prépare, tu valides.</b></p>
        </div>
      </div>
      <Conversation />
    </section>
  );
}

/* ═══════════════ 4 · NUTRITION ═══════════════
   ⚠️ CHAQUE ALIMENT DE LA PHOTO EST COMPTÉ, ET LE TOTAL EST LA SOMME DES LIGNES
   (Louis, 2026-11-04 : on ne vend pas une estimation qui oublie la moitié de
   l'assiette). Poids estimés sur la photo, valeurs proches de Ciqual, sauce et
   huile comprises : c'est ce que fait l'analyse de l'app (`calculerRepas`), et
   `check:vitrine` refait l'addition. `x` et `y` : l'aliment sur la photo, en %.
   Une ligne sans `x` n'a pas de repère : l'huile ne se pointe pas du doigt. */

type LigneRepas = { nom: string; q: string; kcal: number; x?: number; y?: number };

const PLATS: { photo: string; nom: string; kcal: number; p: number; g: number; l: number; lignes: LigneRepas[] }[] = [
  { photo: "/recipes/poke-bowl-saumon-avocat.jpg", nom: "Poke bowl", kcal: 745, p: 37, g: 55, l: 40, lignes: [
    { nom: "Oignon nouveau", q: "10 g", kcal: 3, x: 46, y: 13 },
    { nom: "Concombre", q: "70 g", kcal: 8, x: 66, y: 21 },
    { nom: "Saumon", q: "130 g", kcal: 260, x: 25, y: 41 },
    { nom: "Avocat", q: "70 g", kcal: 144, x: 53, y: 44 },
    { nom: "Chou rouge", q: "40 g", kcal: 12, x: 80, y: 52 },
    { nom: "Sésame", q: "3 g", kcal: 18, x: 44, y: 61 },
    { nom: "Riz", q: "150 g", kcal: 210, x: 36, y: 74 },
    { nom: "Edamame", q: "35 g", kcal: 42, x: 59, y: 77 },
    { nom: "Sauce soja-sésame", q: "10 ml", kcal: 48 },
  ] },
  { photo: "/recipes/saumon-roti-et-patate-douce.jpg", nom: "Saumon rôti", kcal: 612, p: 39, g: 42, l: 32, lignes: [
    { nom: "Saumon", q: "160 g", kcal: 320, x: 58, y: 24 },
    { nom: "Citron", q: "10 g", kcal: 3, x: 72, y: 35 },
    { nom: "Patate douce", q: "180 g", kcal: 155, x: 25, y: 42 },
    { nom: "Brocoli", q: "130 g", kcal: 44, x: 50, y: 70 },
    { nom: "Huile d’olive", q: "10 ml", kcal: 90 },
  ] },
  { photo: "/recipes/steak-hache-patate-douce-rotie-et-haricots-verts.jpg", nom: "Steak et patate douce", kcal: 438, p: 32, g: 45, l: 14, lignes: [
    { nom: "Patate douce", q: "200 g", kcal: 172, x: 37, y: 30 },
    { nom: "Haricots verts", q: "150 g", kcal: 38, x: 72, y: 50 },
    { nom: "Steak haché 5 %", q: "125 g", kcal: 156, x: 42, y: 66 },
    { nom: "Huile d’olive", q: "8 ml", kcal: 72 },
  ] },
];

function Nutrition() {
  return (
    <section className={s.nutrition}>
      <div className={s.nutriGrille}>
        <div className={s.nutriTete}>
          <Grand lignes={["Une photo,", <>et c’est <span className={s.or}>noté.</span></>]} />
        </div>

        <div className={s.assiette} data-assiette data-vivant role="img"
          aria-label="Trois assiettes analysées l’une après l’autre, aliment par aliment, avec le total des calories">
          {PLATS.map((p, i) => {
            let n = 0;
            return (
              <div key={p.photo} className={`${s.plat} ${i === 0 ? s.on : ""}`} data-plat>
                <Image src={p.photo} alt="" fill sizes="(min-width: 960px) 620px, 100vw" className="object-cover" />
                {p.lignes.map((l) => {
                  if (l.x === undefined) return null;
                  n += 1;
                  return <span key={l.nom} className={`${s.repere} vy-nombre ${i === 0 ? s.vu : ""}`} data-y={l.y} style={{ left: `${l.x}%`, top: `${l.y}%` }}>{n}</span>;
                })}
              </div>
            );
          })}
          <span className={s.ligneScan} data-ligne-scan aria-hidden />
        </div>

        <div className={s.ticket} data-ticket>
          {PLATS.map((p, i) => {
            let n = 0;
            return (
              <div key={p.photo} className={`${s.ticketPlat} ${i === 0 ? s.on : ""}`} data-ticket-plat data-total={p.kcal}>
                <div className={s.ticketPapier}>
                <p className={s.ticketTete}><b>{p.nom}</b><span>Estimation</span></p>
                <ol>
                  {p.lignes.map((l) => {
                    if (l.x !== undefined) n += 1;
                    return (
                      <li key={l.nom} className={`${s.ticketLigne} ${i === 0 ? s.vu : ""}`} data-kcal={l.kcal} data-repere={l.x !== undefined || undefined}>
                        <i className="vy-nombre">{l.x !== undefined ? n : ""}</i>
                        <span>{l.nom}</span>
                        <span className="vy-nombre">{l.q}</span>
                        <span className="vy-nombre">{l.kcal}</span>
                      </li>
                    );
                  })}
                </ol>
                <p className={s.ticketTotal}><span>Total</span><b className="vy-nombre">~<span data-somme>{p.kcal}</span></b><span>kcal</span></p>
                <p className={s.ticketMacros}>
                  <span><b className="vy-nombre">{p.p}</b> g de protéines</span>
                  <span><b className="vy-nombre">{p.g}</b> g de glucides</span>
                  <span><b className="vy-nombre">{p.l}</b> g de lipides</span>
                </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className={s.nutriSuite}>
          <p className={s.texte}>
            Vaiiya reconnaît chaque aliment, estime son poids d’après la taille de l’assiette, puis additionne ligne par ligne.
            <b>Tu peux tout ajuster avant de noter.</b>
          </p>
          <dl className={s.aussi}>
            <div><dt>Tes restes</dt><dd>Tu dis ce que tu as, il propose une recette.</dd></div>
            <div><dt>La carte du resto</dt><dd>Les plats rangés selon ton objectif.</dd></div>
          </dl>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ 5 · LE RELAIS ═══════════════
   L'affiche est un objet posé dans le jour, et elle se dévoile sous le doigt.
   L'app compte quatre maillons mais l'affiche ne change que trois fois
   (`etatPoster`, lib/defi.ts) : la vitrine montre ces trois changements (Louis,
   2026-11-04 : « une étape dans le vide »). */

function Relais() {
  return (
    <section className={s.relais} data-relais data-vivant>
      <div className={s.relaisScene}>
        <div className={s.relaisTexte}>
          <Grand lignes={["À deux,", "une affiche", <span key="s" className={s.vio}>se dévoile.</span>]} />
          <p className={s.texte}>Lance le relais avec un ami. Vos séances révèlent l’affiche en trois temps, et <b>elle est à vous deux.</b></p>
        </div>
        <div className={s.afficheCadre}>
          <div className={s.barres} aria-hidden><i /><i /><i /></div>
          <div className={s.affiche} role="img" aria-label="L’affiche Sillage qui se dévoile en trois temps">
            {["01", "02", "03", "04"].map((n) => (
              <div key={n}>
                <Image src={`/defis/sillage/${n}.webp`} alt="" fill sizes="(min-width: 960px) 400px, 80vw" className="object-cover" />
              </div>
            ))}
            <span className={s.afficheSignature}>✦ VAIIYA</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ 6 · TOUT SE PARLE ═══════════════
   ⚠️ LE LOGO EST LE SCHÉMA, DESSINÉ SOBREMENT (Louis, 2026-11-04 : le logo détaillé
   « vole la vedette » à celui de la fin). Une aile par chose qu'on fait, le cœur où
   elles se rejoignent, et deux ailes symétriques vers le Guide et le rang. Chaque
   aile vient de la mesure du logo (`public/marque/aile.svg`). La lumière part du
   bout de l'aile et descend jusqu'au cœur : c'est du CSS, joué par la carte
   graphique, et aucune couture n'est possible puisque chaque aile a sa propre forme. */

/** Une aile : sa forme, la lumière qui la traverse, et le halo qui suit la lumière. */
function Aile({ nom, classe }: { nom: string; classe: string }) {
  return (
    <i className={`${s.aile} ${classe}`} data-aile={nom}>
      <i className={s.forme}><b /></i>
      <i className={s.lueur} />
    </i>
  );
}

function ToutRelie() {
  const rang = RANGS[RANGS.length - 2];
  return (
    <section className={s.relie} data-relie data-vivant>
      <div className={`${s.wrap} ${s.relieGrille}`}>
        <div className={s.relieTete}>
          <Grand lignes={["Et tout", <span key="s" className={s.or}>se parle.</span>]} />
          <p className={s.texte}>Une séance terminée fait avancer ta semaine, nourrit ton rang, et <b>ton Guide le sait déjà.</b></p>
        </div>
        <div className={s.relieScene} data-relie-scene>
          <div className={s.relieFigure} aria-hidden>
            <Aile nom="seance" classe={s.aileG} />
            <Aile nom="repas" classe={s.aileD} />
            <Aile nom="guide" classe={`${s.aileBas} ${s.aileG}`} />
            <Aile nom="rang" classe={`${s.aileBas} ${s.aileD}`} />
            <i className={s.coeur} data-coeur />
          </div>
          <div className={`${s.objet} ${s.oSeance}`} data-objet="seance">
            <b>Ta séance</b>
            <small>Terminée</small>
            <div className={s.oImage}><AnimationExercice nom="Kettlebell swing" taille="100%" label="Une séance en cours" /></div>
          </div>
          <div className={`${s.objet} ${s.oRepas}`} data-objet="repas">
            <b>Ton repas</b>
            <small>Noté</small>
            <div className={s.oImage}>
              <Image src="/recipes/poke-bowl-saumon-avocat.jpg" alt="Un poke bowl" fill sizes="170px" className="object-cover" />
            </div>
          </div>
          <div className={`${s.objet} ${s.oGuide}`} data-objet="guide">
            <div className={s.oImage}>
              <Image src="/guides/nora-listen-entete-v1.webp" alt="Nora" fill sizes="170px" className="object-contain" />
            </div>
            <b>Ton Guide</b>
            <small data-recu-guide>Il le sait déjà</small>
          </div>
          <div className={`${s.objet} ${s.oRang}`} data-objet="rang">
            <div className={s.oImage}>
              <Image src={rang.image!} alt={`Le rang ${rang.nom}`} fill sizes="170px" style={{ objectFit: "contain" }} />
            </div>
            <b>Ton rang</b>
            <small><span className="vy-nombre" data-recu-exp>+30</span> EXP</small>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ 7 · DE BRONZE À ÉTERNEL ═══════════════
   ⚠️ ON VEND LE HAUT DE L'ÉCHELLE (Louis, 2026-11-04 : « il faut donner du rêve »,
   l'Or arrive vers le premier mois). Une scène qui suit le doigt : la gemme monte,
   le ciel change de couleur sans à-coup, et l'échelle descend de Bronze à Éternel,
   dans le sens du geste. Les mois sont un exemple à deux séances par semaine : le
   barème réel y mène plus tôt, et chaque récompense est celle de `RECOMPENSES_RANG`. */

const MONTEE: { quand: string; texte: string; gain: string; ciel: [string, string]; encre: string }[] = [
  { quand: "Jour 1", texte: "12 minutes dans ton salon. Ta première séance.", gain: "Ta première carte de rang", ciel: ["#FDEBDB", "#F6CDA8"], encre: "#8F4E1A" },
  { quand: "Semaine 1", texte: "Ta série tient, même les jours chargés.", gain: "Un joker par mois pour ta série", ciel: ["#F1F4F9", "#D3DDEA"], encre: "#56657A" },
  { quand: "Mois 1", texte: "Tu lances un relais avec un ami.", gain: "Un cadre or autour de ta photo", ciel: ["#FFF3CF", "#FFDD86"], encre: "#94650A" },
  { quand: "Mois 2", texte: "Tes séances ont trouvé leur place dans ta semaine.", gain: "Une lumière tourne autour de ta photo", ciel: ["#E2F7F3", "#B4E6DC"], encre: "#157567" },
  { quand: "Mois 4", texte: "Tu y vas sans qu’on te le rappelle.", gain: "Le titre Inarrêtable sous ton nom", ciel: ["#E1F3FF", "#AEDDFF"], encre: "#1E6AB0" },
  { quand: "Mois 6", texte: "Tu es là où tu voulais aller.", gain: "Ton pseudo passe en lumière", ciel: ["#EFE4FF", "#D2B6FF"], encre: "#6D3BE8" },
];

function Rangs() {
  const rangs = RANGS.filter((r) => r.image);
  return (
    <section className={s.rangs} data-rangs data-vivant>
      <div className={s.rangsScene}>
        <div className={s.rangsCiels} aria-hidden>
          {rangs.map((r, i) => (
            <i key={r.id} data-ciel style={{ "--c1": MONTEE[i].ciel[0], "--c2": MONTEE[i].ciel[1] } as CSSProperties} />
          ))}
        </div>
        <div className={`${s.wrap} ${s.rangsTete}`}>
          <Grand lignes={["Tu commences Bronze.", <>Tu vises <span className={s.vio}>Éternel.</span></>]} />
        </div>
        <ol className={s.rangsListe}>
          {rangs.map((r, i) => (
            <li key={r.id} className={s.rang} data-min={r.min}>
              <div className={s.rangGemme} data-gemme>
                <Image src={r.image!} alt="" fill sizes="(min-width: 960px) 300px, 240px" style={{ objectFit: "contain" }} />
                <i className={s.rangOmbre} aria-hidden />
              </div>
              <div className={s.rangTexte} data-texte style={{ "--r": MONTEE[i].encre } as CSSProperties}>
                <p className={s.rangQuand}>{MONTEE[i].quand}</p>
                <h3>{r.nom}</h3>
                <p>{MONTEE[i].texte}</p>
                <small>{MONTEE[i].gain}</small>
              </div>
            </li>
          ))}
        </ol>
        <div className={s.echelle} aria-hidden>
          {rangs.map((r) => (
            <span key={r.id} data-marche>
              <Image src={r.image!} alt="" width={40} height={64} />
            </span>
          ))}
        </div>
        <p className={s.rangsExp} aria-hidden><b className="vy-nombre" data-exp>{rangs[0].min}</b> EXP</p>
        <p className={s.note}>Exemple à deux séances par semaine.</p>
      </div>
    </section>
  );
}

/* ═══════════════ 8 · L'OFFRE ═══════════════
   Deux cartes de même structure, comme les pages d'abonnement les mieux tenues :
   le nom, une phrase, le prix, l'action, puis ce qui est inclus. Les lignes se
   répondent d'une carte à l'autre. Le gratuit est de l'ivoire, Vaiiya+ un noir et
   or, le seul endroit de la page où l'or parle.
   ⚠️ Vaiiya+ n'a pas de bouton : la vente n'est pas ouverte (`VENTE_OUVERTE`). */

const INCLUS = (c: ChiffresPublics) => [
  "Les séances guidées",
  `Les ${c.mouvements} mouvements, pour composer les tiennes`,
  "Ton Guide, Nora ou Sasha",
  "La nutrition par photo",
  "Ton planning de la semaine",
  "Ton rang, ton EXP et tes missions",
  "Le relais à deux",
  "Zéro pub",
];

const AJOUTS = ["Les séances spécialisées", "Les missions en plus", "Le Guide sans limite"];

function Coche() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2.8 8.6l3.3 3.2L13.2 4.6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** ⚠️ En chasse fixe, la virgule occupe une case entière et coupe le prix en deux. */
function Prix({ valeur }: { valeur: string }) {
  const [euros, centimes] = valeur.replace(/\s*€/, "").split(",");
  return <b className="vy-nombre">{euros}<span className={s.virgule}>,</span>{centimes}</b>;
}

function Offre({ chiffres }: { chiffres: ChiffresPublics }) {
  return (
    <section className={s.offre}>
      <div className={`${s.wrap} ${s.offreGrille}`}>
        <div className={s.offreTete}>
          <Grand lignes={["Tu commences", <span key="s" className={s.vio}>avec tout ça.</span>]} />
        </div>
        <div className={s.plans}>
          <article className={`${s.plan} ${s.planClair}`}>
            <h3 className={s.planNom}>Gratuit</h3>
            <p className={s.planPhrase}>Aussi longtemps que tu veux.</p>
            <p className={s.prix}><b className="vy-nombre">0</b><b>€</b><span>sans carte bancaire</span></p>
            <Bouton label="Créer mon compte" />
            <ul className={s.planListe}>
              {INCLUS(chiffres).map((b) => <li key={b}><Coche />{b}</li>)}
            </ul>
          </article>
          <article className={`${s.plan} ${s.carteNoire}`} data-vivant>
            <h3 className={s.planNom}>Vaiiya+</h3>
            <p className={s.planPhrase}>Pour aller plus loin, quand tu voudras.</p>
            <p className={s.prix}><Prix valeur={formatPrice(PLANS.premium.priceCents)} /><b>€</b><span>par mois, à l’ouverture</span></p>
            <p className={s.planBientot}>Arrive bientôt</p>
            <ul className={s.planListe}>
              <li><Coche />Tout ce qui est gratuit</li>
              {AJOUTS.map((b) => <li key={b}><Coche />{b}</li>)}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ 9 · AVIS, FIN, PIED ═══════════════ */

function Etoiles({ note }: { note: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={15} height={15} viewBox="0 0 24 24" aria-hidden
          fill={n <= note ? "#F5B120" : "transparent"} stroke={n <= note ? "#F5B120" : "rgba(255,255,255,.3)"} strokeWidth={1.6} strokeLinejoin="round">
          <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.9l-5.8 3 1.1-6.45-4.7-4.6 6.5-.95z" />
        </svg>
      ))}
    </span>
  );
}

function Avis({ avis }: { avis: ResumeAvis }) {
  if (avis.total < SEUIL_AVIS_PUBLIC) return null;
  return (
    <section className={s.avis}>
      <div className={s.wrap}>
        <Grand lignes={["Ils utilisent Vaiiya", <span key="s" className={s.or}>au quotidien.</span>]} />
        <p className={s.avisNote}>
          <b className="vy-nombre">{avis.moyenne.toFixed(1).replace(".", ",")}</b>
          <Etoiles note={Math.round(avis.moyenne)} />
          <span>sur {avis.total} avis</span>
        </p>
        <div className={s.avisGrille}>
          {avis.apercu.map((a) => (
            <div key={a.id} className={s.avisLigne}>
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
      <div className={`${s.wrap} ${s.finCorps}`}>
        <h2 className={s.finTitre}>Commence là où <span className={s.accent}>tu en es.</span></h2>
        <p className={s.finTexte}>Une séance suffit pour savoir si Vaiiya est fait pour toi.</p>
        <Bouton label="Créer mon compte gratuit" />
        <p className={s.finNote}>
          Sans carte bancaire · Déjà un compte ?{" "}
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
            <ul>{SEO_PAGES.map((l) => <li key={l.href}><Link href={l.href} prefetch={false}>{l.label}</Link></li>)}</ul>
          </div>
          <div>
            <h4>Vaiiya</h4>
            <ul>
              <li><Link href="/auth?mode=login" prefetch={false}>Se connecter</Link></li>
              <li><Link href="/premium" prefetch={false}>Vaiiya+</Link></li>
              {LEGAL_PAGES.map((l) => <li key={l.href}><Link href={l.href} prefetch={false}>{l.label}</Link></li>)}
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
        <Nutrition />
        <Relais />
        <ToutRelie />
        <Rangs />
        <Offre chiffres={chiffres} />
        <Avis avis={avis} />
      </div>
      <div className={s.crepuscule} data-vivant aria-hidden />
      <div className={s.nuit}>
        <Fin />
      </div>
      <Pied />
    </div>
  );
}
