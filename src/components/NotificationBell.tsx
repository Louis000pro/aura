"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Notif = {
  id: string;
  type: "follow";
  from_pseudo: string;
  from_avatar_url?: string;
  read: boolean;
  created_at: string;
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Il y a ${d}j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function NotificationBell({ side = "right" }: { side?: "right" | "bottom" | "top" }) {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Fetch initial — silencieux si la table n'existe pas encore
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (error) return; // table absente ou autre erreur → on ignore
        if (data) setNotifs(data as Notif[]);

        // Temps réel seulement si le fetch a réussi
        try {
          channel = supabase
            .channel(`notifs-${user.id}`)
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
              (payload) => {
                setNotifs((prev) => [payload.new as Notif, ...prev]);
              }
            )
            .subscribe();
        } catch {
          // realtime non disponible → dégradation silencieuse
        }
      })
      .catch(() => {
        // réseau ou table absente → on ignore
      });

    return () => {
      if (channel) supabase.removeChannel(channel).catch(() => {});
    };
  }, [user]);

  // Fermer si clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0 && user) {
      const supabase = createClient();
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  if (!user) return null;

  const panelStyle =
    side === "right"
      ? { left: "calc(100% + 12px)", top: 0 }
      : side === "top"
      ? { top: "calc(100% + 12px)", right: 0 }
      : { bottom: "calc(100% + 12px)", left: "50%", transform: "translateX(-50%)" };

  return (
    <div ref={panelRef} className="relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.88 }}
        onClick={handleOpen}
        className="w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer mx-auto relative"
        style={open ? { background: "rgba(240,235,255,0.8)" } : {}}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={18} strokeWidth={1.5} style={{ color: open ? "#A78BFA" : "#A0AEC0" }} />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", bounce: 0.6 }}
              className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{ background: "#A78BFA", color: "#fff" }}
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.94, y: side === "bottom" ? 8 : 0, x: side === "right" ? -6 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", bounce: 0.22, duration: 0.35 }}
            className="absolute z-[300] w-72"
            style={{
              ...panelStyle,
              background: "rgba(255,255,255,0.97)",
              backdropFilter: "blur(32px)",
              border: "1px solid rgba(255,255,255,0.9)",
              boxShadow: "0 16px 56px rgba(167,139,250,0.18), 0 2px 8px rgba(0,0,0,0.04)",
              borderRadius: 20,
            }}
          >
            {/* Header */}
            <div
              className="px-4 pt-4 pb-2.5 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(167,139,250,0.1)" }}
            >
              <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>
                Notifications
              </span>
              {unread > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(212,192,255,0.3)", color: "#A78BFA" }}>
                  {unread} nouvelle{unread > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* List */}
            <div className="max-h-[320px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              {notifs.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <span className="text-3xl">🔔</span>
                  <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>
                    Aucune notification
                  </p>
                </div>
              ) : (
                notifs.map((n, i) => (
                  <Link key={n.id} href={`/profil/${n.from_pseudo}`} onClick={() => setOpen(false)}>
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      whileHover={{ backgroundColor: "rgba(240,235,255,0.5)" }}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                      style={{
                        background: n.read ? "transparent" : "rgba(240,235,255,0.28)",
                        borderBottom: i < notifs.length - 1 ? "1px solid rgba(167,139,250,0.06)" : "none",
                      }}
                    >
                      {/* Avatar */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 overflow-hidden"
                        style={{
                          background: n.from_avatar_url ? "transparent" : "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
                          color: "#2D3748",
                        }}
                      >
                        {n.from_avatar_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={n.from_avatar_url} alt={n.from_pseudo} className="w-full h-full object-cover" />
                          : (n.from_pseudo[0] ?? "?").toUpperCase()}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] leading-snug" style={{ color: "#2D3748" }}>
                          <span className="font-semibold">@{n.from_pseudo}</span>
                          {" "}a commencé à vous suivre
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: "#A0AEC0" }}>
                          {formatRelative(n.created_at)}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#A78BFA" }} />
                      )}
                    </motion.div>
                  </Link>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
