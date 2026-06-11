"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.25 }}
        className="text-center"
        style={{ maxWidth: 420 }}
      >
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
      </motion.div>
    </div>
  );
}
