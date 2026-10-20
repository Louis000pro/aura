"use client";

/* ════════════════════════════════════════════════════════════════════
   FollowListModal · les amis d'un profil.

   • `ownerId` : DE QUI on affiche la liste (le profil consulté).
   • L'acteur (l'état des boutons, la demande) est TOUJOURS l'utilisateur
     connecté (useAuth), qu'on soit sur son propre profil ou sur celui de
     quelqu'un d'autre.

   ⚠️ UNE DEMANDE N'EST PAS UNE AMITIÉ (Louis, 2026-10-21). La liste
   montrait tous ceux que le profil suit, demandes en attente comprises,
   et chaque ligne disait « Ami » dès que JE suivais la personne. Elle ne
   montre plus que les amitiés acceptées, et chaque ligne dit où j'en suis
   vraiment. « Ami » n'est plus un bouton : retirer un ami se fait depuis
   son profil, avec une confirmation, jamais d'un toucher dans une liste.
   ════════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, X, UserCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { accepterDemandeAmi, demanderAmi, type RelationAmi } from "@/lib/messagerie";

type RealFollowUser = {
  id: string;
  pseudo: string;
  full_name?: string;
  avatar_url?: string;
};

export default function FollowListModal({
  ownerId,
  onClose,
}: {
  ownerId: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [list, setList] = useState<RealFollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  /* Où J'en suis avec chaque personne de la liste. */
  const [relations, setRelations] = useState<Map<string, RelationAmi>>(new Map());
  const [enCours, setEnCours] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    setLoading(true);

    const fetchList = async () => {
      // Les amis d'ownerId : ceux qu'il ou elle suit ET qui le ou la suivent.
      const [suit, suivi] = await Promise.all([
        supabase.from("followers").select("following_id").eq("follower_id", ownerId),
        supabase.from("followers").select("follower_id").eq("following_id", ownerId),
      ]);
      const leSuivent = new Set((suivi.data ?? []).map((r) => r.follower_id as string));
      const ids = (suit.data ?? []).map((r) => r.following_id as string).filter((id) => leSuivent.has(id));

      if (ids.length === 0) { setList([]); setLoading(false); return; }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, pseudo, avatar_url")
        .in("id", ids);

      setList(profiles ?? []);

      // Mes propres liens, dans les deux sens, pour dire la vraie relation.
      if (user) {
        const [mesSuivis, mesSuiveurs] = await Promise.all([
          supabase.from("followers").select("following_id").eq("follower_id", user.id),
          supabase.from("followers").select("follower_id").eq("following_id", user.id),
        ]);
        const jeSuis = new Set((mesSuivis.data ?? []).map((r) => r.following_id as string));
        const meSuivent = new Set((mesSuiveurs.data ?? []).map((r) => r.follower_id as string));
        setRelations(new Map(ids.map((id) => [id,
          jeSuis.has(id) && meSuivent.has(id) ? "ami"
          : jeSuis.has(id) ? "envoyee"
          : meSuivent.has(id) ? "recue"
          : "aucune"] as [string, RelationAmi])));
      }
      setLoading(false);
    };

    fetchList();
  }, [ownerId, user]);

  const agir = async (profile: RealFollowUser) => {
    if (!user || enCours) return;
    const actuelle = relations.get(profile.id) ?? "aucune";
    if (actuelle !== "recue" && actuelle !== "aucune") return;
    setEnCours(profile.id);
    const r = actuelle === "recue" ? await accepterDemandeAmi(profile.id) : await demanderAmi(profile.id);
    setEnCours(null);
    if (!r.ok) return;
    const devient: RelationAmi = actuelle === "recue" || ("statut" in r && r.statut === "ami") ? "ami" : "envoyee";
    setRelations((prev) => new Map(prev).set(profile.id, devient));
    if (devient === "envoyee") {
      void createClient().auth.getSession().then(({ data: { session } }) => {
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
    ? list.filter((u) => u.pseudo.toLowerCase().includes(query.toLowerCase()))
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
        className="w-full max-w-md rounded-t-[var(--r-feuille)] overflow-hidden flex flex-col"
        style={{ background: "rgba(var(--surface-rgb),0.96)", backdropFilter: "blur(12px)", boxShadow: "0 -12px 48px rgba(var(--accent-rgb),0.18)", maxHeight: "82vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(0,0,0,0.12)" }} />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 pt-1">
          <h2 className="text-[20px] font-semibold" style={{ color: "var(--text-1)" }}>Amis</h2>
          <motion.button whileTap={{ scale: 0.88 }} onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer" style={{ background: "rgba(0,0,0,0.06)" }}>
            <X size={14} strokeWidth={2.5} style={{ color: "var(--text-2)" }} />
          </motion.button>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl" style={{ background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <Search size={13} strokeWidth={2.5} style={{ color: "var(--text-3)", flexShrink: 0 }} />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher…" className="flex-1 text-[16px] bg-transparent outline-none" style={{ color: "var(--text-1)" }} />
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
              <span className="text-[26px]">👤</span>
              <p className="text-[16px] font-light" style={{ color: "var(--text-3)" }}>
                {query ? "Aucun résultat" : "Aucun ami pour l’instant"}
              </p>
            </div>
          ) : (
            filtered.map((u, i) => {
              const relation = relations.get(u.id) ?? "aucune";
              const isOwn = u.id === user?.id;
              return (
                <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 px-4 py-2.5">
                  <Link href={`/profil/${encodeURIComponent(u.pseudo)}`} onClick={onClose} className="flex-shrink-0">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-[16px] font-semibold overflow-hidden"
                      style={{ background: u.avatar_url ? "transparent" : "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))", color: "var(--text-1)" }}>
                      {u.avatar_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img loading="lazy" decoding="async" src={u.avatar_url} alt={u.pseudo} className="w-full h-full object-cover" />
                        : (u.pseudo[0] ?? "?").toUpperCase()}
                    </div>
                  </Link>
                  <Link href={`/profil/${encodeURIComponent(u.pseudo)}`} onClick={onClose} className="flex-1 min-w-0">
                    <p className="text-[16px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{u.pseudo}</p>
                    <p className="text-[11px] font-light truncate" style={{ color: "var(--text-3)" }}>@{u.pseudo}</p>
                  </Link>
                  {!isOwn && user && (relation === "ami" || relation === "envoyee" ? (
                    <span
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-semibold flex-shrink-0"
                      style={{ background: "rgba(0,0,0,0.05)", color: "var(--text-2)", border: "1px solid rgba(0,0,0,0.08)" }}
                    >
                      <UserCheck size={11} strokeWidth={2.5} />{relation === "ami" ? "Ami" : "Envoyée"}
                    </span>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => void agir(u)}
                      disabled={enCours === u.id}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-semibold cursor-pointer flex-shrink-0 text-white disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)" }}
                    >
                      {relation === "recue" ? <><UserCheck size={11} strokeWidth={2.5} />Accepter</> : <><UserPlus size={11} strokeWidth={2.5} />Ajouter</>}
                    </motion.button>
                  ))}
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
