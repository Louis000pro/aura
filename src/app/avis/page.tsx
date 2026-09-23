"use client";

/* ════════════════════════════════════════════════════════════════════
   /avis — les avis PUBLICS sur Vaiiya.

   Choix de Louis (2026-09-23) : les gens laissent une note (1 à 5 étoiles)
   et un mot, visibles par tout le monde. Un avis par personne, éditable.
   Ce n'est pas un fil social (pas de réponse, pas de like) : juste le
   témoignage de chacun sur le produit.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Star, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { chargerAvis, monAvis, poserAvis, supprimerAvis, type Avis } from "@/lib/avis";

const ACTION = "linear-gradient(135deg,#8B5CF6 0%,#C13BC1 100%)";

/* Une rangée d'étoiles, en lecture ou en saisie. En saisie, chaque étoile
   est un bouton ; en lecture, un simple affichage doré. */
function Etoiles({ note, taille = 18, onPick }: { note: number; taille?: number; onPick?: (n: number) => void }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const plein = n <= note;
        const commun = { size: taille, style: { color: plein ? "var(--gold)" : "rgba(var(--accent-rgb),0.22)" }, fill: plein ? "var(--gold)" : "transparent" as string };
        return onPick ? (
          <button key={n} type="button" onClick={() => onPick(n)} aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
            className="cursor-pointer bg-transparent border-none p-0.5">
            <Star {...commun} />
          </button>
        ) : (
          <Star key={n} {...commun} aria-hidden="true" />
        );
      })}
    </span>
  );
}

export default function AvisPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [avis, setAvis] = useState<Avis[]>([]);
  const [charge, setCharge] = useState(false);
  const [note, setNote] = useState(0);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [aDejaUn, setADejaUn] = useState(false);

  const recharger = useCallback(async () => {
    const liste = await chargerAvis();
    setAvis(liste);
    setCharge(true);
  }, []);

  useEffect(() => { void recharger(); }, [recharger]);

  // Pré-remplir avec mon avis existant s'il y en a un.
  useEffect(() => {
    if (!user) return;
    void monAvis(user.id).then((m) => {
      if (m) { setNote(m.note); setTexte(m.texte); setADejaUn(true); }
    });
  }, [user]);

  const soumettre = async () => {
    if (!user || note === 0 || envoi) return;
    setEnvoi(true);
    const ok = await poserAvis(user.id, note, texte);
    setEnvoi(false);
    if (ok) { setADejaUn(true); await recharger(); }
  };

  const retirer = async () => {
    if (!user) return;
    const ok = await supprimerAvis(user.id);
    if (ok) { setNote(0); setTexte(""); setADejaUn(false); await recharger(); }
  };

  const total = avis.length;
  const moyenne = total > 0 ? avis.reduce((s, a) => s + a.note, 0) / total : 0;

  return (
    <div className="min-h-screen px-4 pt-4 pb-28 max-w-2xl mx-auto" style={{ background: "var(--page-bg)" }}>
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 mb-3 text-[13px] font-semibold cursor-pointer bg-transparent border-none"
        style={{ color: "var(--text-3)" }}>
        <ChevronLeft size={14} strokeWidth={2.5} /> Retour
      </button>

      <h1 className="text-[26px] font-extralight tracking-tight" style={{ color: "var(--text-1)" }}>
        Vos{" "}
        <em className="not-italic font-light" style={{
          background: "linear-gradient(135deg,var(--accent),var(--gold))",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontStyle: "italic",
          display: "inline-block", paddingRight: "0.14em",
        }}>avis</em>
      </h1>

      {/* Résumé : moyenne + nombre */}
      {total > 0 && (
        <div className="flex items-center gap-3 mt-2 mb-5">
          <b className="vy-nombre text-[26px]" style={{ color: "var(--text-1)" }}>{moyenne.toFixed(1)}</b>
          <Etoiles note={Math.round(moyenne)} taille={16} />
          <small style={{ color: "var(--text-3)" }}>{total} avis</small>
        </div>
      )}

      {/* Mon avis : laisser ou modifier */}
      {user ? (
        <div className="rounded-2xl p-4 mb-6"
          style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--accent-rgb),0.16)" }}>
          <p className="text-[15px] font-semibold mb-2" style={{ color: "var(--text-1)" }}>
            {aDejaUn ? "Ton avis" : "Ton avis sur Vaiiya"}
          </p>
          <Etoiles note={note} taille={26} onPick={setNote} />
          <textarea
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            maxLength={500}
            placeholder="Dis ce que tu en penses (facultatif)…"
            rows={3}
            className="w-full mt-3 rounded-xl px-3 py-2.5 text-[16px] outline-none resize-none"
            style={{ background: "rgba(var(--surface-rgb),0.9)", border: "1px solid rgba(var(--accent-rgb),0.16)", color: "var(--text-1)" }}
          />
          <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>Ton avis est public, avec ton pseudo.</p>
          <div className="flex items-center gap-3 mt-3">
            <motion.button type="button" whileTap={{ scale: 0.97 }}
              onClick={soumettre} disabled={note === 0 || envoi}
              className="flex-1 py-3 rounded-2xl text-[16px] font-semibold cursor-pointer"
              style={{ background: ACTION, color: "#fff", opacity: note === 0 || envoi ? 0.55 : 1 }}>
              {envoi ? "…" : aDejaUn ? "Modifier mon avis" : "Publier mon avis"}
            </motion.button>
            {aDejaUn && (
              <button type="button" onClick={retirer}
                className="text-[13px] font-medium cursor-pointer bg-transparent border-none" style={{ color: "var(--text-3)" }}>
                Retirer
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[14px] mb-6" style={{ color: "var(--text-3)" }}>Connecte-toi pour laisser ton avis.</p>
      )}

      {/* La liste des avis */}
      {charge && total === 0 && (
        <p className="text-[14px]" style={{ color: "var(--text-3)" }}>Aucun avis pour l’instant. Sois le premier.</p>
      )}
      <ul className="flex flex-col gap-3">
        {avis.map((a) => (
          <li key={a.id} className="rounded-2xl p-4"
            style={{ background: "rgba(var(--surface-rgb),0.9)", border: "1px solid rgba(var(--accent-rgb),0.10)" }}>
            <div className="flex items-center gap-2.5 mb-1.5">
              {a.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.avatar_url} alt="" width={30} height={30} className="rounded-full object-cover w-[30px] h-[30px]" />
              ) : (
                <span className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                  style={{ background: ACTION }}>{a.pseudo.charAt(0).toUpperCase()}</span>
              )}
              <b className="text-[14px] font-semibold flex-1 truncate" style={{ color: "var(--text-1)" }}>{a.pseudo}</b>
              <Etoiles note={a.note} taille={14} />
            </div>
            {a.texte.trim() && (
              <p className="text-[15px] leading-relaxed" style={{ color: "var(--text-2)" }}>{a.texte}</p>
            )}
            <p className="text-[11px] mt-1.5" style={{ color: "var(--text-3)" }}>
              {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
