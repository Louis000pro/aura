/* ════════════════════════════════════════════════════════════════════
   AssistantMark — l'identité visuelle de l'assistant Vaiiya, partagée.

   L'étincelle ✦ = géométrie EXACTE de lucide « sparkles », en bicolore :
   étoile violette (action) + petits éclats dorés. Hérite des couleurs du
   thème → mode sombre automatique, nette à toutes les tailles.

   UNE seule source pour toute l'app :
   • `AssistantSpark`  — l'étincelle nue, posée dans la barre de nav (NavOrb).
   • `AssistantAvatar` — l'étincelle dans une pastille ronde teintée : le
     « visage » du chat (en-tête, avatars de messages, écran d'accueil).

   Remplace partout l'ancien PNG orbe photoréaliste (qui jurait avec la DA).
   ════════════════════════════════════════════════════════════════════ */

export function AssistantSpark({ px }: { px: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      /* Marque figée : en mode « couleurs forcées » (contraste élevé / couleurs
         imposées par le navigateur), on refuse le repeint système — l'étincelle
         garde SON violet + or, partout où elle apparaît. */
      style={{ forcedColorAdjust: "none" }}>
      <path
        d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
        style={{ stroke: "var(--accent)", fill: "rgba(var(--accent-rgb),0.13)" }} />
      <path d="M20 2v4" style={{ stroke: "var(--gold)" }} />
      <path d="M22 4h-4" style={{ stroke: "var(--gold)" }} />
      <circle cx="4" cy="20" r="2" style={{ stroke: "var(--gold)" }} />
    </svg>
  );
}

export function AssistantAvatar({ size, className = "" }: { size: number; className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full flex-shrink-0 select-none ${className}`}
      style={{
        width: size, height: size,
        background: "rgba(var(--accent-rgb),0.12)",
        border: "1px solid rgba(var(--accent-rgb),0.18)",
        forcedColorAdjust: "none",
      }}>
      <AssistantSpark px={Math.round(size * 0.56)} />
    </span>
  );
}
