"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, TrendingUp, Dumbbell, Utensils, User, LogIn, LogOut,
  Settings, Shield, ChevronRight, Crown, MessageCircle, type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { estSurfacePublique, estVitrinePure, estVitrineSiAnonyme } from "@/lib/surfacesPubliques";
import NotificationBell from "@/components/NotificationBell";
import NavOrb from "@/components/NavOrb";
import { useEffect, useRef, useState } from "react";

type TabItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  sub?: { href: string; label: string; icon?: LucideIcon }[];
};

const TABS: (TabItem & { tourAnchor?: string })[] = [
  { href: "/",            label: "Accueil",     icon: Home,        tourAnchor: "nav-accueil" },
  { href: "/progression", label: "Entraînement", icon: Dumbbell,   tourAnchor: "nav-progression" },
  { href: "/nutrition",   label: "Nutrition",   icon: Utensils,    tourAnchor: "nav-nutrition" },
  // Le profil n'est plus un onglet : il s'ouvre depuis l'avatar en haut à
  // gauche des conversations (décision du 2026-07-21, façon Snapchat).
  { href: "/communaute",  label: "Communauté",  icon: MessageCircle, tourAnchor: "nav-communaute" },
];

/* ── Contenu du menu « avatar » — partagé entre la sidebar desktop et le header
      mobile (évite de dupliquer les liens). Inclut « Mon profil » car le profil
      n'est plus un onglet de la barre du bas. ── */
function UserMenuItems({
  user, isAdmin, onClose, onLogout,
}: {
  user: { pseudo?: string; name?: string; email?: string };
  isAdmin: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  const itemCls = "flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-purple-50 transition-colors";
  return (
    <>
      <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <p className="text-sm font-black tracking-tight" style={{ color: "var(--text-0)" }}>
          {user.pseudo ?? user.name ?? "Utilisateur"}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-3)" }}>{user.email}</p>
      </div>
      <Link href="/profil" onClick={onClose} className={itemCls} style={{ color: "var(--text-1)" }}>
        <User size={14} strokeWidth={2} style={{ color: "var(--accent)" }} />
        Mon profil
      </Link>
      <Link href="/premium" onClick={onClose} className="flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-purple-50 transition-colors" style={{ color: "#7C5CFA" }}>
        <Crown size={14} strokeWidth={2.2} style={{ color: "#7C5CFA" }} />
        Vaiiya Premium ✦
      </Link>
      <Link href="/parametres" onClick={onClose} className={itemCls} style={{ color: "var(--text-1)" }}>
        <Settings size={14} strokeWidth={2} style={{ color: "var(--accent)" }} />
        Paramètres
      </Link>
      {isAdmin && (
        <Link href="/admin" onClick={onClose} className={itemCls} style={{ color: "var(--text-1)" }}>
          <Shield size={14} strokeWidth={2} style={{ color: "var(--gold)" }} />
          Administration
        </Link>
      )}
      <div style={{ height: 1, background: "rgba(0,0,0,0.06)" }} />
      <button onClick={() => { onClose(); onLogout(); }}
        className="flex items-center gap-3 px-4 py-3 text-sm font-semibold w-full text-left hover:bg-red-50 transition-colors"
        style={{ color: "#EF4444" }}>
        <LogOut size={14} strokeWidth={2} />
        Déconnexion
      </button>
    </>
  );
}

export default function Navigation() {
  const pathname   = usePathname();
  const router     = useRouter();
  const { user, logout } = useAuth();

  const [userMenu,    setUserMenu]    = useState(false);
  const [progMenu,    setProgMenu]    = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  /* ── Fermer le menu user si clic extérieur ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (userMenuRef.current?.contains(t)) return;
      setUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Préchargement des routes principales → navigation instantanée ── */
  useEffect(() => {
    ["/", "/progression", "/nutrition", "/communaute"].forEach((r) => {
      try { router.prefetch(r); } catch { /* ignore */ }
    });
  }, [router]);

  if (pathname === "/auth") return null;
  /* Le parcours d'entrée occupe tout l'écran et son premier choix est
     obligatoire : lui laisser une barre de navigation derrière, c'est
     offrir une sortie qui n'existe pas, et laisser le clavier tabuler
     dans des liens invisibles sous le voile. Même traitement que /auth. */
  if (pathname === "/bienvenue") return null;
  // Pages publiques : accueil vitrine et invitation à un relais.
  if (!user && (pathname === "/" || pathname.startsWith("/rejoindre"))) return null;

  const handleLogout = () => { logout(); router.push("/"); };

  /* Une surface publique n'affiche AUCUNE chrome applicative : ni la barre du
     bas, ni la cloche flottante, ni le rail desktop. Voir
     `lib/surfacesPubliques.ts`. */
  const surfacePublique = estSurfacePublique(pathname, !!user);

  /* Le rail desktop, en deux temps.

     Sur une vitrine pure, il ne doit exister pour personne : on ne le rend
     pas du tout, donc il n'est même pas dans le HTML.

     Sur une page à double vie (/premium, pages légales, « / »), il appartient
     au membre et pas au visiteur. On le rend toujours, et `a-session` le
     masque en CSS avant le premier paint : décider ici, en JavaScript, le
     ferait apparaître une fois la session résolue. */
  const railAbsent = estVitrinePure(pathname);
  const railSelonSession = estVitrineSiAnonyme(pathname);

  /* Pages qui portent DÉJÀ leur propre barre du haut. Y superposer le voile
     et la cloche flottante ferait deux barres l'une sur l'autre : sur /admin,
     la cloche venait se poser exactement sur le bouton « Actualiser ». */
  const barrePropre = pathname === "/profil" || pathname === "/communaute" || pathname === "/admin";

  const isProgActive = pathname === "/progression";
  const avatarLetter = (user?.pseudo ?? user?.name ?? "?")[0]?.toUpperCase() ?? "?";
  const isAdmin = user?.is_admin || user?.email === "teyprox@gmail.com";

  /* ── Helper: icône d'onglet ── */
  const NavIcon = ({
    href, label, icon: Icon, sub, mobile, tourAnchor,
  }: {
    href: string; label: string; icon: LucideIcon;
    sub?: { href: string; label: string; icon?: LucideIcon }[];
    mobile?: boolean;
    tourAnchor?: string;
  }) => {
    const isActive = sub ? isProgActive : pathname === href;
    const badge    = null;

    if (mobile) {
      return (
        <Link href={href} className="flex-1" aria-label={label} data-tour-anchor={tourAnchor}>
          <motion.div
            className="flex flex-col items-center justify-center gap-1 py-1 px-1 cursor-pointer relative"
            whileTap={{ scale: 0.88 }} transition={{ duration: 0.12 }}
          >
            <div className="relative">
              <Icon size={23} strokeWidth={isActive ? 2.5 : 2}
                style={{ color: isActive ? "var(--gold)" : "var(--nav-fg-inactive)", transition: "color 0.2s ease" }} />
              {badge && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                  style={{ background: "var(--accent)", color: "#fff" }}>
                  {badge > 9 ? "9+" : badge}
                </motion.span>
              )}
            </div>
            {/* Libellé : uniquement l'onglet actif (option B). Hauteur réservée → icônes alignées. */}
            <span className="text-[9px] font-bold leading-none truncate max-w-full"
              style={{ height: 10, color: "var(--gold)", opacity: isActive ? 1 : 0, transition: "opacity 0.2s ease" }}>
              {label}
            </span>
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
      {/* ══ Cloche mobile, flottante en haut à droite.
            L'avatar qui l'accompagnait a été retiré : mon profil s'ouvre
            depuis l'avatar en haut à gauche de Communauté, et deux
            raccourcis vers le même écran n'en font pas un meilleur. Le
            reste du menu (Premium, Paramètres, Admin, Déconnexion) vit
            sur /profil et /parametres.

            Les pages qui possèdent leur propre barre du haut portent la
            cloche elles-mêmes : sinon celle-ci vient se poser dessus. ══ */}
      {/* ══ Voile du haut (mobile) : donne un « toit » aux boutons flottants
            (avatar + cloche) pour que le contenu scrolle proprement dessous au
            lieu de « tomber » dessus. Fondu vers le transparent = pas de barre
            lourde. ══ */}
      {user && !surfacePublique && !barrePropre && (
        <div className="global-mobile-header md:hidden fixed top-0 left-0 right-0 z-30 pointer-events-none"
          style={{
            height: "calc(env(safe-area-inset-top) + 56px)",
            background: "linear-gradient(to bottom, rgba(var(--surface-rgb),0.96) 0%, rgba(var(--surface-rgb),0.80) 42%, rgba(var(--surface-rgb),0) 100%)",
          }} />
      )}

      {user && !surfacePublique && !barrePropre && (
        <div className="global-mobile-header md:hidden fixed top-0 right-0 z-40 flex items-center px-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
          <NotificationBell side="top" />
        </div>
      )}

      {/* ══ Avatar profil global (haut-gauche, mobile) — mon profil s'ouvre depuis
            là sur les onglets principaux (façon Snapchat), plus seulement
            Communauté (qui garde le sien dans sa propre barre). Limité aux onglets
            pour ne pas se poser sur les titres à gauche des pages secondaires. ══ */}
      {user && (pathname === "/" || pathname === "/progression" || pathname === "/nutrition") && (
        <div className="global-mobile-header md:hidden fixed top-0 left-0 z-40 flex items-center px-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
          <button onClick={() => router.push("/profil")} aria-label="Mon profil"
            data-tour-anchor="nav-profil" className="relative shrink-0 active:opacity-80 transition-opacity">
            {user.avatar ? (
              <Image src={user.avatar} alt="" width={36} height={36}
                className="h-9 w-9 rounded-full object-cover" unoptimized />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-bold text-white"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}>
                {(user.pseudo ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
          </button>
        </div>
      )}

      {/* ══ Mobile Bottom Bar — barre pleine, opaque, edge-to-edge (façon TikTok / Insta / ShapeYou)
            Absente des surfaces publiques : elle donnait à un visiteur venu
            d'un moteur de recherche l'impression d'être déjà dans l'app. ══ */}
      {!surfacePublique && (
      <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-50 md:hidden" style={{ willChange: "transform" }}>
        <div
          className="relative flex items-stretch justify-around px-1"
          style={{
            background: "rgb(var(--surface-rgb))",
            borderTop: "1px solid rgba(var(--accent-rgb),0.14)",
            boxShadow: "0 -6px 24px rgba(var(--accent-rgb),0.10)",
            paddingTop: 9,
            paddingBottom: "calc(9px + env(safe-area-inset-bottom))",
          }}
        >
          {/* 1. Accueil */}
          <NavIcon href={TABS[0].href} label={TABS[0].label} icon={TABS[0].icon} sub={TABS[0].sub} mobile tourAnchor={TABS[0].tourAnchor} />
          {/* 2. Progression */}
          <NavIcon href={TABS[1].href} label={TABS[1].label} icon={TABS[1].icon} sub={TABS[1].sub} mobile tourAnchor={TABS[1].tourAnchor} />

          {/* 3. Assistant — glyphe SVG, colonne calquée sur celle des onglets
                (glyphe + hauteur de libellé réservée) → centres alignés. */}
          <div className="flex-1 flex flex-col items-center justify-center gap-1 px-1" data-tour-anchor="nav-assistant">
            <NavOrb size={44} glyph={25} />
            <span aria-hidden style={{ height: 10 }} />
          </div>

          {/* 4. Nutrition */}
          <NavIcon href={TABS[2].href} label={TABS[2].label} icon={TABS[2].icon} sub={TABS[2].sub} mobile tourAnchor={TABS[2].tourAnchor} />
          {/* 5. Communauté */}
          <NavIcon href={TABS[3].href} label={TABS[3].label} icon={TABS[3].icon} sub={TABS[3].sub} mobile tourAnchor={TABS[3].tourAnchor} />
        </div>
      </nav>
      )}

      {/* ══ Desktop Sidebar ══ */}
      {!railAbsent && (
      <aside className={`hidden md:flex fixed left-4 top-4 bottom-4 z-50 flex-col${railSelonSession ? " rail-membre" : ""}`} style={{ willChange: "transform", transform: "translateZ(0)" }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="nav-glass lg-highlight relative flex flex-col h-full w-[68px] py-6 px-3 gap-2 rounded-3xl"
        >
          {/* Icônes de navigation */}
          {TABS.map(({ href, label, icon, sub, tourAnchor }) => (
            <NavIcon key={href} href={href} label={label} icon={icon} sub={sub} tourAnchor={tourAnchor} />
          ))}

          {/* Assistant — glyphe SVG dans une case 40px comme les pastilles d'onglet */}
          <div className="flex justify-center mt-1" data-tour-anchor="nav-assistant">
            <div className="w-10 h-10 flex items-center justify-center">
              <NavOrb size={40} glyph={19} />
            </div>
          </div>

          <div className="flex-1" />

          {/* Cloche notifications */}
          {user && <div className="flex justify-center mb-1"><NotificationBell side="right" /></div>}

          {/* Avatar utilisateur — ouvre le menu */}
          {user ? (
            <div ref={userMenuRef} className="relative flex justify-center" data-tour-anchor="nav-profil">
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
                    <UserMenuItems user={user} isAdmin={isAdmin} onClose={() => setUserMenu(false)} onLogout={handleLogout} />
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
      )}
    </>
  );
}
