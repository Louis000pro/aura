/* ════════════════════════════════════════════════════════════════════
   check:destination — le banc de la seule valeur que l'app accepte de
   l'extérieur pour décider où renvoyer quelqu'un : `?next=`.

     npm run check:destination

   ⚠️ IL EXERCE LE VRAI `src/lib/destinationInterne.ts`, pas une recopie.
   La fonction est pure (aucun accès au DOM, une origine factice en dur),
   donc la décision entière se vérifie hors ligne.

   CE QU'IL PROTÈGE, ET C'EST UNE FAILLE QUI A EXISTÉ : le test d'origine
   ne peut pas s'écrire comme une liste de préfixes interdits. Le navigateur
   NORMALISE le chemin avant de le résoudre (il remplace `\` par `/`, il
   supprime tabulations et retours à la ligne), donc `/\evil.com` sortait du
   site en passant un test qui n'écartait que `//`. Mesuré dans Chromium :
   les quatre vecteurs marqués ci-dessous résolvaient en `http://evil.com/`.

   La règle du banc : TOUT vecteur accepté doit, une fois résolu contre une
   origine quelconque, rester sur cette origine. C'est la propriété, pas la
   liste ; un vecteur qu'on n'a pas imaginé est donc couvert lui aussi.
   ════════════════════════════════════════════════════════════════════ */
import { destinationInterne, destinationDepuisUrl } from "@/lib/destinationInterne";

let echecs = 0;
function verdict(nom: string, bon: boolean, detail = "") {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + (detail ? " — " + detail : ""));
}

const ORIGINE = "https://vaiiya.fr";

/** Ce que le navigateur ferait réellement du chemin rendu. */
function sortDuSite(chemin: string): boolean {
  try {
    return new URL(chemin, ORIGINE).origin !== ORIGINE;
  } catch {
    return true;
  }
}

/* ── 1 · Les vecteurs qui doivent être REFUSÉS ───────────────────────── */
const refuses: [string, string][] = [
  ["//evil.com", "protocole-relatif, le cas historique"],
  ["/\\evil.com", "⚠️ la faille mesurée : le navigateur lit `\\` comme `/`"],
  ["/\\/evil.com", "⚠️ même famille"],
  ["/\t/evil.com", "⚠️ la tabulation est SUPPRIMÉE avant résolution"],
  ["/\n/evil.com", "⚠️ le retour à la ligne aussi"],
  ["/\r/evil.com", "⚠️ le retour chariot aussi"],
  ["/\\\t/evil.com", "les deux ensemble"],
  ["///evil.com", "trois barres"],
  ["/..//evil.com", "normalisé en `//evil.com` : refusé sur la SORTIE"],
  ["https://evil.com", "URL absolue"],
  ["http://evil.com", "URL absolue"],
  ["//evil.com/chemin", "protocole-relatif avec chemin"],
  ["javascript:alert(1)", "autre protocole"],
  ["data:text/html,<script>1</script>", "autre protocole"],
  ["mailto:a@b.fr", "autre protocole"],
  [" //evil.com", "espace de tête : ce n'est plus un chemin absolu"],
  ["communaute", "chemin relatif : jamais accepté, on ne l'ouvre pas"],
  ["", "vide"],
];

for (const [vecteur, pourquoi] of refuses) {
  const r = destinationInterne(vecteur, "/");
  verdict(
    "refuse " + JSON.stringify(vecteur),
    r === "/",
    pourquoi + " → rendu " + JSON.stringify(r),
  );
}

verdict("refuse null", destinationInterne(null) === "/");
verdict("refuse undefined", destinationInterne(undefined) === "/");
verdict("le défaut est respecté", destinationInterne("//evil.com", "/communaute") === "/communaute");

/* ── 2 · Les chemins légitimes passent INTACTS ───────────────────────── */
const acceptes: string[] = [
  "/",
  "/communaute",
  "/communaute/12345",
  "/communaute?amis=demandes",
  "/progression#semaine",
  "/exercices/developpe-couche",
  "/premium?welcome=1",
  "/communaute/abc?x=1&y=2#z",
  "/%2F%2Fevil.com",
  "/evil.com",
  "/rejoindre/AB12CD",
];

for (const chemin of acceptes) {
  const r = destinationInterne(chemin, "/");
  verdict("garde " + JSON.stringify(chemin), r === chemin, "rendu " + JSON.stringify(r));
}

/* ── 3 · LA PROPRIÉTÉ, et c'est elle qui couvre ce qu'on n'a pas imaginé :
      rien de ce qui est accepté ne doit sortir de l'origine. ─────────── */
const balayage: string[] = [];
const separateurs = ["/", "\\", "\t", "\n", "\r", "\f", "\v", " ", "%09", "%2F", "%5C", "."];
for (const a of separateurs) {
  for (const b of separateurs) {
    balayage.push(`/${a}${b}evil.com`);
    balayage.push(`/${a}evil.com${b}`);
  }
}
let fuites = 0;
for (const vecteur of balayage) {
  const r = destinationInterne(vecteur, "/");
  if (r !== "/" && sortDuSite(r)) {
    fuites++;
    console.log("    FUITE " + JSON.stringify(vecteur) + " → " + JSON.stringify(r));
  }
}
verdict(
  `aucun des ${balayage.length} vecteurs composés ne sort de l'origine`,
  fuites === 0,
  fuites ? fuites + " fuite(s)" : "12 séparateurs croisés, deux formes chacun",
);

/* Et tous les chemins légitimes restent bien chez nous, évidemment. */
verdict(
  "les chemins légitimes restent sur l'origine",
  acceptes.every((c) => !sortDuSite(destinationInterne(c, "/"))),
);

/* ── 4 · `destinationDepuisUrl` hors navigateur rend son défaut ──────── */
verdict(
  "sans window, le défaut est rendu",
  destinationDepuisUrl("/repli") === "/repli",
  "la fonction est appelée côté serveur par des composants clients",
);

/* ── 5 · SOURCE · une seule porte pour le `?next=` ───────────────────── */
import { readFileSync } from "node:fs";
import path from "node:path";
const RACINE = path.resolve(import.meta.dirname, "..");
const lus: string[] = [];
for (const f of [
  "src/app/auth/page.tsx",
  "src/components/GardeGuide.tsx",
  "src/lib/destinationInterne.ts",
]) {
  lus.push(readFileSync(path.join(RACINE, f), "utf8"));
}
const tout = lus.join("\n");
const brut = tout.match(/get\(["']next["']\)/g) ?? [];
verdict(
  "le `?next=` ne se lit qu'à un seul endroit",
  brut.length === 1,
  brut.length + " lecture(s) — elle doit vivre dans destinationInterne.ts",
);
verdict(
  "destinationInterne résout au lieu de deviner",
  /new URL\(brut, BASE\)/.test(lus[2]) && /u\.origin !== BASE/.test(lus[2]),
  "sans résolution, la liste des caractères à écarter est à deviner",
);
verdict(
  "la sortie est revérifiée",
  /chemin\.startsWith\("\/\/"\)/.test(lus[2]),
  "`/..//evil.com` se normalise en `//evil.com`",
);

console.log(echecs ? `\n${echecs} échec(s).` : "\nTout passe.");
process.exit(echecs ? 1 : 0);
