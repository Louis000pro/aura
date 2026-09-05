/* ════════════════════════════════════════════════════════════════════
   check:rappels — le banc d'essai du rappel du soir.

     npm run check:rappels

   ⚠️ IL EXERCE LE VRAI `rappelPour`, pas une recopie de ses règles. Le
   module est PUR (il ne lit rien, n'écrit rien, ne connaît ni Supabase ni
   web-push), donc la décision entière se vérifie hors ligne, sur une app
   pourtant auth-gated. C'est exactement pour ça qu'il a été écrit comme ça.

   LA RÈGLE QU'IL PROTÈGE (Louis, 2026-09-05) : l'absence de planning ne
   doit JAMAIS se lire comme « tu aurais dû t'entraîner aujourd'hui ».
   Avant V5, l'ancien moteur écrivait sept lignes par semaine, donc il y
   avait toujours quelque chose au planning et la question ne se posait
   pas. Depuis, une journée sans ligne est la norme.
   ════════════════════════════════════════════════════════════════════ */
import { rappelPour, type ContexteRappel } from "@/lib/rappelsProfil";

let echecs = 0;
function verdict(nom: string, bon: boolean, detail: string) {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + " — " + detail);
}

/** Quelqu'un d'installé, venu aujourd'hui, dont la cadence autorise un
 *  rappel : le cas le plus favorable à l'envoi. Si le rappel ne part pas
 *  ici, c'est bien la règle testée qui l'arrête et rien d'autre. */
function base(): ContexteRappel {
  return {
    aujourdHui: "2026-09-05",
    palier: "regulier",
    pseudo: "Louis",
    guide: null,
    joursDepuisVenue: 0,
    seancePrevue: null,
    jourDeRepos: false,
    seanceFaite: false,
    repasNotes: false,
    noteHabituellement: false,
    serie: 12,
    exp: 400,
    envois: [],
    seancesTotal: 40,
  };
}

const nomDu = (r: ReturnType<typeof rappelPour>) => (r === null ? "aucun rappel" : r.cle + " · « " + r.title + " »");

/* ── Les cinq cas de la règle ────────────────────────────────────────── */

{
  // 1. JOUR VIDE. Aucune ligne aujourd'hui : rien n'était promis.
  const r = rappelPour({ ...base() });
  verdict("jour vide → silence", r === null, nomDu(r));
}

{
  // 2. REPOS EXPLICITE. Un choix, pas un oubli.
  const r = rappelPour({ ...base(), jourDeRepos: true });
  verdict("repos explicite → silence", r === null, nomDu(r));
}

{
  // 3. SÉANCE DATÉE, ENCORE PRÉVUE. Là, et seulement là, on peut parler.
  const r = rappelPour({ ...base(), seancePrevue: "Jambes & Fessiers" });
  verdict("séance datée non faite → rappel possible", r !== null, nomDu(r));
  verdict(
    "et il NOMME la séance",
    r !== null && (r.title + " " + r.body).includes("Jambes & Fessiers"),
    r === null ? "aucun rappel" : r.title + " / " + r.body,
  );
}

{
  // 4. SÉANCE DATÉE, DÉJÀ FAITE. Plus rien à rappeler.
  const r = rappelPour({ ...base(), seancePrevue: "Jambes & Fessiers", seanceFaite: true });
  verdict("séance datée faite → silence", r === null, nomDu(r));
}

{
  // 5. MODE LIBRE : une prochaine étape existe, mais elle n'a pas de date.
  //    Le cron ne lit que les intentions DATÉES du jour, donc il ne la voit
  //    pas, et c'est le comportement voulu : le programme dit QUOI faire,
  //    pas QUAND.
  const r = rappelPour({ ...base(), seancePrevue: null, serie: 30, exp: 995 });
  verdict("prochaine séance non datée seulement → silence", r === null, nomDu(r));
}

/* ── Les quatre modèles qui partaient sans planning ───────────────────
   Chacun s'appliquait AVANT V5b sur une journée vide. On vérifie un par
   un qu'aucun ne passe plus, sinon le correctif n'aurait bouché qu'un
   trou sur quatre.                                                      */
for (const [nom, patch] of [
  ["premier pas (découverte)", { palier: "decouverte" as const, seancesTotal: 1 }],
  ["rang à portée", { exp: 995 }],
  ["série en cours", { serie: 30 }],
  ["générique (dernier recours)", { serie: 0, exp: 10 }],
] as [string, Partial<ContexteRappel>][]) {
  const r = rappelPour({ ...base(), ...patch });
  verdict("jour vide · " + nom + " → silence", r === null, nomDu(r));
  // Le même modèle doit rester joignable dès qu'une séance est datée :
  // le correctif ne doit pas avoir tué la variété des rappels.
  const avecSeance = rappelPour({ ...base(), ...patch, seancePrevue: "Push" });
  verdict("séance datée · " + nom + " → rappel possible", avecSeance !== null, nomDu(avecSeance));
}

/* ── Ce que le garde-fou ne doit PAS avoir cassé ─────────────────────── */

{
  // Le rappel NUTRITION n'est pas un rappel d'entraînement : il ne part
  // qu'à quelqu'un qui vient de s'entraîner, donc il ne reproche rien.
  const r = rappelPour({ ...base(), seanceFaite: true, noteHabituellement: true, repasNotes: false });
  verdict("séance faite, repas non notés → le rappel nutrition part", r?.cle === "repas", nomDu(r));
}

{
  // Les deux paliers d'absence passent AVANT tout le reste : leur message
  // ne parle pas de la séance du jour, un planning vide n'a pas à les taire.
  const endormi = rappelPour({ ...base(), palier: "endormi", joursDepuisVenue: 40 });
  verdict("endormi, jour vide → la veilleuse part quand même", endormi?.cle === "veilleuse", nomDu(endormi));

  const decroche = rappelPour({ ...base(), palier: "decrochage", joursDepuisVenue: 6 });
  verdict("décrochage, jour vide → la reprise part quand même", decroche?.cle === "reprise", nomDu(decroche));
}

{
  // La cadence reste la première barrière, avant toute question de planning.
  const r = rappelPour({
    ...base(),
    palier: "installation",
    seancePrevue: "Push",
    envois: [{ jour: "2026-09-04", cle: "planning", variante: 0 }],
  });
  verdict("cadence dépassée → silence même avec une séance datée", r === null, nomDu(r));
}

console.log("\n" + (echecs === 0 ? "Tout passe." : echecs + " échec(s)."));
process.exit(echecs === 0 ? 0 : 1);
