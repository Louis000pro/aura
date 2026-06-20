"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, TrendingUp, Users, User, LogIn, LogOut,
  Settings, Shield, ChevronRight, Crown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import NavOrb from "@/components/NavOrb";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";

type TabItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  sub?: { href: string; label: string; icon?: React.ElementType }[];
};

const TABS: (TabItem & { tourAnchor?: string })[] = [
  { href: "/",            label: "Accueil",     icon: Home,        tourAnchor: "nav-accueil" },
  { href: "/progression", label: "Progression", icon: TrendingUp,  tourAnchor: "nav-progression" },
  { href: "/communaute",  label: "Communauté",  icon: Users,       tourAnchor: "nav-communaute" },
  { href: "/profil",      label: "Profil",      icon: User,        tourAnchor: "nav-profil" },
];

export default function Navigation() {
  const pathname   = usePathname();
  const router     = useRouter();
  const { user, logout } = useAuth();

  const [unreadDMs,   setUnreadDMs]   = useState(0);
  const [userMenu,    setUserMenu]    = useState(false);
  const [progMenu,    setProgMenu]    = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  /* ── DMs non lus ── */
  useEffect(() => {
    if (!user) { setUnreadDMs(0); return; }
    const supabase = createClient();
    const fetch = async () => {
      const { count } = await supabase.from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id).is("read_at", null);
      setUnreadDMs(count ?? 0);
    };
    fetch();
    const ch = supabase.channel("nav-dms")
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages", filter: `receiver_id=eq.${user.id}` }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch).catch(() => {}); };
  }, [user]);

  /* ── Fermer le menu user si clic extérieur ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Préchargement des routes principales → navigation instantanée ── */
  useEffect(() => {
    ["/", "/communaute", "/progression", "/nutrition", "/profil", "/decouverte"].forEach((r) => {
      try { router.prefetch(r); } catch { /* ignore */ }
    });
  }, [router]);

  if (pathname === "/auth") return null;
  if (!user && pathname === "/") return null;

  const handleLogout = () => { logout(); router.push("/"); };

  const isProgActive = pathname === "/progression" || pathname === "/nutrition";
  const avatarLetter = (user?.pseudo ?? user?.name ?? "?")[0]?.toUpperCase() ?? "?";
  const isAdmin = user?.is_admin || user?.email === "teyprox@gmail.com";

  /* ── Helper: icône d'onglet ── */
  const NavIcon = ({
    href, label, icon: Icon, sub, mobile, tourAnchor,
  }: {
    href: string; label: string; icon: React.ElementType;
    sub?: { href: string; label: string; icon?: React.ElementType }[];
    mobile?: boolean;
    tourAnchor?: string;
  }) => {
    const isActive = sub ? isProgActive : pathname === href;
    const badge    = href === "/communaute" && unreadDMs > 0 ? unreadDMs : null;

    if (mobile) {
      return (
        <Link href={href} className="flex-1" aria-label={label} data-tour-anchor={tourAnchor}>
          <motion.div
            className="flex items-center justify-center py-3 px-1 rounded-xl cursor-pointer relative"
            whileTap={{ scale: 0.85 }} transition={{ duration: 0.12 }}
          >
            {isActive && (
              <motion.div layoutId="mobile-pill" className="absolute inset-0 rounded-xl"
                style={{ background: "rgba(var(--surface-rgb),0.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(var(--accent-rgb),0.14)", boxShadow: "0 2px 10px rgba(0,0,0,0.10)" }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }} />
            )}
            <div className="relative z-10">
              <Icon size={22} strokeWidth={isActive ? 2.4 : 2} style={{ color: isActive ? "var(--nav-fg-active)" : "var(--nav-fg-inactive)", filter: "drop-shadow(0 1px 2px rgba(var(--surface-rgb),0.55))", transition: "all 0.2s ease" }} />
              {badge && !isActive && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                  style={{ background: "var(--accent)", color: "#fff" }}>
                  {badge > 9 ? "9+" : badge}
                </motion.span>
              )}
            </div>
          </motion.div>
        </Link>
      );
    }

    /* Desktop */
    if (sub) {
      return (
        <div className="relative"
          onMouseEnter={() => setProgMenu(true)}
          onMouseLeave={() => setProgMenu(false)}>
          <Link href={href} aria-label={label} data-tour-anchor={tourAnchor}>
            <motion.div
              className="relative flex items-center justify-center w-10 h-10 rounded-2xl cursor-pointer mx-auto"
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", bounce: 0.4, duration: 0.3 }}
            >
              {isActive && (
                <motion.div layoutId="desktop-pill" className="absolute inset-0 rounded-2xl"
                  style={{ background: "rgba(var(--surface-rgb),0.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(var(--accent-rgb),0.14)", boxShadow: "0 2px 10px rgba(0,0,0,0.10)" }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }} />
              )}
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} style={{ color: isActive ? "var(--nav-fg-active)" : "var(--nav-fg-inactive)", filter: "drop-shadow(0 1px 2px rgba(var(--surface-rgb),0.55))", position: "relative", zIndex: 1, transition: "color 0.2s ease" }} />
            </motion.div>
          </Link>

          {/* Flyout sous-menu */}
          <AnimatePresence>
            {progMenu && (
              <motion.div
                initial={{ opacity: 0, x: -8, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -8, scale: 0.95 }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.25 }}
                className="absolute left-[56px] top-0 rounded-2xl overflow-hidden z-50 min-w-[200px]"
                style={{
                  background: "rgba(var(--surface-rgb),0.97)",
                  boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.18), 0 2px 8px rgba(0,0,0,0.08)",
                  border: "1px solid rgba(196,168,255,0.2)",
                }}
              >
                {sub.map((item) => {
                  const SubIcon = item.icon;
                  const subActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors hover:bg-purple-50"
                      style={{ color: subActive ? "#7C5CFA" : "var(--text-1)" }}
                      onClick={() => setProgMenu(false)}
                    >
                      {SubIcon && <SubIcon size={14} strokeWidth={2} style={{ color: subActive ? "#7C5CFA" : "var(--text-3)" }} />}
                      {!SubIcon && <TrendingUp size={14} strokeWidth={2} style={{ color: subActive ? "#7C5CFA" : "var(--text-3)" }} />}
                      {item.label}
                      {subActive && <ChevronRight size={12} strokeWidth={2} className="ml-auto" style={{ color: "#7C5CFA" }} />}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <Link href={href} aria-label={label} data-tour-anchor={tourAnchor}>
        <motion.div
          className="relative flex items-center justify-center w-10 h-10 rounded-2xl cursor-pointer mx-auto"
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
          transition={{ type: "spring", bounce: 0.4, duration: 0.3 }}
        >
          {isActive && (
            <motion.div layoutId="desktop-pill" className="absolute inset-0 rounded-2xl"
              style={{ background: "rgba(var(--tint-violet-rgb),0.9)", boxShadow: "0 2px 12px -2px rgba(var(--accent-rgb),0.22)" }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }} />
          )}
          <div className="relative z-10">
            <Icon size={18} strokeWidth={isActive ? 2 : 1.5} style={{ color: isActive ? "var(--nav-fg-active)" : "var(--nav-fg-inactive)", filter: "drop-shadow(0 1px 2px rgba(var(--surface-rgb),0.55))" }} />
            {badge && !isActive && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.6 }}
                className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold"
                style={{ background: "var(--accent)", color: "#fff" }}>
                {badge > 9 ? "9+" : badge}
              </motion.span>
            )}
          </div>
        </motion.div>
      </Link>
    );
  };

  return (
    <>
      {/* ══ Mobile Bottom Bar — 5 emplacements : Accueil / Progression / Orbe IA / Communauté / Profil ══ */}
      <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-50 md:hidden" style={{ willChange: "transform", transform: "translateZ(0)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="nav-glass lg-highlight relative mx-4 mb-1.5 rounded-2xl px-2 py-2">
          <div className="flex items-center justify-around">
            {/* 1. Accueil */}
            <NavIcon href={TABS[0].href} label={TABS[0].label} icon={TABS[0].icon} sub={TABS[0].sub} mobile tourAnchor={TABS[0].tourAnchor} />
            {/* 2. Progression */}
            <NavIcon href={TABS[1].href} label={TABS[1].label} icon={TABS[1].icon} sub={TABS[1].sub} mobile tourAnchor={TABS[1].tourAnchor} />

            {/* 3. Orbe assistant (centre, mise en avant) */}
            <div className="flex-1 flex items-center justify-center" data-tour-anchor="nav-assistant">
              <NavOrb size={48} />
            </div>

            {/* 4. Communauté */}
            <NavIcon href={TABS[2].href} label={TABS[2].label} icon={TABS[2].icon} sub={TABS[2].sub} mobile tourAnchor={TABS[2].tourAnchor} />
            {/* 5. Profil */}
            <NavIcon href={TABS[3].href} label={TABS[3].label} icon={TABS[3].icon} sub={TABS[3].sub} mobile tourAnchor={TABS[3].tourAnchor} />
          </div>
        </div>
      </nav>

      {/* ══ Desktop Sidebar ══ */}
      <aside className="hidden md:flex fixed left-4 top-4 bottom-4 z-50 flex-col" style={{ willChange: "transform", transform: "translateZ(0)" }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="nav-glass lg-highlight relative flex flex-col h-full w-[68px] py-6 px-3 gap-2 rounded-3xl"
        >
          {/* Icônes de navigation */}
          {TABS.map(({ href, label, icon, sub, tourAnchor }) => (
            <NavIcon key={href} href={href} label={label} icon={icon} sub={sub} tourAnchor={tourAnchor} />
          ))}

          {/* Orbe assistant */}
          <div className="flex justify-center mt-1" data-tour-anchor="nav-assistant">
            <NavOrb size={44} />
          </div>

          <div className="flex-1" />

          {/* Cloche notifications */}
          {user && <div className="flex justify-center mb-1"><NotificationBell side="right" /></div>}

          {/* Avatar utilisateur — ouvre le menu */}
          {user ? (
            <div ref={userMenuRef} className="relative flex justify-center">
              <AnimatePresence>
                {userMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.25 }}
                    className="absolute bottom-[52px] left-0 rounded-2xl overflow-hidden z-50 min-w-[200px]"
                    style={{
                      background: "rgba(var(--surface-rgb),0.98)",
                      boxShadow: "0 -4px 32px rgba(var(--accent-rgb),0.18), 0 8px 32px rgba(0,0,0,0.1)",
                      border: "1px solid rgba(196,168,255,0.2)",
                    }}
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                      <p className="text-sm font-black tracking-tight" style={{ color: "var(--text-0)" }}>
                        {user.pseudo ?? user.name ?? "Utilisateur"}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-3)" }}>{user.email}</p>
                    </div>

                    {/* Vaiiya Premium */}
                    <Link href="/premium" onClick={() => setUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-purple-50 transition-colors"
                      style={{ color: "#7C5CFA" }}>
                      <Crown size={14} strokeWidth={2.2} style={{ color: "#7C5CFA" }} />
                      Vaiiya Premium ✦
                    </Link>

                    {/* Paramètres */}
                    <Link href="/parametres" onClick={() => setUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-purple-50 transition-colors"
                      style={{ color: "var(--text-1)" }}>
                      <Settings size={14} strokeWidth={2} style={{ color: "var(--accent)" }} />
                      Paramètres
                    </Link>

                    {/* Admin (teyprox@gmail.com ou is_admin) */}
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-purple-50 transition-colors"
                        style={{ color: "var(--text-1)" }}>
                        <Shield size={14} strokeWidth={2} style={{ color: "var(--gold)" }} />
                        Administration
                      </Link>
                    )}

                    <div style={{ height: 1, background: "rgba(0,0,0,0.06)" }} />

                    {/* Déconnexion */}
                    <button onClick={() => { setUserMenu(false); handleLogout(); }}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-semibold w-full text-left hover:bg-red-50 transition-colors"
                      style={{ color: "#EF4444" }}>
                      <LogOut size={14} strokeWidth={2} />
                      Déconnexion
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Avatar bubble */}
              <motion.button
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
                onClick={() => setUserMenu((v) => !v)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black cursor-pointer overflow-hidden"
                style={{
                  background: userMenu
                    ? "linear-gradient(135deg,#C4A8FF,var(--accent))"
                    : "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))",
                  color: "var(--text-1)",
                  boxShadow: userMenu ? "0 4px 16px rgba(124,92,250,0.35)" : "0 2px 8px rgba(0,0,0,0.08)",
                  border: userMenu ? "2px solid rgba(124,92,250,0.3)" : "2px solid rgba(var(--surface-rgb),0.8)",
                }}
                aria-label="Menu utilisateur"
              >
                {user.avatar
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img loading="lazy" decoding="async" src={user.avatar} alt="" className="w-full h-full object-cover" />
                  : <span style={{ color: userMenu ? "white" : "#3D2F6B" }}>{avatarLetter}</span>}
              </motion.button>
            </div>
          ) : (
            <Link href="/auth">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer mx-auto"
                style={{ background: "rgba(var(--tint-violet-rgb),0.65)" }}
                aria-label="Connexion">
                <LogIn size={16} strokeWidth={1.5} style={{ color: "var(--text-3)" }} />
              </motion.div>
            </Link>
          )}
        </motion.div>
      </aside>
    </>
  );
}