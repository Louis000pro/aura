"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, User, Dumbbell, X, ChevronRight } from "lucide-react";

type ResultType = "compte" | "contenu";

const fakeResults: { type: ResultType; name: string; sub: string; href: string }[] = [
  { type: "compte", name: "Sophie M.", sub: "Fitness · 3 abonnés communs", href: "/profil" },
  { type: "compte", name: "Lucas Fit", sub: "Musculation · 1 abonné commun", href: "/profil" },
  { type: "compte", name: "Marie Coach", sub: "Yoga · Coach certifiée", href: "/profil" },
  { type: "contenu", name: "Programme full body 4j/sem", sub: "Partagé par Lucas Fit", href: "/communaute" },
  { type: "contenu", name: "Recette : bowl protéiné", sub: "Partagé par Sophie M.", href: "/communaute" },
  { type: "contenu", name: "Routine mobilité matinale", sub: "Partagé par Marie Coach", href: "/communaute" },
];

export default function RecherchePage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"tous" | ResultType>("tous");
  const [particles, setParticles] = useState<{id:number,x:number,y:number,size:number,delay:number,duration:number,opacity:number}[]>([]);
  useEffect(() => {
    setParticles(Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: i < 4 ? 10 + Math.random() * 12 : i < 9 ? 4 + Math.random() * 5 : 2 + Math.random() * 3,
      delay: Math.random() * 6,
      duration: 6 + Math.random() * 8,
      opacity: 0.7 + Math.random() * 0.25,
    })));
  }, []);

  const filtered = fakeResults.filter((r) => {
    const matchQuery = query.trim() === "" || r.name.toLowerCase().includes(query.toLowerCase());
    const matchFilter = filter === "tous" || r.type === filter;
    return matchQuery && matchFilter;
  });

  return (
    <div className="min-h-screen relative overflow-hidden px-6 pt-10 pb-32 md:pl-28 md:pr-10 md:pt-10 md:pb-10" style={{ background: "linear-gradient(135deg, #f2eeff 0%, #fffef5 50%, #f2eeff 100%)" }}>
      {/* ── Calque déco : blobs · anneaux · particules ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <motion.div className="absolute rounded-full"
          style={{ top: "2%", left: "3%", width: 580, height: 580, background: "rgba(147,112,219,0.72)", filter: "blur(65px)" }}
          animate={{ scale: [1,1.2,1], x: [-15,25,-15], y: [-10,18,-10] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute rounded-full"
          style={{ bottom: "5%", right: "3%", width: 560, height: 560, background: "rgba(200,155,50,0.62)", filter: "blur(65px)" }}
          animate={{ scale: [1,1.18,1], x: [15,-25,15], y: [10,-18,10] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1.8 }} />
        <motion.div className="absolute rounded-full"
          style={{ top: "50%", left: "50%", width: 360, height: 360, background: "rgba(147,112,219,0.5)", filter: "blur(50px)" }}
          animate={{ scale: [1,1.4,1] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 3 }} />
        {[520, 380, 260].map((size, i) => (
          <motion.div key={size} className="absolute rounded-full"
            style={{
              width: size, height: size,
              border: `1px solid rgba(167,139,250,${i === 0 ? 0.32 : i === 1 ? 0.45 : 0.32})`,
              top: "50%", left: "50%", marginLeft: -size / 2, marginTop: -size / 2,
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 38 + i * 14, repeat: Infinity, ease: "linear" }}
          />
        ))}
        {particles.map((p) => (
          <motion.div key={p.id} className="absolute rounded-full"
            style={{
              left: `${p.x}%`, top: `${p.y}%`, width: p.size + 1, height: p.size + 1,
              background: p.id % 3 === 0 ? `rgba(167,139,250,${p.opacity})` : p.id % 3 === 1 ? `rgba(212,192,255,${p.opacity})` : `rgba(212,168,67,${p.opacity * 0.85})`,
            }}
            animate={{ y: ["-20px", "20px", "-20px"], opacity: [p.opacity * 0.4, p.opacity, p.opacity * 0.4] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      <motion.div
        className="relative z-10 max-w-lg mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {/* Title */}
        <div className="mb-6">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: "#A0AEC0" }}>Découvrir</p>
          <h1 className="text-2xl font-extralight" style={{ color: "#2D3748" }}>Recherche</h1>
        </div>

        {/* Search bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4"
          style={{
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.8)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 24px rgba(249,168,201,0.08)",
          }}
        >
          <Search size={16} strokeWidth={1.5} style={{ color: "#A0AEC0", flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un compte ou un contenu…"
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#A0AEC0]"
            style={{ color: "#2D3748" }}
          />
          {query && (
            <button onClick={() => setQuery("")} className="cursor-pointer flex-shrink-0">
              <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(["tous", "compte", "contenu"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-150 capitalize"
              style={
                filter === f
                  ? { background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
                  : { background: "rgba(255,255,255,0.55)", color: "#A0AEC0", border: "1px solid rgba(255,255,255,0.6)" }
              }
            >
              {f === "tous" ? "Tous" : f === "compte" ? "Comptes" : "Contenus"}
            </button>
          ))}
        </div>

        {/* Results */}
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-center mt-10 font-light"
              style={{ color: "#A0AEC0" }}
            >
              Aucun résultat pour « {query} »
            </motion.p>
          ) : (
            filtered.map((r, i) => (
              <motion.div
                key={r.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <Link href={r.href}>
                  <motion.div
                    whileHover={{ y: -2, transition: { duration: 0.15 } }}
                    whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-2xl mb-2 cursor-pointer"
                    style={{
                      background: "rgba(255,255,255,0.65)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255,255,255,0.75)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: r.type === "compte"
                          ? "linear-gradient(135deg, #D4C0FF 0%, #A78BFA 100%)"
                          : "linear-gradient(135deg, #F5E6A3 0%, #D4A843 100%)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
                      }}
                    >
                      {r.type === "compte"
                        ? <User size={16} strokeWidth={1.5} style={{ color: "#fff" }} />
                        : <Dumbbell size={16} strokeWidth={1.5} style={{ color: "#fff" }} />
                      }
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#2D3748" }}>{r.name}</p>
                      <p className="text-[11px] font-light truncate" style={{ color: "#A0AEC0" }}>{r.sub}</p>
                    </div>

                    {/* Type badge + chevron */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className="text-[9px] font-semibold tracking-wider uppercase px-2 py-1 rounded-full"
                        style={
                          r.type === "compte"
                            ? { background: "rgba(255,214,231,0.5)", color: "#A78BFA" }
                            : { background: "rgba(178,240,240,0.5)", color: "#D4A843" }
                        }
                      >
                        {r.type}
                      </span>
                      <ChevronRight size={14} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
