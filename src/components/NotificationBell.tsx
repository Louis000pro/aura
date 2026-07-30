"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, Heart, MessageCircle, Repeat2, UserPlus, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import AnnouncementCard from "@/components/AnnouncementCard";
import { ANNOUNCEMENTS, getUnseenAnnouncementIds, markAnnouncementsSeen } from "@/lib/announcements";

type NotifType = "follow" | "like" | "comment" | "repost" | "mention" | "relais" | "message";

type Notif = {
  id: string;
  type: NotifType;
  from_pseudo: string;
  from_avatar_url?: string;
  from_user_id?: string;
  post_id?: string | null;
  lien?: string | null;
  read: boolean;
  created_at: string;
};

function notifLabel(n: Notif): string {
  switch (n.type) {
    case "like":    return `a aimé ta publication`;
    case "comment": return `a commenté ton post`;
    case "repost":  return `a reposté ta publication`;
    case "mention": return `t'a mentionné dans un commentaire`;
    case "relais":  return `a franchi son maillon`;
    case "message": return `t'a envoyé un message`;
    default:        return `te suit maintenant`;
  }
}

function NotifIcon({ type }: { type: NotifType }) {
  const cfg: Record<NotifType, { icon: React.ReactNode; bg: string; color: string }> = {
    like:    { icon: <Heart size={9} fill="currentColor" />,    bg: "#FEE2E2", color: "#EF4444" },
    comment: { icon: <MessageCircle size={9} />,                bg: "#DBEAFE", color: "#8B5CF6" },
    repost:  { icon: <Repeat2 size={9} />,                      bg: "#D1FAE5", color: "#2BD4A0" },
    follow:  { icon: <UserPlus size={9} />,                     bg: "rgba(var(--violet-mid-rgb),0.6)", color: "var(--accent)" },
    mention: { icon: <MessageCircle size={9} />,                bg: "rgba(var(--violet-mid-rgb),0.6)", color: "var(--accent)" },
    relais:  { icon: <Sparkles size={9} />,                     bg: "rgba(215,166,42,0.22)", color: "#D7A62A" },
    message: { icon: <MessageCircle size={9} fill="currentColor" />, bg: "rgba(139,92,246,0.16)", color: "#8B5CF6" },
  };
  const c = cfg[type];
  return (
    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white"
      style={{ background: c.bg, color: c.color }}>
      {c.icon}
    </span>
  );
}

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
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, maxH: 400 });
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);

  // Annonces « Nouveautés » non vues (gate localStorage, côté client)
  const [unseenAnn, setUnseenAnn] = useState<Set<string>>(new Set());
  const [annAck, setAnnAck] = useState(false); // ouvertes pendant cette session

  const unreadNotifs = notifs.filter((n) => !n.read).length;
  const badgeCount = unreadNotifs + (annAck ? 0 : unseenAnn.size);
  // Mise à jour non vue → la cloche scintille pour attirer l'œil
  const announceGlow = !annAck && unseenAnn.size > 0;

  // S'assure qu'on est côté client avant de monter le portail
  useEffect(() => {
    setMounted(true);
    setUnseenAnn(getUnseenAnnouncementIds());
  }, []);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void Promise.resolve(
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30)
    ).then(({ data, error }) => {
        if (error) return;
        if (data) setNotifs(data as Notif[]);

        try {
          channel = supabase
            .channel(`notifs-${user.id}`)
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
              (payload) => { setNotifs((prev) => [payload.new as Notif, ...prev]); }
            )
            .subscribe();
        } catch { /* realtime non disponible */ }
      })
      .catch(() => {});

    return () => {
      if (channel) void Promise.resolve(supabase.removeChannel(channel)).catch(() => {});
    };
  }, [user]);

  // Fermer si clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const calcPos = () => {
    if (!buttonRef.current) return;
    // getBoundingClientRect retourne les coords VIEWPORT — indépendant de tout transform parent
    const rect = buttonRef.current.getBoundingClientRect();
    const PANEL_W = Math.min(360, window.innerWidth - 24);
    const PANEL_H = 440;
    const GAP = 12;
    const MARGIN = 8;

    let top = 0;
    let left = 0;

    if (side === "right") {
      // Sidebar gauche → panel strictement à DROITE de la cloche, aligné à sa hauteur
      top  = rect.top;
      left = rect.right + GAP;
      // Débordement à droite → placer à gauche du bouton en fallback
      if (left + PANEL_W > window.innerWidth - MARGIN) {
        left = rect.left - PANEL_W - GAP;
      }
      // Si toujours hors écran à gauche (sidebar étroite sur mobile) → coller à gauche
      if (left < MARGIN) left = MARGIN;
      // Et clamp à droite au cas où
      if (left + PANEL_W > window.innerWidth - MARGIN) {
        left = window.innerWidth - PANEL_W - MARGIN;
      }
      if (top < MARGIN) top = MARGIN;

    } else if (side === "top") {
      // Header → panel EN DESSOUS aligné à droite du bouton
      top  = rect.bottom + GAP;
      left = rect.right - PANEL_W;
      if (left < MARGIN) left = MARGIN;
      if (top + PANEL_H > window.innerHeight - MARGIN) top = rect.top - PANEL_H - GAP;

    } else {
      // "bottom" nav mobile → panel AU-DESSUS
      top  = rect.top - PANEL_H - GAP;
      left = rect.left;
      if (top < MARGIN) top = rect.bottom + GAP;
      if (left + PANEL_W > window.innerWidth - MARGIN) left = window.innerWidth - PANEL_W - MARGIN;
      if (left < MARGIN) left = MARGIN;
    }

    // Hauteur max disponible depuis top jusqu'en bas de l'écran
    const maxH = Math.min(PANEL_H, window.innerHeight - top - MARGIN);
    setPanelPos({ top, left, maxH });
  };

  const handleOpen = async () => {
    const next = !open;
    if (next) calcPos();
    setOpen(next);

    if (next) {
      // Ouvrir la cloche = avoir vu les nouveautés (la pastille retombe,
      // mais les cartes restent surlignées « NOUVEAU » durant la session)
      if (unseenAnn.size > 0) { markAnnouncementsSeen(); setAnnAck(true); }

      if (unreadNotifs > 0 && user) {
        const supabase = createClient();
        await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
        setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    }
  };

  if (!user) return null;

  const panel = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          key="notif-panel"
          initial={{ opacity: 0, scale: 0.94, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -4 }}
          transition={{ type: "spring", bounce: 0.22, duration: 0.3 }}
          style={{
            position: "fixed",
            top: panelPos.top,
            left: panelPos.left,
            width: Math.min(360, (typeof window !== "undefined" ? window.innerWidth : 360) - 24),
            maxHeight: panelPos.maxH,
            overflow: "hidden",
            zIndex: 99999,
            background: "rgba(var(--surface-rgb),0.98)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(var(--violet-mid-rgb),0.4)",
            boxShadow: "0 20px 64px rgba(var(--accent-rgb),0.22), 0 4px 12px rgba(0,0,0,0.06)",
            borderRadius: 24,
          }}
        >
          {/* Header */}
          <div
            className="px-4 pt-4 pb-2.5 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.1)" }}
          >
            <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-1)" }}>
              🔔 Notifications
            </span>
            {unreadNotifs > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(var(--violet-mid-rgb),0.3)", color: "var(--accent)" }}>
                {unreadNotifs} nouvelle{unreadNotifs > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* List */}
          <div className="max-h-[320px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {/* Nouveautés (récap de mise à jour) épinglées en haut */}
            {ANNOUNCEMENTS.length > 0 && (
              <div className="px-3 pt-3 pb-1 flex flex-col gap-2">
                {ANNOUNCEMENTS.map((a) => (
                  <AnnouncementCard key={a.id} announcement={a} unseen={unseenAnn.has(a.id)} compact />
                ))}
              </div>
            )}

            {notifs.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <span className="text-3xl">🔔</span>
                <p className="text-sm font-light" style={{ color: "var(--text-3)" }}>
                  Aucune notification
                </p>
              </div>
            ) : (
              notifs.map((n, i) => (
                <Link key={n.id} href={n.lien ?? (n.post_id ? `/profil` : `/profil/${encodeURIComponent(n.from_pseudo)}`)} onClick={() => setOpen(false)}>
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ backgroundColor: "rgba(var(--tint-violet-rgb),0.5)" }}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                    style={{
                      background: n.read ? "transparent" : "rgba(var(--tint-violet-rgb),0.28)",
                      borderBottom: i < notifs.length - 1 ? "1px solid rgba(var(--accent-rgb),0.06)" : "none",
                    }}
                  >
                    {/* Avatar + badge type */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden"
                        style={{
                          background: n.from_avatar_url ? "transparent" : "linear-gradient(135deg, var(--violet-mid) 0%, var(--accent) 100%)",
                          color: "var(--text-1)",
                        }}
                      >
                        {n.from_avatar_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img loading="lazy" decoding="async" src={n.from_avatar_url} alt={n.from_pseudo} className="w-full h-full object-cover" />
                          : (n.from_pseudo[0] ?? "?").toUpperCase()}
                      </div>
                      <NotifIcon type={n.type} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] leading-snug break-words" style={{ color: "var(--text-1)" }}>
                        <span className="font-semibold">@{n.from_pseudo}</span>
                        {" "}<span style={{ color: "var(--text-body)" }}>{notifLabel(n)}</span>
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
                        {formatRelative(n.created_at)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--accent)" }} />
                    )}
                  </motion.div>
                </Link>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <motion.button
        ref={buttonRef}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.88 }}
        onClick={handleOpen}
        className="w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer mx-auto relative"
        style={open ? { background: "rgba(var(--tint-violet-rgb),0.8)" } : {}}
        aria-label="Notifications"
        title="Notifications"
      >
        {/* Halo pulsant — uniquement quand une mise à jour n'a pas été vue */}
        <AnimatePresence>
          {announceGlow && (
            <motion.span
              key="ann-glow"
              aria-hidden
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(var(--accent-rgb),0.5) 0%, transparent 70%)" }}
              initial={{ opacity: 0 }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.55, 0, 0.55] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </AnimatePresence>

        {/* Cloche — sonne périodiquement + se teinte en violet si nouveauté */}
        <motion.span
          className="relative"
          style={{ display: "inline-flex", transformOrigin: "50% 0%" }}
          animate={announceGlow ? { rotate: [0, -14, 12, -9, 7, -4, 0] } : { rotate: 0 }}
          transition={announceGlow ? { duration: 1.2, repeat: Infinity, repeatDelay: 1.8, ease: "easeInOut" } : { duration: 0.2 }}
        >
          <Bell size={18} strokeWidth={1.5} style={{ color: open || announceGlow ? "var(--accent)" : "var(--text-3)" }} />
        </motion.span>

        {/* Étincelle qui scintille à côté de la cloche */}
        <AnimatePresence>
          {announceGlow && (
            <motion.span
              key="ann-sparkle"
              aria-hidden
              className="absolute -top-1 -left-1 pointer-events-none"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1, 0.6, 1, 0], opacity: [0, 1, 0.7, 1, 0], rotate: [0, 20, -10, 15, 0] }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles size={11} strokeWidth={2.2} style={{ color: "#F5D77A", fill: "#F5D77A" }} />
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {badgeCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", bounce: 0.6 }}
              className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {badgeCount > 9 ? "9+" : badgeCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Portail → rendu directement dans document.body, échappe tout transform parent */}
      {mounted && createPortal(panel, document.body)}
    </>
  );
}
