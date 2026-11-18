/** Les effets accompagnent la musique des autres applications, sans la remplacer. */
export function melangerAudio(): boolean {
  if (typeof navigator === "undefined") return false;
  try {
    const session = (navigator as Navigator & {
      audioSession?: { type: string };
    }).audioSession;
    if (!session) return false;
    // Ne pas modifier une capture vocale déjà en cours.
    if (session.type === "play-and-record") return false;
    session.type = "ambient";
    return session.type === "ambient";
  } catch {
    // L'API n'est pas disponible sur tous les navigateurs.
    return false;
  }
}
