"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, UserCheck, ArrowLeft, Check, Lock, UserMinus, Share2, MessageCircle, Loader2,
} from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import FollowListModal from "@/components/FollowListModal";
import GemmeRang from "@/components/GemmeRang";
import { AvatarRang, PseudoRang, TitreRang } from "@/components/rang/IdentiteRang";
import FlammeSerie from "@/components/serie/FlammeSerie";
import { calculerAura, cosmetiquesDuRang, etatDepuisExp, progressionRang, type EtatAura } from "@/lib/aura";
import { chargerRang } from "@/lib/rangsPublics";
import { chargerProfilPublic, type ProfilPublic } from "@/lib/profilPublic";
import { libelleObjectif, LEVELS } from "@/lib/profilOnboarding";
import { SERIES, imageEtat, relaisPartage, type SerieSlug, type RelaisPartage } from "@/lib/defi";
import { chargerBadgesAura } from "@/lib/badgesAura";
import EtagereBadges from "@/components/profil/EtagereBadges";
import LigneEnsemble from "@/components/profil/LigneEnsemble";
import CouvertureSeance from "@/components/profil/CouvertureSeance";
import AvecQui from "@/components/communaute/AvecQui";
import { accepterDemandeAmi, creerConversation, demanderAmi, relationAmi, type RelationAmi } from "@/lib/messagerie";
import type { PerformanceData } from "@/lib/afficheSeance";

/* Les colonnes `goals` et `level` ont quitté ce type, et ce n'est pas un
   allègement : elles n'existent dans AUCUNE migration et ne sont écrites par
   AUCUNE ligne de code. Elles étaient demandées dans le même `select` que le
   pseudo et l'avatar, donc le jour où PostgreSQL s'en serait plaint, c'est le
   profil ENTIER qui aurait rendu 404.
   Le questionnaire écrit `onboarding_goals` / `onboarding_level`
   (`lib/profilOnboarding.ts`), et c'est la seule source. */
type Profile = {
  id: string;
  pseudo: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  onboarding_goals?: string[] | null;
  onboarding_level?: string | null;
  is_admin?: boolean;
  created_at?: string | null;
};

/** Une affiche de séance partagée avec ses potes. */
type AfficheAmi = { id: string; data: PerformanceData; mot: string | null };


export default function PublicProfilePage() {
  const params = useParams();
  // Décode l'URL (les pseudos avec espaces/accents arrivent encodés : "La%20France" → "La France")
  const rawUsername = (params?.username as string) ?? "";
  let username = rawUsername;
  try { username = decodeURIComponent(rawUsername); } catch { /* déjà décodé */ }
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  /* Les séances et la série viennent du SERVEUR ou ne viennent pas.
     `workout_sessions` est en RLS propriétaire : les compter ici rendait 0
     pour tout le monde, toujours. `null` = on ne sait pas, donc on n'affiche
     rien ; jamais un zéro qui a l'air vrai. */
  const [pub, setPub] = useState<ProfilPublic | null>(null);
  /* ⚠️ UNE DEMANDE N'EST PAS UNE AMITIÉ (Louis, 2026-10-21). Cet écran
     lisait seulement « je la suis » : dès qu'on touchait « Ajouter », il
     affichait « Ami », « Écrire » et « Lancer un relais », donc on pouvait
     écrire à quelqu'un qui n'avait rien accepté. La relation se lit
     maintenant dans les deux sens. `null` = pas encore lue (ou lecture
     ratée) : on n'affiche alors aucune action. */
  const [relation, setRelation] = useState<RelationAmi | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showFollowList, setShowFollowList] = useState<"Abonnés" | "Abonnements" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [certified, setCertified] = useState(false); // is_certified (fetch défensif)
  const [aura, setAura] = useState<EtatAura | null>(null);
  const [badgeSlugs, setBadgeSlugs] = useState<Set<string>>(new Set());
  // ⚠️ La réponse porte le profil qu'elle décrit. Remettre l'état à zéro
  // dans l'effet serait un setState synchrone (et un avertissement React) ;
  // et ne rien remettre laisserait, le temps d'une requête, la ligne d'un
  // ami sur le profil du suivant. On compare, on ne réinitialise pas.
  const [ensemble, setEnsemble] = useState<{ pour: string; data: RelaisPartage | null } | null>(null);
  const [affiches, setAffiches] = useState<AfficheAmi[]>([]);
  const [avecQui, setAvecQui] = useState(false);
  const [ouvreFil, setOuvreFil] = useState(false);

  // Ce que vous avez fait ensemble. Effet séparé : le profil visité et ma
  // session n'arrivent pas au même moment, et l'effet du profil ne se
  // rejoue pas quand la session se résout.
  useEffect(() => {
    if (!user || !profile) return;
    let vivant = true;
    const pour = profile.id;
    void relaisPartage(user.id, pour)
      .then((r) => { if (vivant) setEnsemble({ pour, data: r }); })
      .catch(() => {});
    return () => { vivant = false; };
  }, [user, profile]);

  // Sticky mini-header
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowStickyHeader(window.scrollY > 160);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  const isOwnProfile = !!(user && profile && user.id === profile.id);

  // Reset scroll position when navigating to a public profile
  // useLayoutEffect runs synchronously before paint — prevents browser scroll restoration
  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
    }
  }, [username]);

  useEffect(() => {
    if (!username) return;
    const supabase = createClient();

    supabase
      .from("profiles")
      .select("id, pseudo, bio, avatar_url, onboarding_goals, onboarding_level, is_admin, created_at")
      .ilike("pseudo", username.trim())
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setProfile(data);

        // Certification (fetch défensif : la colonne is_certified peut ne pas exister)
        supabase.from("profiles").select("is_certified").eq("id", data.id).maybeSingle()
          .then(({ data: c }) => { if (c && (c as { is_certified?: boolean }).is_certified) setCertified(true); });

        // Le nombre d'amis se compte ici : `followers` est lisible de tous
        // (`USING (true)`), c'est le seul des trois chiffres qui l'était.
        // ⚠️ Seulement les amitiés ACCEPTÉES (2026-10-21) : il comptait
        // aussi les demandes qu'il ou elle a envoyées et qui attendent.
        const [ilSuit, leSuivent] = await Promise.all([
          supabase.from("followers").select("following_id").eq("follower_id", data.id),
          supabase.from("followers").select("follower_id").eq("following_id", data.id),
        ]);
        const suiveurs = new Set((leSuivent.data ?? []).map((r) => r.follower_id as string));
        setFollowingCount((ilSuit.data ?? []).filter((r) => suiveurs.has(r.following_id as string)).length);

        /* Les trois chiffres, et le rang.
           Un seul appel dans le cas normal : `profil_public` rend l'EXP, les
           séances et la série. On ne retombe sur `rangs_aura` que si sa
           migration n'est pas encore collée, pour que le rang continue de
           s'afficher comme avant ; et sur `calculerAura` seulement pour son
           propre profil, où les tables sont lisibles. */
        void chargerProfilPublic(data.id)
          .then(async (chiffres) => {
            if (chiffres) {
              setPub(chiffres);
              setAura(etatDepuisExp(chiffres.exp));
              return;
            }
            const rangPublic = await chargerRang(data.id);
            if (rangPublic) setAura(etatDepuisExp(rangPublic.exp));
            else if (user?.id === data.id) {
              const etat = await calculerAura(supabase, data.id);
              if (etat) setAura(etat);
            }
          })
          .catch(() => {});
        /* Pas de `progres` ici : le serveur ne le rend que pour soi. Un
           badge est fait pour se voir de l'extérieur, le détail de ce qui
           reste à quelqu'un d'autre ne l'est pas. */
        void chargerBadgesAura(data.id).then(({ slugs }) => setBadgeSlugs(slugs)).catch(() => {});

        /* Ses affiches de séance partagées avec ses potes. La policy de
           `posts` filtre déjà : seuls les amis réciproques les reçoivent. */
        void supabase
          .from("posts")
          .select("id, performance_data, caption")
          .eq("user_id", data.id)
          .eq("type", "workout")
          .eq("audience", "friends")
          .order("created_at", { ascending: false })
          .limit(12)
          .then(({ data: ps, error: errP }) => {
            if (errP || !ps) return;
            setAffiches(ps
              .filter((p) => p.performance_data)
              .map((p) => ({ id: p.id as string, data: p.performance_data as PerformanceData, mot: null })));
          });

        if (user && user.id !== data.id) {
          setRelation(await relationAmi(user.id, data.id));
        }

        setLoading(false);
      });
  }, [username, user]);

  /* Une demande passe par `demander_ami` (elle notifie et, si l'autre
     m'avait déjà demandé, elle ouvre notre fil), une acceptation par
     `accepter_demande_ami`. Retirer un ami et annuler sa demande, c'est le
     même geste : on supprime SON propre lien. */
  const agirAmi = async () => {
    if (!user || !profile || isOwnProfile || relation === null || followLoading) return;
    setFollowLoading(true);

    if (relation === "ami" || relation === "envoyee") {
      const { error } = await createClient()
        .from("followers")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profile.id);
      if (error) { console.error("retrait ami:", error); showToast("Impossible, réessaie"); setFollowLoading(false); return; }
      // Ce qui reste est SON lien vers moi, s'il existe : une demande reçue.
      setRelation(relation === "ami" ? "recue" : "aucune");
      if (relation === "ami") setFollowingCount((n) => Math.max(0, n - 1));
      setShowRemoveConfirm(false);
      showToast(relation === "ami" ? "Retiré de tes amis" : "Demande annulée");
    } else if (relation === "recue") {
      const r = await accepterDemandeAmi(profile.id);
      if (!r.ok) { showToast("Impossible d’accepter, réessaie"); setFollowLoading(false); return; }
      setRelation("ami");
      setFollowingCount((n) => n + 1);
      showToast("Vous êtes amis");
    } else {
      const r = await demanderAmi(profile.id);
      if (!r.ok) { showToast("Impossible d’envoyer la demande, réessaie"); setFollowLoading(false); return; }
      if (r.statut === "ami") {
        setRelation("ami");
        setFollowingCount((n) => n + 1);
        showToast("Vous êtes amis");
      } else {
        setRelation("envoyee");
        showToast("Demande envoyée");
        // Notification in-app + e-mail via la route serveur (insertion unique).
        void createClient().auth.getSession().then(({ data: { session } }) => {
          if (!session) return;
          fetch("/api/notifications/follow", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
            body: JSON.stringify({ follower_id: user.id, followed_id: profile.id }),
          }).catch(() => {});
        });
      }
    }

    setFollowLoading(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  /** Ouvre (ou retrouve) votre conversation à deux. */
  const ecrire = async () => {
    if (!profile || ouvreFil) return;
    setOuvreFil(true);
    const r = await creerConversation([profile.id]);
    setOuvreFil(false);
    if (!r?.ok || !r.conversation_id) { showToast("Impossible d’ouvrir la conversation"); return; }
    router.push(`/communaute/${r.conversation_id}`);
  };

  const partagerProfil = async () => {
    const url = `${window.location.origin}/profil/${encodeURIComponent(profile?.pseudo ?? username)}`;
    try {
      if (navigator.share) { await navigator.share({ title: `${profile?.pseudo ?? username} sur Vaiiya`, url }); return; }
      await navigator.clipboard.writeText(url);
      showToast("Lien copié");
    } catch { /* partage annulé */ }
  };

  const handleFriendButton = () => {
    if (relation === "ami" || relation === "envoyee") {
      setShowRemoveConfirm(true);
      return;
    }
    void agirAmi();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-8 h-8 rounded-full border-2"
          style={{ borderColor: "rgba(var(--accent-rgb),0.2)", borderTopColor: "var(--accent)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center text-[26px]"
          style={{ background: "rgba(var(--tint-violet-rgb),0.6)" }}
        >
          👤
        </div>
        <p className="text-[20px] font-light" style={{ color: "var(--text-1)" }}>
          Profil introuvable
        </p>
        <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
          @{username} n&apos;existe pas
        </p>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-2xl text-[16px] font-medium cursor-pointer"
          style={{
            background: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
            color: "#fff",
          }}
        >
          Retour
        </motion.button>
      </div>
    );
  }

  const displayPseudo = profile?.pseudo ?? username;
  const displayAvatar = profile?.avatar_url ?? "";
  const initial = displayPseudo[0]?.toUpperCase() ?? "?";
  // Décorations de rang de la personne regardée (déduites de son rang, rien en base).
  // La même mesure que la galerie des rangs, le profil et l'accueil.
  const progression = aura ? progressionRang(aura.exp) : null;
  const cosmetiques = cosmetiquesDuRang(aura?.rang.id ?? "");
  const isCertified = certified || profile?.is_admin === true;
  const rangSuivant = progression?.suivant ?? null;
  const serieJours = Math.max(1, pub?.serie ?? 0);
  const inscritLe = profile?.created_at ?? null;
  const membreDepuis = inscritLe
    ? new Date(inscritLe).toLocaleDateString("fr-FR", new Date(inscritLe).getFullYear() === new Date().getFullYear() ? { month: "long" } : { month: "long", year: "numeric" })
    : null;
  const niveau = profile?.onboarding_level
    ? LEVELS.find((l) => l.id === profile.onboarding_level)?.label ?? null
    : null;
  const objectif = profile?.onboarding_goals?.[0] ? libelleObjectif(profile.onboarding_goals[0]) : null;
  const identite = [objectif, niveau].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen px-5 pt-6 pb-28 max-w-2xl mx-auto relative overflow-x-hidden md:max-w-5xl md:px-10 md:pt-10">

      {/* ── Sticky mini-header (visible quand on scrolle) ── */}
      <AnimatePresence>
        {showStickyHeader && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-5 py-3 md:left-[88px]"
            style={{
              background: "rgba(var(--surface-rgb),0.92)",
              backdropFilter: "blur(16px)",
              borderBottom: "1px solid rgba(var(--text-3-rgb),0.12)",
            }}
          >
            <button type="button" aria-label="Retour" onClick={() => router.back()} className="flex items-center cursor-pointer" style={{ color: "var(--text-2)" }}>
              <ArrowLeft size={17} strokeWidth={2} />
            </button>
            <p className="text-[16px] font-semibold flex-1 truncate" style={{ color: "var(--text-0)" }}>{displayPseudo}</p>
            {!isOwnProfile && user && relation === "ami" && (
              <button
                type="button"
                onClick={() => void ecrire()}
                disabled={ouvreFil}
                className="px-4 h-9 rounded-full text-[13px] font-bold cursor-pointer text-white"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)" }}
              >
                Écrire
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Retour et partage : deux ronds de verre, comme sur mon profil. */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer"
          style={{ background: "rgba(var(--surface-rgb),0.62)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "var(--ombre-pose)" }}
        >
          <ArrowLeft size={19} strokeWidth={2} style={{ color: "var(--text-0)" }} />
        </button>
        <button
          type="button"
          onClick={() => void partagerProfil()}
          aria-label="Partager son profil"
          className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer"
          style={{ background: "rgba(var(--surface-rgb),0.62)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "var(--ombre-pose)" }}
        >
          <Share2 size={18} strokeWidth={2} style={{ color: "var(--text-0)" }} />
        </button>
      </div>

      {/* Sur ordinateur, deux colonnes : qui est la personne à gauche, ce
          qu'elle a gagné à droite. Sur téléphone, une seule. */}
      <div className="md:grid md:grid-cols-[400px_minmax(0,1fr)] md:gap-12 md:items-start">
      <div>
        {/* Le nom à gauche, en héros ; la photo à droite, dans son cadre de rang. */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-start gap-4 mt-6"
        >
          <div className="flex-1 min-w-0 flex flex-col gap-2 pt-1">
            <div className="flex items-center gap-2 min-w-0">
              <h1
                className="min-w-0"
                style={{ margin: 0, fontSize: 34, lineHeight: 1, fontWeight: 850, fontVariationSettings: "var(--w-affiche)", letterSpacing: "-0.02em", color: "var(--text-0)", overflowWrap: "anywhere" }}
              >
                {/* Sans la gemme : le rang s'écrit juste en dessous, une fois suffit. */}
                <PseudoRang cosmetiques={cosmetiques} pseudo={displayPseudo} />
              </h1>
              {isCertified && (
                <span
                  className="flex-shrink-0 flex items-center justify-center rounded-full"
                  title="Compte certifié"
                  style={{ width: 20, height: 20, background: "linear-gradient(135deg,#8B5CF6,#C13BC1)" }}
                >
                  <Check size={11} strokeWidth={3} color="#fff" />
                </span>
              )}
            </div>

            <TitreRang cosmetiques={cosmetiques} />

            {/* Le rang et l'ancienneté, en une ligne discrète. */}
            {aura && (
              <div className="flex items-center gap-1.5 vy-label" style={{ color: "var(--text-2)" }}>
                <GemmeRang rang={aura.rang} size={18} flotte={false} />
                <span style={{ fontWeight: 700, color: "var(--or-encre)" }}>{aura.rang.nom}</span>
                {membreDepuis && <><span>·</span><span>membre depuis {membreDepuis}</span></>}
              </div>
            )}

            {/* Ses objectifs et son niveau sur une ligne. C'est de l'IDENTITÉ,
                pas de la donnée de santé : jamais l'âge, le poids ni la taille. */}
            {identite && (
              <p className="vy-corps" style={{ margin: 0, color: "var(--exp-encre)", fontSize: 13, fontWeight: 600 }}>
                {identite}
              </p>
            )}

            {profile?.bio && (
              <p className="vy-corps" style={{ margin: 0, color: "var(--text-2)" }}>
                {profile.bio}
              </p>
            )}
          </div>

          {/* Avatar : il porte les décorations de rang de la personne (cadre à
              l'Or, anneau au Platine), c'est ici qu'elles se voient des autres. */}
          <AvatarRang cosmetiques={cosmetiques} size={108} className="flex-shrink-0 mt-0.5">
            <div className="absolute rounded-full" style={{ inset: 0, background: "rgb(var(--surface-rgb))" }} />
            <div
              className="absolute rounded-full overflow-hidden flex items-center justify-center text-[34px]"
              style={{
                inset: 3,
                background: displayAvatar ? "transparent" : "linear-gradient(135deg,rgba(var(--tint-violet-rgb),1),rgba(var(--tint-cream-rgb),1))",
                color: "var(--exp-encre)",
                fontWeight: 300,
              }}
            >
              {displayAvatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img loading="lazy" decoding="async" src={displayAvatar} alt="" className="w-full h-full object-cover" />
                : <span>{initial}</span>}
            </div>
          </AvatarRang>
        </motion.div>

        {/* Ami + Écrire. Entre amis, écrire est l'action utile, donc le
            violet ; « Ami » reste en retrait et demande confirmation avant
            de retirer quoi que ce soit.

            ⚠️ « Écrire » N'EXISTE QU'ENTRE AMIS (2026-10-21). Une demande
            envoyée se lit « Demande envoyée », en retrait, et ne donne
            aucune autre porte : ni écrire, ni lancer un relais. Une demande
            reçue s'accepte d'ici, en violet. */}
        {!isOwnProfile && user && (
          <>
          <div className="flex gap-2 mt-5">
            {relation === "ami" ? (
              <>
                <button
                  type="button"
                  onClick={handleFriendButton}
                  disabled={followLoading}
                  className="flex-1 h-11 rounded-full flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{ background: "rgba(139,92,246,0.12)", fontSize: 13, fontWeight: 700, color: "var(--exp-encre)" }}
                >
                  <UserCheck size={15} strokeWidth={2.2} />
                  Ami
                </button>
                <button
                  type="button"
                  onClick={() => void ecrire()}
                  disabled={ouvreFil}
                  className="flex-1 h-11 rounded-full flex items-center justify-center gap-1.5 cursor-pointer text-white"
                  style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)", fontSize: 13, fontWeight: 700 }}
                >
                  {ouvreFil ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} strokeWidth={2.2} />}
                  Écrire
                </button>
              </>
            ) : relation === "envoyee" ? (
              <button
                type="button"
                onClick={handleFriendButton}
                disabled={followLoading}
                className="flex-1 h-11 rounded-full flex items-center justify-center gap-1.5 cursor-pointer"
                style={{ background: "rgba(var(--text-3-rgb),0.1)", fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}
              >
                <Check size={15} strokeWidth={2.4} />
                Demande envoyée
              </button>
            ) : relation === "recue" || relation === "aucune" ? (
              <button
                type="button"
                onClick={handleFriendButton}
                disabled={followLoading}
                className="flex-1 h-11 rounded-full flex items-center justify-center gap-1.5 cursor-pointer text-white"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)", fontSize: 13, fontWeight: 700 }}
              >
                {followLoading
                  ? <Loader2 size={15} className="animate-spin" />
                  : relation === "recue" ? <UserCheck size={15} strokeWidth={2.2} /> : <UserPlus size={15} strokeWidth={2.2} />}
                {relation === "recue" ? "Accepter" : "Ajouter"}
              </button>
            ) : (
              /* La relation n'est pas encore lue : la place du bouton est
                 gardée, pour que rien ne saute quand elle arrive. */
              <div aria-hidden className="flex-1 h-11" />
            )}
          </div>
          {relation === "envoyee" && (
            <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
              Vous pourrez vous écrire dès que {displayPseudo} aura accepté.
            </p>
          )}
          {relation === "recue" && (
            <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
              {displayPseudo} t’a envoyé une demande d’ami. Accepte pour pouvoir vous écrire.
            </p>
          )}
          </>
        )}

        {isOwnProfile && (
          <div className="flex gap-2 mt-5">
            <button
              type="button"
              onClick={() => router.push("/profil")}
              className="flex-1 h-11 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--text-3-rgb),0.16)", fontSize: 13, fontWeight: 700, color: "var(--text-0)" }}
            >
              Modifier mon profil
            </button>
          </div>
        )}

        {/* Les chiffres, sans carte : des traits suffisent à les séparer.
            « Amis » se compte de partout (`followers` est en `USING (true)`).
            « Séances » et « Série » viennent du serveur : tant que
            `profil_public` ne répond pas, ils ne s'affichent PAS. Un chiffre
            qu'on ne peut pas prouver n'a pas sa place à côté d'un vrai. */}
        <div
          className="grid mt-6"
          style={{
            gridTemplateColumns: `repeat(${pub ? 3 : 1}, minmax(0, 1fr))`,
            borderTop: "1px solid rgba(var(--text-3-rgb),0.16)",
            borderBottom: "1px solid rgba(var(--text-3-rgb),0.16)",
          }}
        >
          {([
            { label: followingCount > 1 ? "amis" : "ami", value: String(followingCount), liste: true, feu: false },
            ...(pub ? [
              { label: pub.seances > 1 ? "séances" : "séance", value: String(pub.seances), liste: false, feu: false },
              /* La série se dit en orange partout : c'est le rôle ÉNERGIE du
                 système D, et c'est ce qui la sépare du teal de la réussite. */
              { label: serieJours > 1 ? "jours de série" : "jour de série", value: String(serieJours), liste: false, feu: true },
            ] : []),
          ]).map(({ label, value, liste, feu }, i) => (
            <button
              key={label}
              type="button"
              onClick={() => { if (liste) setShowFollowList("Abonnements"); }}
              className="flex flex-col items-start gap-0.5 py-4 text-left"
              style={{ cursor: liste ? "pointer" : "default", paddingLeft: i === 0 ? 2 : 18, borderLeft: i > 0 ? "1px solid rgba(var(--text-3-rgb),0.16)" : "none" }}
            >
              <span className="vy-nombre flex items-center gap-1 text-[26px] leading-none" style={{ color: feu ? "var(--feu-encre)" : "var(--text-0)", fontWeight: 700 }}>
                {/* La même flamme que sur son accueil, au palier de sa série. */}
                {feu && <FlammeSerie jours={serieJours} taille={16} />}
                {value}
              </span>
              <span className="vy-label" style={{ color: "var(--text-2)", fontWeight: 400 }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Son rang, puis ce que vous avez fait ensemble : un seul groupe,
            un filet entre les deux. Pas de gemme suivante en filigrane : Louis
            l'a retirée de la maquette, deux gemmes pour un rang c'était une
            de trop. */}
        {aura && (
          <div
            className="mt-4 overflow-hidden"
            style={{ borderRadius: "var(--r-affiche)", background: "rgba(var(--surface-rgb),0.66)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "var(--ombre-pose)" }}
          >
            <div className="vy-filet flex items-center gap-4 p-4 pl-3.5">
              <div className="flex-shrink-0"><GemmeRang rang={aura.rang} size={58} flotte={false} /></div>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <span className="vy-sous" style={{ color: "var(--text-0)" }}>{aura.rang.nom}</span>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(139,92,246,0.14)" }}>
                  <div className="h-full rounded-full" style={{
                    width: `${Math.max(4, (progression?.part ?? 0) * 100)}%`,
                    background: "linear-gradient(90deg,#8B5CF6,#C13BC1)",
                  }} />
                </div>
                {rangSuivant ? (
                  <span className="vy-label" style={{ color: "var(--text-2)", fontWeight: 400 }}>
                    Plus que <b className="vy-nombre" style={{ color: "var(--exp-encre)", fontWeight: 700 }}>{aura.restant}</b> EXP avant {rangSuivant.nom}
                  </span>
                ) : (
                  <span className="vy-label" style={{ color: "var(--text-2)", fontWeight: 400 }}>Le sommet.</span>
                )}
              </div>
            </div>
            {/* Ce que vous avez fait ensemble. Muette si vous n'avez jamais
                joué à deux, donc invisible sur le profil d'un inconnu. */}
            {profile && ensemble?.pour === profile.id && ensemble.data && (
              <div className="vy-filet">
                <LigneEnsemble serie={ensemble.data.serie} nombre={ensemble.data.nombre} nu />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 md:mt-6">
      {/* IL N'Y A PAS D'ONGLETS : une seule page. Ce qui reste est ce qui se
          gagne à deux, ou ce qui se voit par nature : ses affiches de relais,
          les affiches qu'il ou elle partage avec ses potes, ses badges.
          Jamais un fil d'activité, jamais une comparaison. */}
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="vy-sous" style={{ margin: 0, color: "var(--text-0)" }}>Affiches du relais</h2>
        <span className="vy-nombre text-[13px]" style={{ color: "var(--text-2)" }}>
          {(Object.keys(SERIES) as SerieSlug[]).filter((s) => badgeSlugs.has(`serie-${s}`)).length} / {Object.keys(SERIES).length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 md:max-w-[520px] md:gap-3.5">
        {(Object.keys(SERIES) as SerieSlug[]).map((slug) => {
          const serie = SERIES[slug];
          const gagnee = badgeSlugs.has(`serie-${slug}`);
          return (
            <div
              key={slug}
              className="relative overflow-hidden"
              style={{ borderRadius: "var(--r-bloc)", aspectRatio: "9/16", boxShadow: "var(--ombre-pose)", background: "#2A2536" }}
            >
              <Image
                src={imageEtat(slug, 4)}
                alt={gagnee ? `Affiche ${serie.nom}` : `Affiche ${serie.nom}, pas encore dévoilée`}
                fill
                sizes="(max-width:768px) 30vw, 170px"
                className="object-cover"
                style={{ filter: gagnee ? "none" : "grayscale(1) brightness(0.45)" }}
              />
              {gagnee && <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,6,18,0) 55%, rgba(10,6,18,0.7) 100%)" }} />}
              {gagnee && <div className="absolute top-2 right-2.5 text-[13px]" style={{ color: "#fff" }}>&#10022;</div>}
              {!gagnee && (
                <div className="absolute inset-0 grid place-items-center">
                  <Lock size={20} strokeWidth={2} style={{ color: "rgba(255,255,255,0.6)" }} />
                </div>
              )}
              <div className="absolute left-2.5 right-2 bottom-2.5" style={{ color: "#fff" }}>
                <p className="text-[13px] font-extrabold leading-tight">{serie.nom}</p>
                <p className="text-[11px] mt-0.5" style={{ opacity: gagnee ? 0.8 : 0.7 }}>
                  {gagnee ? "Dévoilée à deux" : "À dévoiler"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {!isOwnProfile && user && relation === "ami" && (
        <button
          type="button"
          onClick={() => setAvecQui(true)}
          className="min-h-[44px] flex items-center text-[13px] font-bold cursor-pointer mt-1"
          style={{ color: "var(--exp-encre)" }}
        >
          Lancer un relais avec {displayPseudo} →
        </button>
      )}

      {/* Les affiches de séance qu'il ou elle partage avec ses potes. La
          policy de `posts` ne les rend qu'aux amis réciproques : un inconnu
          ne voit rien, et la section disparaît. */}
      {affiches.length > 0 && (
        <>
          <div className="flex items-baseline justify-between mt-7 mb-3">
            <h2 className="vy-sous" style={{ margin: 0, color: "var(--text-0)" }}>Ses affiches</h2>
            <span className="vy-label" style={{ color: "var(--text-2)", fontWeight: 400 }}>Partagées avec ses potes</span>
          </div>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible" style={{ scrollbarWidth: "none" }}>
            {affiches.map((a, idx) => (
              <CouvertureSeance key={a.id} data={a.data} mot={a.mot} teinte={idx % 2} />
            ))}
          </div>
        </>
      )}

      {/* Un badge se voit du dehors, sinon il ne décore personne. */}
      <div className="mt-7">
        <EtagereBadges slugs={badgeSlugs} titre="Ses badges" />
      </div>
      </div>
      </div>

      {/* La porte du relais : la même feuille que dans la communauté, avec
          cette personne déjà cochée. */}
      <AnimatePresence>
        {avecQui && user && profile && (
          <AvecQui
            moi={user.id}
            preselection={profile.id}
            onFermer={() => setAvecQui(false)}
            onFil={(id) => { setAvecQui(false); router.push(`/communaute/${id}`); }}
            onLien={() => { setAvecQui(false); router.push("/defi"); }}
          />
        )}
      </AnimatePresence>
      {/* Une relation d'amitié ne se retire jamais sur un clic accidentel. */}
      <AnimatePresence>
        {showRemoveConfirm && profile && (
          <motion.div
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center p-0 md:items-center md:p-6"
            style={{ background: "rgba(0,0,0,.48)", backdropFilter: "blur(5px)" }}
            onClick={() => setShowRemoveConfirm(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="retirer-ami-titre"
              initial={{ y: "100%", opacity: .7 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: .7 }}
              transition={{ type: "spring", damping: 30, stiffness: 340 }}
              className="w-full max-w-md rounded-t-[var(--r-feuille)] px-5 pb-6 pt-3 md:rounded-[26px] md:p-6"
              style={{
                background: "rgb(var(--surface-rgb))",
                paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
                boxShadow: "var(--ombre-flottant)",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                className="mx-auto mb-5 h-1 w-10 rounded-full md:hidden"
                style={{ background: "rgba(var(--text-3-rgb),.35)" }}
              />
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: "rgba(var(--text-3-rgb),.1)", color: "var(--text-2)" }}
              >
                <UserMinus className="h-5 w-5" />
              </div>
              <h2
                id="retirer-ami-titre"
                className="mt-4 text-center text-[20px] font-bold"
                style={{ color: "var(--text-0)" }}
              >
                {relation === "envoyee" ? `Annuler ta demande à ${profile.pseudo} ?` : `Retirer ${profile.pseudo} de tes amis ?`}
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-center text-[13px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                {relation === "envoyee"
                  ? "Tu pourras en envoyer une autre plus tard."
                  : "Vous ne verrez plus vos affiches dans vos fils. Votre conversation reste lisible, mais pour vous écrire à nouveau, il faudra une demande acceptée."}
              </p>
              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setShowRemoveConfirm(false)}
                  className="rounded-2xl px-4 py-3 text-[16px] font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)" }}
                >
                  {relation === "envoyee" ? "Garder ma demande" : "Garder comme ami"}
                </button>
                <button
                  type="button"
                  onClick={() => void agirAmi()}
                  disabled={followLoading}
                  className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[16px] font-semibold disabled:opacity-50"
                  style={{ color: "var(--text-2)", background: "rgba(var(--text-3-rgb),.08)" }}
                >
                  {followLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <UserMinus className="h-4 w-4" />
                  )}
                  {relation === "envoyee" ? "Annuler la demande" : "Retirer de mes amis"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl flex items-center gap-2"
            style={{
              background: "rgba(var(--surface-rgb),0.95)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(var(--surface-rgb),0.9)",
              boxShadow: "var(--ombre-flottant)",
              whiteSpace: "nowrap",
            }}
          >
            <Check size={14} strokeWidth={2.5} style={{ color: "var(--gold)" }} />
            <span className="text-[16px] font-medium" style={{ color: "var(--text-1)" }}>
              {toast}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ses amis (cliquable depuis les chiffres) */}
      <AnimatePresence>
        {showFollowList && profile && (
          <FollowListModal
            ownerId={profile.id}
            onClose={() => setShowFollowList(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
