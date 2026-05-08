"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, padding: 0, background: "linear-gradient(135deg, #faf8ff 0%, #fffef8 100%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
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
        </div>
      </body>
    </html>
  );
}
