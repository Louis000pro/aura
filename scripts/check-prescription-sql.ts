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
import { appliquerCibles, type CibleOuverte } from "@/lib/progression";
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

/* La projection SQL ≡ la projection TypeScript, sur toutes les compositions.
   ⚠️ Ici c'est la version R2 de la fonction : l'emplacement dans la
   prescription n'arrive qu'avec la revue finale, comparée plus bas. */
const sansEmplacement = <T extends { prescription?: object }>(l: T[]) =>
  l.map((e) => ({ ...e, prescription: Object.fromEntries(Object.entries(e.prescription ?? {}).filter(([k]) => k !== "emplacement")) }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const norm = (x: unknown) => JSON.stringify(x, (_k, v: any) => v && typeof v === "object" && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map((c) => [c, v[c]])) : v);
let cas = 0, diff = 0;
for (const lieu of Object.keys(BANQUE) as Lieu[]) for (const nom of Object.keys(BANQUE[lieu])) for (const o of ["force", "masse", "general"] as Orientation[]) {
  const l = composerEtape(nom, { lieu, orientation: o, niveau: null, version: 1 });
  const sql = (await q("select public.projeter_prescription($1::jsonb) r", [JSON.stringify(l)])).rows[0].r;
  cas++;
  if (norm(sql) !== norm(JSON.parse(JSON.stringify(sansEmplacement(projeterPrescription(l)))))) diff++;
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

/* ── R4 · la marge, la cible acceptée, le cran ──
   Les six cas verrouillés du tour 29 de Codex, joués sur la vraie
   migration, plus l'équivalence de la copie TypeScript et SQL. */
/* R4 dépend des deux règles R6 (`ordinal_etape`, `rang_base`) pour
   trouver l'occurrence visée : elles sont recopiées de leur migration. */
const r6 = readFileSync(new URL("../supabase/migrations/20261004_r6_occurrences.sql", import.meta.url), "utf8");
await ex(`alter table public.programmes add column if not exists rang_depart int, add column if not exists position_initiale int;`);
await ex(r6.slice(r6.indexOf("create or replace function public.ordinal_etape"), r6.indexOf("/* ─────────────── 3. Le déclencheur")));
const mig4 = readFileSync(new URL("../supabase/migrations/20261007_r4_progression.sql", import.meta.url), "utf8");
await ex(mig4);
await ex(mig4);
t("R4 · migration rejouable", true);
await setUid(U);
{
  const P4 = (await q(`insert into programmes(user_id) values ($1) returning id`, [U])).rows[0].id;
  const E4 = (await q(`insert into programme_seances(programme_id, position, nom) values ($1,1,'Push') returning id`, [P4])).rows[0].id;
  await q(`insert into programme_seances(programme_id, position, nom) values ($1,2,'Pull')`, [P4]); // cycle de 2
  const L4 = composerEtape("Push", { lieu: "halteres", orientation: "masse", niveau: null, version: 1 });
  const ir = L4.findIndex((l) => l.statut === "repere" && l.mesure === "reps" && (l.charge_type === "par_haltere" || l.charge_type === "totale"));
  const ic = L4.findIndex((l) => l.statut === "complementaire" && l.mesure === "reps");
  const rep = L4[ir];
  const intention4 = (o: Record<string, unknown> = {}) => ({ programme_id: P4, etape_consommee_id: E4, programme_seance_id: E4, rang: 1, statut: "prevue",
    date: "2026-10-08", type: "Force", title: "Push", difficulty: "Intermédiaire", location: "halteres", origine: "utilisateur",
    adaptation_id: null, consommee_le: null, lancement_id: null, ...o });
  const LA = "a1a1a1a1-0000-0000-0000-000000000001";
  // la séance source : rang 1 fermée en étape libre, puis son journal avec la marge
  const src = await rpc("ecrire_occurrence", { intention: intention4({ statut: "faite", consommee_le: "2026-10-05T10:00:00Z", lancement_id: LA }), modele_id: null, lignes: L4 });
  t("R4 · source fermée", src.resultat === "ok", JSON.stringify(src));
  const exs4 = projeterPrescription(L4);
  const marques4: MarquesSeance = { [ir]: Object.fromEntries(Array.from({ length: rep.series }, (_, k) => [k, {
    statut: "terminee", validation: "bouton", dureeS: null, reps: rep.reps_max, charge: 16,
    exercice: { cle: rep.exercice_cle, nom: rep.exercice_nom, chargeType: rep.charge_type },
    ...(k === rep.series - 1 ? { marge: "1_2" } : {}),
  }])) } as MarquesSeance;
  marques4[ic] = { 0: { statut: "terminee", validation: "bouton", dureeS: null, reps: 10, charge: null, marge: "3_plus" } } as MarquesSeance[number];
  const series4 = lignesDuJournal(exs4, marques4);
  const jA = await rpc("enregistrer_seance", { lancement_id: LA, proprietaire: U, titre: "Push", duree_s: 900, series: series4 });
  const marges = (await q(`select emplacement, serie, marge from series_realisees where workout_session_id=$1 and marge is not null`, [jA.id])).rows;
  t("R4 · la marge s'écrit sur la dernière série du repère, et nulle part ailleurs",
    marges.length === 1 && marges[0].emplacement === ir && marges[0].serie === rep.series && marges[0].marge === "1_2", JSON.stringify(marges));

  // corriger la marge
  t("R4 · corriger la marge d'un repère", (await q(`select public.corriger_marge($1,$2,'3_plus') r`, [LA, ir])).rows[0].r.resultat === "ok"
    && (await q(`select marge from series_realisees where workout_session_id=$1 and emplacement=$2 and serie=$3`, [jA.id, ir, rep.series])).rows[0].marge === "3_plus");
  t("R4 · corriger la marge d'un complémentaire est refusé", (await q(`select public.corriger_marge($1,$2,'1_2') r`, [LA, ic])).rows[0].r.resultat === "pas_un_repere");
  t("R4 · une marge hors vocabulaire est refusée", /marge_invalide/.test(await q(`select public.corriger_marge($1,$2,'beaucoup') r`, [LA, ir]).then(() => "").catch((e: Error) => e.message)));
  await setUid(V);
  t("R4 · la marge d'autrui est introuvable", (await q(`select public.corriger_marge($1,$2,'aucune') r`, [LA, ir])).rows[0].r.resultat === "introuvable");
  t("R4 · accepter depuis la séance d'autrui : introuvable", (await rpc("accepter_cible", { lancement_id: LA, emplacement: ir, charge: 18, reps_cible: rep.reps_min })).resultat === "seance_introuvable");
  await setUid(U);

  // accepter
  t("R4 · répétitions hors fourchette refusées", /reps_invalides/.test(await err("accepter_cible", { lancement_id: LA, emplacement: ir, charge: 18, reps_cible: 99 })));
  t("R4 · une charge à zéro est refusée", /charge_invalide/.test(await err("accepter_cible", { lancement_id: LA, emplacement: ir, charge: 0, reps_cible: rep.reps_min })));
  t("R4 · un complémentaire ne reçoit pas de cible", (await rpc("accepter_cible", { lancement_id: LA, emplacement: ic, charge: null, reps_cible: L4[ic].reps_min })).resultat === "pas_un_repere");
  const acc = await rpc("accepter_cible", { lancement_id: LA, emplacement: ir, charge: 18, reps_cible: rep.reps_min, cran: 2 });
  const cible = (await q(`select * from cibles_acceptees where id=$1`, [acc.cible_id])).rows[0];
  t("R4 · accepter écrit une version ouverte, qui vise l'occurrence suivante de l'étape (R6)",
    acc.resultat === "ok" && cible && Number(cible.charge) === 18 && cible.reps_cible === rep.reps_min && cible.rang_source === 1
      && cible.rang_vise === 3 && acc.rang_vise === 3 && cible.consommee_le === null && cible.exercice_cle === rep.exercice_cle, JSON.stringify(acc));
  t("R4 · le cran confirmé est retenu pour l'exercice", Number((await q(`select cran from crans_exercice where user_id=$1 and exercice_cle=$2`, [U, rep.exercice_cle])).rows[0]?.cran) === 2);
  t("R4 · tour 30 · une version ne se modifie jamais", /cible_immuable/.test(await q(`update cibles_acceptees set charge = 30 where id=$1`, [cible.id]).then(() => "").catch((e: Error) => e.message)));

  // l'équivalence de la copie
  const ouverte = async (id: string): Promise<CibleOuverte> => {
    const c = (await q(`select * from cibles_acceptees where id=$1`, [id])).rows[0];
    return { id: c.id, exercice_cle: c.exercice_cle, charge_type: c.charge_type, charge: c.charge === null ? null : Number(c.charge),
      reps_cible: c.reps_cible, reps_min: c.reps_min, reps_max: c.reps_max, rang_vise: c.rang_vise };
  };
  const o1 = await ouverte(cible.id);
  const tsLignes = appliquerCibles(L4, [o1], 3);
  const sqlCopie = async (lignesJ: unknown, rang: number, statut = "prevue") =>
    (await q(`select public.lignes_avec_cibles($1::jsonb,$2,$3,$4,$5,$6) r`, [JSON.stringify(lignesJ), U, P4, E4, rang, statut])).rows[0].r;
  const sqlLignes = await sqlCopie(tsLignes, 3);
  const pTs = JSON.stringify(sansEmplacement(projeterPrescription(tsLignes)));
  const pSql = JSON.stringify((await q(`select public.projeter_prescription($1::jsonb) r`, [JSON.stringify(sqlLignes)])).rows[0].r);
  const canon = (v: unknown): unknown => Array.isArray(v) ? v.map(canon)
    : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([x], [y]) => x.localeCompare(y)).map(([k, w]) => [k, canon(w)])) : v;
  const norm = (x: string) => JSON.stringify(canon(JSON.parse(x)));
  t("R4 · la copie TypeScript et la copie SQL donnent la même projection", norm(pTs) === norm(pSql), `${pTs.slice(0, 200)} ≠ ${pSql.slice(0, 200)}`);
  t("R4 · sans cible, la projection est celle d'avant R4",
    !JSON.stringify(projeterPrescription(L4)).includes("cible_id") && !JSON.stringify((await q(`select public.projeter_prescription($1::jsonb) r`, [JSON.stringify(L4)])).rows[0].r).includes("cible_id"));
  t("R4 · une occurrence plus proche que celle visée ne reçoit rien", appliquerCibles(L4, [o1], 2)[ir].cible_id === undefined
    && (await sqlCopie(tsLignes, 2))[ir].cible_id === undefined);
  t("R4 · tour 30 · une occurrence PLUS LOIN que celle visée ne reçoit rien non plus", appliquerCibles(L4, [o1], 5)[ir].cible_id === undefined
    && (await sqlCopie(tsLignes, 5))[ir].cible_id === undefined);

  // cas 1 · abandon : rien n'est écrit, la cible reste ouverte
  t("R4 · cas 1 · un lancement abandonné ne consomme rien", (await q(`select consommee_le from cibles_acceptees where id=$1`, [cible.id])).rows[0].consommee_le === null);

  // dater rang 3 en nommant la cible : copie, pas consommation
  const d3 = await rpc("ecrire_occurrence", { intention: intention4({ rang: 3 }), modele_id: null, lignes: tsLignes });
  const l3 = (await q(`select reps_cible, charge_cible, charge_origine, cible_id from occurrence_exercices where intention_id=$1 and emplacement=$2`, [d3.id, ir])).rows[0];
  t("R4 · dater recopie la cible nommée", Number(l3.charge_cible) === 18 && l3.charge_origine === "acceptee" && l3.cible_id === cible.id && l3.reps_cible === rep.reps_min, JSON.stringify(l3));
  t("R4 · la liste préparée porte la charge cible", (await q(`select exercise_list from intentions_entrainement where id=$1`, [d3.id])).rows[0].exercise_list[ir].prescription.charge_cible === 18);
  t("R4 · préparer ne consomme pas", (await q(`select consommee_le from cibles_acceptees where id=$1`, [cible.id])).rows[0].consommee_le === null);
  // tour 30 · la même cible n'est pas copiée sur une autre occurrence de l'étape
  const d5x = await rpc("ecrire_occurrence", { intention: intention4({ rang: 5 }), modele_id: null, lignes: appliquerCibles(L4, [{ ...o1, rang_vise: 5 }], 5) });
  t("R4 · tour 30 · une cible copiée au rang 3 n'est pas copiée au rang 5",
    (await q(`select count(*)::int n from occurrence_exercices where cible_id=$1`, [cible.id])).rows[0].n === 1
      && (await q(`select count(*)::int n from occurrence_exercices where intention_id=$1 and cible_id is not null`, [d5x.id])).rows[0].n === 0);
  await q(`delete from intentions_entrainement where id=$1`, [d5x.id]);
  // cas 4 · deux appareils préparent la même occurrence
  const d3b = await rpc("ecrire_occurrence", { intention: intention4({ rang: 3 }), modele_id: null, lignes: tsLignes });
  t("R4 · cas 4 · un second appareil rend la même occurrence, une seule copie", d3b.resultat === "deja" && d3b.id === d3.id
    && (await q(`select count(*)::int n from occurrence_exercices where cible_id=$1`, [cible.id])).rows[0].n === 1);
  // cas 2 · retrait puis nouvelle datation
  await q(`delete from intentions_entrainement where id=$1`, [d3.id]);
  t("R4 · cas 2 · retirer l'occurrence garde la cible ouverte", (await q(`select consommee_le from cibles_acceptees where id=$1`, [cible.id])).rows[0].consommee_le === null);
  const d3c = await rpc("ecrire_occurrence", { intention: intention4({ rang: 3, date: "2026-10-12" }), modele_id: null, lignes: tsLignes });
  t("R4 · cas 2 · la redater recopie la cible", (await q(`select cible_id from occurrence_exercices where intention_id=$1 and emplacement=$2`, [d3c.id, ir])).rows[0].cible_id === cible.id);
  // cas 5 · corriger la marge après acceptation ne touche ni la cible ni la séance préparée
  const avantCible = JSON.stringify((await q(`select charge, reps_cible, consommee_le from cibles_acceptees where id=$1`, [cible.id])).rows[0]);
  const avantPrep = JSON.stringify((await q(`select reps_cible, charge_cible from occurrence_exercices where intention_id=$1 order by emplacement`, [d3c.id])).rows);
  await q(`select public.corriger_marge($1,$2,'aucune')`, [LA, ir]);
  t("R4 · cas 5 · corriger après acceptation ne change ni la cible ni la séance préparée",
    JSON.stringify((await q(`select charge, reps_cible, consommee_le from cibles_acceptees where id=$1`, [cible.id])).rows[0]) === avantCible
      && JSON.stringify((await q(`select reps_cible, charge_cible from occurrence_exercices where intention_id=$1 order by emplacement`, [d3c.id])).rows) === avantPrep);
  // tour 30 · la marge enregistrée doit autoriser la proposition
  const nbAvant = (await q(`select count(*)::int n from cibles_acceptees`)).rows[0].n;
  const sansMarge = await rpc("accepter_cible", { lancement_id: LA, emplacement: ir, charge: 20, reps_cible: rep.reps_min, cran: 4 });
  t("R4 · tour 30 · une marge « Aucune » en base refuse l'acceptation", sansMarge.resultat === "marge_non_confirmee"
    && (await q(`select count(*)::int n from cibles_acceptees`)).rows[0].n === nbAvant, JSON.stringify(sansMarge));
  // cas 3 · occurrence déjà préparée : accepter de nouveau doit la nommer ; la marge envoyée s'écrit avec
  const refus = await rpc("accepter_cible", { lancement_id: LA, emplacement: ir, charge: 20, reps_cible: rep.reps_min, cran: 4, marge: "1_2" });
  t("R4 · cas 3 · une séance préparée n'est pas réécrite sans être nommée",
    refus.resultat === "occurrence_preparee" && refus.intention_id === d3c.id
      && (await q(`select count(*)::int n from cibles_acceptees`)).rows[0].n === nbAvant
      && Number((await q(`select cran from crans_exercice where user_id=$1 and exercice_cle=$2`, [U, rep.exercice_cle])).rows[0].cran) === 2, JSON.stringify(refus));
  t("R4 · tour 30 · la marge envoyée avec l'acceptation s'écrit dans la même transaction",
    (await q(`select marge from series_realisees where workout_session_id=$1 and emplacement=$2 and serie=$3`, [jA.id, ir, rep.series])).rows[0].marge === "1_2");
  const appli = await rpc("accepter_cible", { lancement_id: LA, emplacement: ir, charge: 20, reps_cible: rep.reps_min, cran: 4, marge: "1_2", appliquer_a: d3c.id });
  const lp = (await q(`select charge_cible, cible_id from occurrence_exercices where intention_id=$1 and emplacement=$2`, [d3c.id, ir])).rows[0];
  t("R4 · cas 3 · nommée, elle reçoit la nouvelle version, garde sa prescription et sa projection suit",
    appli.resultat === "ok" && appli.applique_a === d3c.id && Number(lp.charge_cible) === 20 && lp.cible_id === appli.cible_id
      && (await q(`select count(*)::int n from occurrence_exercices where intention_id=$1`, [d3c.id])).rows[0].n === L4.length
      && (await q(`select exercise_list from intentions_entrainement where id=$1`, [d3c.id])).rows[0].exercise_list[ir].prescription.charge_cible === 20,
    JSON.stringify([appli, lp]));
  t("R4 · tour 30 · accepter de nouveau écrit une nouvelle version et garde l'ancienne intacte",
    appli.cible_id !== cible.id && Number((await q(`select charge from cibles_acceptees where id=$1`, [cible.id])).rows[0].charge) === 18
      && (await q(`select remplacee_le from cibles_acceptees where id=$1`, [cible.id])).rows[0].remplacee_le !== null);
  t("R4 · une seule version ouverte par exercice de l'étape", (await q(`select count(*)::int n from cibles_acceptees where consommee_le is null and remplacee_le is null and programme_id=$1`, [P4])).rows[0].n === 1);
  // la faire : la cible est consommée une fois
  await q(`update intentions_entrainement set statut='faite', consommee_le=now() where id=$1`, [d3c.id]);
  const consommee = (await q(`select consommee_le from cibles_acceptees where id=$1`, [appli.cible_id])).rows[0].consommee_le;
  t("R4 · faite, l'occurrence consomme sa cible", consommee !== null);
  await q(`update intentions_entrainement set updated_at=now(), statut='faite' where id=$1`, [d3c.id]);
  t("R4 · consommée une seule fois", String((await q(`select consommee_le from cibles_acceptees where id=$1`, [appli.cible_id])).rows[0].consommee_le) === String(consommee));
  // une séance faite ne change jamais : plus de séance préparée, accepter n'en touche aucune
  const apres = await rpc("accepter_cible", { lancement_id: LA, emplacement: ir, charge: 22, reps_cible: rep.reps_min, marge: "1_2" });
  t("R4 · une séance faite n'est jamais réécrite", apres.resultat === "ok" && apres.applique_a === null
    && Number((await q(`select charge_cible from occurrence_exercices where intention_id=$1 and emplacement=$2`, [d3c.id, ir])).rows[0].charge_cible) === 20);
  t("R4 · tour 30 · la nouvelle version vise l'occurrence suivante selon R6", apres.rang_vise === 5, JSON.stringify(apres));
  // une étape libre fermée sans la suivre : pas consommée, reportée à l'occurrence suivante
  await rpc("ecrire_occurrence", { intention: intention4({ rang: 5, statut: "faite", consommee_le: "2026-10-09T10:00:00Z", lancement_id: "a1a1a1a1-0000-0000-0000-000000000005" }), modele_id: null, lignes: L4 });
  const c22 = (await q(`select * from cibles_acceptees where id=$1`, [apres.cible_id])).rows[0];
  t("R4 · une séance libre qui n'a pas suivi la cible ne la consomme pas, elle la reporte sur la suivante",
    c22.consommee_le === null && c22.rang_vise === 7, JSON.stringify(c22));
  await rpc("ecrire_occurrence", { intention: intention4({ rang: 7, statut: "faite", consommee_le: "2026-10-11T10:00:00Z", lancement_id: "a1a1a1a1-0000-0000-0000-000000000007" }), modele_id: null, lignes: appliquerCibles(L4, [await ouverte(c22.id)], 7) });
  t("R4 · une séance libre qui l'a suivie la consomme à la fermeture", (await q(`select consommee_le from cibles_acceptees where id=$1`, [c22.id])).rows[0].consommee_le !== null);

  /* ── Tour 30 · la fermeture garde la copie du lancement ── */
  const source = async (P: string, E: string, lanc: string, rang: number, quand: string, extra: Record<string, unknown> = {}) => {
    await rpc("ecrire_occurrence", { intention: { ...intention4({ statut: "faite", consommee_le: quand, lancement_id: lanc, rang }), programme_id: P, etape_consommee_id: E, programme_seance_id: E, ...extra }, modele_id: null, lignes: L4 });
    await rpc("enregistrer_seance", { lancement_id: lanc, proprietaire: U, titre: "Push", duree_s: 900, series: series4 });
  };
  const nouveauProgramme = async () => {
    const P = (await q(`insert into programmes(user_id) values ($1) returning id`, [U])).rows[0].id;
    const E = (await q(`insert into programme_seances(programme_id, position, nom) values ($1,1,'Push') returning id`, [P])).rows[0].id;
    const E2 = (await q(`insert into programme_seances(programme_id, position, nom) values ($1,2,'Pull') returning id`, [P])).rows[0].id;
    return { P, E, E2 };
  };
  const occ = (P: string, E: string, o: Record<string, unknown>) => ({ ...intention4(o), programme_id: P, etape_consommee_id: E, programme_seance_id: E });
  const ligneIr = async (intent: string) => (await q(`select charge_cible, cible_id, reps_cible from occurrence_exercices where intention_id=$1 and emplacement=$2`, [intent, ir])).rows[0];
  {
    // étape libre : copie 18 au lancement, nouvelle acceptation à 20, puis fermeture
    const { P, E } = await nouveauProgramme();
    const S = "b1b1b1b1-0000-0000-0000-000000000001";
    await source(P, E, S, 1, "2026-10-05T10:00:00Z");
    const v1 = await rpc("accepter_cible", { lancement_id: S, emplacement: ir, charge: 18, reps_cible: rep.reps_min, cran: 2 });
    const copieLancement = appliquerCibles(L4, [await ouverte(v1.cible_id)], 3);
    const v2 = await rpc("accepter_cible", { lancement_id: S, emplacement: ir, charge: 20, reps_cible: rep.reps_min, cran: 4 });
    const F = "b1b1b1b1-0000-0000-0000-000000000003";
    const fermeture = { intention: occ(P, E, { rang: 3, statut: "faite", consommee_le: "2026-10-07T10:00:00Z", lancement_id: F }), modele_id: null, lignes: copieLancement };
    const f1 = await rpc("ecrire_occurrence", fermeture);
    const lf = await ligneIr(f1.id);
    t("R4 · tour 30 · P1 · une étape libre se ferme avec la copie du lancement (18), pas la cible du moment (20)",
      f1.resultat === "ok" && Number(lf.charge_cible) === 18 && lf.cible_id === v1.cible_id, JSON.stringify([f1, lf]));
    t("R4 · tour 30 · la version suivie est consommée, la plus récente est reportée",
      (await q(`select consommee_le from cibles_acceptees where id=$1`, [v1.cible_id])).rows[0].consommee_le !== null
        && (await q(`select consommee_le, rang_vise from cibles_acceptees where id=$1`, [v2.cible_id])).rows[0].consommee_le === null
        && (await q(`select rang_vise from cibles_acceptees where id=$1`, [v2.cible_id])).rows[0].rang_vise === 5);
    const f2 = await rpc("ecrire_occurrence", fermeture);
    t("R4 · tour 30 · le rejeu de la fermeture ne change rien", f2.resultat === "doublon" && Number((await ligneIr(f1.id)).charge_cible) === 18, JSON.stringify(f2));
  }
  {
    // une copie dont la version a été consommée ailleurs reste intacte
    const { P, E } = await nouveauProgramme();
    const S = "b2b2b2b2-0000-0000-0000-000000000001";
    await source(P, E, S, 1, "2026-10-05T10:00:00Z");
    const v1 = await rpc("accepter_cible", { lancement_id: S, emplacement: ir, charge: 18, reps_cible: rep.reps_min, cran: 2 });
    const copie = appliquerCibles(L4, [await ouverte(v1.cible_id)], 3);
    await q(`update cibles_acceptees set consommee_le = now() where id=$1`, [v1.cible_id]);
    const f = await rpc("ecrire_occurrence", { intention: occ(P, E, { rang: 3, statut: "faite", consommee_le: "2026-10-07T10:00:00Z", lancement_id: "b2b2b2b2-0000-0000-0000-000000000003" }), modele_id: null, lignes: copie });
    const lf = await ligneIr(f.id);
    t("R4 · tour 30 · une consommation par un autre appareil n'efface pas la copie à la fermeture", Number(lf.charge_cible) === 18 && lf.cible_id === v1.cible_id, JSON.stringify(lf));
  }
  {
    // occurrence préparée : lancée avec 18, ajustée à 20 pendant la séance, fermée par son statut
    const { P, E } = await nouveauProgramme();
    const S = "b3b3b3b3-0000-0000-0000-000000000001";
    await source(P, E, S, 1, "2026-10-05T10:00:00Z");
    const v1 = await rpc("accepter_cible", { lancement_id: S, emplacement: ir, charge: 18, reps_cible: rep.reps_min, cran: 2 });
    const copie = appliquerCibles(L4, [await ouverte(v1.cible_id)], 3);
    const prep = await rpc("ecrire_occurrence", { intention: occ(P, E, { rang: 3 }), modele_id: null, lignes: copie });
    const LP = "b3b3b3b3-0000-0000-0000-000000000003";
    // le lancement : son journal garde la liste qu'il a suivie
    await rpc("enregistrer_seance", { lancement_id: LP, proprietaire: U, titre: "Push", duree_s: 900, exercices: projeterPrescription(copie), series: [] });
    const v2 = await rpc("accepter_cible", { lancement_id: S, emplacement: ir, charge: 20, reps_cible: rep.reps_min, cran: 4, appliquer_a: prep.id });
    t("R4 · (préparée ajustée à 20 avant la fermeture)", v2.resultat === "ok" && Number((await ligneIr(prep.id)).charge_cible) === 20, JSON.stringify(v2));
    await q(`update intentions_entrainement set statut='faite', consommee_le=now(), lancement_id=$2 where id=$1`, [prep.id, LP]);
    const lf = await ligneIr(prep.id);
    t("R4 · tour 30 · P1 · une occurrence préparée se ferme avec la copie de son lancement",
      Number(lf.charge_cible) === 18 && lf.cible_id === v1.cible_id
        && (await q(`select exercise_list from intentions_entrainement where id=$1`, [prep.id])).rows[0].exercise_list[ir].prescription.charge_cible === 18, JSON.stringify(lf));
    t("R4 · tour 30 · elle consomme la version suivie et reporte l'autre",
      (await q(`select consommee_le from cibles_acceptees where id=$1`, [v1.cible_id])).rows[0].consommee_le !== null
        && (await q(`select consommee_le, rang_vise from cibles_acceptees where id=$1`, [v2.cible_id])).rows[0].rang_vise === 5
        && (await q(`select consommee_le from cibles_acceptees where id=$1`, [v2.cible_id])).rows[0].consommee_le === null);
  }
  {
    // R6 · une fermeture tardive place la prochaine occurrence plus loin que source + cycle
    const { P, E, E2 } = await nouveauProgramme();
    await rpc("ecrire_occurrence", { intention: occ(P, E2, { rang: 2, statut: "faite", consommee_le: "2026-10-01T10:00:00Z", lancement_id: "b4b4b4b4-0000-0000-0000-000000000002" }), modele_id: null, lignes: L4 });
    await rpc("ecrire_occurrence", { intention: occ(P, E2, { rang: 4, statut: "faite", consommee_le: "2026-10-03T10:00:00Z", lancement_id: "b4b4b4b4-0000-0000-0000-000000000004" }), modele_id: null, lignes: L4 });
    const S = "b4b4b4b4-0000-0000-0000-000000000001";
    await source(P, E, S, 1, "2026-10-05T10:00:00Z");
    const v = await rpc("accepter_cible", { lancement_id: S, emplacement: ir, charge: 18, reps_cible: rep.reps_min, cran: 2 });
    t("R4 · tour 30 · P1 · après une fermeture tardive, la cible vise l'occurrence que R6 donnera (5, pas 3)", v.resultat === "ok" && v.rang_vise === 5, JSON.stringify(v));
  }
  {
    /* Tour 31 · la base vérifie la réalisation ENTIÈRE avant de créer une version. */
    const exoIr = { cle: rep.exercice_cle, nom: rep.exercice_nom, chargeType: rep.charge_type };
    const marque = (k: number, o: Record<string, unknown> = {}) => ({
      statut: "terminee", validation: "bouton", dureeS: null, reps: rep.reps_max, charge: 16, exercice: exoIr,
      ...(k === rep.series - 1 ? { marge: "1_2" } : {}), ...o,
    });
    let n = 0;
    const essai = async (nom: string, parSerie: (k: number) => Record<string, unknown>, attendu: string, acceptation: Record<string, unknown> = {},
      apres?: (S: string) => Promise<unknown>) => {
      const { P, E } = await nouveauProgramme();
      const S = `c1c1c1c1-0000-0000-0000-${String(++n).padStart(12, "0")}`;
      await rpc("ecrire_occurrence", { intention: occ(P, E, { rang: 1, statut: "faite", consommee_le: "2026-10-05T10:00:00Z", lancement_id: S }), modele_id: null, lignes: L4 });
      const m = { [ir]: Object.fromEntries(Array.from({ length: rep.series }, (_, k) => [k, marque(k, parSerie(k))])) } as MarquesSeance;
      await rpc("enregistrer_seance", { lancement_id: S, proprietaire: U, titre: "Push", duree_s: 900, series: lignesDuJournal(exs4, m) });
      if (apres) await apres(S);
      const avant = (await q(`select count(*)::int n from cibles_acceptees where programme_id=$1`, [P])).rows[0].n;
      const r = await rpc("accepter_cible", { lancement_id: S, emplacement: ir, charge: 18, reps_cible: rep.reps_min, cran: 2, ...acceptation });
      t(`R4 · tour 31 · ${nom}`, r.resultat === attendu && (attendu !== "ok") === ((await q(`select count(*)::int n from cibles_acceptees where programme_id=$1`, [P])).rows[0].n === avant), JSON.stringify(r));
    };
    await essai("une réalisation complète au haut de fourchette est acceptée", () => ({}), "ok");
    await essai("première série non faite : refusée", (k) => k === 0 ? { statut: "non_atteinte", reps: null, charge: null } : {}, "non_comparable");
    await essai("première série validée par le minuteur : refusée", (k) => k === 0 ? { validation: "minuteur_fini" } : {}, "non_comparable");
    await essai("A → B → A : refusée", (k) => k === 1 ? { exercice: { cle: "pompes", nom: "Pompes", chargeType: "poids_du_corps" }, charge: null } : {}, "non_comparable");
    await essai("charges mélangées : refusée", (k) => k === 0 ? { charge: 14 } : {}, "non_comparable");
    await essai("une charge inconnue : refusée", (k) => k === 1 ? { charge: null } : {}, "non_comparable");
    await essai("répétitions insuffisantes (sous la cible) : refusée", (k) => k === 1 ? { reps: rep.reps_cible! - 1 } : {}, "proposition_invalide");
    await essai("sous la cible, même la forme « une répétition de plus » est refusée", (k) => k === 1 ? { reps: rep.reps_cible! - 1 } : {}, "proposition_invalide",
      { charge: 16, reps_cible: Math.min(rep.reps_cible! + 1, rep.reps_max!), cran: null });
    await essai("dans la fourchette, une hausse de charge n'est pas la proposition : refusée", (k) => k === 1 ? { reps: rep.reps_max! - 1 } : {}, "proposition_invalide");
    await essai("dans la fourchette, une répétition de plus à la même charge est acceptée", (k) => k === 1 ? { reps: rep.reps_max! - 1 } : {}, "ok",
      { charge: 16, reps_cible: Math.min(rep.reps_cible! + 1, rep.reps_max!), cran: null });
    await essai("au haut, une charge qui ne progresse pas : refusée", () => ({}), "proposition_invalide", { charge: 16 });
    await essai("au haut, des répétitions autres que le bas de fourchette : refusée", () => ({}), "proposition_invalide", { reps_cible: rep.reps_max });
    /* Tour 32 · une valeur INCONNUE sur une seule série ne passe pas : `bool_and` ignorait le NULL. */
    const premiere = (cols: string) => (S: string) => q(
      `update series_realisees set ${cols} where emplacement = $2 and serie = 1
         and workout_session_id = (select id from workout_sessions where lancement_id = $1)`, [S, ir]);
    await essai("tour 32 · une seule clé d'exercice inconnue : refusée", () => ({}), "non_comparable", {}, premiere("exercice_cle = null"));
    await essai("tour 32 · une seule fourchette prescrite inconnue : refusée", () => ({}), "non_comparable", {}, premiere("reps_min_prescrites = null, reps_max_prescrites = null"));
  }
  {
    // une occurrence passée reporte la cible ; une confirmation sur une occurrence changée n'écrit rien
    const { P, E } = await nouveauProgramme();
    const S = "b5b5b5b5-0000-0000-0000-000000000001";
    await source(P, E, S, 1, "2026-10-05T10:00:00Z");
    const v1 = await rpc("accepter_cible", { lancement_id: S, emplacement: ir, charge: 18, reps_cible: rep.reps_min, cran: 2 });
    const prep = await rpc("ecrire_occurrence", { intention: occ(P, E, { rang: 3 }), modele_id: null, lignes: appliquerCibles(L4, [await ouverte(v1.cible_id)], 3) });
    const annonce = await rpc("accepter_cible", { lancement_id: S, emplacement: ir, charge: 20, reps_cible: rep.reps_min, cran: 4 });
    t("R4 · (annonce de la séance préparée)", annonce.resultat === "occurrence_preparee" && annonce.intention_id === prep.id);
    // entre l'annonce et la confirmation, la séance est faite ailleurs
    await q(`update intentions_entrainement set statut='faite', consommee_le=now() where id=$1`, [prep.id]);
    const n0 = (await q(`select count(*)::int n from cibles_acceptees`)).rows[0].n;
    const conf = await rpc("accepter_cible", { lancement_id: S, emplacement: ir, charge: 20, reps_cible: rep.reps_min, cran: 4, appliquer_a: prep.id });
    t("R4 · tour 30 · la confirmation revérifie l'occurrence : faite entre-temps, rien n'est écrit",
      conf.resultat === "occurrence_changee" && (await q(`select count(*)::int n from cibles_acceptees`)).rows[0].n === n0
        && Number((await ligneIr(prep.id)).charge_cible) === 18, JSON.stringify(conf));
    // une nouvelle cible vers 5, puis l'occurrence 5 est passée : reportée à 7
    const v5 = await rpc("accepter_cible", { lancement_id: S, emplacement: ir, charge: 20, reps_cible: rep.reps_min, cran: 4 });
    const p5 = await rpc("ecrire_occurrence", { intention: occ(P, E, { rang: 5 }), modele_id: null, lignes: appliquerCibles(L4, [await ouverte(v5.cible_id)], 5) });
    await q(`update intentions_entrainement set statut='passee', consommee_le=now() where id=$1`, [p5.id]);
    const c5 = (await q(`select consommee_le, rang_vise from cibles_acceptees where id=$1`, [v5.cible_id])).rows[0];
    t("R4 · tour 30 · une occurrence passée ne consomme pas la cible, elle la reporte sur la suivante", v5.rang_vise === 5 && c5.consommee_le === null && c5.rang_vise === 7, JSON.stringify([v5, c5]));
  }

  // cas 6 · une progression en répétitions au poids du corps
  const Lp = composerEtape("Push", { lieu: "poids", orientation: "masse", niveau: null, version: 1 });
  const ib = Lp.findIndex((l) => l.statut === "repere" && l.mesure === "reps" && l.charge_type === "poids_du_corps" && (l.reps_max ?? 0) > (l.reps_cible ?? 0));
  if (ib >= 0) {
    const P6 = (await q(`insert into programmes(user_id) values ($1) returning id`, [U])).rows[0].id;
    const E6 = (await q(`insert into programme_seances(programme_id, position, nom) values ($1,1,'Push') returning id`, [P6])).rows[0].id;
    const i6 = (o: Record<string, unknown>) => ({ ...intention4(o), programme_id: P6, etape_consommee_id: E6, programme_seance_id: E6 });
    const LB = "a1a1a1a1-0000-0000-0000-0000000000b6";
    await rpc("ecrire_occurrence", { intention: i6({ statut: "faite", consommee_le: "2026-10-05T10:00:00Z", lancement_id: LB }), modele_id: null, lignes: Lp });
    const marquesB: MarquesSeance = { [ib]: Object.fromEntries(Array.from({ length: Lp[ib].series }, (_, k) => [k, {
      statut: "terminee", validation: "bouton", dureeS: null, reps: Lp[ib].reps_cible, charge: null,
      ...(k === Lp[ib].series - 1 ? { marge: "3_plus" } : {}),
    }])) } as MarquesSeance;
    await rpc("enregistrer_seance", { lancement_id: LB, proprietaire: U, titre: "Push", duree_s: 600, series: lignesDuJournal(projeterPrescription(Lp), marquesB) });
    t("R4 · cas 6 · au poids du corps, une charge est refusée", /charge_sans_kilos/.test(await err("accepter_cible", { lancement_id: LB, emplacement: ib, charge: 5, reps_cible: Lp[ib].reps_cible! + 1 })));
    const a6 = await rpc("accepter_cible", { lancement_id: LB, emplacement: ib, charge: null, reps_cible: Lp[ib].reps_cible! + 1 });
    const c6 = (await q(`select * from cibles_acceptees where id=$1`, [a6.cible_id])).rows[0];
    const o6: CibleOuverte = { id: c6.id, exercice_cle: c6.exercice_cle, charge_type: c6.charge_type, charge: null, reps_cible: c6.reps_cible, reps_min: c6.reps_min, reps_max: c6.reps_max, rang_vise: c6.rang_vise };
    const dp = await rpc("ecrire_occurrence", { intention: i6({ rang: c6.rang_vise }), modele_id: null, lignes: appliquerCibles(Lp, [o6], c6.rang_vise) });
    const l6 = (await q(`select reps_cible, charge_cible, charge_origine, cible_id from occurrence_exercices where intention_id=$1 and emplacement=$2`, [dp.id, ib])).rows[0];
    t("R4 · cas 6 · une répétition de plus, sans charge et sans origine de charge",
      l6.reps_cible === Lp[ib].reps_cible! + 1 && l6.charge_cible === null && l6.charge_origine === "aucune" && l6.cible_id === c6.id, JSON.stringify(l6));
  } else t("R4 · cas 6 · un repère au poids du corps existe dans la banque", false);
}

/* ── REVUE FINALE (Codex sur bc38de8) · la migration jouée pour de vrai ── */
await ex(`
alter table public.programmes add column if not exists nom text, add column if not exists intention text,
  add column if not exists origine text, add column if not exists archive_le timestamptz;
alter table public.programme_seances add column if not exists nature text, add column if not exists duree_min int,
  add column if not exists origine text;
alter table public.adaptations_entrainement add column if not exists programme_id uuid,
  add column if not exists statut text, add column if not exists fermee_le timestamptz;
create table if not exists public.exceptions_jour (user_id uuid not null, date date not null, genre text not null,
  cree_le timestamptz not null default now(), primary key (user_id, date));
`);
const revue = readFileSync(new URL("../supabase/migrations/20261012_revue_finale.sql", import.meta.url), "utf8");
await ex(revue);
await ex(revue);
t("Revue · migration rejouable", true);
await setUid(U);
{
  /* 1 · la projection porte l'emplacement, y compris avec des trous. */
  const L = composerEtape("Pull", { lieu: "salle", orientation: "masse", niveau: null, version: 1 });
  const troues = [L[0], L[3], L[4]];
  const sqlP = (await q(`select public.projeter_prescription($1::jsonb) as r`, [JSON.stringify(troues)])).rows[0].r;
  t("Revue · projection SQL = TypeScript, emplacements compris (0, 3, 4)",
    JSON.stringify(sqlP.map((e: { prescription: { emplacement: number } }) => e.prescription.emplacement)) === "[0,3,4]"
      && norm(sqlP) === norm(JSON.parse(JSON.stringify(projeterPrescription(troues)))), norm(sqlP).slice(0, 200));
  let casR = 0, diffR = 0;
  for (const lieu of Object.keys(BANQUE) as Lieu[]) for (const nom of Object.keys(BANQUE[lieu])) for (const o of ["force", "masse", "general"] as Orientation[]) {
    const l = composerEtape(nom, { lieu, orientation: o, niveau: null, version: 1 });
    const sql = (await q("select public.projeter_prescription($1::jsonb) r", [JSON.stringify(l)])).rows[0].r;
    casR++;
    if (norm(sql) !== norm(JSON.parse(JSON.stringify(projeterPrescription(l))))) diffR++;
  }
  t(`Revue · projection SQL ≡ TypeScript avec l'emplacement (${casR} compositions)`, diffR === 0, `${diffR} différence(s)`);

  /* 2 · une ligne réduite par rapport à son modèle ne propose rien. */
  const PR = (await q(`insert into programmes(user_id) values ($1) returning id`, [U])).rows[0].id;
  const ER = (await q(`insert into programme_seances(programme_id, position, nom) values ($1,1,'Pull') returning id`, [PR])).rows[0].id;
  await q(`insert into programme_seances(programme_id, position, nom) values ($1,2,'Push')`, [PR]);
  const mod = await rpc("ecrire_modele", { programme_seance_id: ER, lieu: "salle", orientation: "masse", niveau: null, version: 1, lignes: L });
  const ir = L.findIndex((l) => l.statut === "repere" && l.mesure === "reps");
  const courtes = L.map((l, i) => (i === ir ? { ...l, series: 2 } : l));
  const LR = "e5e5e5e5-0000-0000-0000-000000000001";
  const occ = await rpc("ecrire_occurrence", { intention: { programme_id: PR, etape_consommee_id: ER, programme_seance_id: ER, rang: 1, statut: "faite",
    date: "2026-10-05", consommee_le: "2026-10-05T10:00:00Z", lancement_id: LR, type: "Force", title: "Pull", origine: "utilisateur" }, modele_id: mod.id, lignes: courtes });
  const marques: MarquesSeance = { [ir]: Object.fromEntries(Array.from({ length: 2 }, (_, k) => [k, {
    statut: "terminee", validation: "bouton", dureeS: null, reps: courtes[ir].reps_max, charge: 40, ...(k === 1 ? { marge: "3_plus" } : {}) }])) } as MarquesSeance;
  await rpc("enregistrer_seance", { lancement_id: LR, proprietaire: U, titre: "Pull", duree_s: 600, series: lignesDuJournal(projeterPrescription(courtes), marques) });
  const acc = await rpc("accepter_cible", { lancement_id: LR, emplacement: L[ir].emplacement, charge: 42.5, reps_cible: courtes[ir].reps_min, marge: "3_plus" });
  t("Revue · un repère fait en 2 séries sur les 4 de son modèle : `version_reduite`, aucune cible écrite",
    occ.resultat === "ok" && acc.resultat === "version_reduite"
      && (await q(`select count(*)::int n from cibles_acceptees where programme_id=$1`, [PR])).rows[0].n === 0, JSON.stringify([occ, acc]));

  /* 3 · l'activation vérifie l'aperçu et reconnaît son rejeu. */
  const PA = (await q(`insert into programmes(user_id, statut) values ($1,'actif') returning id`, [V])).rows[0].id;
  await q(`update programmes set statut='archive' where user_id=$1 and id<>$2`, [V, PA]);
  const EA = (await q(`insert into programme_seances(programme_id, position, nom) values ($1,1,'Pull') returning id`, [PA])).rows[0].id;
  await setUid(V);
  const resa = await rpc("ecrire_occurrence", { intention: { programme_id: PA, etape_consommee_id: EA, programme_seance_id: EA, rang: 1, statut: "prevue",
    date: "2026-10-08", type: "Force", title: "Pull", origine: "utilisateur" }, modele_id: null, lignes: L });
  const ctxA = { lieu: "salle", orientation: "masse", niveau: null, version: 1, location: "salle" };
  const demande = (activation: string, approuve: unknown, choix = "garder") => ({
    activation_id: activation, ancien_id: PA, nom: "Dos & bras", intention: "priorites:dos", contexte: ctxA,
    etapes: [{ position: 1, nom: "Dos & bras", lignes: composerEtape("Dos & bras", { lieu: "salle", orientation: "masse", niveau: null, version: 1 }) }],
    choix: { [resa.id]: { choix, approuve } },
  });
  const ok8 = { date: "2026-10-08", rang: 1, etape: EA };
  const A1 = "c3c3c3c3-0000-0000-0000-000000000001";
  await q(`update intentions_entrainement set date='2026-10-12' where id=$1`, [resa.id]);
  const perime = await rpc("activer_programme", demande(A1, ok8));
  t("Revue · réservation montrée le 8, déplacée au 12 : `apercu_perime`, rien d'écrit",
    perime.resultat === "apercu_perime" && (await q(`select statut from programmes where id=$1`, [PA])).rows[0].statut === "actif", JSON.stringify(perime));
  t("Revue · une demande sans état approuvé est périmée", (await rpc("activer_programme", demande(A1, undefined))).resultat === "apercu_perime");
  const ok12 = { ...ok8, date: "2026-10-12" };
  const r1 = await rpc("activer_programme", demande(A1, ok12));
  const r2 = await rpc("activer_programme", demande(A1, ok12));
  t("Revue · la même activation rejouée après une réponse perdue rend la même version, sans « programme changé »",
    r1.resultat === "ok" && r2.resultat === "ok" && r2.deja === true && r2.programme_id === r1.programme_id
      && (await q(`select count(*)::int n from programmes where user_id=$1 and statut='actif'`, [V])).rows[0].n === 1, JSON.stringify([r1, r2]));
  t("Revue · une AUTRE activation sur l'ancienne version : `programme_change`",
    (await rpc("activer_programme", demande("c3c3c3c3-0000-0000-0000-000000000002", ok12))).resultat === "programme_change");
  t("Revue · une activation sans identité est refusée", /activation_sans_identite/.test(await err("activer_programme", { ...demande(A1, ok12), activation_id: null })));

  /* 4 · les gestes de la semaine, tout ou rien. */
  await setUid(U);
  const R = await rpc("ecrire_occurrence", { intention: { programme_id: PR, etape_consommee_id: ER, programme_seance_id: ER, rang: 3, statut: "prevue",
    date: "2026-10-14", type: "Force", title: "Pull", origine: "utilisateur" }, modele_id: null, lignes: L });
  const bouge = await rpc("retirer_le_jour", { date: "2026-10-13", reservation_id: R.id });
  t("Revue · « Pas d'entraînement » sur une réservation qui n'y est plus : `changee`, AUCUNE exception posée",
    bouge.resultat === "changee" && (await q(`select count(*)::int n from exceptions_jour where user_id=$1 and date='2026-10-13'`, [U])).rows[0].n === 0);
  const vrai = await rpc("retirer_le_jour", { date: "2026-10-14", reservation_id: R.id });
  t("Revue · sinon les deux ensemble : réservation retirée et exception posée",
    vrai.resultat === "ok" && (await q(`select count(*)::int n from intentions_entrainement where id=$1`, [R.id])).rows[0].n === 0
      && (await q(`select genre from exceptions_jour where user_id=$1 and date='2026-10-14'`, [U])).rows[0]?.genre === "pas_de_seance");
  const D2 = await rpc("ecrire_occurrence", { intention: { programme_id: PR, etape_consommee_id: ER, programme_seance_id: ER, rang: 5, statut: "prevue",
    date: "2026-10-15", type: "Force", title: "Pull", origine: "utilisateur" }, modele_id: null, lignes: L });
  await q(`insert into intentions_entrainement(user_id, date, nature, type, title) values ($1,'2026-10-16','repos','Repos','Repos')`, [U]);
  const mauvais = await rpc("deplacer_reservation", { id: D2.id, de: "2026-10-15", vers: "2026-10-16", programme_id: PR, etape_id: ER, rang: 3 });
  t("Revue · déplacer une réservation dont le rang a changé : `changee`, la date ne bouge pas",
    mauvais.resultat === "changee" && (await q(`select date::text d from intentions_entrainement where id=$1`, [D2.id])).rows[0].d === "2026-10-15");
  const bon = await rpc("deplacer_reservation", { id: D2.id, de: "2026-10-15", vers: "2026-10-16", programme_id: PR, etape_id: ER, rang: 5 });
  t("Revue · sinon la date bouge et le repos du jour d'arrivée s'en va, dans la même transaction",
    bon.resultat === "ok" && (await q(`select date::text d from intentions_entrainement where id=$1`, [D2.id])).rows[0].d === "2026-10-16"
      && (await q(`select count(*)::int n from intentions_entrainement where user_id=$1 and date='2026-10-16' and nature='repos'`, [U])).rows[0].n === 0);
}

console.log(`${ok} OK, ${ko} échec(s)`);
process.exit(ko === 0 ? 0 : 1);
