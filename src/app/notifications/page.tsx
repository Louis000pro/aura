"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, UserPlus, Bell, CheckCheck, Repeat2, AtSign, Sparkle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import AnnouncementCard from "@/components/AnnouncementCard";
import { ANNOUNCEMENTS, getUnseenAnnouncementIds, markAnnouncementsSeen } from "@/lib/announcements";

/* ─── Types ─────────────────────────────────────────────────── */
type NotifType = "follow" | "like" | "comment" | "repost" | "mention" | "relais" | "message";

type Notification = {
  id: string;
  user_id: string;
  type: NotifType;
  from_pseudo: string;
  from_avatar_url: string | null;
  from_user_id: string;
  read: boolean;
  created_at: string;
  post_id: string | null;
  /** Destination libre (le relais mène à sa conversation). */
  lien: string | null;
};

type Group = { label: string; items: Notification[] };

/* ─── Helpers ────────────────────────────────────────────────── */
function groupNotifications(list: Notification[]): Group[] {
  const now = new Date();
  const today: Notification[] = [];
  const week: Notification[] = [];
  const older: Notification[] = [];

  for (const n of list) {
    const d = new Date(n.created_at);
    const diffMs = now.getTime() - d.getTime();
    const diffH = diffMs / 3_600_000;
    if (diffH < 24) today.push(n);
    else if (diffH < 24 * 7) week.push(n);
    else older.push(n);
  }

  return [
    { label: "Aujourd'hui", items: today },
    { label: "Cette semaine", items: week },
    { label: "Plus tôt", items: older },
  ].filter((g) => g.items.length > 0);
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}j`;
  return `${Math.floor(diff / 604800)}sem`;
}


/* ─── Sub-components ─────────────────────────────────────────── */

function TypeBadge({ type }: { type: NotifType }) {
  const cfgMap = {
    like:    { icon: <Heart size={9} fill="currentColor" />, bg: "#FEE2E2", color: "#EF4444" },
    comment: { icon: <MessageCircle size={9} />,            bg: "#DBEAFE", color: "#8B5CF6" },
    follow:  { icon: <UserPlus size={9} />,                 bg: "rgba(var(--violet-mid-rgb),0.6)", color: "var(--accent)" },
    repost:  { icon: <Repeat2 size={9} />,                  bg: "rgba(43,212,160,0.2)",   color: "#2BD4A0" },
    mention: { icon: <AtSign size={9} />,                   bg: "rgba(var(--violet-mid-rgb),0.6)",  color: "var(--accent)" },
    relais:  { icon: <Sparkle size={9} />,                  bg: "rgba(215,166,42,0.22)",  color: "#D7A62A" },
    message: { icon: <MessageCircle size={9} fill="currentColor" />, bg: "rgba(139,92,246,0.16)", color: "#8B5CF6" },
  };
  const cfg = cfgMap[type] ?? cfgMap.like;

  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.icon}
    </span>
  );
}

function Avatar({ pseudo, avatarUrl, type }: { pseudo: string; avatarUrl: string | null; type: NotifType }) {
  return (
    <div className="relative flex-shrink-0">
      <div
        className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-base font-semibold"
        style={{
          background: avatarUrl ? "transparent" : "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)",
          color: "var(--text-1)",
          boxShadow: "0 2px 8px rgba(var(--accent-rgb),0.25)",
        }}
      >
        {avatarUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img loading="lazy" decoding="async" src={avatarUrl} alt={pseudo} className="w-full h-full object-cover" />
          : (pseudo?.[0] ?? "?").toUpperCase()}
      </div>
      <TypeBadge type={type} />
    </div>
  );
}

function SkeletonRow() {
  return (
    <motion.div
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-2"
      style={{ background: "rgba(var(--surface-rgb),0.55)" }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="w-11 h-11 rounded-full flex-shrink-0" style={{ background: "rgba(var(--accent-rgb),0.15)" }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 rounded-full w-3/4" style={{ background: "rgba(var(--accent-rgb),0.15)" }} />
        <div className="h-2.5 rounded-full w-1/3" style={{ background: "rgba(var(--accent-rgb),0.1)" }} />
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-4 py-20"
    >
      {/* Simple illustration */}
      <motion.div
        className="relative w-24 h-24"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-4xl"
          style={{ background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.4) 0%,rgba(var(--cream-mid-rgb),0.4) 100%)" }}
        >
          <Bell size={38} strokeWidth={1.2} style={{ color: "var(--accent)" }} />
        </div>
        {/* decorative dots */}
        <span
          className="absolute top-1 right-0 w-3 h-3 rounded-full"
          style={{ background: "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))" }}
        />
        <span
          className="absolute bottom-0 left-1 w-2 h-2 rounded-full"
          style={{ background: "rgba(var(--accent-rgb),0.4)" }}
        />
      </motion.div>

      <div className="text-center space-y-1">
        <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>Aucune notification</p>
        <p className="text-xs font-light" style={{ color: "var(--text-3)" }}>
          Les interactions de ta communauté<br />apparaîtront ici
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Nouveautés (récap de mise à jour) — gate localStorage, côté client
  const [unseenAnn, setUnseenAnn] = useState<Set<string>>(new Set());
  useEffect(() => {
    setUnseenAnn(getUnseenAnnouncementIds());
    markAnnouncementsSeen(); // ouvrir la page = avoir vu les nouveautés
  }, []);

  /* Fetch + mark-as-read on mount */
  const fetchAndMarkRead = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const supabase = createClient();

    const { data } = await supabase
      .from("notifications")
      .select("id, user_id, type, from_pseudo, from_avatar_url, from_user_id, read, created_at, post_id, lien")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(80);

    const list = (data ?? []) as Notification[];
    setNotifications(list);
    setLoading(false);

    /* Mark all unread as read */
    const unreadIds = list.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds);

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }, [user]);

  useEffect(() => {
    fetchAndMarkRead();
  }, [fetchAndMarkRead]);

  /* Realtime subscription: new INSERT for this user */
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          /* Auto-mark the incoming notif as read since the page is open */
          supabase
            .from("notifications")
            .update({ read: true })
            .eq("id", newNotif.id)
            .then(() => {
              setNotifications((prev) =>
                prev.map((n) => (n.id === newNotif.id ? { ...n, read: true } : n))
              );
            });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  /* Mark all as read handler (button) */
  const markAllRead = async () => {
    if (!user) return;
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const groups = groupNotifications(notifications);
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="min-h-screen relative overflow-hidden px-6 pt-10 pb-32 md:pl-28 md:pr-10 md:pt-10 md:pb-10">
      <motion.div
        className="relative z-10 max-w-lg mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <p
              className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-1"
              style={{ color: "var(--text-3)" }}
            >
              Activité
            </p>
            <h1 className="text-2xl font-extralight" style={{ color: "var(--text-1)" }}>
              Notifications
            </h1>
          </div>

          <AnimatePresence>
            {hasUnread && !loading && (
              <motion.button
                key="mark-read-btn"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                whileTap={{ scale: 0.94 }}
                onClick={markAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium cursor-pointer"
                style={{
                  background: "rgba(var(--accent-rgb),0.12)",
                  color: "var(--accent)",
                  border: "1px solid rgba(var(--accent-rgb),0.25)",
                }}
              >
                <CheckCheck size={13} strokeWidth={2} />
                Tout marquer comme lu
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Nouveautés (récap de mise à jour) — épinglées en haut */}
        {ANNOUNCEMENTS.length > 0 && (
          <div className="flex flex-col gap-3 mb-6">
            {ANNOUNCEMENTS.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} unseen={unseenAnn.has(a.id)} />
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        <AnimatePresence mode="popLayout">
          {loading && (
            <motion.div key="skeleton" exit={{ opacity: 0 }}>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </motion.div>
          )}

          {/* Empty state */}
          {!loading && notifications.length === 0 && <EmptyState />}

          {/* Groups */}
          {!loading && groups.map((group) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-5"
            >
              {/* Group label */}
              <p
                className="text-[10px] font-semibold tracking-widest uppercase mb-2 ml-1"
                style={{ color: "var(--text-3)" }}
              >
                {group.label}
              </p>

              {group.items.map((notif, i) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  whileHover={{ y: -1, transition: { duration: 0.15 } }}
                  onClick={() => { if (notif.lien) router.push(notif.lien); }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-2 relative cursor-pointer"
                  style={{
                    background: notif.read
                      ? "rgba(var(--surface-rgb),0.55)"
                      : "rgba(var(--surface-rgb),0.8)",
                    backdropFilter: "blur(10px)",
                    border: notif.read
                      ? "1px solid rgba(var(--surface-rgb),0.65)"
                      : "1px solid rgba(var(--accent-rgb),0.3)",
                    boxShadow: notif.read
                      ? "inset 0 1px 0 rgba(var(--surface-rgb),0.8)"
                      : "inset 0 1px 0 rgba(var(--surface-rgb),0.9), 0 2px 12px rgba(var(--accent-rgb),0.1)",
                  }}
                >
                  <Avatar
                    pseudo={notif.from_pseudo}
                    avatarUrl={notif.from_avatar_url}
                    type={notif.type}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-snug" style={{ color: "var(--text-1)" }}>
                      <span className="font-semibold">@{notif.from_pseudo}</span>
                      {" "}
                      <span className="font-light">
                        {notif.type === "follow" && "te suit maintenant"}
                        {notif.type === "like" && "a aimé ta publication"}
                        {notif.type === "comment" && "a commenté ton post"}
                        {notif.type === "repost" && "a repartagé ta publication"}
                        {notif.type === "mention" && "t'a mentionné dans un commentaire"}
                        {notif.type === "relais" && "a franchi son maillon — l'affiche s'est dévoilée"}
                        {notif.type === "message" && "t'a envoyé un message"}
                      </span>
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
                      {relativeTime(notif.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  <AnimatePresence>
                    {!notif.read && (
                      <motion.span
                        key="dot"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,var(--accent),var(--violet-mid))" }}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
