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
 * Frontière d'erreur de la racine.
 *
 * ⚠️ AUCUNE DÉPENDANCE, ET C'EST LA PROPRIÉTÉ PRINCIPALE DE CE FICHIER.
 * `framer-motion` en est parti le 2026-09-13 : le mode d'échec le plus
 * probable derrière cet écran est « un module ne se charge pas », et une
 * frontière d'erreur qui dépend d'un gros module partagé peut échouer à
 * s'afficher au moment exact où elle devrait servir. L'entrée en fondu est
 * donc une animation CSS de six lignes, et elle n'est pas prioritaire : si
 * elle gêne un jour, c'est elle qui part, pas l'absence de dépendance.
 *
 * ⚠️ ET IL Y A TROIS SORTIES, PAS UNE. `reset()` seul ne re-rend que le même
 * arbre React, avec le même bundle déjà chargé : il ne recharge pas le
 * document, ne repasse pas par le service worker et ne change pas de build.
 * Pour un fichier réellement absent du déploiement, il ne peut pas réussir,
 * et l'écran devenait un cul-de-sac. « Recharger Vaiiya » et « Retour à
 * l'accueil » passent tous deux par une vraie navigation du navigateur, donc
 * par la branche réseau-strict de `sw.js`, qui rend toujours le build courant
 * quand on est en ligne.
 *
 * Les trois restent disponibles même quand la récupération automatique a déjà
 * été tentée et a échoué : c'est justement là qu'on en a besoin.
 */
export default function Error({
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

    /* L'ordre compte. On DÉCIDE d'abord (ce qui pose le verrou), pour que le
       journal parte en sachant ce que la frontière a fait : sans ça, on ne
       pourrait pas distinguer « la récupération n'a pas eu lieu » de « elle a
       eu lieu et n'a rien réglé ». */
    const decision = deciderSecours(error);
    const envoi = signalerErreur(error, "error", decision);
    if (decision === "lance") lancerSecours(envoi);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #faf8ff 0%, #fffef8 100%)",
        padding: "40px 24px",
      }}
    >
      <style>{`@keyframes vy-err-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.vy-err{animation:vy-err-in .32s ease-out both}
@media (prefers-reduced-motion: reduce){.vy-err{animation:none}}`}</style>

      <div className="vy-err text-center" style={{ maxWidth: 420 }}>
        <div
          className="mx-auto mb-5 flex items-center justify-center"
          style={{
            width: 80,
            height: 80,
            borderRadius: 9999,
            background:
              "linear-gradient(135deg, rgba(240,235,255,0.9) 0%, rgba(255,251,240,0.9) 100%)",
            boxShadow: "0 8px 32px rgba(167,139,250,0.18)",
            fontSize: 34,
          }}
        >
          🌧️
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 300,
            color: "#2D3748",
            marginBottom: 8,
          }}
        >
          Oups, un petit accroc
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#A0AEC0",
            marginBottom: 24,
            lineHeight: 1.6,
            fontWeight: 300,
          }}
        >
          On n&apos;a pas réussi à charger cette page. Pas de panique, réessaie
          dans un instant
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: "12px 32px",
            borderRadius: 16,
            border: "none",
            background: "linear-gradient(135deg, #A78BFA, #D4A843)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(167,139,250,0.3)",
          }}
        >
          Réessayer
        </button>

        {/* Les deux sorties de secours sont en retrait : du texte, sans surface
            propre. Deux boutons de même poids annuleraient la lecture du
            système D, où le violet plein est L'ACTION. */}
        <div
          style={{
            marginTop: 20,
            display: "flex",
            gap: 18,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button onClick={rechargerVaiiya} style={sortie}>
            Recharger Vaiiya
          </button>
          <button onClick={allerAccueil} style={sortie}>
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    </div>
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
