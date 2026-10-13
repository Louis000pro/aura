/**
 * GET /api/preuve-agent — le test « agent » du 2026-10-13, et rien d'autre.
 *
 * ⚠️ ROUTE TEMPORAIRE, À RETIRER APRÈS LE TEST. Elle ne répond qu'en
 * préversion (jamais en production) et seulement avec le jeton du test :
 * sinon 404, comme si elle n'existait pas.
 *
 * Elle joue UNE formulation de la demande sur le vrai modèle de l'app (le
 * client `llm`, la clé de la préversion), contre un faux compte en mémoire.
 * Rien ne touche la base.
 *
 * ⚠️ L'ESSAI TOURNE APRÈS LA RÉPONSE, ET SON RÉSULTAT VA DANS LES JOURNAUX.
 * Sur le palier gratuit du fournisseur (8 000 jetons par minute), un essai
 * qui relit et vérifie dépasse la minute : plus que ce qu'un client accepte
 * d'attendre. La route répond donc 202 tout de suite, joue l'essai dans
 * `after()`, et l'écrit en lignes courtes préfixées `[preuve-agent]
 * essai=<nom>`, à relire dans les journaux de la préversion.
 *
 * Paramètres : n (1 à 30), essai (un nom court), consigne (courte |
 * longue), modele (grand | petit), effort (low | medium | high), verif (1
 * pour le contrôle de fin), trace (1 pour le détail des gestes).
 */
import { after, NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { FOURNISSEUR, hasLLMKey, optionsIA } from "@/lib/llm";
import { jouerAgent } from "@/lib/agent/boucle";
import { appelerLLM } from "@/lib/agent/modele";
import { FORMULATIONS } from "@/lib/agent/banc/formulations";
import { compteDeTest, controlerPlanning, corriger, OUTILS_PLANNING } from "@/lib/agent/banc/planningSimule";
import { consigneCourte, consigneLongue } from "@/lib/agent/banc/consigne";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/* L'empreinte du jeton, jamais le jeton : le dépôt est public. */
const EMPREINTE = "3a74a996b2154aa7c7c43bb35cfe1f03497716492508c179372dc353a7fd11b8";

const absente = () => new NextResponse(null, { status: 404 });

export async function GET(req: NextRequest) {
  if (process.env.VERCEL_ENV === "production") return absente();
  const p = req.nextUrl.searchParams;
  if (createHash("sha256").update(p.get("jeton") ?? "").digest("hex") !== EMPREINTE) return absente();
  if (!hasLLMKey()) return NextResponse.json({ erreur: "aucune clé de modèle dans cet environnement" }, { status: 503 });

  const n = Number(p.get("n") ?? "1");
  const formulation = FORMULATIONS[n - 1];
  if (!formulation) return NextResponse.json({ erreur: `n entre 1 et ${FORMULATIONS.length}` }, { status: 400 });

  const role = p.get("modele") === "petit" ? "outil" : "coach";
  const effortBrut = p.get("effort");
  const effort = effortBrut === "medium" || effortBrut === "high" ? effortBrut : "low";
  const longue = p.get("consigne") === "longue";
  const verif = p.get("verif") === "1";
  const trace = p.get("trace") === "1";
  const essai = (p.get("essai") ?? "").replace(/[^\w-]/g, "").slice(0, 20) || `n${n}`;
  const reglage = { fournisseur: FOURNISSEUR, modele: optionsIA(role, 0).model, effort, consigne: longue ? "longue" : "courte", verif };

  after(async () => {
    /* Des lignes courtes, une idée chacune : un journal coupe les lignes
       trop longues, et une ligne coupée ne se relit plus. */
    const ecrire = (cle: string, valeur: unknown) => console.log(`[preuve-agent] essai=${essai} ${cle}=${JSON.stringify(valeur)}`);
    try {
      const initial = compteDeTest();
      const etat = compteDeTest();
      const cr = await jouerAgent({
        consigne: longue ? consigneLongue() : consigneCourte(),
        demande: formulation.texte,
        outils: OUTILS_PLANNING,
        etat,
        appeler: appelerLLM({ role, effort }),
        etapesMax: 16,
        controle: verif ? controlerPlanning(initial) : undefined,
      });
      const verdict = corriger(initial, etat, formulation.periode, cr.fin, cr.messageFinal);
      const gestes = cr.etapes.flatMap((e) => e.gestes);
      ecrire("bilan", {
        n, reussi: verdict.reussi, criteres: verdict.criteres, fin: cr.fin, erreur: cr.erreur,
        etapes: cr.etapes.length, gestes: gestes.length, refus: gestes.filter((g) => g.refuse).length,
        relances: cr.relances.length, jetons: { entree: cr.jetonsEntree, sortie: cr.jetonsSortie }, dureeMs: cr.dureeMs,
      });
      ecrire("reglage", reglage);
      ecrire("details", { details: verdict.details, avertissements: verdict.avertissements });
      ecrire("message", cr.messageFinal);
      ecrire("apercu", etat.apercu);
      /* L'état final, lisible par une machine : on peut le recorriger hors
         ligne si le correcteur change, sans rejouer (ni repayer) l'essai. */
      ecrire("etat", {
        exceptions: etat.exceptions, absences: etat.absences, adaptation: etat.adaptation,
        joursHabituels: etat.joursHabituels, joursChangesPourDeBon: etat.joursChangesPourDeBon, prioritesPourDeBon: etat.prioritesPourDeBon,
      });
      cr.relances.forEach((r, i) => ecrire(`relance${i + 1}`, r));
      ecrire("limites", cr.limites);
      if (trace) cr.etapes.forEach((e) => ecrire(`etape${e.numero}`, e));
    } catch (e) {
      ecrire("plantage", String(e));
    }
  });

  return NextResponse.json({ lance: true, essai, n, formulation: formulation.texte, reglage }, { status: 202 });
}
