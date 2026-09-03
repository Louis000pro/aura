"use client";

import { useState, useEffect, useRef } from "react";
import { chargerRelaisAccueil, type RelaisAccueil } from "@/lib/defi";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import LandingStory from "@/components/Landing/LandingStory";
import LandingHero from "@/components/Landing/LandingHero";
/* Le type seul : la coquille serveur (`app/page.tsx`) fait le comptage et
   descend trois entiers, pour que les données ne traversent pas jusqu'ici. */
import type { ChiffresPublics } from "@/lib/chiffresPublics";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import AccueilSignature from "@/components/AccueilSignature";
import RangsModal from "@/components/rang/RangsModal";
import { calculerAura, etatDepuisExp, type EtatAura } from "@/lib/aura";
import { noterRang } from "@/lib/celebrationRang";
import { useGuideActif } from "@/context/GuideContext";
import {
  lireDejaVu,
  lireSignauxAccueil,
  momentAccueil,
  noterDejaVu,
  type MomentAccueil,
} from "@/lib/momentAccueil";
import { observeParisDay, parisDateStr } from "@/lib/dates";
import { marquerPresence } from "@/lib/presence";

/* ─────────────────────────────────────────────────
   LANDING PAGE — visiteur non connecté
   Hero + présentation vivent dans src/components/Landing/ pour garder
   ce fichier (partagé entre agents) le plus petit possible.
───────────────────────────────────────────────── */
function LandingPage({ chiffres }: { chiffres: ChiffresPublics }) {
  return (
    <div className="relative w-full" style={{ overflowX: "clip", background: "var(--page-bg)" }}>
      <LandingHero />
      <LandingStory chiffres={chiffres} />
    </div>
  );
}

/* ─── Dashboard ─── */
function Dashboard() {
  const now = new Date();
  const hour = now.getHours();
  const { user } = useAuth();
  const router = useRouter();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  const [parisDay, setParisDay] = useState(() => parisDateStr());

  // Une app laissée ouverte traverse réellement minuit : toutes les requêtes
  // quotidiennes repartent alors sur le nouveau jour Europe/Paris.
  useEffect(() => observeParisDay(setParisDay), []);

  // ── L'aura (rang personnel) : EXP dérivée des vraies données de l'utilisateur ──
  // `statsTick` est incrémenté quand l'effet des stats a fini d'écrire daily_stats
  // (connexion du jour). On recalcule l'aura APRÈS, sinon la connexion du jour ne
  // serait pas comptée (0 EXP, Jour 0) à cause de la race entre les deux effets.
  const [statsTick, setStatsTick] = useState(0);
  const [aura, setAura] = useState<EtatAura>(() => etatDepuisExp(0));
  const [auraLoaded, setAuraLoaded] = useState(false);
  const didInitAuraRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const cacheKey = `vaiiya_aura_exp_${user.id}`;
    const firstRun = !didInitAuraRef.current;
    didInitAuraRef.current = true;

    // Affichage OPTIMISTE : au tout premier chargement, on montre tde suite le
    // dernier rang connu (cache localStorage) au lieu d'un « — » le temps que
    // les 5 requêtes de calculerAura reviennent. Le vrai calcul rafraîchit juste après.
    if (firstRun) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached != null) {
          const exp = parseInt(cached, 10) || 0;
          prevExpRef.current = exp;           // pas de faux « +EXP » quand le frais arrive
          setAura(etatDepuisExp(exp));
          setAuraLoaded(true);
        }
      } catch { /* ignore */ }
    }

    /* `calculerAura` peut rendre `null` : la RPC manque (migration pas
       encore collée), le réseau a lâché, la session a expiré. Dans ce cas
       on ne touche à RIEN, surtout pas pour afficher un zéro qui
       ressemblerait à une perte d'EXP. L'écran garde le dernier chiffre
       connu, ou son tiret. */
    calculerAura(supabase, user.id)
      .then((etat) => {
        if (!etat) return;
        if (firstRun) prevExpRef.current = etat.exp; // le premier chargement ne s'anime jamais
        setAura(etat);
        setAuraLoaded(true);
        try { localStorage.setItem(cacheKey, String(etat.exp)); } catch { /* ignore */ }
        // Passage de rang : on note le rang FRAIS (jamais celui du cache d'affichage).
        noterRang(user.id, etat.rang);
      })
      .catch(() => { /* silencieux : on garde l'affichage précédent */ });
  }, [user, statsTick, parisDay]);

  // Animation quand l'EXP augmente : un « +N EXP » s'envole au-dessus du compteur
  // et la pastille pulse. On garde la 1re valeur en référence (pas d'anim au chargement).
  const [expGain, setExpGain] = useState<number | null>(null);
  const [showRangs, setShowRangs] = useState(false);
  const prevExpRef = useRef<number | null>(null);
  useEffect(() => {
    if (!auraLoaded) return;
    const prev = prevExpRef.current;
    prevExpRef.current = aura.exp;
    if (prev !== null && aura.exp > prev) {
      setExpGain(aura.exp - prev);
      const t = setTimeout(() => setExpGain(null), 2000);
      return () => clearTimeout(t);
    }
  }, [aura.exp, auraLoaded]);

  /* ── Le mot du Guide ────────────────────────────────────────────────
     Toute la règle vit dans `momentAccueil.ts` : ici on apporte les faits
     et on affiche la décision. Trois garde-fous, chacun pour une raison
     précise.

     1. LE REPÈRE DE FRÉQUENCE SE LIT AVANT LES REQUÊTES. Si le Guide a
        déjà parlé aujourd'hui, on ne lit RIEN : zéro requête sur
        l'écran le plus ouvert de l'app, tous les jours, à partir de la
        deuxième visite.
     2. ON ATTEND QUE L'AURA SOIT VRAIE. Le premier rendu affiche une EXP
        de cache : décider « plus que 12 EXP avant Or » dessus pourrait
        annoncer un palier déjà franchi.
     3. UNE SEULE ÉVALUATION PAR JOUR ET PAR MONTAGE (`jourEvalueRef`).
        `aura` change plusieurs fois pendant le chargement, et sans ce
        verrou le deuxième passage lirait le repère que le premier vient
        d'écrire, donc le mot disparaîtrait aussitôt affiché. Le verrou
        garde le JOUR et pas un booléen : une app laissée ouverte qui
        traverse minuit redonne ainsi la parole au Guide, sans effet
        supplémentaire pour la lui reprendre. */
  const { guide, etat: etatGuide } = useGuideActif();
  const [motGuide, setMotGuide] = useState<MomentAccueil | null>(null);
  const jourEvalueRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || !auraLoaded || etatGuide === "chargement") return;
    if (jourEvalueRef.current === parisDay) return;
    jourEvalueRef.current = parisDay;

    const dejaVu = lireDejaVu(user.id);
    if (dejaVu.jour === parisDay) return;      // il a déjà parlé : rien à lire

    let vivant = true;
    (async () => {
      const signaux = await lireSignauxAccueil(createClient(), user.id, aura, parisDay);
      if (!vivant || !signaux) return;         // lecture ratée : il se tait
      const moment = momentAccueil(signaux, aura, parisDay, dejaVu);
      if (!moment) return;
      setMotGuide(moment);
      noterDejaVu(user.id, parisDay, moment);
    })();
    return () => { vivant = false; };
  }, [user, aura, auraLoaded, etatGuide, parisDay]);

  /* ── Le relais, s'il y en a un de vivant ──
     Le relais n'avait aucune entrée sur l'écran où l'on arrive. Une bande
     fine sous les missions du jour, et seulement quand il y a un relais :
     même règle que le Guide, on ne parle que quand on a une raison.

     ⚠️ Une seule requête pour quelqu'un qui n'a jamais joué (voir
     `chargerRelaisAccueil`) : l'accueil est l'écran le plus ouvert de
     l'app, et `chargerDefi` en coûte six. Relu au changement de jour
     parisien, parce que « c'est à toi » change à minuit. */
  const [relais, setRelais] = useState<RelaisAccueil | null>(null);
  useEffect(() => {
    if (!user) return;
    let vivant = true;
    void chargerRelaisAccueil(user.id)
      .then((r) => { if (vivant) setRelais(r); })
      .catch(() => {});
    return () => { vivant = false; };
  }, [user, parisDay, statsTick]);


  /* ── La présence du jour ──
     ⚠️ CET EFFET NE FAIT PLUS QU'UNE CHOSE, ET ELLE EST INDISPENSABLE.
     `marquerPresence` crédite la connexion du jour (+5 EXP) et tient la
     série ; `setStatsTick` fait recalculer l'aura APRÈS, sinon la course
     entre les deux effets afficherait 0 EXP et « Jour 0 ».

     Il portait aussi un score sur 100 écrit dans `daily_stats` et lu par
     PERSONNE depuis la refonte de l'accueil (vérifié : seuls `streak` et
     `date` sont relus, par l'admin, le cron, `presence.ts` et
     `momentAccueil`). Trois requêtes par ouverture pour une colonne morte,
     sur l'écran le plus ouvert de l'app. */
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    (async () => {
      try {
        await marquerPresence(supabase, user.id);
      } finally {
        setStatsTick((t) => t + 1);
      }
    })();
  }, [user, parisDay]);

  return (
    <div
      className="fixed inset-0 md:left-[88px] overflow-y-auto overscroll-none"
      style={{ background: "var(--page-bg)", height: "100dvh", WebkitOverflowScrolling: "touch" }}
    >
      <div
        className="mx-auto w-full max-w-2xl px-4 flex flex-col gap-4"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 62px)",
          paddingBottom: "calc(96px + env(safe-area-inset-bottom))",
        }}
      >
        <AccueilSignature
          greeting={greeting}
          pseudo={user?.pseudo ?? user?.name ?? ""}
          aura={aura}
          auraLoaded={auraLoaded}
          expGain={expGain}
          isPremium={!!user?.is_premium}
          isAdmin={!!user?.is_admin}
          guide={guide}
          moment={motGuide}
          relais={relais}
          onNavigate={(path) => router.push(path)}
          onOpenRangs={() => setShowRangs(true)}
        />

        <RangsModal
          open={showRangs}
          onClose={() => setShowRangs(false)}
          expActuel={auraLoaded ? aura.exp : 0}
          rangActuelId={aura.rang.id}
          pseudo={user?.pseudo ?? user?.name ?? ""}
          avatarUrl={user?.avatar}
          isAdmin={!!user?.is_admin}
        />
      </div>
    </div>
  );
}

/* ─── Spinner de chargement ─── */
function LoadingSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: "var(--page-bg)" }}>
      <motion.div
        className="w-10 h-10 rounded-full border-2"
        style={{ borderColor: "rgba(var(--accent-rgb),0.2)", borderTopColor: "var(--accent)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/* ─── Page principale ───
   Le serveur ignore qui demande la page : il rend donc la landing publique,
   celle que voit un visiteur anonyme. C'est ce qui met la présentation réelle
   de Vaiiya dans le HTML initial, sans qu'il faille exécuter le JavaScript.

   Avant, cet emplacement servait un spinner pendant la résolution de session,
   et un paragraphe caché tenait lieu de contenu pour les robots. Le paragraphe
   a disparu : le contenu montré aux moteurs est désormais celui montré aux
   visiteurs, sans version parallèle à tenir à jour.

   Celui qui est déjà connecté ne voit pas la landing passer pour autant : la
   classe `a-session`, posée avant le premier paint par le script du <head>,
   masque la landing et révèle l'attente (voir globals.css). La bascule est en
   CSS et non en React, pour que le rendu reste identique serveur et client. */
export default function AccueilClient({ chiffres }: { chiffres: ChiffresPublics }) {
  const { user, isLoading, justLoggedIn, isNewUser, clearWelcome } = useAuth();
  // Le popup animé "Bonsoir" est retiré au profit de l'intro logo (SplashIntro).
  void justLoggedIn; void isNewUser; void clearWelcome;

  // Le script du <head> voit un jeton, pas une session valide : un jeton périmé
  // ou révoqué ailleurs pose quand même `a-session`. Sans ce filet, la landing
  // resterait masquée par la CSS et l'écran serait vide. Dès que la session est
  // résolue sans compte, on lève la classe et la landing réapparaît.
  useEffect(() => {
    if (!isLoading && !user) document.documentElement.classList.remove("a-session");
  }, [isLoading, user]);

  // Session résolue, compte connecté : l'app prend toute la place.
  if (!isLoading && user) return <Dashboard />;

  // La landing garde sa position dans l'arbre quand `isLoading` retombe : elle
  // n'est pas remontée, donc les animations du hero ne rejouent pas.
  return (
    <>
      <div className="accueil-landing"><LandingPage chiffres={chiffres} /></div>
      {isLoading && <div className="accueil-attente"><LoadingSpinner /></div>}
    </>
  );
}
