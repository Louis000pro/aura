"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp, Sparkles, UserPlus, UserCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Profile = {
  id: string;
  pseudo: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  mutual_count?: number;
  follower_count?: number;
};

const sectionGradients = [
  "linear-gradient(135deg, #D4C0FF 0%, #A78BFA 100%)",
  "linear-gradient(135deg, #F5E6A3 0%, #D4A843 100%)",
  "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
  "linear-gradient(135deg, #F0EBFF 0%, #D4C0FF 100%)",
  "linear-gradient(135deg, #FFFBF0 0%, #F5E6A3 100%)",
];

function avatarGradient(id: string) {
  return sectionGradients[id.charCodeAt(0) % sectionGradients.length];
}

function ProfileCard({
  profile,
  isFollowing,
  onFollow,
  showMutual = false,
}: {
  profile: Profile;
  isFollowing: boolean;
  onFollow: (profile: Profile) => void;
  showMutual?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="lg-surface lg-highlight relative flex items-center gap-3 px-4 py-3 rounded-2xl"
    >
      <Link href={`/profil/${profile.pseudo}`} className="flex-shrink-0">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-base overflow-hidden"
          style={{ background: profile.avatar_url ? "transparent" : avatarGradient(profile.id), color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}
        >
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={profile.pseudo} className="w-full h-full object-cover" />
          ) : (
            (profile.pseudo?.[0] ?? "?").toUpperCase()
          )}
        </div>
      </Link>

      <Link href={`/profil/${profile.pseudo}`} className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>
          {profile.full_name || profile.pseudo}
        </p>
        <p className="text-[11px]" style={{ color: "#A78BFA" }}>@{profile.pseudo}</p>
        {showMutual && (profile.mutual_count ?? 0) > 0 ? (
          <p className="text-[10px] mt-0.5" style={{ color: "#A0AEC0" }}>
            {profile.mutual_count} ami{(profile.mutual_count ?? 0) > 1 ? "s" : ""} en commun
          </p>
        ) : profile.bio ? (
          <p className="text-[10px] truncate mt-0.5" style={{ color: "#A0AEC0" }}>{profile.bio}</p>
        ) : null}
      </Link>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onFollow(profile)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer flex-shrink-0"
        style={
          isFollowing
            ? { background: "rgba(240,235,255,0.7)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.2)" }
            : { background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
        }
      >
        {isFollowing
          ? <><UserCheck size={12} strokeWidth={2} /> Suivi</>
          : <><UserPlus size={12} strokeWidth={2} /> Suivre</>}
      </motion.button>
    </motion.div>
  );
}

type Tab = "reseau" | "populaires" | "nouveaux";

const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "reseau",     label: "Ton réseau",  icon: Users },
  { id: "populaires", label: "Populaires",  icon: TrendingUp },
  { id: "nouveaux",   label: "Nouveaux",    icon: Sparkles },
];

export default function DecouvertePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("reseau");
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [reseauProfiles, setReseauProfiles]       = useState<Profile[]>([]);
  const [populairesProfiles, setPopulairesProfiles] = useState<Profile[]>([]);
  const [nouveauxProfiles, setNouveauxProfiles]   = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // Charger les abonnements existants
  useEffect(() => {
    if (!user) return;
    createClient()
      .from("followers")
      .select("following_id")
      .eq("follower_id", user.id)
      .then(({ data }) => {
        if (data) setFollowingIds(new Set(data.map((r) => r.following_id as string)));
      });
  }, [user]);

  // Charger selon l'onglet actif
  const loadTab = useCallback(async (tab: Tab) => {
    if (!user) return;
    setLoading(true);
    const supabase = createClient();

    if (tab === "reseau") {
      const { data } = await supabase.rpc("get_suggested_users", {
        p_user_id: user.id,
        p_limit: 20,
      });
      setReseauProfiles((data as Profile[]) ?? []);

    } else if (tab === "populaires") {
      // Profils avec le plus d'abonnés (via count sur followers)
      const { data } = await supabase
        .from("profiles")
        .select("id, pseudo, full_name, avatar_url, bio")
        .neq("id", user.id)
        .order("created_at", { ascending: true }) // approximatif — on trie côté client après count
        .limit(40);

      if (data) {
        // Récupérer les follower counts pour ces profils
        const ids = (data as Profile[]).map((p) => p.id);
        const { data: counts } = await supabase
          .from("followers")
          .select("following_id")
          .in("following_id", ids);

        const countMap: Record<string, number> = {};
        (counts ?? []).forEach((r) => {
          const id = r.following_id as string;
          countMap[id] = (countMap[id] ?? 0) + 1;
        });

        const sorted = (data as Profile[])
          .map((p) => ({ ...p, follower_count: countMap[p.id] ?? 0 }))
          .sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0))
          .slice(0, 20);

        setPopulairesProfiles(sorted);
      }

    } else {
      // Nouveaux membres (récents, pas encore suivis)
      const { data } = await supabase
        .from("profiles")
        .select("id, pseudo, full_name, avatar_url, bio")
        .neq("id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setNouveauxProfiles((data as Profile[]) ?? []);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, loadTab]);

  const handleFollow = async (profile: Profile) => {
    if (!user) return;
    const supabase = createClient();
    const isF = followingIds.has(profile.id);

    setFollowingIds((prev) => {
      const n = new Set(prev);
      isF ? n.delete(profile.id) : n.add(profile.id);
      return n;
    });

    if (isF) {
      await supabase.from("followers").delete().eq("follower_id", user.id).eq("following_id", profile.id);
      showToast(`Abonnement annulé`);
    } else {
      const { error } = await supabase
        .from("followers")
        .upsert({ follower_id: user.id, following_id: profile.id }, { onConflict: "follower_id,following_id", ignoreDuplicates: true });
      if (error) {
        setFollowingIds((prev) => { const n = new Set(prev); n.delete(profile.id); return n; });
        showToast("Erreur");
        return;
      }
      // Notification in-app
      void supabase.from("notifications").insert({
        user_id: profile.id, from_user_id: user.id,
        from_pseudo: user.pseudo, from_avatar_url: user.avatar ?? null, type: "follow",
      });
      // Email (authentifié)
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        fetch("/api/notifications/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
          body: JSON.stringify({ follower_id: user.id, followed_id: profile.id }),
        }).catch(() => {});
      });
      showToast(`Vous suivez @${profile.pseudo} 🎉`);
    }
  };

  const currentProfiles = activeTab === "reseau"
    ? reseauProfiles
    : activeTab === "populaires"
    ? populairesProfiles
    : nouveauxProfiles;

  // Filtrer ceux déjà suivis dans "nouveaux" et "populaires" (optionnel — les garder pour toggle)
  const displayed = currentProfiles;

  return (
    <div className="min-h-screen px-4 md:px-8 pt-8 pb-28 max-w-2xl mx-auto md:mx-0 md:max-w-xl relative">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "#A0AEC0" }}>
            Communauté
          </p>
          <h1 className="text-2xl font-extralight tracking-tight" style={{ color: "#2D3748" }}>
            Découverte
          </h1>
        </div>
        <Link href="/communaute">
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="lg-strong lg-highlight relative w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer"
            aria-label="Retour"
          >
            <ArrowLeft size={16} strokeWidth={1.5} style={{ color: "#2D3748" }} />
          </motion.div>
        </Link>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 mb-5"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer transition-all"
            style={
              activeTab === id
                ? { background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }
                : { background: "rgba(255,255,255,0.5)", color: "#A0AEC0", border: "1px solid rgba(255,255,255,0.6)" }
            }
          >
            <Icon size={13} strokeWidth={activeTab === id ? 2 : 1.5} />
            {label}
          </button>
        ))}
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-2"
        >
          {/* Description de l'onglet */}
          <p className="text-[11px] font-light px-1 mb-1" style={{ color: "#A0AEC0" }}>
            {activeTab === "reseau"
              ? "Personnes suivies par ceux que tu suis déjà"
              : activeTab === "populaires"
              ? "Les comptes les plus suivis sur Aura"
              : "Membres qui ont rejoint Aura récemment"}
          </p>

          {loading ? (
            <div className="flex justify-center py-16">
              <motion.div
                className="w-6 h-6 rounded-full border-2"
                style={{ borderColor: "rgba(167,139,250,0.3)", borderTopColor: "#A78BFA" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(240,235,255,0.8) 0%, rgba(255,251,240,0.8) 100%)" }}
              >
                {activeTab === "reseau"
                  ? <Users size={22} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                  : activeTab === "populaires"
                  ? <TrendingUp size={22} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                  : <Sparkles size={22} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />}
              </div>
              <div className="text-center">
                <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>
                  {activeTab === "reseau"
                    ? "Suis des personnes pour voir leurs connexions"
                    : activeTab === "populaires"
                    ? "Aucun compte pour l'instant"
                    : "Aucun nouveau membre récemment"}
                </p>
              </div>
            </div>
          ) : (
            displayed.map((profile, i) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, type: "spring", bounce: 0.2 }}
              >
                <ProfileCard
                  profile={profile}
                  isFollowing={followingIds.has(profile.id)}
                  onFollow={handleFollow}
                  showMutual={activeTab === "reseau"}
                />
              </motion.div>
            ))
          )}
        </motion.div>
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
            className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl flex items-center gap-2"
            style={{
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(240,235,255,0.9)",
              boxShadow: "0 8px 32px rgba(167,139,250,0.2), inset 0 1px 0 rgba(255,255,255,0.9)",
              color: "#2D3748",
              whiteSpace: "nowrap",
            }}
          >
            <span className="text-sm font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
