"use client";

/* ════════════════════════════════════════════════════════════════════
   /admin/avis — modération des avis avant publication.

   Réservé aux admins (la RLS le tient aussi côté base : un non-admin ne verra
   aucun avis en attente et ne pourra rien approuver). On liste les avis
   « en_attente », on approuve (ils deviennent publics) ou on rejette.
   ════════════════════════════════════════════════════════════════════ */
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ChevronLeft, Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { chargerAvisAModerer, modererAvis, type Avis } from "@/lib/avis";

export default function ModerationAvisPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [liste, setListe] = useState<Avis[]>([]);
  const [charge, setCharge] = useState(false);
  const [enCours, setEnCours] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    setListe(await chargerAvisAModerer());
    setCharge(true);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user?.is_admin) { router.replace("/"); return; }
    void recharger();
  }, [isLoading, user, router, recharger]);

  const moderer = async (id: string, statut: "approuve" | "rejete") => {
    setEnCours(id);
    const ok = await modererAvis(id, statut);
    setEnCours(null);
    if (ok) setListe((l) => l.filter((a) => a.id !== id));
  };

  if (isLoading || !user?.is_admin) return null;

  return (
    <div className="min-h-screen px-4 pt-4 pb-28 max-w-2xl mx-auto" style={{ background: "var(--page-bg)" }}>
      <button onClick={() => router.push("/admin")}
        className="flex items-center gap-1.5 mb-3 text-[13px] font-semibold cursor-pointer bg-transparent border-none"
        style={{ color: "var(--text-3)" }}>
        <ChevronLeft size={14} strokeWidth={2.5} /> Administration
      </button>

      <h1 className="text-[24px] font-extralight tracking-tight mb-1" style={{ color: "var(--text-1)" }}>
        Modération des avis
      </h1>
      <p className="text-[13px] mb-6" style={{ color: "var(--text-3)" }}>
        {liste.length > 0 ? `${liste.length} avis en attente` : "File d’attente vide."}
      </p>

      {charge && liste.length === 0 && (
        <p className="text-[14px]" style={{ color: "var(--text-3)" }}>Rien à modérer. ✦</p>
      )}

      <ul className="flex flex-col gap-3">
        {liste.map((a) => (
          <li key={a.id} className="rounded-2xl p-4"
            style={{ background: "rgba(var(--surface-rgb),0.9)", border: "1px solid rgba(var(--accent-rgb),0.12)" }}>
            <div className="flex items-center gap-2.5 mb-2">
              {a.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.avatar_url} alt="" width={30} height={30} className="rounded-full object-cover w-[30px] h-[30px]" />
              ) : (
                <span className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#8B5CF6 0%,#C13BC1 100%)" }}>{a.pseudo.charAt(0).toUpperCase()}</span>
              )}
              <b className="text-[14px] font-semibold flex-1 truncate" style={{ color: "var(--text-1)" }}>{a.pseudo}</b>
              <span className="inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: "var(--gold)" }}>
                {a.note} <Star size={13} fill="var(--gold)" style={{ color: "var(--gold)" }} />
              </span>
            </div>
            {a.texte.trim()
              ? <p className="text-[15px] leading-relaxed" style={{ color: "var(--text-2)" }}>{a.texte}</p>
              : <p className="text-[13px] italic" style={{ color: "var(--text-3)" }}>(note seule, sans texte)</p>}
            <p className="text-[11px] mt-1.5 mb-3" style={{ color: "var(--text-3)" }}>
              {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <div className="flex gap-2">
              <button onClick={() => moderer(a.id, "approuve")} disabled={enCours === a.id}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[14px] font-semibold text-white cursor-pointer"
                style={{ background: "linear-gradient(135deg,#8B5CF6 0%,#C13BC1 100%)", opacity: enCours === a.id ? 0.5 : 1 }}>
                <Check size={15} strokeWidth={2.6} /> Approuver
              </button>
              <button onClick={() => moderer(a.id, "rejete")} disabled={enCours === a.id}
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-[14px] font-medium cursor-pointer"
                style={{ background: "rgba(var(--surface-rgb),0.8)", color: "var(--text-2)", border: "1px solid rgba(var(--accent-rgb),0.16)" }}>
                <X size={15} strokeWidth={2.4} /> Rejeter
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
