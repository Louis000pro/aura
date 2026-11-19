const path = require('node:path');
process.chdir(path.resolve(__dirname, '..'));
const fs = require('fs'), assert = require('assert/strict'), { randomUUID } = require('crypto');
const { PGlite } = require('@electric-sql/pglite');
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,created_at timestamptz,email_confirmed_at timestamptz,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create table profiles(id uuid primary key references auth.users(id) on delete cascade,is_banned bool default false,onboarding_completed bool default true);create table boosters_illimites(user_id uuid references auth.users(id) on delete cascade,requete_id uuid,cartes jsonb,ouvert_le timestamptz default now(),cadence_3h bool default false,primary key(user_id,requete_id));create table aura_mission_credits(user_id uuid,mission_id text,period_key text,points int,unique(user_id,mission_id,period_key));create function crediter_mission_aura(uuid,text,text,text,int,bool) returns void language sql as $$insert into public.aura_mission_credits values($1,$2,$4,$5) on conflict do nothing$$;create function tirer_booster_exercices() returns jsonb language sql as $$select '[{"exercice":"pompes","rarete":"commune"},{"exercice":"crunch","rarete":"rare"},{"exercice":"squat","rarete":"epique"}]'::jsonb$$;`);
    const before = fs.readFileSync('supabase/migrations/20261116_boosters_collection_exp.sql', 'utf8');
    const a = before.indexOf('create or replace function public.crediter_booster_aura()'), b = before.indexOf('drop trigger if exists booster_credit_aura on public.boosters_exercices', a);
    await db.exec(before.slice(a, b) + `create trigger booster_credit_aura after insert on boosters_illimites for each row execute function crediter_booster_aura();`);
    const sql = fs.readFileSync('supabase/migrations/20261119_parrainage.sql', 'utf8');
    await db.exec(sql);
    const q = async (text, args = []) => (await db.query(text, args)).rows;
    const parent = randomUUID(), arrivee = new Date(Date.now() - 7200000).toISOString();
    async function user(email, options = {}) { const id = randomUUID(); await db.query("insert into auth.users values($1,now()-$2::interval,case when $3 then now() else null end,$4)", [id, options.age || '1 hour', options.confirme !== false, email]); await db.query('insert into profiles values($1,false,$2)', [id, options.complet !== false]); return id; }
    await db.query("insert into auth.users values($1,now()-interval '1 year',now(),'parent@test.invalid')", [parent]);
    await db.query('insert into profiles(id) values($1)', [parent]);
    const etat = () => q('select etat_parrainage($1) as e', [parent]).then(r => r[0].e);
    let e = await etat();
    assert.equal(e.actif, Date.now() >= Date.parse('2026-11-19T00:00:00+01:00'));
    assert.equal(e.gagnes, 0);
    const code = e.code;
    // Horloge de campagne simulée seulement dans cette base de test.
    await db.exec(sql.replaceAll('2026-11-19 00:00:00 Europe/Paris', '2000-01-01 00:00:00 Europe/Paris'));
    const valider = id => q('select valider_parrainage($1,$2,$3) as v', [id, code, arrivee]).then(r => r[0].v);
    const enfants = [];
    for (let i = 0; i < 4; i++) {
        const id = await user('ami' + i + '@test.invalid');
        enfants.push(id);
        assert((await valider(id)).nouveau);
        assert.equal((await etat()).gagnes, [3, 6, 10, 13][i]);
        assert(!(await valider(id)).nouveau);
        assert.equal((await etat()).gagnes, [3, 6, 10, 13][i]);
    }
    assert.equal((await valider(await user('ancien@test.invalid', { age: '1 year' }))).raison, 'compte_non_eligible');
    assert.equal((await valider(parent)).raison, 'compte_non_eligible');
    assert.equal((await valider(await user('nonconfirme@test.invalid', { confirme: false }))).raison, 'inscription_en_cours');
    assert.equal((await valider(await user('incomplet@test.invalid', { complet: false }))).raison, 'inscription_en_cours');
    assert(!(await valider(await user('AMI0@test.invalid'))).nouveau);
    await db.query('delete from auth.users where id=$1', [enfants[0]]);
    assert.equal((await etat()).gagnes, 13);
    assert(!(await valider(await user('ami0@test.invalid'))).nouveau);
    await db.query("select set_config('test.uid',$1,false)", [parent]);
    const ouvrir = id => q('select ouvrir_booster_exercices_v5($1) as b', [id]).then(r => r[0].b);
    let stock = await ouvrir(null);
    assert.equal(stock.stock, 16);
    assert.equal(stock.stock_habituel, 3);
    const requete = randomUUID();
    let tirage = await ouvrir(requete);
    assert.equal(tirage.bonus, 12);
    assert.equal(tirage.stock_habituel, 3);
    assert.equal(tirage.exp, 23);
    await Promise.all(Array.from({ length: 8 }, () => ouvrir(requete)));
    assert.equal((await ouvrir(null)).bonus, 12);
    for (let i = 0; i < 12; i++) {
        stock = await ouvrir(randomUUID());
        assert.equal(stock.stock_habituel, 3);
    }
    assert.equal(stock.bonus, 0);
    for (let i = 0; i < 3; i++)
        stock = await ouvrir(randomUUID());
    assert.equal(stock.stock, 0);
    assert.equal((await ouvrir(randomUUID())).cartes, null);
    assert.equal((await q('select count(*)::int as n from aura_mission_credits'))[0].n, 16);
    assert.equal((await q('select count(*)::int as n from boosters_bonus_ouverts'))[0].n, 13);
    const droits = (await q(`select
      has_function_privilege('authenticated','public.valider_parrainage(uuid,text,timestamptz)','execute') as valider,
      has_function_privilege('authenticated','public.reserve_booster(uuid,timestamptz)','execute') as reserve,
      has_function_privilege('authenticated','public.ouvrir_booster_exercices_v5(uuid)','execute') as ouvrir,
      has_table_privilege('authenticated','public.parrainages','select') as prive`))[0];
    assert.deepEqual(droits, { valider: false, reserve: false, ouvrir: true, prive: false });
    await db.query("select set_config('test.uid','',false)");
    await assert.rejects(() => ouvrir(null), /Connexion requise/);
    console.log('OK SQL PostgreSQL : migration idempotente, lancement Paris, 3/6/10/13, nouveau compte vérifié, refus ancien/auto-parrainage, doublons et recréation, bonus sans plafond, réserve 3h intacte, ouverture rejouée unique, EXP et collection.');
    await db.close();
})().catch(e => { console.error(e); process.exit(1); });
