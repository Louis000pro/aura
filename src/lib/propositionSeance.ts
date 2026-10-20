/* ════════════════════════════════════════════════════════════════════
   propositionSeance · ce qu'on peut répondre à une séance que le Guide
   propose.

   Louis, 2026-10-21 (version 3 de « La conversation du Guide », planche
   « Sasha te propose la séance ») : la séance se pose dans le fil, sous la
   bulle du Guide, comme une pièce jointe, avec ses mouvements animés et UN
   seul bouton, « On y va ». Le reste, c'est ce qu'on lui répondrait, en
   pointillés, de ton côté : « Plutôt demain », « Un autre jour »,
   « Autre chose ». Une réponse choisie devient ta bulle d'encre.

   ⚠️ PUR : aucune lecture, aucune horloge (le jour d'aujourd'hui se
   reçoit), donc tout se vérifie hors ligne (`npm run check:ouverture`).
   Ce sont les mots de la personne : ils vivent ici, pas dans `guides.ts`,
   qui ne porte que la parole du Guide.
   ════════════════════════════════════════════════════════════════════ */

/** Un des sept prochains jours, tel que `chargerJours` le rend. */
export type JourPropose = {
  ymd: string;
  /** Ce qui est déjà prévu ce jour-là, à dire AVANT le clic. */
  occupe?: string | null;
  /** Tout ce qui y est prévu est déjà fait : on n'y pose rien. */
  bloque?: boolean;
};

/** Répondre un jour. `texte` est ce qui s'écrit dans ta bulle une fois
 *  choisi ; `jour` est ce que le Guide en redit (« demain », « jeudi »). */
export type ReponseJour = { genre: "jour"; texte: string; ymd: string; pris: boolean; jour: string };

export type ReponseProposition =
  | ReponseJour
  | { genre: "autre_jour"; texte: string }
  | { genre: "autre_chose"; texte: string };

const NOMS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function enUTC(ymd: string): Date {
  const [a, m, j] = ymd.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j));
}

/** Le lendemain d'une date `AAAA-MM-JJ`. Le calcul se fait en UTC parce
 *  que la date est DÉJÀ la journée locale : la repasser par le fuseau du
 *  navigateur la ferait reculer d'un jour à l'est de Greenwich. */
export function lendemain(ymd: string): string {
  const d = enUTC(ymd);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Le jour tel qu'on le dit : « demain », sinon son nom (« jeudi »). Sur
 *  les sept prochains jours, un nom ne revient jamais deux fois, donc il
 *  suffit pour savoir de quel jour on parle. */
export function jourDit(ymd: string, aujourdhui: string): string {
  if (ymd === aujourdhui) return "aujourd’hui";
  if (ymd === lendemain(aujourdhui)) return "demain";
  return NOMS[enUTC(ymd).getUTCDay()];
}

function reponseJour(j: JourPropose, aujourdhui: string): ReponseJour {
  const jour = jourDit(j.ymd, aujourdhui);
  return { genre: "jour", texte: `Plutôt ${jour}`, ymd: j.ymd, pris: !!j.occupe, jour };
}

/** Après « Un autre jour » : les jours à partir de demain (on a pu toucher
 *  « Un autre jour » en voulant demain), sauf ceux où tout est déjà fait.
 *  Aujourd'hui n'y est pas : « On y va » le couvre. */
export function joursAuChoix(jours: JourPropose[], aujourdhui: string): ReponseJour[] {
  const demain = lendemain(aujourdhui);
  return jours
    .filter((j) => j.ymd >= demain && !j.bloque)
    .sort((a, b) => a.ymd.localeCompare(b.ymd))
    .map((j) => reponseJour(j, aujourdhui));
}

/** Les réponses sous la séance, dans cet ordre : demain, un autre jour,
 *  autre chose. `jours` vaut `null` tant qu'ils ne sont pas lus (on
 *  propose alors sans dire ce qui est déjà pris). `coach` : il reste des
 *  messages aujourd'hui, sinon « Autre chose » ne pourrait pas partir.
 *  « Plutôt demain » et « Un autre jour » ne coûtent aucun message : ils
 *  programment la séance sans passer par le coach. */
export function reponsesProposition({ jours, aujourdhui, coach }: {
  jours: JourPropose[] | null;
  aujourdhui: string;
  coach: boolean;
}): ReponseProposition[] {
  const demain = lendemain(aujourdhui);
  const jDemain = jours?.find((j) => j.ymd === demain) ?? { ymd: demain };
  const r: ReponseProposition[] = [];
  if (!jDemain.bloque) r.push(reponseJour(jDemain, aujourdhui));
  const autres = jours === null ? null : joursAuChoix(jours, aujourdhui).filter((j) => j.ymd !== demain);
  if (autres === null || autres.length > 0) r.push({ genre: "autre_jour", texte: "Un autre jour" });
  if (coach) r.push({ genre: "autre_chose", texte: "Autre chose" });
  return r;
}
