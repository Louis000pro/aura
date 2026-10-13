/**
 * GET /api/preuve-agent — le test « agent » du 2026-10-13, et rien d'autre.
 *
 * ⚠️ ROUTE TEMPORAIRE, À RETIRER APRÈS LE TEST. Elle ne répond qu'en
 * préversion (jamais en production) et seulement avec le jeton du test :
 * sinon 404, comme si elle n'existait pas.
 *
 * Elle joue UNE formulation de la demande sur le vrai modèle de l'app (le
 * client `llm`, la clé de la préversion), contre un faux compte en mémoire.
 * Rien ne touche la base. Elle rend le verdict du correcteur, ce que
 * l'agent a préparé, ses étapes, sa durée, ses jetons et les limites du
 * fournisseur (le test ne doit pas épuiser le quota du coach).
 *
 * Paramètres : n (1 à 30), consigne (courte | longue), modele (grand |
 * petit), effort (low | medium | high), trace (1 pour le détail des gestes).
 */
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { FOURNISSEUR, hasLLMKey, optionsIA } from "@/lib/llm";
import { jouerAgent } from "@/lib/agent/boucle";
import { appelerLLM } from "@/lib/agent/modele";
import { FORMULATIONS } from "@/lib/agent/banc/formulations";
import { compteDeTest, corriger, OUTILS_PLANNING } from "@/lib/agent/banc/planningSimule";
import { consigneCourte, consigneLongue } from "@/lib/agent/banc/consigne";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const initial = compteDeTest();
  const etat = compteDeTest();
  const cr = await jouerAgent({
    consigne: longue ? consigneLongue() : consigneCourte(),
    demande: formulation.texte,
    outils: OUTILS_PLANNING,
    etat,
    appeler: appelerLLM({ role, effort }),
    etapesMax: 14,
  });
  const verdict = corriger(initial, etat, formulation.periode, cr.fin, cr.messageFinal);

  return NextResponse.json({
    n,
    reussi: verdict.reussi,
    criteres: verdict.criteres,
    details: verdict.details,
    avertissements: verdict.avertissements,
    formulation: formulation.texte,
    periode: formulation.periode,
    reglage: { fournisseur: FOURNISSEUR, modele: optionsIA(role, 0).model, effort, consigne: longue ? "longue" : "courte" },
    fin: cr.fin,
    erreur: cr.erreur,
    message: cr.messageFinal,
    apercu: etat.apercu,
    etapes: cr.etapes.length,
    gestes: cr.etapes.reduce((s, e) => s + e.gestes.length, 0),
    refus: cr.etapes.reduce((s, e) => s + e.gestes.filter((g) => g.refuse).length, 0),
    jetons: { entree: cr.jetonsEntree, sortie: cr.jetonsSortie },
    dureeMs: cr.dureeMs,
    limites: cr.limites,
    ...(p.get("trace") === "1" ? { trace: cr.etapes } : {}),
  });
}
