import posthog from "posthog-js";

/* ════════════════════════════════════════════════════════════════════
   Petit wrapper PostHog pour le reste de l'app.

   L'init se fait dans `src/instrumentation-client.ts`. Ici on expose juste
   des helpers qui :
   - ne font RIEN hors build de production (comme l'init) → `next dev` propre ;
   - sont blindés en try/catch → l'analytics ne casse jamais une action user.

   Voir [[posthog-analytics-integration]].
   ════════════════════════════════════════════════════════════════════ */

const ENABLED = process.env.NODE_ENV === "production" && typeof window !== "undefined";

/** Rattache la session (et le replay) à un compte. À appeler à la connexion. */
export function identifyUser(id: string, props?: Record<string, unknown>) {
  if (!ENABLED) return;
  try { posthog.identify(id, props); } catch { /* analytics indispo → on ignore */ }
}

/** Délie la session du compte. À appeler à la déconnexion. */
export function resetUser() {
  if (!ENABLED) return;
  try { posthog.reset(); } catch { /* idem */ }
}

/** Logge un événement métier (ex : "seance_creee"). */
export function track(event: string, props?: Record<string, unknown>) {
  if (!ENABLED) return;
  try { posthog.capture(event, props); } catch { /* idem */ }
}
