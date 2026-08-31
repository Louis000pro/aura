"use client";

/* ════════════════════════════════════════════════════════════════════
   FollowListModal — liste des abonnés / abonnements d'un profil.

   • `ownerId` : DE QUI on affiche la liste (le profil consulté).
   • L'acteur (qui suit / se désabonne, et l'état des boutons) est
     TOUJOURS l'utilisateur connecté (useAuth) — qu'on soit sur son propre
     profil ou sur celui de quelqu'un d'autre.
   ════════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, X, UserCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type RealFollowUser = {
  id: string;
  pseudo: string;
  full_name?: string;
  avatar_url?: string;
};

export default function FollowListModal({
  type,
  ownerId,
  onClose,
}: {
  type: "Abonnés" | "Abonnements";
  ownerId: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [list, setList] = useState<RealFollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    setLoading(true);

    const fetchList = async () => {
      // Récupérer les IDs des membres de la liste (abonnés OU abonnements d'ownerId)
      const col = type === "Abonnés" ? "follower_id" : "following_id";
      const filter = type === "Abonnés" ? "following_id" : "follower_id";

      const { data: rows } = await supabase
        .from("followers")
        .select(col)
        .eq(filter, ownerId);

      if (!rows || rows.length === 0) { setList([]); setLoading(false); return; }

      const ids = (rows as Record<string, string>[]).map((r) => r[col]);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, pseudo, full_name, avatar_url")
        .in("id", ids);

      setList(profiles ?? []);

      // État des boutons : qui l'UTILISATEUR CONNECTÉ suit déjà
      if (user) {
        const { data: myFollows } = await supabase
          .from("followers")
          .select("following_id")
          .eq("follower_id", user.id);
        setFollowingIds(new Set((myFollows ?? []).map((r) => r.following_id as string)));
      }
      setLoading(false);
    };

    fetchList();
  }, [type, ownerId, user]);

  const handleFollow = async (profile: RealFollowUser) => {
    if (!user) return;
    const supabase = createClient();
    const isF = followingIds.has(profile.id);
    setFollowingIds((prev) => {
      const next = new Set(prev);
      isF ? next.delete(profile.id) : next.add(profile.id);
      return next;
    });
    if (isF) {
      await supabase.from("followers").delete().eq("follower_id", user.id).eq("following_id", profile.id);
    } else {
      await supabase.from("followers").insert({ follower_id: user.id, following_id: profile.id });
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        fetch("/api/notifications/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
          body: JSON.stringify({ follower_id: user.id, followed_id: profile.id }),
        }).catch(() => {});
      });
    }
  };

  const filtered = query.trim()
    ? list.filter((u) => (u.pseudo + (u.full_name ?? "")).toLowerCase().includes(query.toLowerCase()))
    : list;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.18)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
        className="w-full max-w-md rounded-t-3xl overflow-hidden flex flex-col"
        style={{ background: "rgba(var(--surface-rgb),0.96)", backdropFilter: "blur(12px)", boxShadow: "0 -12px 48px rgba(var(--accent-rgb),0.18)", maxHeight: "82vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(0,0,0,0.12)" }} />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 pt-1">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>Amis</h2>
          <motion.button whileTap={{ scale: 0.88 }} onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer" style={{ background: "rgba(0,0,0,0.06)" }}>
            <X size={14} strokeWidth={2.5} style={{ color: "var(--text-2)" }} />
          </motion.button>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl" style={{ background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <Search size={13} strokeWidth={2.5} style={{ color: "var(--text-3)", flexShrink: 0 }} />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher…" className="flex-1 text-sm bg-transparent outline-none" style={{ color: "var(--text-1)" }} />
          </div>
        </div>
        <div className="h-px mx-4" style={{ background: "rgba(0,0,0,0.06)" }} />
        <div className="overflow-y-auto flex-1 py-2" style={{ scrollbarWidth: "none" }}>
          {loading ? (
            <div className="flex justify-center py-12">
              <motion.div className="w-6 h-6 rounded-full border-2"
                style={{ borderColor: "rgba(var(--accent-rgb),0.2)", borderTopColor: "var(--accent)" }}
                animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <span className="text-3xl">👤</span>
              <p className="text-sm font-light" style={{ color: "var(--text-3)" }}>
                {query ? "Aucun résultat" : "Aucun ami pour l’instant"}
              </p>
            </div>
          ) : (
            filtered.map((u, i) => {
              const isF = followingIds.has(u.id);
              const isOwn = u.id === user?.id;
              return (
                <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 px-4 py-2.5">
                  <Link href={`/profil/${encodeURIComponent(u.pseudo)}`} onClick={onClose} className="flex-shrink-0">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden"
                      style={{ background: u.avatar_url ? "transparent" : "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))", color: "var(--text-1)" }}>
                      {u.avatar_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img loading="lazy" decoding="async" src={u.avatar_url} alt={u.pseudo} className="w-full h-full object-cover" />
                        : (u.pseudo[0] ?? "?").toUpperCase()}
                    </div>
                  </Link>
                  <Link href={`/profil/${encodeURIComponent(u.pseudo)}`} onClick={onClose} className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-1)" }}>{u.full_name || u.pseudo}</p>
                    <p className="text-[11px] font-light truncate" style={{ color: "var(--text-3)" }}>@{u.pseudo}</p>
                  </Link>
                  {!isOwn && user && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleFollow(u)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer flex-shrink-0"
                      style={isF
                        ? { background: "rgba(0,0,0,0.05)", color: "var(--text-2)", border: "1px solid rgba(0,0,0,0.08)" }
                        : { background: "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)", color: "var(--text-1)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.7)" }
                      }
                    >
                      {isF ? <><UserCheck size={11} strokeWidth={2.5} />Ami</> : <><UserPlus size={11} strokeWidth={2.5} />Ajouter</>}
                    </motion.button>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
        <div className="pb-safe h-6" />
      </motion.div>
    </motion.div>
  );
}
