"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserCheck, Dumbbell, Activity, Shield, Search,
  X, RefreshCw, Crown, Trash2, ChevronRight, TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

/* ─── Types ─── */
type AdminUser = {
  id: string;
  pseudo: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  is_admin?: boolean;
  created_at: string;
  follower_count?: number;
  following_count?: number;
};

type Stats = {
  totalUsers: number;
  totalFollows: number;
  totalSessions: number;
  totalNotifs: number;
};

/* ─── Helpers ─── */
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return "Aujourd'hui";
  if (d === 1) return "Hier";
  if (d < 30) return `Il y a ${d}j`;
  const m = Math.floor(d / 30);
  return `Il y a ${m} mois`;
}

/* ─── Stat Card ─── */
function StatCard({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: number | string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 flex items-center gap-3"
      style={{
        background: "rgba(255,255,255,0.75)",
        border: "1px solid rgba(255,255,255,0.85)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 12px rgba(167,139,250,0.08)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        <Icon size={16} strokeWidth={1.5} style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-semibold leading-none" style={{ color: "#2D3748" }}>{value}</p>
        <p className="text-[10px] font-semibold tracking-widest uppercase mt-1" style={{ color: "#A0AEC0" }}>{label}</p>
      </div>
    </motion.div>
  );
}

/* ─── Main ─── */
export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [tab, setTab] = useState<"users" | "stats">("users");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  /* Redirect if not admin */
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace("/auth"); return; }
    if (!user.is_admin) { router.replace("/"); return; }
  }, [user, isLoading, router]);

  /* Fetch data */
  const fetchData = async () => {
    setLoadingData(true);
    const supabase = createClient();

    try {
      const [usersRes, followsRes, sessionsRes, notifsRes] = await Promise.all([
        supabase.from("profiles").select("id, pseudo, full_name, avatar_url, is_admin, created_at").order("created_at", { ascending: false }),
        supabase.from("followers").select("follower_id", { count: "exact", head: true }),
        supabase.from("workout_sessions").select("id", { count: "exact", head: true }),
        supabase.from("notifications").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        totalUsers: usersRes.data?.length ?? 0,
        totalFollows: followsRes.count ?? 0,
        totalSessions: sessionsRes.count ?? 0,
        totalNotifs: notifsRes.count ?? 0,
      });

      if (usersRes.data) {
        // Enrichir avec les comptes follower/following
        const enriched: AdminUser[] = await Promise.all(
          usersRes.data.map(async (u) => {
            const [f1, f2] = await Promise.all([
              supabase.from("followers").select("follower_id", { count: "exact", head: true }).eq("following_id", u.id),
              supabase.from("followers").select("following_id", { count: "exact", head: true }).eq("follower_id", u.id),
            ]);
            return { ...u, follower_count: f1.count ?? 0, following_count: f2.count ?? 0 };
          })
        );
        setUsers(enriched);
      }
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user?.is_admin) fetchData();
  }, [user?.is_admin]); // eslint-disable-line

  const toggleAdmin = async (target: AdminUser) => {
    const supabase = createClient();
    const newVal = !target.is_admin;
    const { error } = await supabase.from("profiles").update({ is_admin: newVal }).eq("id", target.id);
    if (error) { showToast(`Erreur : ${error.message}`); return; }
    setUsers((prev) => prev.map((u) => u.id === target.id ? { ...u, is_admin: newVal } : u));
    showToast(newVal ? `@${target.pseudo} est maintenant admin` : `Droits admin retirés à @${target.pseudo}`);
  };

  const deleteUser = async (target: AdminUser) => {
    const supabase = createClient();
    // On supprime les follows et notifs d'abord
    await Promise.all([
      supabase.from("followers").delete().or(`follower_id.eq.${target.id},following_id.eq.${target.id}`),
      supabase.from("notifications").delete().or(`user_id.eq.${target.id},from_user_id.eq.${target.id}`),
    ]);
    const { error } = await supabase.from("profiles").delete().eq("id", target.id);
    if (error) { showToast(`Erreur : ${error.message}`); return; }
    setUsers((prev) => prev.filter((u) => u.id !== target.id));
    setConfirmDelete(null);
    showToast(`@${target.pseudo} supprimé`);
  };

  const filtered = search.trim()
    ? users.filter((u) =>
        (u.pseudo + (u.full_name ?? "") + (u.email ?? "")).toLowerCase().includes(search.toLowerCase())
      )
    : users;

  if (isLoading || !user?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-8 h-8 rounded-full border-2"
          style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 px-5 md:px-8 pt-8 max-w-3xl mx-auto">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }}
          >
            <Shield size={16} strokeWidth={1.5} style={{ color: "#2D3748" }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight" style={{ color: "#2D3748" }}>Administration</h1>
            <p className="text-[11px]" style={{ color: "#A0AEC0" }}>Connecté en tant que @{user.pseudo}</p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={fetchData}
          className="w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer"
          style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(212,192,255,0.5)" }}
          aria-label="Actualiser"
        >
          <RefreshCw size={14} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
        </motion.button>
      </motion.div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={Users} label="Utilisateurs" value={stats.totalUsers} color="#A78BFA" />
          <StatCard icon={UserCheck} label="Abonnements" value={stats.totalFollows} color="#34D399" />
          <StatCard icon={Dumbbell} label="Séances" value={stats.totalSessions} color="#FBBF24" />
          <StatCard icon={Activity} label="Notifs" value={stats.totalNotifs} color="#FB923C" />
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex gap-1 mb-5 p-1 rounded-2xl"
        style={{ background: "rgba(240,235,255,0.55)" }}
      >
        {(["users", "stats"] as const).map((t) => (
          <motion.button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200"
            animate={{
              background: tab === t ? "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)" : "transparent",
              color: tab === t ? "#2D3748" : "#A0AEC0",
            }}
            style={{ boxShadow: tab === t ? "inset 0 1px 0 rgba(255,255,255,0.85)" : "none" }}
          >
            {t === "users" ? `Utilisateurs (${users.length})` : "Statistiques"}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "users" && (
          <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Search */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4"
              style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(212,192,255,0.4)" }}
            >
              <Search size={14} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un utilisateur…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#A0AEC0]"
                style={{ color: "#2D3748" }}
              />
              {search && (
                <button onClick={() => setSearch("")} className="cursor-pointer">
                  <X size={13} strokeWidth={2} style={{ color: "#A0AEC0" }} />
                </button>
              )}
            </div>

            {/* User list */}
            {loadingData ? (
              <div className="flex justify-center py-12">
                <motion.div
                  className="w-6 h-6 rounded-full border-2"
                  style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filtered.map((u, i) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.75)",
                      border: u.is_admin ? "1px solid rgba(212,192,255,0.6)" : "1px solid rgba(255,255,255,0.85)",
                      boxShadow: u.is_admin
                        ? "inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 12px rgba(167,139,250,0.12)"
                        : "inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 12px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Avatar */}
                      <Link href={`/profil/${u.pseudo}`} className="flex-shrink-0">
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden"
                          style={{ background: u.avatar_url ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}
                        >
                          {u.avatar_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={u.avatar_url} alt={u.pseudo} className="w-full h-full object-cover" />
                            : (u.pseudo[0] ?? "?").toUpperCase()}
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>
                            {u.full_name || u.pseudo}
                          </p>
                          {u.is_admin && (
                            <Crown size={11} strokeWidth={2} style={{ color: "#D4A843", flexShrink: 0 }} />
                          )}
                        </div>
                        <p className="text-[11px]" style={{ color: "#A78BFA" }}>@{u.pseudo}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px]" style={{ color: "#A0AEC0" }}>
                            {u.follower_count} abonnés · {u.following_count} abonnements
                          </span>
                          <span className="text-[10px]" style={{ color: "#C4CDD8" }}>·</span>
                          <span className="text-[10px]" style={{ color: "#C4CDD8" }}>
                            {timeAgo(u.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Profile link */}
                        <Link href={`/profil/${u.pseudo}`}>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
                            style={{ background: "rgba(240,235,255,0.7)" }}
                            title="Voir le profil"
                          >
                            <ChevronRight size={13} strokeWidth={2} style={{ color: "#A78BFA" }} />
                          </motion.div>
                        </Link>

                        {/* Toggle admin (pas sur soi-même) */}
                        {u.id !== user.id && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toggleAdmin(u)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
                            style={{
                              background: u.is_admin
                                ? "linear-gradient(135deg,#D4C0FF,#F5E6A3)"
                                : "rgba(240,235,255,0.5)",
                            }}
                            title={u.is_admin ? "Retirer admin" : "Donner admin"}
                          >
                            <Crown size={12} strokeWidth={2} style={{ color: u.is_admin ? "#D4A843" : "#A0AEC0" }} />
                          </motion.button>
                        )}

                        {/* Delete (pas sur soi-même) */}
                        {u.id !== user.id && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setConfirmDelete(u)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
                            style={{ background: "rgba(255,100,100,0.08)" }}
                            title="Supprimer"
                          >
                            <Trash2 size={12} strokeWidth={1.5} style={{ color: "#FC8181" }} />
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {filtered.length === 0 && !loadingData && (
                  <div className="text-center py-12">
                    <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>
                      {search ? `Aucun résultat pour « ${search} »` : "Aucun utilisateur"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {tab === "stats" && stats && (
          <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            {/* Ratios */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.75)",
                border: "1px solid rgba(255,255,255,0.85)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
                backdropFilter: "blur(12px)",
              }}
            >
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-4" style={{ color: "#A0AEC0" }}>
                Engagement
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Abonnements / utilisateur", value: stats.totalUsers > 0 ? (stats.totalFollows / stats.totalUsers).toFixed(1) : "0", icon: TrendingUp, color: "#A78BFA" },
                  { label: "Séances / utilisateur", value: stats.totalUsers > 0 ? (stats.totalSessions / stats.totalUsers).toFixed(1) : "0", icon: Dumbbell, color: "#FBBF24" },
                  { label: "Utilisateurs actifs", value: users.filter(u => (u.follower_count ?? 0) + (u.following_count ?? 0) > 0).length, icon: Activity, color: "#34D399" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}16` }}>
                      <Icon size={13} strokeWidth={1.5} style={{ color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium" style={{ color: "#718096" }}>{label}</span>
                        <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>{value}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top utilisateurs */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.75)",
                border: "1px solid rgba(255,255,255,0.85)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
                backdropFilter: "blur(12px)",
              }}
            >
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-4" style={{ color: "#A0AEC0" }}>
                Top abonnés
              </p>
              <div className="flex flex-col gap-2">
                {[...users]
                  .sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0))
                  .slice(0, 5)
                  .map((u, i) => (
                    <div key={u.id} className="flex items-center gap-2">
                      <span className="w-5 text-[10px] font-semibold text-center" style={{ color: i === 0 ? "#D4A843" : "#A0AEC0" }}>
                        {i + 1}
                      </span>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold overflow-hidden flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                        {u.pseudo[0]?.toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm font-medium truncate" style={{ color: "#2D3748" }}>@{u.pseudo}</span>
                      <span className="text-xs font-semibold" style={{ color: "#A78BFA" }}>{u.follower_count} abonnés</span>
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm delete modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-5"
            style={{ background: "rgba(0,0,0,0.2)", backdropFilter: "blur(8px)" }}
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", bounce: 0.25 }}
              className="w-full max-w-sm rounded-3xl p-6"
              style={{
                background: "rgba(255,255,255,0.97)",
                backdropFilter: "blur(40px)",
                border: "1px solid rgba(255,255,255,0.9)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center gap-3 mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,100,100,0.1)" }}>
                  <Trash2 size={22} strokeWidth={1.5} style={{ color: "#FC8181" }} />
                </div>
                <h2 className="text-base font-semibold" style={{ color: "#2D3748" }}>Supprimer @{confirmDelete.pseudo} ?</h2>
                <p className="text-sm font-light leading-relaxed" style={{ color: "#718096" }}>
                  Cette action supprimera le profil, tous ses follows et notifications. Elle est irréversible.
                </p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 rounded-2xl text-sm font-medium cursor-pointer"
                  style={{ background: "rgba(240,235,255,0.7)", color: "#718096" }}
                >
                  Annuler
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => deleteUser(confirmDelete)}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#FC8181,#F56565)", color: "white" }}
                >
                  Supprimer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

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
              boxShadow: "0 8px 32px rgba(167,139,250,0.2)",
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
