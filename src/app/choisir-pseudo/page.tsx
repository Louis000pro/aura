"use client";

/* L'écran « choisis ton pseudo », montré une fois après une première
   connexion Google (voir GardePseudo). Il n'écrit que le pseudo, rien
   d'autre : le choix du Guide et le profil viennent après, par leurs
   propres écrans.

   Après l'enregistrement on recharge la page vers la destination : c'est le
   plus sûr pour que GardePseudo relise `pseudo_choisi` (désormais vrai) et
   ne renvoie pas ici en boucle. */

import { useEffect, useState } from "react";
import { AtSign } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchAuth } from "@/lib/fetchAuth";
import { destinationDepuisUrl } from "@/lib/destinationInterne";

const FORME = /^[A-Za-z0-9._-]{2,24}$/;

export default function ChoisirPseudoPage() {
  const { user, isLoading } = useAuth();
  const [pseudo, setPseudo] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Sans compte, cet écran n'a rien à faire : on renvoie vers la connexion.
  useEffect(() => {
    if (!isLoading && !user && typeof window !== "undefined") {
      window.location.replace("/auth");
    }
  }, [isLoading, user]);

  const valide = FORME.test(pseudo.trim());

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valide || loading) return;
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetchAuth("/api/me/choisir-pseudo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudo: pseudo.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.error) {
        setErreur(j.error ?? "Enregistrement impossible. Réessaie.");
        setLoading(false);
        return;
      }
      // Rechargement complet : GardePseudo relit le drapeau à jour.
      window.location.assign(destinationDepuisUrl("/"));
    } catch {
      setErreur("Connexion impossible. Réessaie.");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
      style={{
        background: "var(--page-bg)",
        paddingTop: "calc(env(safe-area-inset-top) + 24px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
      }}
    >
      <div className="w-full max-w-[400px]">
        <h1 className="text-[26px] font-extrabold tracking-tight" style={{ color: "var(--text-0)" }}>
          Choisis ton pseudo
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "var(--text-soft)" }}>
          C&apos;est le nom qu&apos;on verra sur ton profil et dans la communauté. Tu pourras le changer plus tard.
        </p>

        <form onSubmit={enregistrer} className="mt-6 flex flex-col gap-3">
          <div
            className="flex items-center gap-2 rounded-2xl px-3.5 py-3"
            style={{
              background: "rgba(var(--surface-rgb),0.72)",
              border: "1.5px solid rgba(var(--accent-rgb),0.18)",
            }}
          >
            <AtSign size={16} style={{ color: "var(--text-3)" }} />
            <input
              autoFocus
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="ex : Atlas92 ou atlas_92"
              maxLength={24}
              className="flex-1 bg-transparent outline-none text-[16px]"
              style={{ color: "var(--text-1)" }}
            />
          </div>

          {erreur && (
            <p className="text-[13px]" role="alert" style={{ color: "#E5484D" }}>{erreur}</p>
          )}

          <button
            type="submit"
            aria-disabled={!valide || loading}
            className="mt-1 rounded-2xl py-3.5 text-[16px] font-semibold text-white transition-transform active:scale-95"
            style={{
              background: "linear-gradient(100deg, #8B5CF6, #C13BC1)",
              opacity: !valide || loading ? 0.5 : 1,
            }}
          >
            {loading ? "Un instant…" : "Continuer"}
          </button>
        </form>
      </div>
    </div>
  );
}
