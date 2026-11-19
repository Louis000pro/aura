/* Ce que le fil et la feuille d’un jour disent d’une séance : partagé
   par les deux, pour qu’une séance se décrive pareil partout. Pur. */

import { dayTitle, dureeIntention } from "@/lib/planning";
import type { EtapeCycle } from "@/lib/programme";
import { libelleAttente } from "@/lib/projection";
import type { ElementJour } from "@/lib/semaine";
import type { ResultatGeste } from "@/lib/semaineGestes";

/** La réservation à libérer une fois la nouvelle séance enregistrée. */
export type ALiberer = { id: string; date: string } | null;

export const RAISONS: Record<Exclude<ResultatGeste, { ok: true }>["raison"], string> = {
  changee: "Ton planning a bougé entre-temps, je l’ai relu.",
  illisible: "Je n’arrive pas à relire ton planning, réessaie dans un instant.",
  echec: "Ça n’a pas pris, réessaie dans un instant.",
  masquee: "Ton adaptation met cette séance de côté ce jour-là.",
  partiel: "Une partie seulement est passée : je relis ton planning, regarde avant de recommencer.",
};

export const CONFLITS = {
  absence: "en pause pendant ton absence",
  jour_retire: "jour retiré, elle passera au suivant",
  adaptation: "mise de côté par ton adaptation",
} as const;

/** Ce que la ligne dit d'une séance : son titre, sa durée, pourquoi elle est là. */
export function descriptionElement(el: ElementJour<EtapeCycle>, cycle: EtapeCycle[] | null) {
  const intention = el.genre === "realisee" ? null : el.intention;
  const titre = el.genre === "realisee" ? el.seance.titre
    : intention ? dayTitle(intention)
    : el.genre === "prevu" ? el.projete.etape.nom : "";
  const duree = el.genre === "realisee" ? (el.seance.dureeMin ?? 45)
    : el.genre === "prevu" && !intention ? (el.projete.etape.dureeMin ?? 45)
    : intention ? dureeIntention(intention) : 45;
  const nbExos = intention?.exerciseList?.length ?? 0;
  const fait = el.genre === "fait" || el.genre === "realisee";
  const p = el.genre === "prevu" ? el.projete : null;
  /* Pourquoi elle est là. Une seule raison, la plus utile. */
  let raison: string | null = null;
  if (p?.conflit) raison = CONFLITS[p.conflit];
  else if (p?.attendaitLe) raison = libelleAttente(p.attendaitLe);
  else if (p?.reservee || (el.genre === "pose" && intention?.etapeId)) raison = "placée par toi";
  else if (el.genre === "pose") raison = intention?.origine === "guide" ? "posée avec ton Guide" : "ajoutée par toi";
  else if (p && el.genre === "prevu" && el.proposee) raison = "ta prochaine séance";
  else if (p && cycle && cycle.length > 1) {
    const tri = [...cycle].sort((a, b) => a.position - b.position);
    const i = tri.findIndex((e) => e.id === p.etape.id);
    if (i >= 0) raison = `après ${tri[(i - 1 + tri.length) % tri.length].nom} dans ton programme`;
  }
  return { titre, duree, nbExos, fait, raison, p, intention };
}

