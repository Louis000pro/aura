/* ════════════════════════════════════════════════════════════════════
   check:ouverture · le banc de l'ouverture de la conversation.

     npm run check:ouverture

   Quand on ouvre la conversation, le Guide parle en premier, et de ta
   journée (Louis, 2026-10-20). Ce banc exerce le VRAI module
   (`lib/ouvertureGuide.ts`) et les VRAIES phrases (`lib/guides.ts`) : le
   choix est pur, donc il se vérifie hors ligne sur une app pourtant
   derrière la connexion.

   Ce qu'il tient :
   · l'ordre (une séance en pause avant tout, rien d'affirmé avant d'avoir lu) ;
   · ce que dit chaque situation, et les réponses qu'elle propose ;
   · la flamme (à partir de trois jours, la nouvelle flamme le jour où elle arrive) ;
   · la typographie, aucun accord de genre, aucun reproche, pas d'étincelle ;
   · le chemin : aucun appel d'IA, l'ouverture entre dans le fil à la réponse.
   ════════════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";
import path from "node:path";
import { composerOuverture, situationDuJour, estSoir, SERIE_DITE, type FaitsOuverture, type Ouverture, type SituationOuverture } from "@/lib/ouvertureGuide";
import type { EtatJournee } from "@/lib/journee";

let echecs = 0;
let total = 0;
function verdict(nom: string, bon: boolean, detail = "") {
  total++;
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + (detail ? " · " + detail : ""));
}

const RACINE = path.resolve(import.meta.dirname, "..");
const lire = (f: string) => readFileSync(path.join(RACINE, f), "utf8");
const NBSP = "\u00a0";

function faits(p: Partial<FaitsOuverture> = {}): FaitsOuverture {
  return { reprise: null, etat: "libre", titreJour: null, etape: null, quand: null, minutes: null, ...p };
}
function ouvrir(s: SituationOuverture, p: Partial<Parameters<typeof composerOuverture>[1]> = {}): Ouverture {
  return composerOuverture("sasha", { situation: s, pseudo: "louisdml", serie: null, heure: 20, peutLancer: true, coach: true, ...p });
}
const textes = (o: Ouverture) => o.brouillons.map((b) => b.texte);

/* ── 1. L'ordre ─────────────────────────────────────────────────────── */
{
  const s = situationDuJour(faits({ reprise: { titre: "Express 12", exerciceIdx: 2, total: 5 }, etat: "seance", titreJour: "Push" }));
  verdict("une séance en pause passe avant la séance du jour", s?.genre === "reprise", JSON.stringify(s));
  const s2 = situationDuJour(faits({ reprise: { titre: "Express 12", exerciceIdx: 0, total: 5 }, etat: "loading" }));
  verdict("la séance en pause se dit même avant que la journée soit lue", s2?.genre === "reprise");
  verdict("rien n'est affirmé tant que la journée n'est pas lue", situationDuJour(faits({ etat: "loading" })) === null);
  const attendus: [EtatJournee, string][] = [
    ["repos", "repos"], ["libre", "libre"], ["setup", "aucune"], ["indisponible", "aucune"], ["aucune_compatible", "aucune"],
  ];
  for (const [etat, genre] of attendus) {
    verdict(`état « ${etat} » → ${genre}`, situationDuJour(faits({ etat }))?.genre === genre);
  }
  verdict("« seance » sans titre ne dit pas une séance vide", situationDuJour(faits({ etat: "seance" }))?.genre === "aucune");
  verdict("« etape » sans étape ne dit pas une étape vide", situationDuJour(faits({ etat: "etape" }))?.genre === "aucune");
}

/* ── 2. Ce que dit chaque situation ─────────────────────────────────── */
{
  const reprise = ouvrir(situationDuJour(faits({ reprise: { titre: "Express 12", exerciceIdx: 2, total: 5 } }))!);
  verdict("reprise : nomme la séance et le mouvement", reprise.bulles[1] === `Ta séance «${NBSP}Express 12${NBSP}» est en pause, au mouvement 3 sur 5. On la termine${NBSP}?`, reprise.bulles[1]);
  verdict("reprise : « On la termine » reprend, sans passer par le coach", reprise.brouillons[0]?.texte === "On la termine" && reprise.brouillons[0]?.action === "reprendre");
  const horsLimite = situationDuJour(faits({ reprise: { titre: "Express 12", exerciceIdx: 9, total: 5 } }));
  verdict("reprise : un mouvement hors limites est ramené au dernier", horsLimite?.genre === "reprise" && horsLimite.position === 5);
  const unSeul = ouvrir(situationDuJour(faits({ reprise: { titre: "Gainage", exerciceIdx: 0, total: 1 } }))!);
  verdict("reprise : une séance d'un seul mouvement ne dit pas « 1 sur 1 »", !unSeul.bulles[1].includes("sur 1"), unSeul.bulles[1]);

  const seance = ouvrir(situationDuJour(faits({ etat: "seance", titreJour: "Push", minutes: 45 }))!);
  verdict("séance du jour : le titre, la durée, la question", seance.bulles[1] === `Aujourd’hui, c’est «${NBSP}Push${NBSP}», environ 45${NBSP}min. On y va${NBSP}?`, seance.bulles[1]);
  verdict("séance du jour : « On y va » lance, en premier", seance.brouillons[0]?.texte === "On y va" && seance.brouillons[0]?.action === "lancer");
  verdict("séance du jour : décaler et raccourcir partent au coach",
    textes(seance).includes("Décale-la à demain") && textes(seance).includes("J’ai moins de temps aujourd’hui")
    && seance.brouillons.slice(1).every((b) => !b.action));
  const sansDuree = ouvrir(situationDuJour(faits({ etat: "seance", titreJour: "Push" }))!);
  verdict("séance du jour : sans estimation, aucune durée inventée", !/min/.test(sansDuree.bulles[1]), sansDuree.bulles[1]);

  const etapeAujourdhui = situationDuJour(faits({ etat: "etape", etape: "Pull", quand: "aujourd’hui", minutes: 40 }));
  verdict("étape prévue aujourd'hui = la séance du jour", etapeAujourdhui?.genre === "seance");
  const etapeMardi = ouvrir(situationDuJour(faits({ etat: "etape", etape: "Pull", quand: "mardi 8" }))!);
  verdict("étape d'un autre jour : elle dit le jour", etapeMardi.bulles[1] === `Ta prochaine séance, c’est «${NBSP}Pull${NBSP}», prévue mardi 8.`, etapeMardi.bulles[1]);
  const etapeLibre = ouvrir(situationDuJour(faits({ etat: "etape", etape: "Pull" }))!);
  verdict("étape sans jour : « quand tu veux », jamais un jour inventé", etapeLibre.bulles[1].endsWith("quand tu veux."), etapeLibre.bulles[1]);
  verdict("étape : « On la fait maintenant » lance", etapeLibre.brouillons[0]?.action === "lancer");

  const faite = ouvrir(situationDuJour(faits({ etat: "done", titreJour: "Push" }))!);
  verdict("séance faite : elle le dit, et rien n'est à relancer", faite.bulles[1].includes("est faite") && faite.brouillons.every((b) => !b.action), faite.bulles[1]);
  const repos = ouvrir({ genre: "repos" });
  verdict("repos : il le dit comme un choix", repos.bulles[1].startsWith("Aujourd’hui, c’est repos."));
  const libre = ouvrir({ genre: "libre" });
  verdict("libre : jamais appelé « repos »", !/repos/i.test(libre.bulles[1]), libre.bulles[1]);
  const aucune = ouvrir({ genre: "aucune" });
  verdict("aucune : l'invitation générale et ses quatre réponses", aucune.bulles[1] === "Dis-moi où tu en es aujourd’hui." && aucune.brouillons.length === 4);
}

/* ── 3. Le salut et la flamme ───────────────────────────────────────── */
{
  verdict("le soir commence à 18 h et finit à 5 h", estSoir(18) && estSoir(23) && estSoir(4) && !estSoir(5) && !estSoir(17));
  verdict("le soir : « Bonsoir »", ouvrir({ genre: "libre" }, { heure: 20 }).bulles[0] === "Bonsoir, louisdml.");
  verdict("le jour : « Salut »", ouvrir({ genre: "libre" }, { heure: 10 }).bulles[0] === "Salut, louisdml.");
  verdict("sans pseudo : le salut tient seul", ouvrir({ genre: "libre" }, { pseudo: null, heure: 10 }).bulles[0] === "Salut.");
  verdict("la flamme se tait sous trois jours", ouvrir({ genre: "libre" }, { serie: SERIE_DITE - 1 }).bulles[0] === "Bonsoir, louisdml.");
  verdict("la flamme se tait quand la série n'est pas lue", ouvrir({ genre: "libre" }, { serie: null }).bulles[0] === "Bonsoir, louisdml.");
  const douze = ouvrir({ genre: "libre" }, { serie: 12 }).bulles[0];
  verdict("douze jours : en lettres, comme sur la maquette", douze.startsWith("Bonsoir, louisdml. Douze jours d’affilée, "), douze);
  const sept = ouvrir({ genre: "libre" }, { serie: 7 }).bulles[0];
  verdict("le jour d'une flamme, c'est elle qu'on dit", sept === `Bonsoir, louisdml. Sept jours d’affilée${NBSP}: ta flamme devient le Feu.`, sept);
  const trente = ouvrir({ genre: "libre" }, { serie: 30 }).bulles[0];
  verdict("trente jours : le Brasier", trente.endsWith("Trente jours d’affilée\u00a0: ta flamme devient le Brasier."), trente);
  const cent = ouvrir({ genre: "libre" }, { serie: 100 }).bulles[0];
  verdict("cent jours : le Feu sacré", cent.endsWith("Cent jours d’affilée\u00a0: ta flamme devient le Feu sacré."), cent);
  const qq = ouvrir({ genre: "libre" }, { serie: 45 }).bulles[0];
  verdict("au-delà de vingt : en chiffres", qq.includes("45 jours d’affilée"), qq);
}

/* ── 4. Ce qu'on propose selon ce qui est possible ──────────────────── */
{
  const s = situationDuJour(faits({ etat: "seance", titreJour: "Push" }))!;
  verdict("rien à lancer : « On y va » disparaît", !ouvrir(s, { peutLancer: false }).brouillons.some((b) => b.action === "lancer"));
  const epuise = ouvrir(s, { coach: false });
  verdict("plus de messages aujourd'hui : il ne reste que ce qui agit", epuise.brouillons.length === 1 && epuise.brouillons[0].action === "lancer");
  const reprise = ouvrir(situationDuJour(faits({ reprise: { titre: "Express 12", exerciceIdx: 0, total: 3 } }))!, { coach: false, peutLancer: false });
  verdict("reprendre reste possible sans coach et sans séance à lancer", reprise.brouillons.length === 1 && reprise.brouillons[0].action === "reprendre");
  const midi = ouvrir({ genre: "repos" }, { heure: 11 });
  const soir = ouvrir({ genre: "repos" }, { heure: 19 });
  verdict("le repas se dit selon l'heure", textes(midi).includes(`Je mange quoi ce midi${NBSP}?`) && textes(soir).includes(`Je mange quoi ce soir${NBSP}?`));
}

/* ── 5. Toutes les phrases, relues ──────────────────────────────────── */
{
  const situations: SituationOuverture[] = [
    { genre: "reprise", titre: "Haut du corps", position: 2, total: 6 },
    { genre: "reprise", titre: "Gainage", position: null, total: null },
    { genre: "seance", titre: "Push", minutes: 45 },
    { genre: "seance", titre: "Bas du corps", minutes: null },
    { genre: "etape", titre: "Pull", quand: "demain", minutes: 40 },
    { genre: "etape", titre: "Pull", quand: null, minutes: null },
    { genre: "faite", titre: "Push" },
    { genre: "faite", titre: null },
    { genre: "repos" }, { genre: "libre" }, { genre: "aucune" },
  ];
  const tout: string[] = [];
  for (const s of situations) {
    for (const heure of [3, 8, 12, 16, 21]) {
      for (const serie of [null, 0, 1, 2, 3, 6, 7, 12, 29, 30, 45, 100, 116]) {
        for (const guide of ["nora", "sasha", null] as const) {
          const o = composerOuverture(guide, { situation: s, pseudo: "louisdml", serie, heure, peutLancer: true, coach: true });
          tout.push(...o.bulles, ...o.brouillons.map((b) => b.texte));
        }
      }
    }
  }
  const uniques = [...new Set(tout)];
  const fautes = (test: (t: string) => boolean) => uniques.filter(test);
  let f = fautes((t) => t.includes(String.fromCharCode(0x2014)));
  verdict("aucun tiret cadratin", f.length === 0, f.slice(0, 2).join(" | "));
  f = fautes((t) => t.includes("'"));
  verdict("apostrophes courbes partout", f.length === 0, f.slice(0, 2).join(" | "));
  f = fautes((t) => {
    for (let i = 0; i < t.length; i++) {
      if (!"?!;:»".includes(t[i])) continue;
      if (t[i] === ":" && /\d/.test(t[i - 1] ?? "") && /\d/.test(t[i + 1] ?? "")) continue; // une heure
      if (t[i - 1] !== NBSP) return true;
    }
    return false;
  });
  verdict("une espace insécable avant ? : ! ; et »", f.length === 0, f.slice(0, 2).join(" | "));
  f = fautes((t) => /«[^\u00a0]/.test(t));
  verdict("une espace insécable après «", f.length === 0, f.slice(0, 2).join(" | "));
  f = fautes((t) => /\b(prêt|prête|content|contente|fier|fière|motivé|motivée|fatigué|fatiguée|seul|seule)\b|\(e\)/i.test(t));
  verdict("aucun accord de genre", f.length === 0, f.slice(0, 2).join(" | "));
  f = fautes((t) => /raté|manqué|dommage|oubli|abandonn|il faudrait|tu aurais dû|en retard/i.test(t));
  verdict("jamais un reproche", f.length === 0, f.slice(0, 2).join(" | "));
  f = fautes((t) => t.includes("✦"));
  verdict("pas d'étincelle dans la bouche du Guide", f.length === 0, f.slice(0, 2).join(" | "));
  verdict("Nora et Sasha disent la même chose", situations.every((s) => {
    const a = composerOuverture("nora", { situation: s, pseudo: "x", serie: 12, heure: 20, peutLancer: true, coach: true });
    const b = composerOuverture("sasha", { situation: s, pseudo: "x", serie: 12, heure: 20, peutLancer: true, coach: true });
    return JSON.stringify(a) === JSON.stringify(b);
  }));
}

/* ── 6. Le chemin, lu dans le source ────────────────────────────────── */
{
  const module = lire("src/lib/ouvertureGuide.ts");
  const imports = [...module.matchAll(/^import\s.*?from\s+"([^"]+)"/gm)].map((m) => m[1]);
  verdict("le module ne lit rien : il n'importe que les phrases, la flamme et un type",
    imports.every((i) => ["./guides", "./flammesSerie", "./journee"].includes(i))
    && /import type \{ EtatJournee \} from "\.\/journee"/.test(module), imports.join(", "));
  verdict("le module ne lit pas l'horloge", !/new Date\(|Date\.now\(/.test(module));

  const composant = lire("src/components/assistant/OuvertureGuide.tsx");
  verdict("l'ouverture ne fait aucun appel d'IA", !/aiFetch|\/api\/|fetch\(/.test(composant));
  verdict("la série vient de la même source que la flamme de l'accueil", composant.includes("calculerAura("));
  verdict("« On la termine » passe par la reprise du lanceur global", /action === "reprendre"\)\s*\{\s*reprendre\(\);/.test(composant));
  verdict("« On y va » passe par le bouton du héros", /action === "lancer"\)\s*\{\s*j\.lancerAujourdhui\(\);/.test(composant));
  verdict("la mention IA reste visible avant de parler", composant.includes("Réponses générées par une IA"));
  verdict("l'ouverture dite est notée pour le prochain envoi, puis oubliée", /noterOuverture\(ouverture \? ouverture\.bulles : null\)/.test(composant) && /return \(\) => noterOuverture\(null\)/.test(composant));

  const feuille = lire("src/components/AssistantSheet.tsx");
  verdict("la feuille ne monte l'ouverture que sur une conversation vide", /messages\.length === 0 && \([\s\S]{0,240}<OuvertureGuide \/>/.test(feuille));
  verdict("plus de suggestions figées dans la feuille", !/const SUGGESTIONS/.test(feuille));

  const ctx = lire("src/context/AssistantContext.tsx");
  verdict("le premier envoi emporte l'ouverture, seulement sur un fil vide", /messages\.length === 0 \? ouvertureRef\.current : null/.test(ctx));
  verdict("un tour masqué de la personne passe devant les bulles du Guide", /content: "J’ouvre la conversation\.", id: uid\(\), masque: true/.test(ctx));
  verdict("le coach reçoit l'ouverture devant la réponse", /\[\.\.\.messages, \.\.\.prelude, userMsg\]\.slice\(-10\)/.test(ctx));
  verdict("le fil la garde aussi, à sa place", /\[\.\.\.prev, \.\.\.prelude, userMsg,/.test(ctx));
}

console.log(`\n${total - echecs}/${total} contrôles passent.`);
if (echecs > 0) {
  console.error(`${echecs} échec(s).`);
  process.exit(1);
}
