const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "../src");
const uid = "11111111-1111-4111-8111-111111111111";
const now = new Date().toISOString();
const old = new Date(Date.now() - 31 * 86400_000).toISOString();
let adminAutorise = true, journalManquant = false;
const tables = {
  profiles: [{ id: uid, pseudo: "Exemple", guide_id: "nora" }],
  boosters_illimites: [{ user_id: uid, requete_id: "booster", ouvert_le: now, cadence_3h: true, cartes: [{ exercice: "crunch", rarete: "epique" }] }],
  boosters_exercices: [{ user_id: uid, jour: now.slice(0, 10), cartes: [] }],
  boosters_notifies: [{ user_id: uid, dernier_envoi: now }],
  journal_push: [{ id: "ancien-clic", user_id: uid, cree_le: old, touche_le: now, termine_le: old, titre: "Ancien rappel", categorie: "rappel", statut: "accepte", appareils: 1, acceptes: 1, echecs: 0, codes_erreur: [] }],
  push_subscriptions: [{ user_id: uid, endpoint: "bon", p256dh: "secret", auth: "secret" }, { user_id: uid, endpoint: "expire", p256dh: "secret", auth: "secret" }],
};
const db = { from(table) {
  let rows = [...(tables[table] ?? [])], action = "select", value, counts = false;
  const q = {
    select(_cols, opts) { counts = opts?.count === "exact"; return q; },
    insert(v) { action = "insert"; value = v; return q; },
    update(v) { action = "update"; value = v; return q; },
    delete() { action = "delete"; return q; },
    eq(k, v) { rows = rows.filter(r => r[k] === v); return q; },
    is(k, v) { rows = rows.filter(r => (r[k] ?? null) === v); return q; },
    gte(k, v) { rows = rows.filter(r => r[k] && r[k] >= v); return q; },
    match(v) { for (const [k, x] of Object.entries(v)) q.eq(k, x); return q; },
    order(k, opts) { rows.sort((a, b) => String(a[k]).localeCompare(String(b[k])) * (opts?.ascending === false ? -1 : 1)); return q; },
    limit(n) { rows = rows.slice(0, n); return q; },
    range(a, b) { rows = rows.slice(a, b + 1); return q; }, abortSignal() { return q; },
    then(resolve, reject) {
      if (journalManquant && table === "journal_push") return Promise.resolve({ data: null, error: { code: "PGRST205" } }).then(resolve, reject);
      if (action === "insert") { value.cree_le ??= new Date().toISOString(); (tables[table] ??= []).push(value); }
      if (action === "update") rows.forEach(r => Object.assign(r, value));
      if (action === "delete") tables[table] = tables[table].filter(r => !rows.includes(r));
      return Promise.resolve({ data: action === "select" ? rows : null, error: null, count: counts ? rows.length : null }).then(resolve, reject);
    },
  }; return q;
}, rpc: async () => ({ data: { stock: 2, prochain: now }, error: null }) };
const cache = new Map(); let payload;
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} }; cache.set(file, module.exports);
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file + ".ts"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", code)((id) => {
    if (id === "node:crypto") return crypto;
    if (id === "web-push") return { __esModule: true, default: { setVapidDetails() {}, async sendNotification(sub, charge) {
      payload = JSON.parse(charge); if (sub.endpoint === "expire") throw { statusCode: 410 };
    } } };
    if (id === "@/lib/adminGuard") return { exigerAdmin: async () => adminAutorise ? { ok: true, admin: db, userId: uid } : { ok: false, reponse: new Response(null, { status: 403 }) } };
    if (id.endsWith("supabase-admin")) return { createAdminClient: () => db };
    if (id === "@/lib/notificationPrefs") return { preferencesDe: async () => ({ rappel: false }) };
    return load(id.startsWith("@/") ? id.slice(2) : path.posix.normalize(path.posix.join(path.posix.dirname(file), id)));
  }, module, module.exports);
  cache.set(file, module.exports); return module.exports;
}

(async () => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test"; process.env.VAPID_PRIVATE_KEY = "test";
  const { pousserA } = load("lib/pushServeur");
  assert.equal(await pousserA(db, uid, { title: "Ton booster est prêt", body: "Contenu privé NON journalisé", categorie: "booster" }), 1);
  const ligne = tables.journal_push.at(-1);
  const chargeSuivie = payload.suivi;
  assert.equal(ligne.statut, "partiel"); assert.equal(ligne.acceptes, 1); assert.equal(ligne.echecs, 1);
  assert.deepEqual(ligne.codes_erreur, [410]); assert(!JSON.stringify(ligne).includes("Contenu privé"));
  assert.equal(crypto.createHash("sha256").update(payload.suivi.token).digest("hex"), ligne.token_hash);
  assert.equal(tables.push_subscriptions.length, 1);
  const { POST } = load("app/api/notifications/touchee/route");
  const toucher = data => POST(new Request("https://test/", { method: "POST", body: JSON.stringify(data) }));
  assert.equal((await toucher({ id: ligne.id, token: "f".repeat(64) })).status, 204); assert(!ligne.touche_le);
  assert.equal((await toucher(payload.suivi)).status, 204); assert(ligne.touche_le);
  const premiere = ligne.touche_le; await toucher(payload.suivi); assert.equal(ligne.touche_le, premiere);
  assert.equal((await toucher({ id: "non", token: "non" })).status, 400);
  const { GET } = load("app/api/admin/suivi/route");
  let response = await GET(new Request("https://test/?membre=" + uid)); assert.equal(response.status, 200);
  let result = await response.json(); assert.match(response.headers.get("Cache-Control"), /no-store/);
  assert(result.journalActif); assert.equal(result.fiche.stock, 2); assert.equal(result.fiche.rappel, false);
  assert(result.evenements.some(e => e.id === "clic:ancien-clic")); assert(!result.evenements.some(e => e.id === "push:ancien-clic"));
  assert.equal(result.evenements.filter(e => e.type === "push").length, 1); // dernier rappel dédoublonné
  assert(result.evenements.some(e => e.type === "booster" && !e.heureConnue));
  assert(!JSON.stringify(result).includes(ligne.token_hash)); assert(!JSON.stringify(result).includes(payload.suivi.token));
  assert.equal((await GET(new Request("https://test/?jours=999"))).status, 400);
  response = await GET(new Request("https://test/?limite=1")); result = await response.json(); assert(result.suite); assert.equal(result.evenements.length, 1);
  adminAutorise = false; assert.equal((await GET(new Request("https://test/"))).status, 403); adminAutorise = true;
  journalManquant = true;
  assert.equal(await pousserA(db, uid, { title: "Rappel", body: "Test" }), 1);
  result = await (await GET(new Request("https://test/"))).json(); assert(!result.journalActif); assert(result.evenements.length > 0);
  journalManquant = false;
  tables.push_subscriptions = []; await pousserA(db, uid, { title: "Rappel", body: "Test" }); assert.equal(tables.journal_push.at(-1).statut, "sans_appareil");
  const callbacks = {}, waits = []; let notification, tracking, opened = false;
  const sw = fs.readFileSync(path.resolve(__dirname, "../public/sw.js"), "utf8").split('// ── Push Notifications')[1].split("\n").slice(1).join("\n");
  vm.runInNewContext(sw, { self: { addEventListener: (n, cb) => callbacks[n] = cb,
    registration: { showNotification: async (_t, options) => { notification = options; } },
    clients: { matchAll: async () => [], openWindow: async () => { opened = true; } } },
    AbortController, setTimeout, clearTimeout, fetch: async (_u, opts) => { tracking = JSON.parse(opts.body); } });
  callbacks.push({ data: { json: () => ({ title: "Test", suivi: chargeSuivie }) }, waitUntil: p => waits.push(p) }); await Promise.all(waits);
  callbacks.notificationclick({ notification: { ...notification, close() {} }, waitUntil: p => waits.push(p) }); await Promise.all(waits);
  assert.deepEqual(JSON.parse(JSON.stringify(tracking)), chargeSuivie); assert(opened);
  console.log("OK : administration protégée, filtres, heures historiques honnêtes, clics anciens, pagination, dédoublonnage, envois partiels, clés privées absentes, jeton de clic, idempotence, table absente sans perte d’envoi, service worker.");
})().catch(error => { console.error(error); process.exitCode = 1; });
