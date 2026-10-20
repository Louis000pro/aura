/* ════════════════════════════════════════════════════════════════════
   check:amis-sql · AMIS AVANT DE PARLER, JOUÉ POUR DE VRAI, HORS LIGNE

     npm run check:amis-sql

   Une base PostgreSQL en mémoire (PGlite), le schéma minimal de la
   messagerie, et les fonctions recopiées de la base telles qu'elles
   étaient le 2026-10-21 (`sont_en_relation`, la règle d'envoi,
   `creer_conversation`, `ajouter_membres_conversation`, `lancer_relais`).

   CE QU'IL PROTÈGE (Louis, 2026-10-21 : « il faut une acceptation pour
   commencer à parler ») : une demande d'ami ne suffit plus pour ouvrir
   une discussion, ajouter quelqu'un à un groupe, lancer un relais à deux
   ou écrire dans un fil à deux. Une amitié, ce sont les deux sens.

   ⚠️ IL COMMENCE PAR LE TÉMOIN : avec les définitions d'avant, une
   demande envoyée ouvre bien une discussion et permet bien d'y écrire.
   Si le banc ne voyait pas ce trou, il ne prouverait rien en le voyant
   fermé ensuite.

   Ce banc ne remplace pas l'essai sur la vraie base (droits Supabase,
   PostgREST) : il empêche de casser ce qu'il exerce.
   ════════════════════════════════════════════════════════════════════ */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { refusRelais } from "@/lib/defiErreurs";

const db = new PGlite();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const q = (s: string, p?: unknown[]) => db.query<any>(s, p);
const ex = (s: string) => db.exec(s);
let ok = 0, ko = 0;
const t = (nom: string, cond: boolean, info = "") => {
  if (cond) ok++;
  else ko++;
  console.log("[" + (cond ? "OK   " : "ECHEC") + "] " + nom + (info ? " · " + info : ""));
};

const U = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const [A, B, C, D, E, F, G] = [1, 2, 3, 4, 5, 6, 7].map(U);
const tableau = (ids: string[]) => "{" + ids.join(",") + "}";

/* ── Le schéma minimal, et la base telle qu'elle était le 2026-10-21 ── */
await ex(`
create role anon; create role authenticated; create role service_role;
create schema auth;
grant usage on schema auth to anon, authenticated;
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;

create table public.profiles (id uuid primary key, pseudo text);
create table public.followers (
  follower_id uuid not null, following_id uuid not null,
  primary key (follower_id, following_id)
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'duo', nom text, created_by uuid not null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(), image_url text
);
create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null, joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid, contenu text,
  type text not null default 'texte' check (type = any (array['texte','systeme','image'])),
  media_path text, media_width int, media_height int,
  repond_a uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint messages_media_check check (
    (type = 'image' and media_path is not null and media_width between 1 and 4096 and media_height between 1 and 4096)
    or (type <> 'image' and media_path is null and media_width is null and media_height is null))
);
create table public.challenge_runs (
  id uuid primary key default gen_random_uuid(), created_by uuid,
  conversation_id uuid references public.conversations(id), statut text not null,
  serie text not null default 'sillage', starts_on date, ends_on date,
  window_days int not null default 7, max_membres int,
  created_at timestamptz not null default now()
);
create table public.challenge_run_members (
  run_id uuid not null references public.challenge_runs(id) on delete cascade,
  user_id uuid not null, primary key (run_id, user_id)
);

-- Ce que les fonctions appellent sans que la migration y touche.
create function public.fermer_relais_expires() returns void language plpgsql as $$ begin null; end $$;
create function public.serie_a_jouer(p_membres uuid[]) returns text language sql stable as $$ select 'sillage'::text $$;
create function public.est_membre_conversation(p_conv uuid, p_user uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members where conversation_id = p_conv and user_id = p_user);
$$;

-- AVANT (recopiée de la base le 2026-10-21) : un seul sens suffit.
create function public.sont_en_relation(p_a uuid, p_b uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select p_a <> p_b and exists (
    select 1 from public.followers f
    where (f.follower_id = p_a and f.following_id = p_b)
       or (f.follower_id = p_b and f.following_id = p_a));
$$;

-- AVANT : la règle d'envoi de 20260725_messagerie_notifications_idempotentes.sql.
alter table public.messages enable row level security;
create policy "messages visibles par membres" on public.messages for select
  using (public.est_membre_conversation(conversation_id, auth.uid()));
create policy "envoi par membres" on public.messages for insert with check (
  auth.uid() = user_id
  and public.est_membre_conversation(conversation_id, auth.uid())
  and (repond_a is null or exists (
    select 1 from public.messages original
    where original.id = messages.repond_a and original.conversation_id = messages.conversation_id))
  and (
    (type = 'texte' and media_path is null and length(btrim(contenu)) between 1 and 4000)
    or (type = 'image' and contenu = 'Photo'
        and media_path like conversation_id::text || '/' || auth.uid()::text || '/%'))
);
grant select, insert, delete on public.messages to authenticated;

-- Recopiée de la base le 2026-10-21.
create function public.creer_conversation(p_membres uuid[], p_nom text default null) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_tous uuid[]; v_type text; v_conv uuid; v_autre uuid; v_m uuid;
begin
  if v_user is null then return jsonb_build_object('ok', false, 'raison', 'non_connecte'); end if;
  select array(select distinct x from unnest(array_append(coalesce(p_membres, array[]::uuid[]), v_user)) as x where x is not null) into v_tous;
  if coalesce(array_length(v_tous, 1), 0) < 2 then return jsonb_build_object('ok', false, 'raison', 'membre_manquant'); end if;
  if array_length(v_tous, 1) > 5 then return jsonb_build_object('ok', false, 'raison', 'groupe_complet'); end if;
  foreach v_m in array v_tous loop
    if v_m <> v_user then
      if not exists (select 1 from public.profiles where id = v_m) then
        return jsonb_build_object('ok', false, 'raison', 'profil_introuvable');
      end if;
      if not public.sont_en_relation(v_user, v_m) then
        return jsonb_build_object('ok', false, 'raison', 'relation_requise');
      end if;
    end if;
  end loop;
  v_type := case when array_length(v_tous, 1) = 2 then 'duo' else 'groupe' end;
  if v_type = 'duo' then
    select x into v_autre from unnest(v_tous) as x where x <> v_user limit 1;
    select c.id into v_conv from public.conversations c
    where c.type = 'duo' and public.est_membre_conversation(c.id, v_user)
      and public.est_membre_conversation(c.id, v_autre)
      and (select count(*) from public.conversation_members cm where cm.conversation_id = c.id) = 2
    limit 1;
    if v_conv is not null then return jsonb_build_object('ok', true, 'conversation_id', v_conv, 'existante', true); end if;
  end if;
  insert into public.conversations (type, nom, created_by) values (v_type, nullif(btrim(p_nom), ''), v_user) returning id into v_conv;
  foreach v_m in array v_tous loop
    insert into public.conversation_members (conversation_id, user_id) values (v_conv, v_m) on conflict do nothing;
  end loop;
  return jsonb_build_object('ok', true, 'conversation_id', v_conv, 'existante', false);
end $$;

-- Recopiée de la base le 2026-10-21.
create function public.ajouter_membres_conversation(p_conv uuid, p_membres uuid[]) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_nouveaux uuid[]; v_total integer; v_m uuid;
begin
  if v_user is null then return jsonb_build_object('ok', false, 'raison', 'non_connecte'); end if;
  if not public.est_membre_conversation(p_conv, v_user) then return jsonb_build_object('ok', false, 'raison', 'pas_membre'); end if;
  select array(select distinct x from unnest(coalesce(p_membres, array[]::uuid[])) as x
    where x is not null and x <> v_user and not public.est_membre_conversation(p_conv, x)) into v_nouveaux;
  if coalesce(array_length(v_nouveaux, 1), 0) = 0 then return jsonb_build_object('ok', true, 'ajoutes', 0); end if;
  if exists (select 1 from public.challenge_runs where conversation_id = p_conv and statut in ('inscription','en_cours')) then
    return jsonb_build_object('ok', false, 'raison', 'relais_en_cours');
  end if;
  select count(*) into v_total from public.conversation_members where conversation_id = p_conv;
  if v_total + array_length(v_nouveaux, 1) > 5 then return jsonb_build_object('ok', false, 'raison', 'groupe_complet'); end if;
  foreach v_m in array v_nouveaux loop
    if not exists (select 1 from public.profiles where id = v_m) then
      return jsonb_build_object('ok', false, 'raison', 'profil_introuvable');
    end if;
    if not public.sont_en_relation(v_user, v_m) then
      return jsonb_build_object('ok', false, 'raison', 'relation_requise');
    end if;
  end loop;
  foreach v_m in array v_nouveaux loop
    insert into public.conversation_members (conversation_id, user_id) values (p_conv, v_m) on conflict do nothing;
  end loop;
  update public.conversations set type = 'groupe' where id = p_conv
    and (select count(*) from public.conversation_members where conversation_id = p_conv) > 2;
  return jsonb_build_object('ok', true, 'ajoutes', array_length(v_nouveaux, 1));
end $$;
`);

for (const [id, pseudo] of [[A, "ana"], [B, "bo"], [C, "cam"], [D, "dom"], [E, "eli"], [F, "fred"], [G, "gab"]]) {
  await q("insert into public.profiles (id, pseudo) values ($1, $2)", [id, pseudo]);
}

/* ── Les gestes, joués sous le rôle `authenticated` ── */
async function comme<T>(uid: string | null, f: () => Promise<T>): Promise<T> {
  await q("select set_config('test.uid', $1, false)", [uid ?? ""]);
  await ex("set role authenticated");
  try { return await f(); }
  finally { await ex("reset role"); await q("select set_config('test.uid', '', false)"); }
}
const suit = (de: string, vers: string) =>
  q("insert into public.followers values ($1, $2) on conflict do nothing", [de, vers]);
const neSuitPlus = (de: string, vers: string) =>
  q("delete from public.followers where follower_id = $1 and following_id = $2", [de, vers]);
async function rpc(uid: string, sql: string, p: unknown[]) {
  return comme(uid, async () => (await q(sql, p)).rows[0].r as { ok: boolean; raison?: string; conversation_id?: string; existante?: boolean });
}
const creer = (uid: string, ids: string[]) =>
  rpc(uid, "select public.creer_conversation($1::uuid[], null) as r", [tableau(ids)]);
const ajouter = (uid: string, conv: string, ids: string[]) =>
  rpc(uid, "select public.ajouter_membres_conversation($1, $2::uuid[]) as r", [conv, tableau(ids)]);
const lancer = (uid: string, conv: string) =>
  rpc(uid, "select public.lancer_relais($1) as r", [conv]);
async function ecrit(uid: string, conv: string, contenu = "salut"): Promise<boolean> {
  try {
    await comme(uid, () => q(
      "insert into public.messages (conversation_id, user_id, contenu, type) values ($1, $2, $3, 'texte')",
      [conv, uid, contenu]));
    return true;
  } catch { return false; }
}
async function envoieImage(uid: string, conv: string, contenu: string, chemin?: string): Promise<boolean> {
  try {
    await comme(uid, () => q(
      "insert into public.messages (conversation_id, user_id, contenu, type, media_path, media_width, media_height) values ($1, $2, $3, 'image', $4, 1080, 1920)",
      [conv, uid, contenu, chemin ?? `${conv}/${uid}/affiche.webp`]));
    return true;
  } catch { return false; }
}
async function duoBrut(a: string, b: string): Promise<string> {
  const { rows } = await q("insert into public.conversations (type, created_by) values ('duo', $1) returning id", [a]);
  const id = rows[0].id as string;
  await q("insert into public.conversation_members (conversation_id, user_id) values ($1, $2), ($1, $3)", [id, a, b]);
  return id;
}

/* ── LE TÉMOIN : le trou, tel qu'il existait ── */
console.log("\n·Avant la migration (le témoin)");
await suit(A, B); // A envoie une demande à B. B n'a rien accepté.
const avant = await creer(A, [B]);
t("avant · une demande envoyée suffisait pour ouvrir une discussion", avant.ok === true, JSON.stringify(avant));
const duoAB = avant.conversation_id as string;
t("avant · et pour y écrire", await ecrit(A, duoAB, "coucou"));
t("avant · une affiche de séance était refusée", !(await envoieImage(A, duoAB, "Affiche de séance")));

/* ── LA MIGRATION, deux fois : elle doit être rejouable ── */
const mig = readFileSync(new URL("../supabase/migrations/20261021_amis_avant_de_parler.sql", import.meta.url), "utf8");
let rejouable = true;
try { await ex(mig); await ex(mig); } catch (e) { rejouable = false; console.log(e); }
t("la migration passe, et se rejoue", rejouable);
if (!rejouable) process.exit(1);

console.log("\n·Une demande n'est pas une amitié");
const relation = async (a: string | null, b: string | null) =>
  (await q("select public.sont_en_relation($1, $2) as r", [a, b])).rows[0].r as boolean | null;
t("une demande dans un seul sens n'est pas une relation", (await relation(A, B)) === false);
t("ni vue de l'autre côté", (await relation(B, A)) === false);
t("sans aucun lien, rien", (await relation(C, D)) === false);
t("un compte absent rend faux, jamais NULL", (await relation(null, B)) === false && (await relation(A, null)) === false);
t("on n'est pas en relation avec soi-même", (await relation(A, A)) === false);

const refusCreer = await creer(A, [B]);
t("ouvrir une discussion sur une simple demande est refusé", refusCreer.ok === false && refusCreer.raison === "relation_requise", JSON.stringify(refusCreer));
t("écrire dans le fil déjà ouvert est refusé", !(await ecrit(A, duoAB)));
t("y répondre de l'autre côté aussi, tant que rien n'est accepté", !(await ecrit(B, duoAB)));
t("une photo non plus", !(await envoieImage(A, duoAB, "Photo")));
const lu = await comme(A, async () => (await q("select count(*)::int as n from public.messages where conversation_id = $1", [duoAB])).rows[0].n as number);
t("le fil reste lisible", lu === 1, `${lu} message`);

console.log("\n·Une fois la demande acceptée");
await suit(B, A); // B accepte.
t("les deux sens font une relation", (await relation(A, B)) === true && (await relation(B, A)) === true);
t("A écrit", await ecrit(A, duoAB));
t("B répond", await ecrit(B, duoAB));
const retrouve = await creer(A, [B]);
t("« Écrire » retrouve le même fil", retrouve.ok === true && retrouve.existante === true && retrouve.conversation_id === duoAB);
t("une affiche de séance passe enfin", await envoieImage(A, duoAB, "Affiche de séance"));
t("une photo passe toujours", await envoieImage(B, duoAB, "Photo", `${duoAB}/${B}/photo.webp`));
t("une autre légende reste refusée", !(await envoieImage(A, duoAB, "Capture")));
t("une image rangée chez quelqu'un d'autre reste refusée", !(await envoieImage(A, duoAB, "Photo", `${duoAB}/${B}/vol.webp`)));
let systeme = false;
try {
  await comme(A, () => q("insert into public.messages (conversation_id, user_id, contenu, type) values ($1, null, 'faux message du système', 'systeme')", [duoAB]));
  systeme = true;
} catch { systeme = false; }
t("personne n'écrit à la place du système", !systeme);

console.log("\n·Après un retrait d'ami");
await neSuitPlus(B, A);
t("le fil se referme à l'écriture", !(await ecrit(A, duoAB)) && !(await ecrit(B, duoAB)));
const toujoursLu = await comme(B, async () => (await q("select count(*)::int as n from public.messages where conversation_id = $1", [duoAB])).rows[0].n as number);
t("mais reste lisible des deux côtés", toujoursLu === 5, `${toujoursLu} messages`);
await suit(B, A); // Ils redeviennent amis pour la suite.

console.log("\n·Les groupes");
await suit(A, C); await suit(C, A); // A et C amis. B et C ne se connaissent pas.
const groupe = await creer(A, [B, C]);
t("un groupe se crée entre amis", groupe.ok === true && groupe.existante === false, JSON.stringify(groupe));
const idGroupe = groupe.conversation_id as string;
t("on écrit dans un groupe sans être ami avec tout le monde", await ecrit(B, idGroupe) && await ecrit(C, idGroupe));
await suit(A, D); // une simple demande à D
const refusAjout = await ajouter(A, idGroupe, [D]);
t("on n'ajoute pas quelqu'un qui n'a rien accepté", refusAjout.ok === false && refusAjout.raison === "relation_requise", JSON.stringify(refusAjout));
await suit(D, A);
const ajout = await ajouter(A, idGroupe, [D]);
t("on l'ajoute une fois la demande acceptée", ajout.ok === true, JSON.stringify(ajout));
const refusGroupe = await creer(A, [C, E]);
t("pas de groupe avec quelqu'un qui n'a rien accepté", refusGroupe.ok === false && refusGroupe.raison === "relation_requise");

console.log("\n·Le relais");
await suit(E, A); // E demande A en ami ; A n'a rien accepté.
const duoEA = await duoBrut(E, A); // un fil ouvert par l'ancien trou
const pasAmis = await lancer(E, duoEA);
t("pas de relais à deux sans amitié", pasAmis.ok === false && pasAmis.raison === "pas_amis", JSON.stringify(pasAmis));
const runs = (await q("select count(*)::int as n from public.challenge_runs where conversation_id = $1", [duoEA])).rows[0].n as number;
const sys = (await q("select count(*)::int as n from public.messages where conversation_id = $1", [duoEA])).rows[0].n as number;
t("et rien n'est écrit, ni relais ni message", runs === 0 && sys === 0);
const enGroupe = await lancer(B, idGroupe);
t("un relais en groupe se lance comme avant", enGroupe.ok === true, JSON.stringify(enGroupe));
await suit(F, G); await suit(G, F);
const duoFG = await duoBrut(F, G);
const entreAmis = await lancer(F, duoFG);
t("un relais à deux entre amis se lance comme avant", entreAmis.ok === true, JSON.stringify(entreAmis));
const annonce = (await q("select count(*)::int as n from public.messages where conversation_id = $1 and type = 'systeme' and user_id is null", [duoFG])).rows[0].n as number;
t("et son message du système s'écrit toujours", annonce === 1);
t("le refus « pas_amis » a sa phrase", refusRelais({ raison: "pas_amis" }).texte !== refusRelais({ raison: "inconnu" }).texte);

console.log("\n·Les droits");
const droit = async (role: string, fn: string) =>
  (await q("select has_function_privilege($1, $2, 'execute') as r", [role, fn])).rows[0].r as boolean;
t("un visiteur sans compte ne peut pas sonder la règle d'écriture", !(await droit("anon", "public.peut_ecrire_dans(uuid)")));
t("ni les relations", !(await droit("anon", "public.sont_en_relation(uuid, uuid)")));
t("un compte connecté, oui", await droit("authenticated", "public.peut_ecrire_dans(uuid)") && await droit("authenticated", "public.sont_en_relation(uuid, uuid)"));
const sansCompte = (await q("select public.peut_ecrire_dans($1) as r", [duoAB])).rows[0].r as boolean;
t("sans session, la règle dit non", sansCompte === false);
const signature = (await q("select pg_get_function_identity_arguments('public.peut_ecrire_dans(uuid)'::regprocedure) as r")).rows[0].r as string;
t("la règle ne prend aucun compte en paramètre : elle répond pour la session", signature === "p_conv uuid", signature);

/* ── Le code de l'écran tient la même règle ── */
console.log("\n·L'écran");
const lire = (chemin: string) => readFileSync(new URL("../" + chemin, import.meta.url), "utf8");
const messagerie = lire("src/lib/messagerie.ts");
t("« Nouvelle discussion », « Avec qui ? » et l'ajout lisent les amis réciproques",
  /export async function mesAmis/.test(messagerie) && /meSuivent\.has\(id\)/.test(messagerie) && !/mesRelations/.test(messagerie));
const fil = lire("src/app/communaute/[id]/page.tsx");
t("le fil remplace la saisie tant que l'amitié n'est pas réciproque",
  /const ecritureFermee = !!idDuo && relationAutre !== null && relationAutre !== "ami"/.test(fil) && /\{ecritureFermee \? \(/.test(fil));
const infos = lire("src/app/communaute/[id]/infos/page.tsx");
t("les infos d'un fil à deux ne proposent pas de relais sans amitié", /!duoSansAmitie &&/.test(infos));
const profil = lire("src/app/profil/[username]/page.tsx");
t("le profil d'un autre ne propose « Écrire » qu'entre amis", /relation === "ami" && \(/.test(profil) && !/isFollowing/.test(profil));

console.log(`\n${ok} contrôles passés, ${ko} en échec.`);
if (ko > 0) process.exit(1);
