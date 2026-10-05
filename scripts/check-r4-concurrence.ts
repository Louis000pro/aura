/* ════════════════════════════════════════════════════════════════════
   R4 · L'ACCEPTATION ET LA FERMETURE EN MÊME TEMPS (tour 31 de Codex)

   PGlite n'a qu'une connexion : il ne peut pas jouer deux transactions à
   la fois. Ce banc démarre un VRAI PostgreSQL local (binaires 16 du
   système), y installe le même schéma que `check:prescription-sql` plus
   le déclencheur `attribuer_rang` de R6 (c'est lui qui prend le verrou de
   programme à l'écriture d'une occurrence), puis pilote deux sessions
   `psql` pas à pas.

   L'invariant vérifié après chaque entrelacement : aucune version
   ouverte ne vise une occurrence déjà résolue (faite ou passée).

   Sans PostgreSQL sur la machine, le banc le dit et s'arrête sans échec.
   ════════════════════════════════════════════════════════════════════ */
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { composerEtape, projeterPrescription } from "@/lib/banqueEtapes";
import { lignesDuJournal, type MarquesSeance } from "@/lib/journalSeance";

const BIN = "/usr/lib/postgresql/16/bin";
if (!existsSync(`${BIN}/postgres`)) { console.log("PostgreSQL 16 absent : banc de concurrence non joué."); process.exit(0); }

let ok = 0, ko = 0;
const t = (nom: string, cond: boolean, info = "") => { if (cond) { ok++; console.log("OK  ", nom); } else { ko++; console.log("ÉCHEC", nom, info); } };

/* ── Le serveur ── */
const dir = mkdtempSync(join(tmpdir(), "r4-pg-"));
chmodSync(dir, 0o777);
const PORT = String(54000 + Math.floor(Math.random() * 900));
const enPostgres = (cmd: string) => execFileSync("su", ["postgres", "-c", cmd], { stdio: "pipe" });
enPostgres(`${BIN}/initdb -D ${dir}/data -A trust -U postgres >/dev/null`);
enPostgres(`${BIN}/pg_ctl -D ${dir}/data -o "-k ${dir} -p ${PORT} -c listen_addresses=''" -l ${dir}/log -w start >/dev/null`);
process.env.PGOPTIONS = "-c client_min_messages=warning";
const arreter = () => { try { enPostgres(`${BIN}/pg_ctl -D ${dir}/data -m immediate stop >/dev/null`); } catch { /* déjà arrêté */ } };
process.on("exit", arreter);
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => { arreter(); process.exit(1); });

/* ── Une session psql pilotée ligne à ligne ── */
class Session {
  private p = spawn(`${BIN}/psql`, ["-X", "-q", "-At", "-h", dir, "-p", PORT, "-U", "postgres", "-d", "postgres"], { stdio: ["pipe", "pipe", "pipe"] });
  private sortie = "";
  private n = 0;
  constructor() {
    this.p.stdout.on("data", (d) => { this.sortie += d; });
    this.p.stderr.on("data", (d) => { this.sortie += d; });
  }
  /** Envoie, et rend une promesse résolue quand la commande a fini. */
  envoyer(sql: string): Promise<string> {
    const m = `__fin_${++this.n}__`;
    const debut = this.sortie.length;
    this.p.stdin.write(`${sql}\n\\echo ${m}\n`);
    return new Promise((res) => {
      const tic = setInterval(() => {
        const i = this.sortie.indexOf(m, debut);
        if (i >= 0) { clearInterval(tic); res(this.sortie.slice(debut, i).trim()); }
      }, 10);
    });
  }
  fermer() { this.p.stdin.end(); }
}
const attente = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** La promesse est-elle encore en attente après `ms` ? */
const bloquee = async (p: Promise<unknown>, ms = 600) => (await Promise.race([p.then(() => false), attente(ms).then(() => true)]));

/* ── Le schéma : celui du banc PGlite, R6 avec son déclencheur, puis R4 ── */
const lire = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf8");
const banc = lire("scripts/check-prescription-sql.ts");
const schema = banc.slice(banc.indexOf("create role anon;"), banc.indexOf("`);", banc.indexOf("create role anon;")));
const r1 = lire("supabase/migrations/20261003_r1_journal_series.sql");
const r6 = lire("supabase/migrations/20261004_r6_occurrences.sql");
const setup = [
  schema,
  r1.slice(r1.indexOf("create table if not exists public.series_realisees"), r1.indexOf("create index if not exists idx_series_historique")),
  lire("supabase/migrations/20261005_r2_prescription.sql"),
  "alter table public.programmes add column if not exists rang_depart int, add column if not exists position_initiale int;",
  r6.slice(r6.indexOf("create or replace function public.ordinal_etape"), r6.indexOf("/* ─────────────── 5. La reprise")),
  "create trigger intentions_attribuer_rang before insert or update of etape_consommee_id, rang, programme_id on public.intentions_entrainement for each row execute function public.attribuer_rang();",
  lire("supabase/migrations/20261007_r4_progression.sql"),
].join("\n;\n");
writeFileSync(join(dir, "setup.sql"), setup);
execFileSync(`${BIN}/psql`, ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-h", dir, "-p", PORT, "-U", "postgres", "-d", "postgres", "-f", join(dir, "setup.sql")], { stdio: ["ignore", "ignore", "inherit"] });

/* ── Les données ── */
const U = "11111111-1111-1111-1111-111111111111";
const L4 = composerEtape("Push", { lieu: "halteres", orientation: "masse", niveau: null, version: 1 });
const ir = L4.findIndex((l) => l.statut === "repere" && l.mesure === "reps" && (l.charge_type === "par_haltere" || l.charge_type === "totale"));
const rep = L4[ir];
const exs = projeterPrescription(L4);
const marques: MarquesSeance = { [ir]: Object.fromEntries(Array.from({ length: rep.series }, (_, k) => [k, {
  statut: "terminee", validation: "bouton", dureeS: null, reps: rep.reps_max, charge: 16,
  exercice: { cle: rep.exercice_cle, nom: rep.exercice_nom, chargeType: rep.charge_type },
  ...(k === rep.series - 1 ? { marge: "1_2" } : {}),
}])) } as MarquesSeance;
const series = lignesDuJournal(exs, marques);
const j = (v: unknown) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;

const admin = new Session();
await admin.envoyer(`insert into auth.users values ('${U}');`);
let numero = 0;
/** Un programme de deux étapes, avec la source (rang 1) fermée et journalisée. */
async function programme() {
  const k = ++numero;
  const P = await admin.envoyer(`insert into programmes(user_id) values ('${U}') returning id;`);
  const E = await admin.envoyer(`insert into programme_seances(programme_id, position, nom) values ('${P}',1,'Push') returning id;`);
  await admin.envoyer(`insert into programme_seances(programme_id, position, nom) values ('${P}',2,'Pull');`);
  const S = `d0d0d0d0-0000-0000-0000-${String(k).padStart(12, "0")}`;
  const intent = (o: Record<string, unknown>) => ({ programme_id: P, etape_consommee_id: E, programme_seance_id: E, statut: "prevue", date: "2026-10-08",
    type: "Force", title: "Push", difficulty: "Intermédiaire", location: "halteres", origine: "utilisateur", adaptation_id: null, consommee_le: null, lancement_id: null, ...o });
  await admin.envoyer(`select set_config('test.uid','${U}',false);`);
  await admin.envoyer(`select public.ecrire_occurrence(${j({ intention: intent({ rang: 1, statut: "faite", consommee_le: "2026-10-05T10:00:00Z", lancement_id: S }), modele_id: null, lignes: L4 })});`);
  await admin.envoyer(`select public.enregistrer_seance(${j({ lancement_id: S, proprietaire: U, titre: "Push", duree_s: 900, series })});`);
  return { P, E, S, intent };
}
const accepter = (S: string, o: Record<string, unknown> = {}) =>
  `select public.accepter_cible(${j({ lancement_id: S, emplacement: ir, charge: 18, reps_cible: rep.reps_min, cran: 2, ...o })});`;
const fermerLibre = (intent: (o: Record<string, unknown>) => unknown, rang: number, lanc: string) =>
  `select public.ecrire_occurrence(${j({ intention: intent({ rang, statut: "faite", consommee_le: "2026-10-07T10:00:00Z", lancement_id: lanc }), modele_id: null, lignes: L4 })});`;
const perimees = async (P: string) => Number(await admin.envoyer(`select count(*) from cibles_acceptees c where c.programme_id='${P}' and c.consommee_le is null and c.remplacee_le is null
  and exists (select 1 from intentions_entrainement i where i.programme_id=c.programme_id and i.rang=c.rang_vise and i.statut in ('faite','passee'));`));
const sessions = async () => {
  const A = new Session(), B = new Session();
  for (const s of [A, B]) await s.envoyer(`select set_config('test.uid','${U}',false);`);
  return { A, B };
};

/* 1 · La fermeture d'une étape libre est en cours ; l'acceptation arrive. */
{
  const { P, S, intent } = await programme();
  const { A, B } = await sessions();
  await B.envoyer("begin;");
  await B.envoyer(fermerLibre(intent, 3, "d1d1d1d1-0000-0000-0000-000000000003"));
  const acc = A.envoyer(accepter(S));
  t("1 · l'acceptation attend la fermeture en cours (même verrou de programme)", await bloquee(acc));
  await B.envoyer("commit;");
  const r = JSON.parse(await acc);
  t("1 · puis vise l'occurrence suivante, pas celle qui vient d'être fermée", r.resultat === "ok" && r.rang_vise === 5, JSON.stringify(r));
  t("1 · aucune version ouverte ne vise une occurrence résolue", (await perimees(P)) === 0);
  A.fermer(); B.fermer();
}

/* 2 · L'acceptation est en cours ; la fermeture arrive. */
{
  const { P, S, intent } = await programme();
  const { A, B } = await sessions();
  await A.envoyer("begin;");
  const r = JSON.parse(await A.envoyer(accepter(S)));
  t("2 · l'acceptation vise le rang 3", r.resultat === "ok" && r.rang_vise === 3, JSON.stringify(r));
  const ferme = B.envoyer(fermerLibre(intent, 3, "d2d2d2d2-0000-0000-0000-000000000003"));
  t("2 · la fermeture attend l'acceptation en cours", await bloquee(ferme));
  await A.envoyer("commit;");
  await ferme;
  const c = (await admin.envoyer(`select rang_vise || '|' || coalesce(consommee_le::text,'') from cibles_acceptees where id='${r.cible_id}';`)).split("|");
  t("2 · la fermeture qui ne l'a pas suivie la reporte au rang 5", c[0] === "5" && c[1] === "", c.join("|"));
  t("2 · aucune version ouverte ne vise une occurrence résolue", (await perimees(P)) === 0);
  A.fermer(); B.fermer();
}

/* 3 · Une occurrence préparée se ferme par son statut ; une confirmation la nomme. */
{
  const { P, S, intent } = await programme();
  const prep = JSON.parse(await admin.envoyer(`select public.ecrire_occurrence(${j({ intention: intent({ rang: 3 }), modele_id: null, lignes: L4 })});`)).id;
  const { A, B } = await sessions();
  await B.envoyer("begin;");
  await B.envoyer(`update intentions_entrainement set statut='faite', consommee_le=now() where id='${prep}';`);
  const acc = A.envoyer(accepter(S, { appliquer_a: prep }));
  const attend = await bloquee(acc);
  t("3 · ligne occupée par une fermeture : l'acceptation n'attend pas", !attend);
  const fin = await B.envoyer("commit;");
  const brut = await acc;
  let r: { resultat?: string } = {};
  try { r = JSON.parse(brut); } catch { /* erreur rendue par psql */ }
  t("3 · elle répond « occupée » et n'écrit rien", r.resultat === "occurrence_occupee", brut);
  t("3 · sans interblocage", !/deadlock/i.test(brut + fin), brut + fin);
  t("3 · aucune version ouverte ne vise une occurrence résolue", (await perimees(P)) === 0);
  A.fermer(); B.fermer();
}

/* 4 · La confirmation tient la ligne ; la fermeture par statut arrive. */
{
  const { P, S, intent } = await programme();
  const prep = JSON.parse(await admin.envoyer(`select public.ecrire_occurrence(${j({ intention: intent({ rang: 3 }), modele_id: null, lignes: L4 })});`)).id;
  const { A, B } = await sessions();
  await A.envoyer("begin;");
  const r = JSON.parse(await A.envoyer(accepter(S, { appliquer_a: prep })));
  t("4 · la confirmation ajuste l'occurrence nommée", r.resultat === "ok" && r.applique_a === prep, JSON.stringify(r));
  const ferme = B.envoyer(`update intentions_entrainement set statut='faite', consommee_le=now() where id='${prep}';`);
  t("4 · la fermeture attend la confirmation", await bloquee(ferme));
  await A.envoyer("commit;");
  const fin = await ferme;
  t("4 · sans interblocage", !/deadlock/i.test(fin), fin);
  t("4 · aucune version ouverte ne vise une occurrence résolue", (await perimees(P)) === 0);
  A.fermer(); B.fermer();
}

admin.fermer();
console.log(`${ok} OK, ${ko} échec(s)`);
arreter();
process.exit(ko === 0 ? 0 : 1);
