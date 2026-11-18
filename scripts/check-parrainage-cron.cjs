const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), ts = require("typescript");
let envois = 0, ancienSchema = false;
const uid = "11111111-1111-4111-8111-111111111111";
const base = {
  push_subscriptions: [{ user_id: uid }], profiles: [{ id: uid, guide_id: "nora" }], boosters_notifies: [],
  boosters_illimites: [
    { user_id: uid, requete_id: "normal", ouvert_le: new Date(Date.now() - 4 * 3600_000).toISOString(), cadence_3h: true },
    { user_id: uid, requete_id: "bonus", ouvert_le: new Date(Date.now() - 600_000).toISOString(), cadence_3h: true },
  ], boosters_bonus_ouverts: [{ user_id: uid, requete_id: "bonus" }],
};
const admin = { from(table) {
  let lignes = [...base[table]];
  const q = { select: () => q, order: () => q, upsert: () => q,
    eq(k, v) { lignes = lignes.filter(l => l[k] === v); return q; },
    in(k, v) { lignes = lignes.filter(l => v.includes(l[k])); return q; },
    range(a, b) { lignes = lignes.slice(a, b + 1); return q; },
    then(resolve, reject) { return Promise.resolve({ data: lignes, error: ancienSchema && table === "boosters_bonus_ouverts" ? { code: "PGRST205" } : null }).then(resolve, reject); },
  }; return q;
} };
const moduleTest = { exports: {} };
const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "../src/app/api/cron/boosters/route.ts"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
new Function("require", "module", "exports", code)(id => {
  if (id === "next/server") return { NextResponse: { json: (data, opts) => new Response(JSON.stringify(data), opts) } };
  if (id.endsWith("supabase-admin")) return { createAdminClient: () => admin };
  if (id.endsWith("notificationPrefs")) return { PAR_DEFAUT: { rappel: true }, preferencesDeLot: async () => new Map([[uid, { rappel: true }]]) };
  if (id.endsWith("pushServeur")) return { iconeGuide: () => "icone", pousserA: async () => { envois++; return 1; } };
  throw new Error(id);
}, moduleTest, moduleTest.exports);
(async () => {
  const format = Intl.DateTimeFormat;
  Intl.DateTimeFormat = function () { return { format: () => "12" }; };
  process.env.BOOSTER_CRON_KEY = "test";
  try {
    const requete = cle => new Request("https://test/", { headers: { "x-cron-key": cle } });
    let r = await moduleTest.exports.GET(requete("test")); assert.equal((await r.json()).envoyes, 1); assert.equal(envois, 1);
    r = await moduleTest.exports.GET(requete("faux")); assert.equal(r.status, 401); assert.equal(envois, 1);
    ancienSchema = true; base.boosters_illimites.pop();
    r = await moduleTest.exports.GET(requete("test")); assert.equal((await r.json()).envoyes, 1);
    console.log("OK : une ouverture bonus ne retarde pas le rappel normal ; ancien schéma et contrôle du cron préservés.");
  } finally { Intl.DateTimeFormat = format; }
})().catch(error => { console.error(error); process.exitCode = 1; });
