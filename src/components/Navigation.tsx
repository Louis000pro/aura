"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, TrendingUp, Users, User, LogIn, LogOut, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const tabs = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/recherche", label: "Recherche", icon: Search },
  { href: "/progression", label: "Progression", icon: TrendingUp },
  { href: "/communaute", label: "Communauté", icon: Users, badge: 3 },
  { href: "/profil", label: "Profil", icon: User },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  if (pathname === "/auth") return null;
  if (!user && pathname === "/") return null;

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      {/* Mobile Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="lg-strong lg-highlight relative mx-4 mb-4 rounded-2xl px-2 py-2">
          <div className="flex items-center justify-around">
            {tabs.map(({ href, label, icon: Icon, badge }) => {
              const isActive = pathname === href;
              return (
                <Link key={href} href={href} className="flex-1" aria-label={label}>
                  <motion.div
                    className="flex items-center justify-center py-3 px-1 rounded-xl cursor-pointer relative"
                    whileTap={{ scale: 0.85 }}
                    transition={{ duration: 0.12 }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="mobile-active-pill"
                        className="absolute inset-0 rounded-xl"
                        style={{ background: "linear-gradient(135deg, rgba(240,235,255,0.9) 0%, rgba(255,251,240,0.9) 100%)" }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <div className="relative z-10">
                      <Icon size={22} strokeWidth={isActive ? 2 : 1.5} style={{ color: isActive ? "#2D3748" : "#A0AEC0" }} />
                      {badge && !isActive && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                          style={{ background: "#A78BFA", color: "#fff" }}
                        >
                          {badge}
                        </motion.span>
                      )}
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-4 top-4 bottom-4 z-50 flex-col">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="lg-strong lg-highlight relative flex flex-col h-full w-[68px] py-6 px-3 gap-2 rounded-3xl"
        >
          {tabs.map(({ href, label, icon: Icon, badge }) => {
            const isActive = pathname === href;
            return (
              <Link key={href} href={href} aria-label={label}>
                <motion.div
                  className="relative flex items-center justify-center w-10 h-10 rounded-2xl cursor-pointer mx-auto"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", bounce: 0.4, duration: 0.3 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="desktop-active-pill"
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        background: "linear-gradient(135deg, rgba(240,235,255,0.95) 0%, rgba(255,251,240,0.95) 100%)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 12px -2px rgba(167,139,250,0.22)",
                      }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <div className="relative z-10">
                    <Icon size={18} strokeWidth={isActive ? 2 : 1.5} style={{ color: isActive ? "#2D3748" : "#A0AEC0" }} />
                    {badge && !isActive && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", bounce: 0.6 }}
                        className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold"
                        style={{ background: "#A78BFA", color: "#fff" }}
                      >
                        {badge}
                      </motion.span>
                    )}
                  </div>
                </motion.div>
              </Link>
            );
          })}

          <div className="flex-1" />

          <AnimatePresence mode="wait">
            {user ? (
              <motion.div key="user" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex flex-col items-center gap-2">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-semibold cursor-default"
                  style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }}
                  title={`@${user.pseudo}`}
                >
                  {user.pseudo[0]?.toUpperCase()}
                </div>
                <motion.button
                  onClick={handleLogout}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.88 }}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer mx-auto"
                  aria-label="Déconnexion"
                  title="Déconnexion"
                >
                  <LogOut size={16} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                </motion.button>
              </motion.div>
            ) : (
              <motion.div key="login" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <Link href="/auth">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.88 }}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer mx-auto"
                    style={{ background: "linear-gradient(135deg, rgba(240,235,255,0.7) 0%, rgba(255,251,240,0.7) 100%)" }}
                    aria-label="Connexion"
                    title="Connexion"
                  >
                    <LogIn size={16} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                  </motion.div>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </aside>
    </>
  );
}
