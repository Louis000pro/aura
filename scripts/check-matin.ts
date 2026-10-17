/* ═══════════════════════════════════════════════════════════════════════
   check:matin, le banc des trois rendez-vous du matin.

     npm run check:matin

   ⚠️ IL EXERCE LES VRAIES RÈGLES (`monteeSerie`, `motDuJour`,
   `mouvementDuJour`) et les vraies phrases de `guides.ts`, puis il lit la
   source des écrans qui les montrent.

   CE QU'IL PROTÈGE (Louis, 2026-10-17, page « Revenir chaque jour ») :
   · la flamme monte une seule fois, à l'ouverture où la série a grandi,
     jamais sans repère, jamais quand elle redescend ;
   · le mot du jour dit des choses vraies, sans reproche, et ne dit
     « rien de prévu » qu'une fois la journée lue ;
   · le mouvement du jour est le même pour tout le monde, animé, et la
     rotation passe par les 102 mouvements ;
   · retourner sa carte rapporte +5 EXP, une fois par jour, et seule la
     base le décide : l'écran ne fait monter « +5 » que sur sa réponse.
   ═══════════════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";
import path from "node:path";
import { decideMontee } from "@/lib/monteeSerie";
import { lignesDuMot, type PlanDuJour } from "@/lib/motDuJour";
import { mouvementDuJour, exerciceDuMouvement, carteRetournee } from "@/lib/mouvementDuJour";
import {
  EXP_CONNEXION_SUITE,
  EXP_MOUVEMENT,
  MISSIONS,
  MISSIONS_JOUR,
  MISSIONS_PREMIUM,
  PLAFOND_JOUR_GRATUIT,
  PLAFOND_JOUR_PREMIUM,
} from "@/lib/aura";
import { EXERCISE_LIBRARY } from "@/lib/exerciseLibrary";
import { resolveGuide } from "@/lib/exerciseGuides";
import { voix } from "@/lib/guides";
import type { MomentAccueil } from "@/lib/momentAccueil";

let echecs = 0;
function verdict(nom: string, bon: boolean, detail: string) {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + " · " + detail);
}

/* ── La montée ─────────────────────────────────────────────────────────── */

verdict("sans repère, on note en silence", decideMontee(null, { serie: 12, exp: 695 }) === null, "aucune montée");
verdict("même série qu'à la dernière visite : rien", decideMontee({ serie: 12, exp: 695 }, { serie: 12, exp: 725 }) === null, "aucune montée");
{
  const m = decideMontee({ serie: 11, exp: 675 }, { serie: 12, exp: 695 });
  verdict(
    "le cas réel : 11 → 12, 675 → 695 EXP",
    !!m && m.deSerie === 11 && m.aSerie === 12 && m.deExp === 675 && m.aExp === 695 && m.palierAvant === "feu" && m.palierApres === "feu",
    m ? `${m.deSerie} → ${m.aSerie}, ${m.deExp} → ${m.aExp}` : "rien",
  );
}
verdict("une série qui redescend ne joue rien", decideMontee({ serie: 12, exp: 695 }, { serie: 1, exp: 705 }) === null, "coupure");
{
  const m = decideMontee({ serie: 29, exp: 900 }, { serie: 30, exp: 920 });
  verdict("le jour d'un palier : le Feu devient Brasier", !!m && m.palierAvant === "feu" && m.palierApres === "brasier", m ? `${m.palierAvant} → ${m.palierApres}` : "rien");
}
{
  const m = decideMontee({ serie: 4, exp: 500 }, { serie: 5, exp: 470 });
  verdict("une EXP plus basse ne fabrique jamais un gain négatif", !!m && m.aExp - m.deExp === 0, m ? `+${m.aExp - m.deExp}` : "rien");
}

/* ── Le mot du jour ────────────────────────────────────────────────────── */

const dire = (lignes: ReturnType<typeof lignesDuMot>) => lignes.map((l) => voix("sasha", l.cle, l.ctx));
const etape: PlanDuJour = { etat: "etape", etape: "Bas du corps" };

{
  // Le compte de Louis le 2026-10-17 : 12 jours, prochaine étape Bas du corps.
  const phrases = dire(lignesDuMot({ moment: null, serie: 12, plan: etape }));
  verdict(
    "le cas réel, mot pour mot",
    phrases.length === 2
      && phrases[0] === "Douze jours d’affilée, ta flamme est au Feu. Plus que 18 jours avant le Brasier."
      && phrases[1] === "Ton programme te propose Bas du corps, quand tu veux.",
    phrases.join(" | "),
  );
}
{
  const [p] = dire(lignesDuMot({ moment: null, serie: 1, plan: null }));
  verdict("jour 1 : la flamme s'allume, la Flamme est à deux jours", p.startsWith("Premier jour de ta série") && p.includes("Plus que 2 jours avant la Flamme"), p);
}
{
  const [p] = dire(lignesDuMot({ moment: null, serie: 7, plan: null }));
  verdict("le jour d'un palier, le mot le dit", p === "Sept jours d’affilée : ta flamme devient le Feu.", p);
}
{
  const [p] = dire(lignesDuMot({ moment: null, serie: 140, plan: null }));
  verdict("au dernier palier, plus de « plus que »", p.includes("Feu sacré") && !p.includes("Plus que"), p);
}
{
  const p = dire(lignesDuMot({ moment: null, serie: 3, plan: null }));
  verdict("tant que la journée n'est pas lue, pas de deuxième phrase", p.length === 1, `${p.length} phrase(s)`);
}
for (const [etat, attendu] of [["done", "matin.plan.fait"], ["repos", "matin.plan.repos"], ["libre", "matin.plan.libre"], ["seance", "matin.plan.seance"]] as const) {
  const l = lignesDuMot({ moment: null, serie: 5, plan: { etat, titre: "Express 12" } });
  verdict(`journée « ${etat} » → ${attendu}`, l[l.length - 1].cle === attendu, voix("sasha", l[l.length - 1].cle, l[l.length - 1].ctx));
}
{
  const l = lignesDuMot({ moment: null, serie: 5, plan: { etat: "etape", etape: "Pull", jour: "mardi 8" } });
  verdict("une étape déjà datée dit son jour", voix("sasha", l[1].cle, l[1].ctx) === "Ta prochaine séance, Pull, est prévue mardi 8.", voix("sasha", l[1].cle, l[1].ctx));
}
{
  const retour: MomentAccueil = { cle: "absence.courte", phrase: "retour.absence.courte", etat: "welcome", ctx: {} };
  const cap: MomentAccueil = { cle: "serie", phrase: "retour.serie", etat: "encourage", ctx: { serie: 14 } };
  const avecRetour = lignesDuMot({ moment: retour, serie: 2, plan: null });
  const avecCap = lignesDuMot({ moment: cap, serie: 14, plan: null });
  verdict("le mot du Guide sur l'accueil ouvre le mot du jour", avecRetour[0].cle === "retour.absence.courte" && avecRetour.length === 2, avecRetour.map((l) => l.cle).join(", "));
  verdict("un cap de série n'est pas dit deux fois", avecCap.length === 1 && avecCap[0].cle.startsWith("matin.flamme"), avecCap.map((l) => l.cle).join(", "));
}
{
  // Aucun reproche, sur tous les cas qu'on peut fabriquer.
  const interdits = /rat[ée]|manqu|oubli|perdu|dommage|attention/i;
  const fautives: string[] = [];
  for (const serie of [1, 2, 3, 6, 7, 12, 29, 30, 99, 100, 140]) {
    for (const plan of [null, etape, { etat: "done" }, { etat: "repos" }, { etat: "libre" }, { etat: "seance", titre: "Pull" }] as (PlanDuJour | null)[]) {
      for (const p of dire(lignesDuMot({ moment: null, serie, plan }))) if (interdits.test(p)) fautives.push(p);
    }
  }
  verdict("aucune phrase du mot ne reproche quoi que ce soit", fautives.length === 0, fautives[0] ?? "aucune");
}

/* ── Le mouvement du jour ──────────────────────────────────────────────── */

verdict("le 17 octobre 2026, c'est le Bicycle crunch", mouvementDuJour("2026-10-17").name === "Bicycle crunch", mouvementDuJour("2026-10-17").name);
verdict("le même mouvement pour une même date", mouvementDuJour("2026-11-03").name === mouvementDuJour("2026-11-03").name, "déterministe");
{
  const vus = new Set<string>();
  const debut = Date.UTC(2026, 9, 17);
  for (let i = 0; i < EXERCISE_LIBRARY.length; i++) vus.add(mouvementDuJour(new Date(debut + i * 86_400_000).toISOString().slice(0, 10)).name);
  verdict(`en ${EXERCISE_LIBRARY.length} jours, les ${EXERCISE_LIBRARY.length} mouvements passent`, vus.size === EXERCISE_LIBRARY.length, `${vus.size} différents`);
}
{
  const sansAnimation = EXERCISE_LIBRARY.filter((m) => !resolveGuide(m.name)).map((m) => m.name);
  verdict("chaque mouvement du jour est animé", sansAnimation.length === 0, sansAnimation.join(", ") || "les 102");
}
{
  const ex = exerciceDuMouvement(mouvementDuJour("2026-10-17"));
  verdict("le tunnel reçoit le mouvement tel qu'une séance composée", ex.name === "Bicycle crunch" && ex.sets > 0 && !!ex.reps && ex.muscles.length > 0, `${ex.sets} × ${ex.reps}`);
}

/* ── La carte et ses 5 EXP ─────────────────────────────────────────────── */

verdict("retournée ici aujourd'hui : elle s'ouvre retournée", carteRetournee({ retourneeLe: "2026-10-17", jour: "2026-10-17", dejaGagne: false }), "cet appareil");
verdict("retournée hier : elle se présente fermée", !carteRetournee({ retourneeLe: "2026-10-16", jour: "2026-10-17", dejaGagne: false }), "un autre jour ne compte pas");
verdict("retournée ailleurs aujourd'hui : la base suffit", carteRetournee({ retourneeLe: null, jour: "2026-10-17", dejaGagne: true }), "un autre appareil");
{
  /* Louis, 2026-10-17 au soir : la carte garde ses 5 EXP, mais elle n'est
     plus une quête. Elle ne doit réapparaître ni dans le catalogue, ni dans
     le compte du jour. */
  const ids: string[] = MISSIONS.map((m) => m.id);
  verdict("le mouvement du jour n'est plus une quête", !ids.includes("mouvement") && MISSIONS_JOUR.length === 4, `${MISSIONS_JOUR.length} missions du jour`);
  verdict("sa carte rapporte toujours 5 EXP", EXP_MOUVEMENT === 5, `+${EXP_MOUVEMENT}`);
}
{
  const gratuit = EXP_CONNEXION_SUITE + MISSIONS_JOUR.filter((m) => m.id !== "connexion").reduce((s, m) => s + m.exp, 0);
  const premium = gratuit + MISSIONS_PREMIUM.reduce((s, m) => s + m.exp, 0);
  verdict("le plafond des missions suit le catalogue, sans la carte", PLAFOND_JOUR_GRATUIT === gratuit && PLAFOND_JOUR_PREMIUM === premium, `${PLAFOND_JOUR_GRATUIT} et ${PLAFOND_JOUR_PREMIUM}`);
}

/* ── Par la source ─────────────────────────────────────────────────────── */

const RACINE = path.resolve(import.meta.dirname, "..");
const lire = (fichier: string) => readFileSync(path.join(RACINE, fichier), "utf8");

{
  const tuile = lire("src/components/accueil/MaJournee.tsx");
  verdict("la tuile décide sa montée avec la règle unique", tuile.includes("decideMontee(") && tuile.includes("noterVuSerie("), "MaJournee.tsx");
  verdict("la montée ne joue pas quand il faut réduire les animations", /reduce \? null : decideMontee\(/.test(tuile), "reduce");
}
{
  const feuille = lire("src/components/accueil/FeuilleMotDuJour.tsx");
  verdict("le mot ne parle qu'avec les phrases de guides.ts", feuille.includes("lignesDuMot(") && feuille.includes("voix(guide"), "FeuilleMotDuJour.tsx");
  verdict("le mot attend la journée avant de dire « rien de prévu »", /etat === "loading" \? null/.test(feuille), "plan nul en chargement");
}
{
  const carte = lire("src/components/accueil/MouvementDuJour.tsx");
  verdict("le sceau ne se pose que sur la réponse de la base", carte.includes("{gain && posee && <Sceau"), "gain confirmé");
  verdict("« +5 EXP » ne s'envole que d'un gain neuf, et jamais en mouvement réduit", carte.includes('envol={gain === "gagne" && eclore}') && carte.includes("const eclore = touchee && !reduce"), "envol");
  verdict("deux touchers ne lancent qu'une découverte", carte.includes("lancee.current") && carte.includes("if (phase !== \"fermee\" || lancee.current) return"), "garde");
  verdict("la carte fermée n'annonce les 5 EXP que si la base sait les créditer", carte.includes("{bonus && (") && carte.includes("bonus ? `Découvrir le mouvement du jour, plus"), "bonus");
}
{
  const feuille = lire("src/components/accueil/FeuilleMotDuJour.tsx");
  verdict("le mot demande les 5 EXP à la base", feuille.includes("crediterMouvement(createClient())"), "decouvrir_mouvement_aura");
  verdict("le gain ne remonte que sur un crédit neuf", feuille.includes("if (r) onGain();") && feuille.includes("if (r === null) return;"), "true seulement");
  verdict("sans le SQL, le mot ne demande rien et ne promet rien", feuille.includes("if (dejaGagne === null) return;") && feuille.includes("bonus={dejaGagne !== null}"), "dejaGagne null");
}
{
  const sql = lire("supabase/migrations/20261017_mouvement_du_jour.sql");
  const points = /'mouvement_du_jour', 'day', v_today::text, (\d+), false/.exec(sql)?.[1];
  verdict("la base crédite le nombre du catalogue", Number(points) === EXP_MOUVEMENT, `${points} = ${EXP_MOUVEMENT}`);
  verdict("l'état des missions porte la nouvelle", sql.includes("'mouvement', jsonb_build_object(") && /'mouvement_du_jour'\s*\]::text\[\]/.test(sql), "etat_missions_aura + CHECK");
}
{
  const accueil = lire("src/components/AccueilSignature.tsx");
  verdict("le mot lit l'état de la carte à part, pas dans les missions", accueil.includes("dejaGagne={aura.mouvementDuJour}") && !accueil.includes("ROUTE_MOT_DU_JOUR"), "aura.mouvementDuJour");
  verdict("l'aura se relit à la fermeture du mot, après un gain", /gainMouvement\.current = false;\s*onAuraChange\?\.\(\)/.test(accueil) && lire("src/app/AccueilClient.tsx").includes("onAuraChange={() => setStatsTick("), "onAuraChange");
}
{
  const accueil = lire("src/components/AccueilSignature.tsx");
  verdict("l'entrée porte la pastille du mot non lu", accueil.includes("motNonLu") && accueil.includes("t’a laissé un mot"), "AccueilSignature.tsx");
  verdict("le moment du jour est gardé pour le mot", lire("src/app/AccueilClient.tsx").includes("noterMomentDuJour("), "AccueilClient.tsx");
}

console.log(echecs === 0 ? "\nTout passe." : `\n${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
