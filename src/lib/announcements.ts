/* ════════════════════════════════════════════════════════════════════
   Annonces « Quoi de neuf » — récap des mises à jour de Vaiiya.

   Tout est CÔTÉ CLIENT : le contenu est versionné ici (déployé avec le
   code), et l'état « déjà vu » est stocké dans localStorage. Aucune table,
   aucun broadcast en base → zéro risque RLS, et ça part avec main.

   Pour une nouvelle release : ajoute un objet EN TÊTE du tableau avec un
   `id` unique. Tous les utilisateurs verront la pastille « Nouveautés »
   tant qu'ils n'auront pas ouvert la cloche / la page notifications.
   ════════════════════════════════════════════════════════════════════ */

export type AnnouncementItem = {
  emoji: string;
  title: string;
  text: string;
};

export type Announcement = {
  id: string;        // identifiant unique et stable (sert de clé "déjà vu")
  date: string;      // ISO (YYYY-MM-DD) — affiché
  title: string;
  intro?: string;
  items: AnnouncementItem[];
};

/* Les plus récentes EN PREMIER. */
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "2026-06-21-maj-ia-planning",
    date: "2026-06-21",
    title: "La plus grosse mise à jour de Vaiiya 💜",
    intro: "Merci d'être là. Voici tout ce qui change aujourd'hui :",
    items: [
      {
        emoji: "🤖",
        title: "Un assistant IA partout",
        text: "Appuie sur l'orbe en bas de l'écran : il connaît tout le site, te guide, et peut même créer ou déplacer tes séances. Il retient tes objectifs, tes blessures et tes préférences.",
      },
      {
        emoji: "🗓️",
        title: "Ton planning, enfin tout connecté",
        text: "Un planning unique relié à ta bibliothèque de séances et à ta progression. Pose une séance sur un jour, navigue entre les semaines, et laisse l'IA l'organiser pour toi.",
      },
      {
        emoji: "✨",
        title: "Nouvelle orbe d'assistant",
        text: "Un bouton central élégant pour parler à ton coach à tout moment : appui pour écrire, maintien pour parler.",
      },
      {
        emoji: "🏋️",
        title: "Des séances plus claires",
        text: "Noms d'exercices standardisés, démo vidéo dépliable, et un générateur qui respecte vraiment ton lieu et ton matériel.",
      },
      {
        emoji: "🚀",
        title: "Plus rapide, plus fluide",
        text: "Transitions entre pages adoucies et un réglage de qualité visuelle (Auto / Élevée / Fluide) pour rester fluide même sur les appareils modestes.",
      },
      {
        emoji: "🐛",
        title: "Corrections",
        text: "Compteurs d'abonnés/abonnements corrigés, ouverture de l'orbe sur mobile fiabilisée, et déploiements toujours à jour.",
      },
    ],
  },
];

/* ── État « déjà vu » (localStorage) ─────────────────────────────────── */

const SEEN_KEY = "vaiiya:seenAnnouncements";

function readSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Ensemble des annonces PAS encore vues par cet appareil. */
export function getUnseenAnnouncementIds(): Set<string> {
  const seen = readSeen();
  return new Set(ANNOUNCEMENTS.filter((a) => !seen.has(a.id)).map((a) => a.id));
}

/** Nombre d'annonces non vues (pour la pastille de la cloche). */
export function unseenAnnouncementCount(): number {
  return getUnseenAnnouncementIds().size;
}

/** Marque toutes les annonces (ou une liste) comme vues. */
export function markAnnouncementsSeen(ids: string[] = ANNOUNCEMENTS.map((a) => a.id)): void {
  if (typeof window === "undefined") return;
  try {
    const seen = readSeen();
    ids.forEach((id) => seen.add(id));
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    /* localStorage indisponible (mode privé strict) → on ignore */
  }
}
