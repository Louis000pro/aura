"use client";

import { useEffect } from "react";
import {
  deciderSecours,
  lancerSecours,
  signalerErreur,
  rechargerVaiiya,
  allerAccueil,
} from "@/lib/secoursErreur";

/**
 * Frontière d'erreur de dernier recours : elle remplace le layout racine, donc
 * elle porte son propre `<html>` et son propre `<body>`, et `globals.css` n'y
 * est pas appliqué (tous les styles sont en ligne, c'est voulu).
 *
 * ⚠️ Elle souffrait exactement du même cul-de-sac que `error.tsx` : une seule
 * action, `reset()`, qui ne recharge rien. Elle partage donc la même
 * récupération, par `src/lib/secoursErreur.ts`, qui n'importe rien lui-même.
 * On ne recopie pas la logique ici : une seule autorité décide, compte les
 * tentatives et écrit le journal, sinon les deux frontières finiraient par ne
 * plus compter pareil.
 *
 * `origine: "global-error"` part dans le journal : une erreur qui atterrit ici
 * plutôt que sur `error.tsx` vient du layout racine ou de la frontière
 * elle-même, et ça se diagnostique très différemment.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      console.error(error);
    } catch {
      /* ignoré */
    }
    const decision = deciderSecours(error);
    const envoi = signalerErreur(error, "global-error", decision);
    if (decision === "lance") lancerSecours(envoi);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, padding: 0, background: "linear-gradient(135deg, #faf8ff 0%, #fffef8 100%)", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center", padding: "40px 24px", maxWidth: 480 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 24, fontWeight: 300, color: "#2D3748", marginBottom: 8 }}>
            Quelque chose s&apos;est mal passé
          </h1>
          <p style={{ fontSize: 14, color: "#718096", marginBottom: 24, lineHeight: 1.6 }}>
            {error?.message ?? "Une erreur inattendue est survenue."}
          </p>
          <button
            onClick={reset}
            style={{ padding: "12px 32px", borderRadius: 16, border: "none", background: "linear-gradient(135deg, #A78BFA, #D4A843)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Réessayer
          </button>

          <div style={{ marginTop: 20, display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={rechargerVaiiya} style={sortie}>
              Recharger Vaiiya
            </button>
            <button onClick={allerAccueil} style={sortie}>
              Retour à l&apos;accueil
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

const sortie: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  color: "#718096",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: 3,
};
