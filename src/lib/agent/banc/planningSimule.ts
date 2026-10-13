/* ════════════════════════════════════════════════════════════════════
   Le faux compte du test « agent », son planning simulé, ses outils et
   le correcteur.

   ⚠️ Prototype du test du 2026-10-13. Rien ne touche la base : tout vit en
   mémoire, et chaque essai repart du même compte.

   Le planning suit les règles du vrai moteur (refonte d'octobre) :
   - des jours habituels (lundi, mercredi, vendredi) ;
   - des exceptions datées (`pas_de_seance`, `seance_en_plus`) et des
     absences, qui l'emportent sur les jours habituels ;
   - les étapes du cycle se posent DANS L'ORDRE sur les jours qui portent
     une séance, à partir de la prochaine étape ;
   - une adaptation datée qui masque des étapes, comme V8.
   Deux réglages de l'adaptation n'existent PAS encore dans le moteur :
   la durée maximale (`duree_max_min`, l'axe prévu par adaptation.ts) et
   l'accent sur des zones. Le test les donne à l'agent pour mesurer s'il
   sait s'en servir ; s'il réussit, ce sont les deux boutons à construire.

   Le correcteur juge l'ÉTAT FINAL du planning, jamais la suite d'appels :
   plusieurs chemins mènent au bon résultat, et c'est le résultat que la
   personne verra dans l'aperçu.
   ════════════════════════════════════════════════════════════════════ */
import type { Outil } from "../boucle";
import { BORNES, type Periode } from "./formulations";

export const ZONES = ["dos", "fessiers", "jambes", "pectoraux", "epaules", "bras", "abdos"] as const;
export type Zone = (typeof ZONES)[number];

type Etape = { id: string; nom: string; zones: Zone[]; dureeMin: number };
type Exception = "pas_de_seance" | "seance_en_plus";
type Adaptation = { debut: string; fin: string; dureeMax?: number; accent?: Zone[]; eviter?: string[] };

export type EtatPlanning = {
  aujourdhui: string;
  lieu: string;
  /** 1 = lundi … 7 = dimanche, comme `jours_entrainement`. */
  joursHabituels: number[];
  cycle: Etape[];
  /** L'étape qui vient après la dernière faite (index dans le cycle). */
  prochaine: number;
  faites: { date: string; etape: string }[];
  exceptions: Record<string, Exception>;
  absences: { debut: string; fin: string }[];
  adaptation: Adaptation | null;
  /** Les deux gestes « pour de bon » : le test vérifie qu'ils restent intacts. */
  joursChangesPourDeBon: boolean;
  prioritesPourDeBon: Zone[] | null;
  /** Ce que l'agent a préparé, dans l'ordre, tel que l'aperçu le dirait. */
  apercu: string[];
};

/* ─── Dates, en UTC pour ne dépendre d'aucun fuseau ─── */
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const versDate = (s: string) => new Date(s + "T12:00:00Z");
const versTexte = (d: Date) => d.toISOString().slice(0, 10);
export const decaler = (s: string, n: number) => { const d = versDate(s); d.setUTCDate(d.getUTCDate() + n); return versTexte(d); };
/** 1 = lundi … 7 = dimanche. */
export const jourIso = (s: string) => { const j = versDate(s).getUTCDay(); return j === 0 ? 7 : j; };
const nomJour = (s: string) => JOURS[versDate(s).getUTCDay()];
export const enClair = (s: string) => { const d = versDate(s); return `${JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`; };
const dateValide = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && versTexte(versDate(v)) === v;
const ecart = (a: string, b: string) => Math.round((versDate(b).getTime() - versDate(a).getTime()) / 86_400_000);
/** Le lundi de la semaine d'une date. */
const lundi = (s: string) => decaler(s, 1 - jourIso(s));

/* ─── Le faux compte ─── */
export function compteDeTest(): EtatPlanning {
  return {
    aujourdhui: "2026-10-13",
    lieu: "à la maison, avec des haltères",
    joursHabituels: [1, 3, 5],
    cycle: [
      { id: "etape-full", nom: "Full Body", zones: ["jambes", "fessiers", "pectoraux", "dos", "abdos"], dureeMin: 45 },
      { id: "etape-haut", nom: "Haut du corps", zones: ["pectoraux", "dos", "epaules", "bras"], dureeMin: 45 },
      { id: "etape-bas", nom: "Bas du corps", zones: ["jambes", "fessiers", "abdos"], dureeMin: 45 },
    ],
    prochaine: 1,
    faites: [
      { date: "2026-10-05", etape: "Full Body" },
      { date: "2026-10-07", etape: "Haut du corps" },
      { date: "2026-10-09", etape: "Bas du corps" },
      { date: "2026-10-12", etape: "Full Body" },
    ],
    exceptions: {},
    absences: [],
    adaptation: null,
    joursChangesPourDeBon: false,
    prioritesPourDeBon: null,
    apercu: [],
  };
}

/* ─── La projection : ce que chaque jour porte ─── */
export type JourProjete = {
  date: string;
  seance: null | { etape: string; dureeMin: number; zones: Zone[]; accent: Zone[] | null; origine: string };
  fait?: string;
  note?: string;
};

const enAbsence = (e: EtatPlanning, d: string) => e.absences.some((a) => d >= a.debut && d <= a.fin);
const habituel = (e: EtatPlanning, d: string) => e.joursHabituels.includes(jourIso(d));

function porteUneSeance(e: EtatPlanning, d: string): string | null {
  if (enAbsence(e, d)) return null;
  const ex = e.exceptions[d];
  if (ex === "pas_de_seance") return null;
  if (ex === "seance_en_plus") return "séance en plus";
  return habituel(e, d) ? "jour habituel" : null;
}

const adaptationDu = (e: EtatPlanning, d: string) =>
  e.adaptation && d >= e.adaptation.debut && d <= e.adaptation.fin ? e.adaptation : null;

/** Du jour du test jusqu'à `au`, dans l'ordre du cycle. */
export function projeter(e: EtatPlanning, au: string): JourProjete[] {
  const jours: JourProjete[] = [];
  let curseur = e.prochaine;
  const n = e.cycle.length;
  for (let d = e.aujourdhui; d <= au; d = decaler(d, 1)) {
    const origine = porteUneSeance(e, d);
    if (!origine) {
      const note = enAbsence(e, d) ? "absence" : e.exceptions[d] === "pas_de_seance" ? "pas de séance (exception)" : undefined;
      jours.push({ date: d, seance: null, ...(note ? { note } : {}) });
      continue;
    }
    const ad = adaptationDu(e, d);
    // Une étape évitée est TRAVERSÉE, jamais consommée (règle V8).
    let pas = 0;
    while (ad?.eviter?.includes(e.cycle[curseur % n].id) && pas < n) { curseur++; pas++; }
    const etape = e.cycle[curseur % n];
    curseur++;
    jours.push({
      date: d,
      seance: {
        etape: etape.nom,
        dureeMin: ad?.dureeMax ? Math.min(etape.dureeMin, ad.dureeMax) : etape.dureeMin,
        zones: etape.zones,
        accent: ad?.accent ?? null,
        origine,
      },
    });
  }
  return jours;
}

/* ─── Les outils ─── */
const erreur = (texte: string) => ({ erreur: texte });
/** Jusqu'où l'on projette pour juger et pour compter : sept semaines. */
const HORIZON = "2026-11-29";

function normaliserZone(v: unknown): Zone | null {
  if (typeof v !== "string") return null;
  const s = v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  if ((ZONES as readonly string[]).includes(s)) return s as Zone;
  if (/fess|fesse|glute|booty/.test(s)) return "fessiers";
  if (/epaule/.test(s)) return "epaules";
  if (/pec/.test(s)) return "pectoraux";
  if (/abdo|gainage|core/.test(s)) return "abdos";
  if (/jambe|cuisse|quadri/.test(s)) return "jambes";
  if (/bras|biceps|triceps/.test(s)) return "bras";
  if (/dos/.test(s)) return "dos";
  return null;
}

const DATE = { type: "string", description: "Date au format AAAA-MM-JJ." };
const JOURS_SEMAINE = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

export const OUTILS_PLANNING: Outil<EtatPlanning>[] = [
  {
    nom: "lire_programme",
    description: "Lit le programme : le cycle de séances (dans l'ordre), les jours habituels, le lieu, la durée habituelle et l'adaptation déjà préparée.",
    parametres: { type: "object", properties: {} },
    executer: (_a, e) => ({
      aujourdhui: `${enClair(e.aujourdhui)} 2026 (${e.aujourdhui})`,
      lieu: e.lieu,
      jours_habituels: e.joursHabituels.map((j) => JOURS[j % 7]),
      seances_par_semaine: e.joursHabituels.length,
      cycle: e.cycle.map((c) => ({ etape: c.nom, zones: c.zones, duree_min: c.dureeMin })),
      prochaine_etape: e.cycle[e.prochaine].nom,
      adaptation: e.adaptation,
    }),
  },
  {
    nom: "lire_planning",
    description: "Lit le planning jour par jour entre deux dates incluses (62 jours au plus), changements préparés compris. Chaque jour dit s'il porte une séance, laquelle, sa durée et son accent.",
    parametres: { type: "object", properties: { du: DATE, au: DATE }, required: ["du", "au"] },
    executer: (a, e) => {
      if (!dateValide(a.du) || !dateValide(a.au)) return erreur("Dates attendues au format AAAA-MM-JJ.");
      if (a.au < a.du) return erreur("« au » doit être après « du ».");
      if (ecart(a.du, a.au) > 61) return erreur("62 jours au plus par lecture.");
      return { jours: lignesDuPlanning(e, a.du as string, a.au as string) };
    },
  },
  {
    nom: "poser_exceptions",
    description:
      "Prépare des exceptions datées sans toucher aux jours habituels. « pas_de_seance » retire la séance d'un jour habituel ; « seance_en_plus » ajoute une séance un jour qui n'en porte pas. Les étapes du cycle se répartissent ensuite, dans l'ordre, sur les jours qui portent une séance. Une exception par date.",
    parametres: {
      type: "object",
      properties: {
        exceptions: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            properties: { date: DATE, genre: { type: "string", enum: ["pas_de_seance", "seance_en_plus"] } },
            required: ["date", "genre"],
          },
        },
      },
      required: ["exceptions"],
    },
    executer: (a, e) => {
      const liste = Array.isArray(a.exceptions) ? a.exceptions : null;
      if (!liste || liste.length === 0) return erreur("Donne au moins une exception.");
      const faites: string[] = [];
      const refusees: string[] = [];
      const touchees = new Set<string>();
      const avant = projeter(e, HORIZON);
      for (const brut of liste as Record<string, unknown>[]) {
        const date = brut?.date, genre = brut?.genre;
        if (!dateValide(date)) { refusees.push(`${String(date)} : date illisible`); continue; }
        if (date < e.aujourdhui) { refusees.push(`${date} : date passée`); continue; }
        if (ecart(e.aujourdhui, date) > 120) { refusees.push(`${date} : trop loin (120 jours au plus)`); continue; }
        if (genre === "pas_de_seance") {
          if (!habituel(e, date)) { refusees.push(`${date} : ce n'est pas un jour habituel, il n'y a rien à retirer`); continue; }
        } else if (genre === "seance_en_plus") {
          if (habituel(e, date)) { refusees.push(`${date} : c'est déjà un jour habituel`); continue; }
        } else { refusees.push(`${date} : genre inconnu`); continue; }
        e.exceptions[date] = genre;
        touchees.add(lundi(date));
        const ligne = `${enClair(date)} : ${genre === "pas_de_seance" ? "pas de séance" : "une séance en plus"}`;
        e.apercu.push(ligne);
        faites.push(ligne);
      }
      /* Le geste dit ce qu'il change, comme une carte de Vaiiya nomme sa
         conséquence : le nombre de séances des semaines touchées. */
      const apres = projeter(e, HORIZON);
      const consequences = [...touchees].sort().flatMap((l) => {
        const compte = (jours: JourProjete[]) => jours.filter((j) => j.seance && j.date >= l && j.date <= decaler(l, 6)).length;
        const n0 = compte(avant), n1 = compte(apres);
        return n0 === n1 ? [] : [`semaine du ${enClair(l)} : ${n0} → ${n1} séance(s)`];
      });
      return {
        preparees: faites,
        ...(refusees.length ? { refusees } : {}),
        ...(consequences.length ? { consequences } : {}),
      };
    },
  },
  {
    nom: "changer_jours_periode",
    description:
      "Pour une période seulement, retire des jours habituels et en ajoute d'autres (par exemple sans le mercredi, avec le jeudi). Les dates sont calculées pour toi, jour par jour, et les jours habituels de fond ne changent pas.",
    parametres: {
      type: "object",
      properties: {
        du: DATE,
        au: DATE,
        retirer: { type: "array", items: { type: "string", enum: JOURS_SEMAINE }, description: "Jours habituels sans séance pendant la période." },
        ajouter: { type: "array", items: { type: "string", enum: JOURS_SEMAINE }, description: "Jours qui portent une séance en plus pendant la période." },
      },
      required: ["du", "au"],
    },
    executer: (a, e) => {
      if (!dateValide(a.du) || !dateValide(a.au)) return erreur("Dates attendues au format AAAA-MM-JJ.");
      if (a.du < e.aujourdhui) return erreur("La période ne commence pas dans le passé.");
      if (a.au < a.du) return erreur("« au » doit être après « du ».");
      if (ecart(a.du, a.au) > 120) return erreur("120 jours au plus : au-delà, change les jours habituels pour de bon.");
      const numero = (j: unknown) => { const i = JOURS.indexOf(String(j).toLowerCase().trim()); return i < 0 ? -1 : i === 0 ? 7 : i; };
      const retirer = (Array.isArray(a.retirer) ? a.retirer : []).map(numero);
      const ajouter = (Array.isArray(a.ajouter) ? a.ajouter : []).map(numero);
      if (retirer.includes(-1) || ajouter.includes(-1)) return erreur("Jours attendus : lundi … dimanche.");
      if (retirer.length + ajouter.length === 0) return erreur("Donne au moins un jour à retirer ou à ajouter.");
      const nonHabituels = retirer.filter((j) => !e.joursHabituels.includes(j));
      if (nonHabituels.length) return erreur(`Rien à retirer : ${nonHabituels.map((j) => JOURS[j % 7]).join(", ")} n'est pas un jour habituel (jours habituels : ${e.joursHabituels.map((j) => JOURS[j % 7]).join(", ")}).`);
      const dejaHabituels = ajouter.filter((j) => e.joursHabituels.includes(j));
      if (dejaHabituels.length) return erreur(`${dejaHabituels.map((j) => JOURS[j % 7]).join(", ")} porte déjà une séance chaque semaine.`);
      const avant = projeter(e, HORIZON);
      const touchees = new Set<string>();
      let n = 0;
      for (let d = a.du; d <= a.au; d = decaler(d, 1)) {
        const j = jourIso(d);
        if (retirer.includes(j)) { e.exceptions[d] = "pas_de_seance"; touchees.add(lundi(d)); n++; }
        else if (ajouter.includes(j)) { e.exceptions[d] = "seance_en_plus"; touchees.add(lundi(d)); n++; }
      }
      const apres = projeter(e, HORIZON);
      const consequences = [...touchees].sort().flatMap((l) => {
        const compte = (jours: JourProjete[]) => jours.filter((x) => x.seance && x.date >= l && x.date <= decaler(l, 6)).length;
        const n0 = compte(avant), n1 = compte(apres);
        return n0 === n1 ? [] : [`semaine du ${enClair(l)} : ${n0} → ${n1} séance(s)`];
      });
      const quoi = [
        retirer.length ? `sans séance le ${retirer.map((j) => JOURS[j % 7]).join(", ")}` : "",
        ajouter.length ? `une séance le ${ajouter.map((j) => JOURS[j % 7]).join(", ")}` : "",
      ].filter(Boolean).join(", ");
      e.apercu.push(`du ${enClair(a.du)} au ${enClair(a.au)} : ${quoi}`);
      return { ok: true, dates_touchees: n, ...(consequences.length ? { consequences } : {}) };
    },
  },
  {
    nom: "retirer_exception",
    description: "Annule une exception préparée à une date.",
    parametres: { type: "object", properties: { date: DATE }, required: ["date"] },
    executer: (a, e) => {
      if (!dateValide(a.date) || !e.exceptions[a.date]) return erreur("Aucune exception préparée à cette date.");
      delete e.exceptions[a.date];
      e.apercu.push(`${enClair(a.date)} : exception annulée`);
      return { ok: true };
    },
  },
  {
    nom: "poser_absence",
    description: "Prépare une absence (vacances, pause) : aucune séance entre deux dates incluses, 120 jours au plus.",
    parametres: { type: "object", properties: { debut: DATE, fin: DATE }, required: ["debut", "fin"] },
    executer: (a, e) => {
      if (!dateValide(a.debut) || !dateValide(a.fin)) return erreur("Dates attendues au format AAAA-MM-JJ.");
      if (a.debut < e.aujourdhui) return erreur("Une absence ne commence pas dans le passé.");
      if (a.fin < a.debut) return erreur("« fin » doit être après « debut ».");
      if (ecart(a.debut, a.fin) > 120) return erreur("120 jours au plus.");
      const debut = a.debut, fin = a.fin;
      if (e.absences.some((x) => debut <= x.fin && fin >= x.debut)) return erreur("Elle chevauche une absence déjà préparée.");
      e.absences.push({ debut, fin });
      e.apercu.push(`absence du ${enClair(debut)} au ${enClair(fin)}`);
      return { ok: true };
    },
  },
  {
    nom: "adapter_periode",
    description:
      "Prépare une adaptation temporaire entre deux dates incluses (120 jours au plus) : durée maximale des séances, zones à mettre en avant, étapes du cycle à éviter. Le programme de fond ne change pas et tout redevient comme avant après la fin. Une seule adaptation à la fois : mets tous les réglages dans le même appel.",
    parametres: {
      type: "object",
      properties: {
        debut: DATE,
        fin: DATE,
        duree_max_min: { type: "integer", minimum: 10, maximum: 120, description: "Durée maximale d'une séance, en minutes." },
        accent_zones: { type: "array", items: { type: "string", enum: [...ZONES] }, minItems: 1, maxItems: 3, description: "Zones à mettre en avant dans chaque séance." },
        eviter_etapes: { type: "array", items: { type: "string" }, description: "Noms d'étapes du cycle à ne pas proposer pendant la période." },
        motif: { type: "string", description: "Pourquoi, en quelques mots (facultatif)." },
      },
      required: ["debut", "fin"],
    },
    executer: (a, e) => {
      if (e.adaptation) {
        return erreur(`Une adaptation est déjà préparée (du ${e.adaptation.debut} au ${e.adaptation.fin}). Une seule à la fois : annule-la avec arreter_adaptation, puis recrée-la avec tous les réglages ensemble.`);
      }
      if (!dateValide(a.debut) || !dateValide(a.fin)) return erreur("Dates attendues au format AAAA-MM-JJ.");
      if (a.debut < e.aujourdhui) return erreur("Une adaptation ne commence pas dans le passé.");
      if (a.fin < a.debut) return erreur("« fin » doit être après « debut ».");
      if (ecart(a.debut, a.fin) > 120) return erreur("120 jours au plus : au-delà, c'est un changement de programme.");
      const ad: Adaptation = { debut: a.debut, fin: a.fin };
      if (a.duree_max_min !== undefined) {
        const m = Number(a.duree_max_min);
        if (!Number.isFinite(m) || m < 10 || m > 120) return erreur("duree_max_min entre 10 et 120.");
        ad.dureeMax = Math.round(m);
      }
      if (a.accent_zones !== undefined) {
        const brutes = Array.isArray(a.accent_zones) ? a.accent_zones : [a.accent_zones];
        const zones = brutes.map(normaliserZone);
        if (zones.some((z) => !z)) return erreur(`Zone inconnue. Zones possibles : ${ZONES.join(", ")}.`);
        ad.accent = [...new Set(zones as Zone[])];
      }
      if (a.eviter_etapes !== undefined) {
        const noms = Array.isArray(a.eviter_etapes) ? a.eviter_etapes : [a.eviter_etapes];
        const ids = noms.map((nom) => e.cycle.find((c) => c.nom.toLowerCase() === String(nom).toLowerCase().trim())?.id);
        if (ids.some((x) => !x)) return erreur(`Étape inconnue. Étapes du cycle : ${e.cycle.map((c) => c.nom).join(", ")}.`);
        if (ids.length >= e.cycle.length) return erreur("On ne peut pas éviter toutes les étapes du cycle.");
        ad.eviter = ids as string[];
      }
      if (!ad.dureeMax && !ad.accent && !ad.eviter) return erreur("Donne au moins un réglage : duree_max_min, accent_zones ou eviter_etapes.");
      e.adaptation = ad;
      const morceaux = [
        ad.dureeMax ? `séances de ${ad.dureeMax} min au plus` : "",
        ad.accent ? `accent sur ${ad.accent.join(", ")}` : "",
        ad.eviter ? `sans ${ad.eviter.map((id) => e.cycle.find((c) => c.id === id)?.nom).join(", ")}` : "",
      ].filter(Boolean);
      e.apercu.push(`du ${enClair(ad.debut)} au ${enClair(ad.fin)} : ${morceaux.join(", ")}`);
      return { ok: true, adaptation: { debut: ad.debut, fin: ad.fin, duree_max_min: ad.dureeMax, accent_zones: ad.accent, eviter_etapes: nomsEvites(ad, e) } };
    },
  },
  {
    nom: "arreter_adaptation",
    description: "Annule l'adaptation préparée.",
    parametres: { type: "object", properties: {} },
    executer: (_a, e) => {
      if (!e.adaptation) return erreur("Aucune adaptation préparée.");
      e.adaptation = null;
      e.apercu.push("adaptation annulée");
      return { ok: true };
    },
  },
  {
    nom: "changer_jours_habituels",
    description: "Change POUR DE BON les jours d'entraînement habituels de la semaine. Seulement si la personne veut un changement durable, jamais pour une période.",
    parametres: {
      type: "object",
      properties: { jours: { type: "array", minItems: 1, maxItems: 7, items: { type: "string", enum: JOURS_SEMAINE } } },
      required: ["jours"],
    },
    executer: (a, e) => {
      const jours = (Array.isArray(a.jours) ? a.jours : []).map((j) => JOURS.indexOf(String(j))).filter((i) => i >= 0).map((i) => (i === 0 ? 7 : i));
      if (jours.length === 0) return erreur("Jours attendus : lundi … dimanche.");
      e.joursHabituels = [...new Set(jours)].sort((x, y) => x - y);
      e.joursChangesPourDeBon = true;
      e.apercu.push(`pour de bon : jours habituels ${e.joursHabituels.map((j) => JOURS[j % 7]).join(", ")}`);
      return { ok: true };
    },
  },
  {
    nom: "changer_priorites",
    description: "Recompose POUR DE BON le programme autour de zones prioritaires (nouvelle version du programme). Seulement si la personne veut un changement durable, jamais pour une période.",
    parametres: {
      type: "object",
      properties: { zones: { type: "array", minItems: 1, maxItems: 2, items: { type: "string", enum: [...ZONES] } } },
      required: ["zones"],
    },
    executer: (a, e) => {
      const zones = (Array.isArray(a.zones) ? a.zones : []).map(normaliserZone).filter(Boolean) as Zone[];
      if (zones.length === 0) return erreur(`Zones possibles : ${ZONES.join(", ")}.`);
      e.prioritesPourDeBon = zones;
      e.apercu.push(`pour de bon : programme recomposé autour de ${zones.join(", ")}`);
      return { ok: true };
    },
  },
  {
    nom: "presenter_apercu",
    description: "Termine ton travail : présente à la personne ce que tu as préparé. Rien n'est appliqué avant qu'elle valide. Message de 2 phrases au plus, tutoiement, sans markdown. Si quelque chose bloque, dis-le ici.",
    parametres: { type: "object", properties: { message: { type: "string" } }, required: ["message"] },
    executer: (a) => (typeof a.message === "string" && a.message.trim() ? { ok: true } : erreur("Le message est vide.")),
    clot: true,
  },
];

/** Le planning en lignes courtes : chaque jour coûte une dizaine de jetons,
 *  et la lecture repart au modèle à chaque étape de la boucle. */
function lignesDuPlanning(e: EtatPlanning, du: string, au: string): string[] {
  const futurs = au >= e.aujourdhui ? projeter(e, au) : [];
  const lignes: string[] = [];
  for (let d = du; d <= au; d = decaler(d, 1)) {
    const tete = `${d} ${nomJour(d)} : `;
    if (d < e.aujourdhui) {
      const f = e.faites.find((x) => x.date === d);
      lignes.push(tete + (f ? `${f.etape} (faite)` : "rien"));
      continue;
    }
    const p = futurs.find((x) => x.date === d);
    if (!p?.seance) { lignes.push(tete + "rien" + (p?.note ? ` (${p.note})` : "")); continue; }
    const s = p.seance;
    lignes.push(tete + `${s.etape}, ${s.dureeMin} min` + (s.accent ? `, accent ${s.accent.join("+")}` : "") + (s.origine === "séance en plus" ? " (séance en plus)" : ""));
  }
  return lignes;
}

function nomsEvites(ad: Adaptation, e: EtatPlanning) {
  return ad.eviter?.map((id) => e.cycle.find((c) => c.id === id)?.nom);
}

/* ─── Le correcteur ─── */
export type Verdict = {
  reussi: boolean;
  criteres: Record<"apercu" | "mercredi" | "duree" | "accent" | "nombre" | "perimetre", boolean>;
  details: string[];
  avertissements: string[];
};

export function corriger(initial: EtatPlanning, final: EtatPlanning, periode: Periode, fin: string, message: string | null): Verdict {
  const { finMin, finMax } = BORNES[periode];
  const avant = projeter(initial, HORIZON);
  const apres = projeter(final, HORIZON);
  const details: string[] = [];
  const avertissements: string[] = [];
  const fenetre = apres.filter((j) => j.date <= finMin);

  /* Finir en parlant, après avoir préparé des changements, vaut aperçu : dans
     l'app, l'écran montrerait les changements sous ce dernier message. Finir
     en parlant SANS rien préparer, c'est une question ou un abandon. */
  const apercu = fin === "apercu" || (fin === "texte" && final.apercu.length > 0);
  if (fin === "texte" && apercu) avertissements.push("a fini en parlant au lieu d'appeler presenter_apercu");
  if (!apercu) details.push(fin === "texte" ? "a répondu sans rien préparer" : fin === "etapes_max" ? "n'a pas fini dans le nombre d'étapes" : "s'est arrêté sur une erreur");

  const mercredis = fenetre.filter((j) => j.seance && jourIso(j.date) === 3);
  if (mercredis.length) details.push(`séance un mercredi : ${mercredis.map((j) => j.date).join(", ")}`);

  const longues = fenetre.filter((j) => j.seance && j.seance.dureeMin > 30);
  if (longues.length) details.push(`plus de 30 min : ${longues.map((j) => j.date).join(", ")}`);

  const sansAccent = fenetre.filter((j) => j.seance && !j.seance.accent?.includes("fessiers"));
  if (sansAccent.length) details.push(`sans accent fessiers : ${sansAccent.map((j) => j.date).join(", ")}`);

  // Le nombre de séances, semaine par semaine, jusqu'à la dernière semaine
  // touchable : ni moins (une séance perdue), ni plus (personne n'en a demandé).
  let nombre = true;
  for (let l = lundi(initial.aujourdhui); l <= lundi(finMax); l = decaler(l, 7)) {
    const compte = (jours: JourProjete[]) => jours.filter((j) => j.seance && j.date >= l && j.date <= decaler(l, 6)).length;
    if (compte(apres) !== compte(avant)) {
      nombre = false;
      details.push(`semaine du ${l} : ${compte(apres)} séance(s) au lieu de ${compte(avant)}`);
    }
  }

  // Après la période : rien ne doit avoir bougé (présence, durée, accent).
  const touches = apres.filter((j) => {
    if (j.date <= finMax) return false;
    const a = avant.find((x) => x.date === j.date);
    return !!a?.seance !== !!j.seance || a?.seance?.dureeMin !== j.seance?.dureeMin || JSON.stringify(a?.seance?.accent) !== JSON.stringify(j.seance?.accent);
  });
  if (touches.length) details.push(`touche à des jours après la période : ${touches.slice(0, 4).map((j) => j.date).join(", ")}${touches.length > 4 ? "…" : ""}`);
  if (final.joursChangesPourDeBon) details.push("a changé les jours habituels pour de bon");
  if (final.prioritesPourDeBon) details.push("a recomposé le programme pour de bon");
  const perimetre = touches.length === 0 && !final.joursChangesPourDeBon && !final.prioritesPourDeBon;

  if (message && /c'est fait|c’est fait|j'ai (modifié|mis à jour|appliqué|changé)|j’ai (modifié|mis à jour|appliqué|changé)/i.test(message)) {
    avertissements.push("le message parle comme si c'était déjà appliqué");
  }

  const criteres = {
    apercu,
    mercredi: mercredis.length === 0,
    duree: longues.length === 0,
    accent: sansAccent.length === 0,
    nombre,
    perimetre,
  };
  return { reussi: Object.values(criteres).every(Boolean), criteres, details, avertissements };
}
