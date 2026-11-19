/* ════════════════════════════════════════════════════════════════════
   check-situations-sql · LA TABLE « EN CE MOMENT », JOUÉE HORS LIGNE

     node --experimental-strip-types scripts/check-situations-sql.ts

   PGlite, le schéma minimal (les comptes), puis
   `20261119_situations.sql` deux fois : elle doit être rejouable.
   Ce banc ne remplace pas l'essai sur la vraie base (droits Supabase).
   ════════════════════════════════════════════════════════════════════ */
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync } from "node:fs";

const db = new PGlite({ extensions: { btree_gist } });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const q = (s: string, p?: unknown[]) => db.query<any>(s, p);
const ex = (s: string) => db.exec(s);
let ko = 0;
const t = (nom: string, cond: boolean, info = "") => {
  if (!cond) ko++;
  console.log("[" + (cond ? "OK   " : "ECHEC") + "] " + nom + (info ? " · " + info : ""));
};
const erreur = async (s: string, p?: unknown[]): Promise<string | null> => {
  try { await q(s, p); return null; } catch (e) { return (e as Error).message; }
};

await ex(`
create role anon; create role authenticated;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
`);
const mig = readFileSync(new URL("../supabase/migrations/20261119_situations.sql", import.meta.url), "utf8");
await ex(mig);
await ex(mig);
t("la migration est rejouable", true);

const U = "11111111-1111-1111-1111-111111111111";
const V = "22222222-2222-2222-2222-222222222222";
await ex(`insert into auth.users values ('${U}'), ('${V}');`);
const ins = (genre: string, debut: string, fin: string, reglages: unknown, user = U) =>
  erreur(`insert into public.situations (user_id, genre, debut, fin, reglages) values ($1, $2, $3, $4, $5)`, [user, genre, debut, fin, JSON.stringify(reglages)]);

t("moins de temps : 25 min accepté", (await ins("moins_de_temps", "2026-11-18", "2026-11-22", { minutes: 25 })) === null);
t("moins de temps : 5 min refusé", (await ins("moins_de_temps", "2026-12-01", "2026-12-02", { minutes: 5 })) !== null);
t("une clé inconnue est refusée", (await ins("moins_de_temps", "2026-12-01", "2026-12-02", { minutes: 25, effort: "x" })) !== null);
t("un genre inconnu est refusé", (await ins("vacances", "2026-12-01", "2026-12-02", {})) !== null);
t("une gêne avec ses zones est acceptée",
  (await ins("gene", "2026-11-18", "2026-12-02", { zones: ["Épaule droite"], mode: "eviter", choix: {}, pauses: {} })) === null);
t("une gêne sans zone est refusée", (await ins("gene", "2026-12-10", "2026-12-12", { zones: [], mode: "eviter" })) !== null);
t("une gêne au mode inconnu est refusée", (await ins("gene", "2026-12-10", "2026-12-12", { zones: ["Cou"], mode: "soigner" })) !== null);
t("deux genres différents se croisent", (await ins("energie", "2026-11-20", "2026-11-24", { mode: "leger" })) === null);
t("deux situations du même genre ne se chevauchent pas", (await ins("moins_de_temps", "2026-11-21", "2026-11-25", { minutes: 30 })) !== null);
t("bout à bout, c'est accepté", (await ins("moins_de_temps", "2026-11-23", "2026-11-25", { minutes: 30 })) === null);
t("une autre personne n'est pas gênée", (await ins("moins_de_temps", "2026-11-18", "2026-11-22", { minutes: 25 }, V)) === null);
t("le matériel : lieu connu seulement", (await ins("materiel", "2026-11-18", "2026-11-20", { lieu: "salle" })) !== null
  && (await ins("materiel", "2026-11-18", "2026-11-20", { lieu: "poids" })) === null);
t("une fin avant le début est refusée", (await ins("energie", "2026-12-10", "2026-12-01", { mode: "pause" })) !== null);
t("plus de 120 jours est refusé", (await ins("energie", "2027-01-01", "2027-06-01", { mode: "pause" })) !== null);
t("active avec une date de fermeture est refusée",
  (await erreur(`update public.situations set fermee_le = now() where genre = 'energie' and user_id = $1`, [U])) !== null);
t("fermer = statut terminée et sa date",
  (await erreur(`update public.situations set statut = 'terminee', fermee_le = now() where genre = 'energie' and user_id = $1`, [U])) === null);
t("une situation fermée ne bloque plus le même genre", (await ins("energie", "2026-11-21", "2026-11-22", { mode: "pause" })) === null);

await ex(`grant usage on schema public to authenticated;`);
await ex(`set role authenticated; select set_config('test.uid', '${V}', false);`);
const vus = await q(`select count(*)::int as n from public.situations`);
t("chacun ne voit que les siennes", vus.rows[0].n === 1, String(vus.rows[0].n));
t("on n'écrit pas chez quelqu'un d'autre",
  (await erreur(`insert into public.situations (user_id, genre, debut, fin, reglages) values ('${U}', 'energie', '2027-02-01', '2027-02-02', '{"mode":"leger"}')`)) !== null);
await ex(`reset role;`);
t("supprimer un compte emporte ses situations",
  (await erreur(`delete from auth.users where id = $1`, [U])) === null
  && (await q(`select count(*)::int as n from public.situations where user_id = $1`, [U])).rows[0].n === 0);

console.log("\n" + (ko === 0 ? "Tout passe." : ko + " échec(s)."));
process.exit(ko === 0 ? 0 : 1);
