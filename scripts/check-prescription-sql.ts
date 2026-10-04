/* ════════════════════════════════════════════════════════════════════
   R2 · LA MIGRATION JOUÉE POUR DE VRAI, HORS LIGNE

   Une base PostgreSQL en mémoire (PGlite), le schéma minimal dont R2
   dépend (recopié des migrations V4, V6, R1 et R6), puis la migration R2
   elle-même, deux fois (elle doit être rejouable). On exerce ensuite ses
   fonctions et ses contraintes, et on compare la projection SQL à la
   projection TypeScript sur TOUTES les compositions possibles.

   Ce banc ne remplace pas l'essai sur la vraie base (droits Supabase,
   déclencheur de rang réel) : il empêche de casser ce qu'il exerce.
   ════════════════════════════════════════════════════════════════════ */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import {
  BANQUE, composerEtape, projeterPrescription, type Lieu, type Orientation,
} from "@/lib/banqueEtapes";
import { lignesDuJournal, type MarquesSeance } from "@/lib/journalSeance";
import { remplacer } from "@/lib/remplacement";
const db = new PGlite();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const q = (s: string, p?: unknown[]) => db.query<any>(s, p);
const ex = (s: string) => db.exec(s);
let ok = 0, ko = 0;
const t = (nom: string, cond: boolean, info = "") => { if (cond) ok++; else { ko++; console.log("ÉCHEC", nom, info); } };
await ex(`
create role anon; create role authenticated;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create table public.programmes (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), statut text default 'actif');
create table public.programme_seances (id uuid primary key default gen_random_uuid(), programme_id uuid not null references public.programmes(id) on delete cascade, position int, nom text);
create table public.adaptations_entrainement (id uuid primary key default gen_random_uuid(), user_id uuid);
create table public.intentions_entrainement (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, date date, type text not null default 'Force',
  title text not null default '', difficulty text not null default 'Intermédiaire', location text,
  exercise_list jsonb not null default '[]', session_id text, statut text not null default 'prevue',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  nature text not null default 'seance', origine text not null default 'systeme', consommee_le timestamptz,
  programme_id uuid, programme_seance_id uuid, etape_consommee_id uuid, adaptation_id uuid, lancement_id uuid, rang int,
  constraint intentions_consommee_check check ((statut = 'prevue') = (consommee_le is null)),
  constraint uniq_intention_lancement unique (user_id, lancement_id));
create unique index uniq_occurrence on public.intentions_entrainement (programme_id, rang) where rang is not null;
create table public.workout_sessions (id uuid primary key default gen_random_uuid(), user_id uuid, title text, category text,
  duration_minutes int, calories_burned int, elapsed_seconds int, exercises jsonb, started_at timestamptz, termine_le timestamptz,
  lancement_id uuid, journal_version smallint);
create unique index uniq_workout_lancement on public.workout_sessions (user_id, lancement_id) where lancement_id is not null;
`);
const r1 = readFileSync(new URL("../supabase/migrations/20261003_r1_journal_series.sql", import.meta.url), "utf8");
await ex(r1.slice(r1.indexOf("create table if not exists public.series_realisees"), r1.indexOf("create index if not exists idx_series_historique")));
const mig = readFileSync(new URL("../supabase/migrations/20261005_r2_prescription.sql", import.meta.url), "utf8");
await ex(mig);
await ex(mig); // rejouable
t("migration rejouable", true);

const U="11111111-1111-1111-1111-111111111111", V="22222222-2222-2222-2222-222222222222";
await ex(`insert into auth.users values ('${U}'),('${V}')`);
const prog = (await q(`insert into programmes(user_id) values ($1) returning id`,[U])).rows[0].id;
const etape = (await q(`insert into programme_seances(programme_id, position, nom) values ($1,1,'Push') returning id`,[prog])).rows[0].id;
const setUid = (u: string) => ex(`select set_config('test.uid','${u}',false)`);
const lignes = composerEtape("Push", { lieu: "halteres", orientation: "masse", niveau: null, version: 1 });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = async (f: string, p: unknown): Promise<any> => (await q(`select public.${f}($1::jsonb) as r`, [JSON.stringify(p)])).rows[0].r;
const err = async (f: string, p: unknown): Promise<string> => { try { await rpc(f, p); return ""; } catch (e) { return (e as Error).message; } };

await setUid(U);
// modèle
const m1 = await rpc("ecrire_modele", { programme_seance_id: etape, lieu: "halteres", orientation: "masse", niveau: null, version: 1, lignes });
t("modèle créé", m1.cree === true);
const m2 = await rpc("ecrire_modele", { programme_seance_id: etape, lieu: "halteres", orientation: "force", niveau: null, version: 1, lignes: lignes.slice(0,1) });
t("modèle existant rendu tel quel, jamais recomposé", m2.cree === false && m2.id === m1.id);
t("ses lignes n'ont pas bougé", (await q(`select count(*)::int n from etape_exercices where modele_id=$1`,[m1.id])).rows[0].n === lignes.length);
await setUid(V);
t("modèle d'une étape d'autrui refusé", /etape_inconnue/.test(await err("ecrire_modele", { programme_seance_id: etape, lieu: "poids", orientation: "masse", version: 1, lignes })));
await setUid(U);

const intention = (o: Record<string, unknown> = {}) => ({ programme_id: prog, etape_consommee_id: etape, programme_seance_id: etape, rang: 4, statut: "prevue",
  date: "2026-10-08", type: "Force", title: "Push", difficulty: "Intermédiaire", location: "halteres", origine: "utilisateur",
  adaptation_id: null, consommee_le: null, lancement_id: null, ...o });
// datation
const d1 = await rpc("ecrire_occurrence", { intention: intention(), modele_id: m1.id, lignes });
t("occurrence datée écrite", d1.resultat === "ok");
const nl = (await q(`select count(*)::int n from occurrence_exercices where intention_id=$1`,[d1.id])).rows[0].n;
t("avec ses lignes", nl === lignes.length);
const row = (await q(`select exercise_list from intentions_entrainement where id=$1`,[d1.id])).rows[0];
t("exercise_list = projection", Array.isArray(row.exercise_list) && row.exercise_list.length === lignes.length && row.exercise_list[0].prescription.cle === lignes[0].exercice_cle);
const d2 = await rpc("ecrire_occurrence", { intention: intention({ date: "2026-10-09" }), modele_id: m1.id, lignes: lignes.slice(0,2) });
t("rejouer la préparation rend la même, sans recalculer", d2.resultat === "deja" && d2.id === d1.id
  && (await q(`select count(*)::int n from occurrence_exercices where intention_id=$1`,[d1.id])).rows[0].n === lignes.length);
// déplacement : même liste → lignes gardées
await q(`update intentions_entrainement set date='2026-10-10', exercise_list=exercise_list where id=$1`,[d1.id]);
t("déplacer garde la prescription", (await q(`select count(*)::int n from occurrence_exercices where intention_id=$1`,[d1.id])).rows[0].n === lignes.length);
// liste relue en JS puis réécrite
const relue = (await q(`select exercise_list from intentions_entrainement where id=$1`,[d1.id])).rows[0].exercise_list;
await q(`update intentions_entrainement set exercise_list=$2::jsonb where id=$1`,[d1.id, JSON.stringify(relue)]);
t("réécrire la liste relue garde la prescription", (await q(`select count(*)::int n from occurrence_exercices where intention_id=$1`,[d1.id])).rows[0].n === lignes.length);
// marquer faite garde
// substitution : provenance tombe → prescription part
const d3 = await rpc("ecrire_occurrence", { intention: intention({ rang: 7 }), modele_id: null, lignes });
await q(`update intentions_entrainement set programme_seance_id=null, exercise_list='[]' where id=$1`,[d3.id]);
t("substitution : la prescription part", (await q(`select count(*)::int n from occurrence_exercices where intention_id=$1`,[d3.id])).rows[0].n === 0);
// fermeture étape libre
const f1 = await rpc("ecrire_occurrence", { intention: intention({ rang: 10, statut: "faite", consommee_le: "2026-10-05T10:00:00Z", lancement_id: "33333333-3333-3333-3333-333333333333" }), modele_id: m1.id, lignes });
t("fermeture avec prescription", f1.resultat === "ok");
const f2 = await rpc("ecrire_occurrence", { intention: intention({ rang: 10, statut: "faite", consommee_le: "2026-10-05T10:00:00Z", lancement_id: "33333333-3333-3333-3333-333333333333" }), modele_id: m1.id, lignes });
t("fermeture rejouée = doublon de lancement", f2.resultat === "doublon" && f2.contrainte === "uniq_intention_lancement", JSON.stringify(f2));
const f3 = await rpc("ecrire_occurrence", { intention: intention({ rang: 10, statut: "faite", consommee_le: "2026-10-05T11:00:00Z", lancement_id: "44444444-4444-4444-4444-444444444444" }), modele_id: m1.id, lignes: lignes.slice(0,2) });
t("second lancement du même rang = doublon d'occurrence", f3.resultat === "doublon" && f3.contrainte === "uniq_occurrence", JSON.stringify(f3));
t("la prescription de la première fermeture reste", (await q(`select count(*)::int n from occurrence_exercices where intention_id=$1`,[f1.id])).rows[0].n === lignes.length);
t("aucune ligne orpheline du second", (await q(`select count(*)::int n from occurrence_exercices`)).rows[0].n === lignes.length*2);
// refus
t("faite sans consommee_le refusée", /consommee_check/.test(await err("ecrire_occurrence", { intention: intention({ rang: 12, statut: "faite" }), lignes })));
t("provenance différente refusée", /provenance_differente/.test(await err("ecrire_occurrence", { intention: intention({ rang: 13, programme_seance_id: null }), lignes })));
t("sans lignes refusée", /lignes_invalides/.test(await err("ecrire_occurrence", { intention: intention({ rang: 14 }), lignes: [] })));
const bad = lignes.map((l, i) => i===0 ? { ...l, reps_min: 12, reps_max: 6 } : l);
t("fourchette incohérente refusée", !!(await err("ecrire_occurrence", { intention: intention({ rang: 15 }), lignes: bad })));
t("refus = rien écrit (intention annulée avec)", (await q(`select count(*)::int n from intentions_entrainement where rang=15`)).rows[0].n === 0);
const zero = lignes.map((l, i) => i===0 ? { ...l, mesure: "reps", duree_s: 30 } : l);
t("reps et durée à la fois refusée", !!(await err("ecrire_occurrence", { intention: intention({ rang: 16 }), lignes: zero })));
/* Tour 22 · une prescription INCOMPLÈTE est refusée : une comparaison avec
   NULL rendait NULL, et le CHECK passait. Chaque refus ne laisse rien. */
const iReps = lignes.findIndex((l) => l.mesure === "reps");
const sansReps = (champs: string[]) => lignes.map((l, i) => i === iReps ? { ...l, ...Object.fromEntries(champs.map((c) => [c, null])) } : l);
let rangInc = 30;
for (const champs of [["reps_min", "reps_max", "reps_cible"], ["reps_min"], ["reps_max"], ["reps_cible"]]) {
  const r = rangInc++;
  const e = await err("ecrire_occurrence", { intention: intention({ rang: r }), modele_id: null, lignes: sansReps(champs) });
  t(`occurrence · reps sans ${champs.join("/")} refusée`, !!e, e || "acceptée");
  t(`occurrence · refus ${champs.join("/")} = aucune intention`, (await q(`select count(*)::int n from intentions_entrainement where rang=$1`,[r])).rows[0].n === 0);
}
const dureeNulle = lignes.map((l, i) => i === iReps ? { ...l, mesure: "duree", duree_s: null, reps_min: null, reps_max: null, reps_cible: null } : l);
const dureeZero = lignes.map((l, i) => i === iReps ? { ...l, mesure: "duree", duree_s: 0, reps_min: null, reps_max: null, reps_cible: null } : l);
for (const [nom, ls] of [["durée nulle", dureeNulle], ["durée à zéro", dureeZero]] as const) {
  const r = rangInc++;
  const e = await err("ecrire_occurrence", { intention: intention({ rang: r }), modele_id: null, lignes: ls });
  t(`occurrence · ${nom} refusée`, !!e && (await q(`select count(*)::int n from intentions_entrainement where rang=$1`,[r])).rows[0].n === 0, e || "acceptée");
}
const nbModeles = async () => (await q(`select count(*)::int n from etape_modeles`)).rows[0].n;
const nbLignesModeles = async () => (await q(`select count(*)::int n from etape_exercices`)).rows[0].n;
const avantM = [await nbModeles(), await nbLignesModeles()];
for (const [nom, ls] of [["reps sans valeurs", sansReps(["reps_min", "reps_max", "reps_cible"])], ["durée nulle", dureeNulle]] as const) {
  const e = await err("ecrire_modele", { programme_seance_id: etape, lieu: "poids", orientation: "masse", niveau: null, version: 1, lignes: ls });
  t(`modèle · ${nom} refusé`, !!e, e || "accepté");
}
t("modèle refusé = aucun modèle ni ligne partiels", (await nbModeles()) === avantM[0] && (await nbLignesModeles()) === avantM[1],
  `${await nbModeles()} modèles, ${await nbLignesModeles()} lignes`);
await setUid(V);
t("programme d'autrui refusé", /programme_inconnu/.test(await err("ecrire_occurrence", { intention: intention({ rang: 17 }), lignes })));
await setUid("");
t("non connecté refusé", /non_connecte/.test(await err("ecrire_occurrence", { intention: intention({ rang: 18 }), lignes })));
await setUid(U);
// charge jamais zéro
t("charge cible zéro refusée", !!(await q(`update occurrence_exercices set charge_cible=0, charge_origine='historique' where intention_id=$1`,[d1.id]).then(() => null).catch((e: Error) => e.message)));
t("charge sans origine refusée", !!(await q(`update occurrence_exercices set charge_cible=40 where intention_id=$1`,[d1.id]).then(() => null).catch((e: Error) => e.message)));
// journal
const j = await rpc("enregistrer_seance", { lancement_id: "55555555-5555-5555-5555-555555555555", proprietaire: U, titre: "Push", duree_s: 600,
  series: [{ emplacement: 0, exercice_cle: lignes[0].exercice_cle, exercice_nom: "x", serie: 1, statut: "terminee", mesure: "reps", reps_prescrites: 9, validation: "bouton",
    statut_prescrit: "repere", fonction_prescrite: "poussee_horizontale", reps_min_prescrites: 6, reps_max_prescrites: 12 }] });
const s = (await q(`select statut_prescrit, reps_min_prescrites, reps_max_prescrites from series_realisees where workout_session_id=$1`,[j.id])).rows[0];
t("le journal garde sa copie de la prescription", s && s.statut_prescrit === "repere" && s.reps_min_prescrites === 6 && s.reps_max_prescrites === 12);
const j2 = await rpc("enregistrer_seance", { lancement_id: "66666666-6666-6666-6666-666666666666", proprietaire: U, titre: "Vieux", duree_s: 600,
  series: [{ emplacement: 0, exercice_cle: null, exercice_nom: "x", serie: 1, statut: "passee", mesure: "reps", reps_prescrites: 10 }] });
t("un journal d'avant R2 s'écrit encore", !!j2.id);
// suppression de l'intention emporte ses lignes
await q(`delete from intentions_entrainement where id=$1`,[d1.id]);
t("supprimer l'intention emporte sa prescription", (await q(`select count(*)::int n from occurrence_exercices where intention_id=$1`,[d1.id])).rows[0].n === 0);

/* Le remplissage des programmes existants : rejouable, ne complète que les
   modèles absents, ne touche à aucune intention. */
await ex(`create table public.contexte_entrainement (user_id uuid primary key, lieu text, materiel text);
create table public.profiles (id uuid primary key, onboarding_goals text[], onboarding_level text);`);
const W = "77777777-7777-7777-7777-777777777777";
await ex(`insert into auth.users values ('${W}')`);
await ex(`insert into public.contexte_entrainement values ('${U}','maison','halteres'), ('${W}','salle',null)`);
await ex(`insert into public.profiles values ('${U}','{masse}','intermediaire'), ('${W}','{prise_de_masse,force}','debutant')`);
const progW = (await q(`insert into programmes(user_id) values ($1) returning id`, [W])).rows[0].id;
const etW = (await q(`insert into programme_seances(programme_id, position, nom) values ($1,1,'Pull'),($1,2,'Nom inconnu') returning id, nom`, [progW])).rows;
const archive = (await q(`insert into programmes(user_id, statut) values ($1,'archive') returning id`, [W])).rows[0].id;
await q(`insert into programme_seances(programme_id, position, nom) values ($1,1,'Push')`, [archive]);
const avantI = (await q(`select md5(string_agg(t::text, '|' order by id)) h from intentions_entrainement t`)).rows[0].h;
const rempl = readFileSync(new URL("../supabase/migrations/20261005_r2_modeles_existants.sql", import.meta.url), "utf8");
await ex(rempl);
const n1 = (await q(`select count(*)::int n from etape_modeles`)).rows[0].n;
await ex(rempl);
const n2 = (await q(`select count(*)::int n from etape_modeles`)).rows[0].n;
t("remplissage rejouable, sans doublon", n1 === n2 && n1 === 3, `${n1} puis ${n2} modèles`);
t("le modèle déjà écrit (orientation masse) n'est pas recomposé",
  (await q(`select count(*)::int n from etape_exercices where modele_id=$1`, [m1.id])).rows[0].n === lignes.length);
t("un programme archivé ne reçoit rien",
  (await q(`select count(*)::int n from etape_modeles m join programme_seances ps on ps.id=m.programme_seance_id where ps.programme_id=$1`, [archive])).rows[0].n === 0);
const pull = etW.find((e: { nom: string }) => e.nom === "Pull").id;
const lusW = (await q(`select e.* from etape_exercices e join etape_modeles m on m.id=e.modele_id where m.programme_seance_id=$1 order by emplacement`, [pull])).rows;
const attendu = composerEtape("Pull", { lieu: "salle", orientation: "force", niveau: "debutant", version: 1 });
t("le remplissage écrit exactement la composition TypeScript (salle, force d'abord)",
  lusW.length === attendu.length && lusW.every((r: Record<string, unknown>, i: number) => r.exercice_cle === attendu[i].exercice_cle
    && r.reps_min === attendu[i].reps_min && r.series === attendu[i].series && r.statut === attendu[i].statut));
const inconnu = etW.find((e: { nom: string }) => e.nom === "Nom inconnu").id;
t("une étape au nom inconnu reçoit le repli Full Body, comme le code",
  (await q(`select e.exercice_cle from etape_exercices e join etape_modeles m on m.id=e.modele_id where m.programme_seance_id=$1 order by emplacement limit 1`, [inconnu])).rows[0]?.exercice_cle
    === composerEtape("Full Body", { lieu: "salle", orientation: "force", niveau: null, version: 1 })[0].exercice_cle);
t("aucune intention touchée", (await q(`select md5(string_agg(t::text, '|' order by id)) h from intentions_entrainement t`)).rows[0].h === avantI);

/* La projection SQL ≡ la projection TypeScript, sur toutes les compositions. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const norm = (x: unknown) => JSON.stringify(x, (_k, v: any) => v && typeof v === "object" && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map((c) => [c, v[c]])) : v);
let cas = 0, diff = 0;
for (const lieu of Object.keys(BANQUE) as Lieu[]) for (const nom of Object.keys(BANQUE[lieu])) for (const o of ["force", "masse", "general"] as Orientation[]) {
  const l = composerEtape(nom, { lieu, orientation: o, niveau: null, version: 1 });
  const sql = (await q("select public.projeter_prescription($1::jsonb) r", [JSON.stringify(l)])).rows[0].r;
  cas++;
  if (norm(sql) !== norm(JSON.parse(JSON.stringify(projeterPrescription(l))))) diff++;
}
t(`projection SQL ≡ TypeScript (${cas} compositions)`, diff === 0, `${diff} différence(s)`);

/* ── R3 · le journal écrit la charge et l'exercice réellement fait ──
   La migration est jouée deux fois, puis on écrit un journal construit par
   le VRAI `lignesDuJournal` : A en série 1, B en série 2, C en série 3. */
const mig3 = readFileSync(new URL("../supabase/migrations/20261006_r3_charges.sql", import.meta.url), "utf8");
await ex(mig3);
await ex(mig3);
t("R3 · migration rejouable", true);
await setUid(U);
{
  const exs = projeterPrescription(composerEtape("Push", { lieu: "halteres", orientation: "masse", niveau: null, version: 1 }));
  const A = exs[0];
  const B = { cle: "pompes", nom: "Pompes", chargeType: "poids_du_corps" as const };
  const C = { cle: "developpeinclinehalteres", nom: "Développé incliné haltères", chargeType: "par_haltere" as const };
  let r = remplacer(A, 0, {}, B);
  r = remplacer(A, 0, r, C);
  const marques: MarquesSeance = { 0: {
    0: { statut: "terminee", validation: "bouton", dureeS: null, reps: 10, charge: 16, exercice: { cle: A.prescription!.cle, nom: A.name, chargeType: A.prescription!.charge_type } },
    1: { statut: "terminee", validation: "bouton", dureeS: null, reps: 12, charge: null, exercice: B },
  } };
  const series = lignesDuJournal([{ ...A, sets: 4 }], marques, r);
  const jr = await rpc("enregistrer_seance", { lancement_id: "88888888-8888-8888-8888-888888888888", proprietaire: U, titre: "Push", duree_s: 900, series });
  const lu = (await q(`select serie, exercice_cle, exercice_prevu_cle, reps_declarees, charge, charge_unite, charge_type, statut
    from series_realisees where workout_session_id=$1 order by serie`, [jr.id])).rows;
  t("R3 · une ligne par série prévue", lu.length === 4);
  t("R3 · série 1 : A, 10 × 16 kg par haltère, sans exercice prévu différent",
    lu[0].exercice_cle === A.prescription!.cle && lu[0].reps_declarees === 10 && Number(lu[0].charge) === 16
      && lu[0].charge_unite === "kg" && lu[0].charge_type === "par_haltere" && lu[0].exercice_prevu_cle === null, JSON.stringify(lu[0]));
  t("R3 · série 2 : B gardée malgré le remplacement suivant, sans kilos, A comme prévu",
    lu[1].exercice_cle === "pompes" && lu[1].reps_declarees === 12 && lu[1].charge === null && lu[1].charge_unite === null
      && lu[1].charge_type === "poids_du_corps" && lu[1].exercice_prevu_cle === A.prescription!.cle, JSON.stringify(lu[1]));
  t("R3 · séries restantes : C, non atteintes, rien de déclaré",
    lu[2].exercice_cle === C.cle && lu[2].statut === "non_atteinte" && lu[2].reps_declarees === null && lu[2].charge === null
      && lu[2].exercice_prevu_cle === A.prescription!.cle, JSON.stringify(lu[2]));
  const rejeu = await rpc("enregistrer_seance", { lancement_id: "88888888-8888-8888-8888-888888888888", proprietaire: U, titre: "Push", duree_s: 900, series });
  t("R3 · rejeu : même séance, aucune ligne de plus", rejeu.deja === true && rejeu.id === jr.id
    && (await q(`select count(*)::int n from series_realisees where workout_session_id=$1`, [jr.id])).rows[0].n === 4);
  /* Revenir à A efface le remplacement : les séries restantes refont A,
     sans « exercice prévu » différent et sans charge reprise. */
  const retour = remplacer(A, 0, r, { cle: A.prescription!.cle, nom: A.name, chargeType: A.prescription!.charge_type });
  const lr = lignesDuJournal([{ ...A, sets: 4 }], marques, retour);
  t("R3 · retour à A : séries restantes sur A, rien de transféré",
    lr[2].exercice_cle === A.prescription!.cle && lr[2].exercice_prevu_cle === null && lr[2].charge === null
      && lr[1].exercice_cle === "pompes");
  t("R3 · le propriétaire est toujours vérifié", /proprietaire_different/.test(await err("enregistrer_seance",
    { lancement_id: "99999999-9999-9999-9999-999999999999", proprietaire: V, duree_s: 60, series })));
  const z = await rpc("enregistrer_seance", { lancement_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", proprietaire: U, duree_s: 60,
    series: [{ ...series[0], charge: 0 }] });
  t("R3 · une charge à zéro s'écrit inconnue, jamais zéro",
    (await q(`select charge, charge_unite from series_realisees where workout_session_id=$1`, [z.id])).rows[0].charge === null);
  const vieux = await rpc("enregistrer_seance", { lancement_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", proprietaire: U, duree_s: 60,
    series: [{ emplacement: 0, exercice_cle: null, exercice_nom: "x", serie: 1, statut: "terminee", mesure: "reps", reps_prescrites: 10, validation: "bouton" }] });
  t("R3 · un journal d'avant R3 s'écrit encore, charge nulle",
    (await q(`select charge, charge_type, exercice_prevu_cle from series_realisees where workout_session_id=$1`, [vieux.id])).rows
      .every((x: Record<string, unknown>) => x.charge === null && x.charge_type === null && x.exercice_prevu_cle === null));
}

console.log(`${ok} OK, ${ko} échec(s)`);
process.exit(ko === 0 ? 0 : 1);
