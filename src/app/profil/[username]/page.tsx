"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, UserCheck, ArrowLeft, Check, Lock, UserMinus,
} from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import FollowListModal from "@/components/FollowListModal";
import GemmeRang from "@/components/GemmeRang";
import { AvatarRang, PseudoRang, TitreRang } from "@/components/rang/IdentiteRang";
import { calculerAura, cosmetiquesDuRang, etatDepuisExp, RANGS, type EtatAura } from "@/lib/aura";
import { chargerRang } from "@/lib/rangsPublics";
import { chargerProfilPublic, type ProfilPublic } from "@/lib/profilPublic";
import { libelleObjectif, LEVELS } from "@/lib/profilOnboarding";
import { SERIES, imageEtat, relaisPartage, type SerieSlug, type RelaisPartage } from "@/lib/defi";
import { chargerBadgesAura } from "@/lib/badgesAura";
import EtagereBadges from "@/components/profil/EtagereBadges";
import LigneEnsemble from "@/components/profil/LigneEnsemble";

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
};


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
  const [isFollowing, setIsFollowing] = useState(false);
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
      .select("id, pseudo, full_name, bio, avatar_url, onboarding_goals, onboarding_level, is_admin")
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
        const { count: amisCount } = await supabase
          .from("followers")
          .select("following_id", { count: "exact", head: true })
          .eq("follower_id", data.id);
        setFollowingCount(amisCount ?? 0);

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

        if (user && user.id !== data.id) {
          const { data: followData } = await supabase
            .from("followers")
            .select("follower_id")
            .eq("follower_id", user.id)
            .eq("following_id", data.id)
            .maybeSingle();
          setIsFollowing(!!followData);
        }

        setLoading(false);
      });
  }, [username, user]);

  const handleFollow = async () => {
    if (!user || !profile || isOwnProfile) return;
    const supabase = createClient();
    setFollowLoading(true);

    if (isFollowing) {
      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profile.id);
      if (error) { console.error("unfollow:", error); showToast("Impossible de retirer, réessaie"); setFollowLoading(false); return; }
      setIsFollowing(false);
      setShowRemoveConfirm(false);
      showToast("Retiré de tes amis");
    } else {
      const { error } = await supabase
        .from("followers")
        .upsert(
          { follower_id: user.id, following_id: profile.id },
          { onConflict: "follower_id,following_id", ignoreDuplicates: true }
        );
      if (error) { console.error("follow:", error); showToast("Impossible d’ajouter, réessaie"); setFollowLoading(false); return; }
      // Notification in-app + email via route admin (insertion unique)
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        fetch("/api/notifications/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
          body: JSON.stringify({ follower_id: user.id, followed_id: profile.id }),
        }).catch(() => {});
      });
      setIsFollowing(true);
      showToast("Ami ajouté.");
    }

    setFollowLoading(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleFriendButton = () => {
    if (isFollowing) {
      setShowRemoveConfirm(true);
      return;
    }
    void handleFollow();
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
          className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl"
          style={{ background: "rgba(var(--tint-violet-rgb),0.6)" }}
        >
          👤
        </div>
        <p className="text-lg font-light" style={{ color: "var(--text-1)" }}>
          Profil introuvable
        </p>
        <p className="text-sm" style={{ color: "var(--text-3)" }}>
          @{username} n&apos;existe pas
        </p>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-2xl text-sm font-medium cursor-pointer"
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
  const rangCourant = aura?.rang ?? RANGS[0];
  const cosmetiques = cosmetiquesDuRang(aura?.rang.id ?? "");
  const isCertified = certified || profile?.is_admin === true;

  return (
    <div className="min-h-screen px-6 pt-10 pb-12 max-w-2xl mx-auto relative overflow-x-hidden">
      {/* Blobs */}
      <div
        className="fixed top-0 left-0 pointer-events-none -z-10"
        style={{
          width: 320,
          height: 320,
          background: "radial-gradient(circle, rgba(var(--violet-mid-rgb),0.35) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />
      <div
        className="fixed bottom-0 right-0 pointer-events-none -z-10"
        style={{
          width: 300,
          height: 300,
          background: "radial-gradient(circle, rgba(var(--cream-mid-rgb),0.3) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

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
              borderBottom: "1px solid rgba(var(--violet-mid-rgb),0.2)",
            }}
          >
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()} className="flex items-center gap-1 cursor-pointer" style={{ color: "var(--text-3)" }}>
              <ArrowLeft size={15} strokeWidth={1.5} />
            </motion.button>
            <div
              className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-semibold flex-shrink-0"
              style={{ background: displayAvatar ? "transparent" : "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))", color: "var(--text-1)" }}
            >
              {displayAvatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img loading="lazy" decoding="async" src={displayAvatar} alt="" className="w-full h-full object-cover" />
                : initial}
            </div>
            <p className="text-sm font-semibold flex-1" style={{ color: "var(--text-1)" }}>@{displayPseudo}</p>
            {!isOwnProfile && user && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleFriendButton}
                disabled={followLoading}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
                style={isFollowing
                  ? { background: "rgba(var(--tint-violet-rgb),0.7)", color: "var(--exp-encre)", border: "1px solid rgba(var(--accent-rgb),0.2)" }
                  : { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff" }
                }
              >
                {isFollowing ? "Ami" : "Ajouter"}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.back()}
        whileTap={{ scale: 0.93 }}
        className="flex items-center gap-2 mb-8 cursor-pointer"
        style={{ color: "var(--text-3)" }}
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        <span className="text-sm font-medium">Retour</span>
      </motion.button>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl p-6 mb-6 relative overflow-hidden"
        style={{
          /* Cette carte était peinte en dur (#faf8ff vers #fffef8). Elle porte
             le pseudo, la bio, le rang et les chiffres, tous en `--text-0` :
             en mode sombre, ce blanc cassé rendait un texte presque blanc sur
             un aplat presque blanc. Le voile violet des jetons dit la même
             chose et suit le thème. */
          background: "linear-gradient(135deg, rgba(var(--tint-violet-rgb),0.75) 0%, rgba(var(--tint-cream-rgb),0.75) 100%)",
          border: "1px solid rgba(var(--violet-mid-rgb),0.35)",
          boxShadow: "0 4px 32px rgba(var(--accent-rgb),0.1), inset 0 1px 0 rgba(var(--surface-rgb),0.95)",
        }}
      >
        <motion.div
          className="absolute -top-12 -right-12 w-52 h-52 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(var(--violet-mid-rgb),0.35) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="flex flex-col items-center text-center relative z-10 mb-4">
          {/* Avatar — porte les décorations de rang de la personne (cadre à l'Or,
              anneau au Platine) : c'est ici qu'elles se voient par les autres. */}
          <AvatarRang rang={rangCourant} cosmetiques={cosmetiques} size={88} className="mb-3">
            <div
              className="absolute inset-0"
              style={{
                borderRadius: "50%",
                padding: 3,
                background: "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)",
                boxShadow: "0 6px 24px rgba(var(--accent-rgb),0.28)",
              }}
            >
              <div
                className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-3xl font-semibold"
                style={{ background: displayAvatar ? "transparent" : "linear-gradient(135deg,rgba(var(--tint-violet-rgb),1) 0%,rgba(var(--tint-cream-rgb),1) 100%)", color: "var(--text-1)" }}
              >
                {displayAvatar
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img loading="lazy" decoding="async" src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                  : <span>{initial}</span>}
              </div>
            </div>
          </AvatarRang>

          {/* Pseudo + badge certifié */}
          <div className="flex items-center gap-2 justify-center">
            <h1 className="text-[28px] font-black tracking-[-0.03em] leading-none" style={{ color: "var(--text-0)" }}>
              <PseudoRang
                rang={rangCourant}
                cosmetiques={cosmetiques}
                pseudo={displayPseudo}
                tailleGemme={22}
              />
            </h1>
            {isCertified && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                className="flex-shrink-0 flex items-center justify-center rounded-full"
                title="Compte certifié"
                style={{ width: 22, height: 22, background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 2px 8px rgba(139,92,246,0.4)" }}
              >
                <svg width="11" height="11" viewBox="0 0 13 13" fill="none">
                  <path d="M2.5 6.5L5 9L10.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
            )}
          </div>

          {/* Titre débloqué au Diamant */}
          <TitreRang cosmetiques={cosmetiques} />

          {/* Ses objectifs. C'est de l'IDENTITÉ, pas de la donnée de santé :
              on montre le libellé (« Prise de masse »), jamais l'âge, le poids
              ni la taille, qui vivent dans les colonnes voisines et n'ont rien
              à faire dehors. */}
          {profile?.onboarding_goals && profile.onboarding_goals.length > 0 && (
            <p className="text-[12px] font-semibold mt-1.5 max-w-[260px]" style={{ color: "var(--exp-encre)" }}>
              {profile.onboarding_goals.map(libelleObjectif).join(" · ")}
            </p>
          )}

          {/* Bio */}
          {profile?.bio && (
            <p className="text-sm mt-1.5 max-w-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
              {profile.bio}
            </p>
          )}

          {/* Son niveau */}
          {profile?.onboarding_level && (
            <span
              className="inline-block mt-2 text-[10px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full"
              style={{ background: "rgba(var(--violet-mid-rgb),0.3)", color: "var(--exp-encre)", border: "1px solid rgba(var(--accent-rgb),0.25)" }}
            >
              {LEVELS.find((l) => l.id === profile.onboarding_level)?.label ?? profile.onboarding_level}
            </span>
          )}
        </div>

        {/* Follow button row */}
        <div className="flex justify-center relative z-10">
          <div className="flex gap-2">

          {!isOwnProfile && user && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleFriendButton}
                disabled={followLoading}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-semibold cursor-pointer flex-shrink-0"
                style={
                  isFollowing
                    ? {
                        background: "rgba(var(--tint-violet-rgb),0.7)",
                        color: "var(--accent)",
                        border: "1px solid rgba(var(--accent-rgb),0.2)",
                      }
                    : {
                        /* Le bouton principal de l'écran est TOUJOURS violet
                           plein (système D). Il était en lavande pâle avec du
                           texte sombre : il se lisait comme désactivé. */
                        background: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
                        color: "#fff",
                        boxShadow: "0 4px 14px rgba(139,92,246,0.32)",
                      }
                }
              >
                {isFollowing ? (
                  <><UserCheck size={13} strokeWidth={2} />Ami</>
                ) : (
                  <><UserPlus size={13} strokeWidth={2} />Ajouter</>
                )}
              </motion.button>
            </>
          )}

          {isOwnProfile && (
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => router.push("/profil")}
              className="px-4 py-2 rounded-2xl text-xs font-semibold cursor-pointer"
              style={{
                background: "rgba(var(--tint-violet-rgb),0.6)",
                color: "var(--accent)",
                border: "1px solid rgba(var(--accent-rgb),0.15)",
              }}
            >
              Modifier
            </motion.button>
          )}
          </div>
        </div>

        {/* ─── Rang (l'aura) ─── */}
        {aura && (
          <div
            className="flex items-center gap-4 mt-5 px-4 py-3.5 rounded-3xl relative z-10"
            style={{
              background: "rgba(var(--surface-rgb),0.8)",
              border: "1px solid rgba(var(--accent-rgb),0.14)",
              boxShadow: "0 4px 24px rgba(var(--accent-rgb),0.1)",
            }}
          >
            <div className="flex-shrink-0"><GemmeRang rang={aura.rang} size={44} /></div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--text-3)" }}>Rang</span>
              <p className="text-[19px] font-black tracking-[-0.02em] leading-tight" style={{ color: "var(--text-0)" }}>{aura.rang.nom}</p>
              <p className="text-[12.5px] font-semibold mt-0.5" style={{ color: "var(--text-soft)" }}>
                <span style={{ color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{aura.exp}</span> / {aura.seuilHaut} EXP
              </p>
              <div className="h-[7px] rounded-full mt-2 overflow-hidden" style={{ background: "rgba(var(--tint-violet-rgb),0.9)" }}>
                <div className="h-full rounded-full" style={{
                  width: `${Math.min(100, Math.max(4, ((aura.exp - aura.seuilBas) / Math.max(1, aura.seuilHaut - aura.seuilBas)) * 100))}%`,
                  background: "linear-gradient(90deg,#8B5CF6,#C13BC1)",
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Les chiffres.
            « Amis » se compte de partout (`followers` est en `USING (true)`).
            « Séances » et « Série » viennent du serveur : tant que
            `profil_public` n'est pas collée, ils ne s'affichent PAS. Un chiffre
            qu'on ne peut pas prouver n'a pas sa place à côté de deux qui sont
            vrais : l'écran en montrait trois, dont deux valaient zéro pour tout
            le monde depuis toujours. */}
        <div
          className="flex items-center mt-4 pt-4 relative z-10"
          style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.1)" }}
        >
          {([
            { label: "Amis", value: String(followingCount), tab: "Abonnements" as const, encre: "var(--text-1)" },
            ...(pub ? [
              { label: "Séances", value: String(pub.seances), tab: null, encre: "var(--text-1)" },
              /* La série se dit en orange partout : c'est le rôle ÉNERGIE du
                 système D, et c'est ce qui la sépare du teal de la réussite. */
              { label: "Série", value: `🔥 ${pub.serie}`, tab: null, encre: "var(--feu-encre)" },
            ] : []),
          ] as { label: string; value: string; tab: "Abonnés" | "Abonnements" | null; encre: string }[]).map(({ label, value, tab, encre }, i) => (
            <div key={label} className="flex items-center flex-1">
              {i > 0 && (
                <div
                  className="w-px self-stretch mx-2"
                  style={{ background: "rgba(var(--accent-rgb),0.15)" }}
                />
              )}
              <motion.div
                onClick={() => tab && setShowFollowList(tab)}
                whileTap={tab ? { scale: 0.94 } : undefined}
                whileHover={tab ? { backgroundColor: "rgba(var(--accent-rgb),0.07)" } : undefined}
                className={`flex-1 flex flex-col items-center py-1 rounded-xl ${tab ? "cursor-pointer" : ""}`}
              >
                <span className="text-[22px] font-black leading-none" style={{ color: encre, letterSpacing: "-0.03em" }}>
                  {value}
                </span>
                <span
                  className="text-[10px] font-bold tracking-[0.12em] uppercase mt-1.5"
                  style={{ color: tab ? "var(--accent)" : "var(--text-3)" }}
                >
                  {label}
                </span>
              </motion.div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Ce que vous avez fait ensemble. Muette si vous n'avez jamais
          joué à deux, donc invisible sur le profil d'un inconnu. */}
      {profile && ensemble?.pour === profile.id && ensemble.data && (
        <LigneEnsemble serie={ensemble.data.serie} nombre={ensemble.data.nombre} />
      )}

      {/* LES ONGLETS ONT DISPARU, ET IL N'EN RESTE QU'UNE PAGE.
          « Séances » listait les trois dernières séances de la personne : la
          requête ne rendait JAMAIS rien (RLS propriétaire), et le jour où elle
          aurait rendu quelque chose, c'aurait été un fil d'activité, refusé
          depuis juillet. « Ses affiches de perf » était vide par construction
          elle aussi : depuis le 30 août une affiche s'écrit en `private`, donc
          la policy de `posts` ne la montre qu'à son auteur.
          Ce qui reste est ce qui se gagne à deux, ou ce qui se voit par
          nature : son rang, ses affiches de relais, ses badges, et la ligne
          « ensemble » juste au-dessus. */}
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-3)" }}>
        Affiches du relais
      </p>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {(Object.keys(SERIES) as SerieSlug[]).map((slug) => {
          const serie = SERIES[slug];
          const gagnee = badgeSlugs.has(`serie-${slug}`);
          return (
            <div
              key={slug}
              className="relative rounded-2xl overflow-hidden"
              style={{ aspectRatio: "9/16", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 10px 26px -12px rgba(0,0,0,0.5)" }}
            >
              <Image
                src={imageEtat(slug, 4)}
                alt={serie.nom}
                fill
                sizes="(max-width:768px) 45vw, 200px"
                className="object-cover"
                style={{ filter: gagnee ? "none" : "grayscale(1) brightness(0.5)" }}
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 45%,rgba(0,0,0,0.72))" }} />
              {gagnee && <div className="absolute top-2.5 right-3 text-[13px] font-black" style={{ color: "rgba(255,255,255,0.9)" }}>&#10022;</div>}
              <div className="absolute left-3 right-3 bottom-3" style={{ color: "#fff" }}>
                <p className="text-[14px] font-black leading-tight">{serie.nom}</p>
                <p className="text-[10.5px] font-semibold mt-0.5" style={{ opacity: 0.75 }}>
                  {gagnee ? "Dévoilée · à deux" : serie.promesse}
                </p>
              </div>
              {!gagnee && (
                <div className="absolute inset-0 grid place-items-center" style={{ background: "rgba(10,6,18,0.42)" }}>
                  <Lock size={22} strokeWidth={2} style={{ color: "rgba(255,255,255,0.55)" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Un badge se voit du dehors, sinon il ne decore personne. */}
      <EtagereBadges slugs={badgeSlugs} titre="Ses badges" />

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
              className="w-full max-w-md rounded-t-[26px] px-5 pb-6 pt-3 md:rounded-[26px] md:p-6"
              style={{
                background: "rgb(var(--surface-rgb))",
                paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
                boxShadow: "0 24px 70px rgba(17,10,34,.24)",
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
                className="mt-4 text-center text-[18px] font-bold"
                style={{ color: "var(--text-0)" }}
              >
                Retirer {profile.pseudo} de tes amis ?
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-center text-[13.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                Cette action supprimera votre lien d&apos;amitié. Votre conversation restera disponible.
              </p>
              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setShowRemoveConfirm(false)}
                  className="rounded-2xl px-4 py-3 text-[14px] font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)" }}
                >
                  Garder comme ami
                </button>
                <button
                  type="button"
                  onClick={() => void handleFollow()}
                  disabled={followLoading}
                  className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[14px] font-semibold disabled:opacity-50"
                  style={{ color: "var(--text-2)", background: "rgba(var(--text-3-rgb),.08)" }}
                >
                  {followLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <UserMinus className="h-4 w-4" />
                  )}
                  Retirer de mes amis
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
              boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.2)",
              whiteSpace: "nowrap",
            }}
          >
            <Check size={14} strokeWidth={2.5} style={{ color: "var(--gold)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
              {toast}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des abonnés / abonnements (cliquable depuis les stats) */}
      <AnimatePresence>
        {showFollowList && profile && (
          <FollowListModal
            type={showFollowList}
            ownerId={profile.id}
            onClose={() => setShowFollowList(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
