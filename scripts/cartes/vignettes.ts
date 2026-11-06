/* ════════════════════════════════════════════════════════════════════
   npm run cartes · LES VIGNETTES DES CARTES, CUITES PAR LE VRAI MOTEUR.

   La collection n'affiche qu'UNE carte vivante à la fois : le reste, ce
   sont ces images, dessinées par `src/lib/cartes/moteur.ts` et `faces.ts`
   dans un Chrome sans fenêtre, à l'angle de repos. Elles n'écrivent ni
   pseudo, ni numéro, ni date : à la taille d'une vignette, ces textes
   feraient 4 px de haut, et la même image sert à tout le monde.

   La liste vient du catalogue : une carte ajoutée y entre toute seule.
   Les sources TypeScript sont transpilées puis servies telles quelles,
   donc la cuisson ne peut pas diverger de l'app.

   ⚠️ Il faut Chrome et le réseau (les polices viennent de Google Fonts).
   ⚠️ Rien de tout ça ne tourne au build : les images sont dans le dépôt.
   ════════════════════════════════════════════════════════════════════ */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import { construireCollection, toutes, type CarteDef } from "@/lib/cartes/catalogue";

const RACINE = process.cwd();
const PUBLIC = path.join(RACINE, "public");
const SORTIE = path.join(PUBLIC, "cartes", "v");
const PORT_WEB = 8931;
const PORT_CHROME = 9341;
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const JS: Record<string, string> = {};
for (const nom of ["moteur", "faces", "matieres"]) {
  const src = readFileSync(path.join(RACINE, "src/lib/cartes", `${nom}.ts`), "utf8");
  JS[`/__cuisson/${nom}.js`] = ts.transpileModule(src, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/from "\.\/(\w+)"/g, 'from "./$1.js"');
}

const PAGE = `<!doctype html><meta charset=utf-8><title>cuisson</title>
<link rel=stylesheet href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Martian+Mono:wdth,wght@75..112.5,100..800&display=swap">
<style>body{font-family:Archivo}.vy-nombre{font-family:'Martian Mono'}</style>
<canvas id=c width=540 height=756></canvas>
<script type=module>
import { MoteurCarte } from "/__cuisson/moteur.js";
import * as F from "/__cuisson/faces.js";
const c = document.getElementById("c");
const k = new MoteurCarte(c);
window.cuire = async (o) => {
  const f = o.dos ? await F.dos(null) : o.pochette ? await F.pochette(o.pochette) : await F.fabriquer(o.face);
  const p = k.preparer(f);
  k.activer(p);
  k.dessiner(-.28, -.2, 3);
  const d = c.toDataURL("image/webp", .86);
  k.liberer(p);
  return d;
};
window.pret = true;
</script>`;

const TYPES: Record<string, string> = { ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml" };
const serveur = http.createServer((req, res) => {
  const u = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (u === "/__cuisson/page.html") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(PAGE); return; }
  if (JS[u]) { res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" }); res.end(JS[u]); return; }
  const f = path.join(PUBLIC, u);
  if (!f.startsWith(PUBLIC) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] ?? "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise<void>((r) => serveur.listen(PORT_WEB, "127.0.0.1", r));

const profil = path.join(os.tmpdir(), "vaiiya-cuisson-cartes");
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT_CHROME}`, "--remote-allow-origins=*",
  "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl",
  "--hide-scrollbars", "--mute-audio", `--user-data-dir=${profil}`, "about:blank",
], { stdio: "ignore" });

async function attendreChrome() {
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try { const r = await fetch(`http://127.0.0.1:${PORT_CHROME}/json/version`); if (r.ok) return; } catch { /* pas encore */ }
  }
  throw new Error("Chrome ne répond pas");
}

try {
  await attendreChrome();
  const cible = await (await fetch(`http://127.0.0.1:${PORT_CHROME}/json/new?about:blank`, { method: "PUT" })).json() as { webSocketDebuggerUrl: string };
  const ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const attente = new Map<number, (v: { result?: { result?: { value?: unknown }; exceptionDetails?: { text?: string; exception?: { description?: string } } } }) => void>();
  ws.onmessage = (e) => {
    const m = JSON.parse(String(e.data));
    if (m.id && attente.has(m.id)) { attente.get(m.id)?.(m); attente.delete(m.id); }
  };
  const envoi = (method: string, params: Record<string, unknown> = {}) => new Promise<{ result?: { result?: { value?: unknown }; exceptionDetails?: { text?: string; exception?: { description?: string } } } }>((res) => {
    const i = ++id;
    attente.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const lire = async (expression: string) => {
    const r = await envoi("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text);
    return r.result?.result?.value;
  };
  await envoi("Runtime.enable");
  await envoi("Page.enable");
  await envoi("Page.navigate", { url: `http://127.0.0.1:${PORT_WEB}/__cuisson/page.html` });
  for (let i = 0; !(await lire("window.pret === true").catch(() => false)); i++) {
    if (i > 200) throw new Error("La page de cuisson ne répond pas");
    await new Promise((r) => setTimeout(r, 150));
  }

  mkdirSync(SORTIE, { recursive: true });
  const faites = new Set<string>();
  const cuire = async (fichier: string, spec: object) => {
    if (faites.has(fichier)) return;
    faites.add(fichier);
    const d = await lire(`cuire(${JSON.stringify(spec)})`) as string;
    writeFileSync(path.join(PUBLIC, fichier), Buffer.from(d.split(",")[1], "base64"));
  };

  await cuire("cartes/v/dos.webp", { dos: true });
  for (const guide of ["nora", "sasha", null] as const) {
    const c = construireCollection({ pseudo: "", rangId: "eternel", serie: 0, slugs: new Set(), guide });
    for (const carte of toutes(c) as CarteDef[]) {
      if (carte.vignette) await cuire(carte.vignette.slice(1), { face: carte.face });
      if (carte.pochette && carte.vignettePochette) await cuire(carte.vignettePochette.slice(1), { pochette: carte.pochette });
    }
  }
  console.log(`✓ ${faites.size} vignettes cuites dans public/cartes/v`);
  ws.close();
} finally {
  chrome.kill();
  serveur.close();
}
process.exit(0);
