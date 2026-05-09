"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase";

type Profile = {
  id: string;
  pseudo: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
};

export default function RecherchePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();

    if (!q) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("profiles")
          .select("id, pseudo, full_name, bio, avatar_url")
          .or(`pseudo.ilike.%${q}%,full_name.ilike.%${q}%`)
          .limit(20);
        setResults(data ?? []);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  return (
    <div className="min-h-screen relative overflow-hidden px-6 pt-10 pb-32 md:pl-28 md:pr-10 md:pt-10 md:pb-10">
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
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 24px rgba(167,139,250,0.08)",
          }}
        >
          <Search size={16} strokeWidth={1.5} style={{ color: "#A0AEC0", flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un compte…"
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#A0AEC0]"
            style={{ color: "#2D3748" }}
          />
          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                onClick={() => setQuery("")}
                className="cursor-pointer flex-shrink-0"
              >
                <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Results */}
        <AnimatePresence mode="popLayout">
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex justify-center py-10">
              <motion.div className="w-6 h-6 rounded-full border-2"
                style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
                animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
            </motion.div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center py-16 gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: "rgba(240,235,255,0.6)" }}>👤</div>
              <p className="text-sm font-light text-center" style={{ color: "#A0AEC0" }}>
                Aucun résultat pour « {query} »
              </p>
            </motion.div>
          )}

          {!loading && !query.trim() && (
            <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-sm text-center mt-10 font-light" style={{ color: "#C4CDD8" }}>
              Tape un pseudo ou un nom pour trouver quelqu&apos;un
            </motion.p>
          )}

          {!loading && results.map((profile, i) => (
            <motion.div key={profile.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
            >
              <Link href={`/profil/${profile.pseudo}`}>
                <motion.div
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl mb-2 cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.65)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.75)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-semibold flex-shrink-0 overflow-hidden"
                    style={{
                      background: profile.avatar_url ? "transparent" : "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
                      boxShadow: "0 2px 8px rgba(167,139,250,0.2)",
                      color: "#2D3748",
                      padding: profile.avatar_url ? 0 : undefined,
                    }}
                  >
                    {profile.avatar_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={profile.avatar_url} alt={profile.pseudo} className="w-full h-full object-cover" />
                      : (profile.pseudo?.[0] ?? "?").toUpperCase()
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>
                      {profile.full_name || profile.pseudo}
                    </p>
                    <p className="text-[11px] font-light truncate" style={{ color: "#A78BFA" }}>
                      @{profile.pseudo}
                    </p>
                    {profile.bio && (
                      <p className="text-[10px] truncate mt-0.5" style={{ color: "#A0AEC0" }}>
                        {profile.bio}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[9px] font-semibold tracking-wider uppercase px-2 py-1 rounded-full"
                      style={{ background: "rgba(212,192,255,0.35)", color: "#A78BFA" }}>
                      Compte
                    </span>
                    <ChevronRight size={14} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
