const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");
const root = path.resolve(__dirname, "../src");
process.env.AUTH_SECRET = "secret-local-de-test";
let compte = { id: "11111111-1111-4111-8111-111111111111" }, panne = false;
const appels = [];
const configuration = { DEBUT_PARRAINAGE: "2000-01-01T00:00:00Z" };
class Reponse extends Response {
  constructor(body, opts) { super(body, opts); this.valeurs = new Map(); this.cookies = { set: (nom, valeur, options) => this.valeurs.set(nom, { valeur, options }) }; }
  static json(data, opts) { return new Reponse(JSON.stringify(data), opts); }
  static redirect(url) { return new Reponse(null, { status: 307, headers: { Location: String(url) } }); }
}
const admin = {
  rpc: async (nom, args) => { appels.push({ nom, args }); return panne ? { data: null, error: {} } : { data: nom === "etat_parrainage" ? { actif: true, code: "a".repeat(32), amis: 3, gagnes: 10, bonus: 10 } : { valide: true }, error: null }; },
  from: () => { const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { code: "a".repeat(32) }, error: null }) }; return q; },
};
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file + ".ts"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", code)(id => {
    if (id === "next/server") return { NextResponse: Reponse };
    if (id === "@/lib/apiAuth") return { compteAppelant: async () => compte, refusAuth: () => new Response(null, { status: 401 }) };
    if (id === "@/lib/supabase-admin") return { createAdminClient: () => admin };
    if (id === "@/lib/parrainage") return configuration;
    if (id.startsWith("node:")) return require(id);
    return load(id.startsWith("@/") ? id.slice(2) : path.posix.normalize(path.posix.join(path.posix.dirname(file), id)));
  }, mod, mod.exports);
  cache.set(file, mod.exports); return mod.exports;
}
const req = (url, cookie, opts) => {
  const r = new Request(url, opts); r.cookies = { get: () => cookie ? { value: cookie } : undefined }; return r;
};

(async () => {
  const { signerInvitation, lireInvitation, COOKIE_PARRAINAGE } = load("lib/parrainageServeur");
  const code = "a".repeat(32), cookie = signerInvitation(code);
  assert.equal(lireInvitation(cookie).code, code);
  assert.equal(lireInvitation(cookie.replace(/^a/, "b")), null);
  assert.equal(lireInvitation(signerInvitation(code, Date.now() - 8 * 86400_000)), null);
  assert.equal(lireInvitation(signerInvitation(code, Date.now() + 120_000)), null);
  assert.equal(lireInvitation(cookie + ".autre"), null);
  const api = load("app/api/parrainage/route");
  let r = await api.GET(req("https://test/api/parrainage"));
  assert.equal(r.status, 200); assert.match(r.headers.get("Cache-Control"), /no-store/);
  assert.equal((await r.json()).gagnes, 10);
  await api.POST(req("https://test/", cookie, { method: "POST", body: JSON.stringify({ p_user: "autre", p_code: "faux" }) }));
  assert.equal(appels.at(-1).args.p_user, compte.id); assert.equal(appels.at(-1).args.p_code, code);
  const n = appels.length; await api.POST(req("https://test/", "faux", { method: "POST" })); assert.equal(appels.length, n);
  compte = null; assert.equal((await api.GET(req("https://test/"))).status, 401); assert.equal((await api.POST(req("https://test/", cookie, { method: "POST" }))).status, 401);
  compte = { id: "11111111-1111-4111-8111-111111111111" }; panne = true;
  assert.equal((await api.GET(req("https://test/"))).status, 503); panne = false;
  const invitation = load("app/invitation/[code]/route");
  const ouvrir = (code, cookie, headers) => invitation.GET(req("https://vaiiya.fr/invitation/" + code, cookie, { headers }), { params: Promise.resolve({ code }) });
  r = await ouvrir(code); assert.equal(r.status, 307); assert.equal(r.headers.get("Location"), "https://vaiiya.fr/premiers-pas");
  const pose = r.valeurs.get(COOKIE_PARRAINAGE); assert(pose.options.httpOnly); assert.equal(pose.options.sameSite, "lax"); assert.equal(lireInvitation(pose.valeur).code, code);
  assert.equal((await ouvrir("b".repeat(32), cookie)).valeurs.size, 0); // premier lien conservé
  assert.equal((await ouvrir(code, undefined, { "sec-fetch-dest": "image" })).valeurs.size, 0); // pas d'association cachée
  assert.equal((await ouvrir("code-invalide")).valeurs.size, 0);
  configuration.DEBUT_PARRAINAGE = new Date(Date.now() + 86400_000).toISOString();
  assert.equal((await ouvrir(code)).valeurs.size, 0);
  delete process.env.AUTH_SECRET; assert.equal(lireInvitation(cookie), null);
  console.log("OK : authentification, identité serveur, preuve signée et expiration, Google via cookie HTTP-only, premier lien conservé, refus des inclusions cachées, lancement différé, base indisponible.");
})().catch(error => { console.error(error); process.exitCode = 1; });
