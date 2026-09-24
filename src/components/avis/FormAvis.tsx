"use client";

/* ════════════════════════════════════════════════════════════════════
   FormAvis — la zone d'écriture d'un avis, sur la page /avis.

   La LISTE des avis approuvés est rendue côté serveur (dans la page), pour le
   SEO. Ce composant ne gère que l'interaction : la note, le texte, l'envoi, et
   l'état de MON avis (y compris « en attente de validation », que la liste
   publique ne montre pas).

   Déconnecté : on ne fait pas écrire dans le vide. On montre le bouton, et il
   mène à l'inscription — un avis a besoin d'un vrai compte derrière.
   ════════════════════════════════════════════════════════════════════ */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { monAvis, poserAvis, supprimerAvis, type MonAvis } from "@/lib/avis";

const ACTION = "linear-gradient(135deg,#8B5CF6 0%,#C13BC1 100%)";

/** Étoiles en saisie (boutons) ou en lecture (affichage doré). */
export function Etoiles({ note, taille = 18, onPick }: { note: number; taille?: number; onPick?: (n: number) => void }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const plein = n <= note;
        const commun = { size: taille, style: { color: plein ? "var(--gold)" : "rgba(var(--accent-rgb),0.22)" }, fill: plein ? "var(--gold)" : ("transparent" as string) };
        return onPick ? (
          <button key={n} type="button" onClick={() => onPick(n)} aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
            className="cursor-pointer bg-transparent border-none p-0.5">
            <Etoile {...commun} />
          </button>
        ) : (
          <Etoile key={n} {...commun} aria-hidden="true" />
        );
      })}
    </span>
  );
}

/* Petite étoile SVG inline : évite d'importer une icône lourde juste pour ça,
   et garde le remplissage doré cohérent avec le reste. */
function Etoile({ size, style, fill }: { size: number; style: React.CSSProperties; fill: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} fill={fill} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
      <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.9l-5.8 3 1.1-6.45-4.7-4.6 6.5-.95z" />
    </svg>
  );
}

export default function FormAvis() {
  const { user } = useAuth();
  const [note, setNote] = useState(0);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [mien, setMien] = useState<MonAvis | null>(null);
  const [envoye, setEnvoye] = useState(false);

  useEffect(() => {
    if (!user) return;
    void monAvis(user.id).then((m) => {
      if (m) { setNote(m.note); setTexte(m.texte); setMien(m); }
    });
  }, [user]);

  const soumettre = async () => {
    if (!user || note === 0 || envoi) return;
    setEnvoi(true);
    const ok = await poserAvis(user.id, note, texte);
    setEnvoi(false);
    if (ok) {
      setEnvoye(true);
      void monAvis(user.id).then(setMien);
    }
  };

  const retirer = async () => {
    if (!user) return;
    const ok = await supprimerAvis(user.id);
    if (ok) { setNote(0); setTexte(""); setMien(null); setEnvoye(false); }
  };

  // Déconnecté : porte d'entrée, pas de formulaire.
  if (!user) {
    return (
      <div className="rounded-2xl p-5 mb-6 text-center"
        style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--accent-rgb),0.16)" }}>
        <p className="text-[15px] font-semibold mb-1" style={{ color: "var(--text-1)" }}>Ton avis compte</p>
        <p className="text-[13px] mb-4" style={{ color: "var(--text-3)" }}>
          Crée ton compte (ou connecte-toi) pour laisser un avis sur Vaiiya.
        </p>
        <Link href="/auth?mode=signup&next=/avis">
          <span className="inline-flex items-center justify-center py-3 px-6 rounded-2xl text-[15px] font-semibold cursor-pointer"
            style={{ background: ACTION, color: "#fff" }}>
            Laisser un avis
          </span>
        </Link>
      </div>
    );
  }

  const enAttente = mien?.statut === "en_attente";

  return (
    <div className="rounded-2xl p-4 mb-6"
      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--accent-rgb),0.16)" }}>
      <p className="text-[15px] font-semibold mb-2" style={{ color: "var(--text-1)" }}>
        {mien ? "Ton avis" : "Ton avis sur Vaiiya"}
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

      {(enAttente || envoye) && (
        <p className="text-[12px] mt-2 font-medium" style={{ color: "var(--accent)" }}>
          Merci ✦ Ton avis est en attente de validation, il apparaîtra publiquement une fois vérifié.
        </p>
      )}

      <div className="flex items-center gap-3 mt-3">
        <motion.button type="button" whileTap={{ scale: 0.97 }}
          onClick={soumettre} disabled={note === 0 || envoi}
          className="flex-1 py-3 rounded-2xl text-[16px] font-semibold cursor-pointer"
          style={{ background: ACTION, color: "#fff", opacity: note === 0 || envoi ? 0.55 : 1 }}>
          {envoi ? "…" : mien ? "Modifier mon avis" : "Publier mon avis"}
        </motion.button>
        {mien && (
          <button type="button" onClick={retirer}
            className="text-[13px] font-medium cursor-pointer bg-transparent border-none" style={{ color: "var(--text-3)" }}>
            Retirer
          </button>
        )}
      </div>
    </div>
  );
}
