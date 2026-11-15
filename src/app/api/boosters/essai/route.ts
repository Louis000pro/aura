import { randomInt } from "node:crypto";
import { compteAppelant, refusAuth } from "@/lib/apiAuth";
import { mouvements, type Carte } from "@/lib/cartesBooster";

// Compte Vaiiya vérifié de Louis. Cette exception autorise uniquement les tirages d’essai.
const compteEssai = "d193d5b2-5866-4cba-9321-a37bdbeff772";
const prive = { headers: { "Cache-Control": "private, no-store" } };

export async function GET(req: Request) {
  const appelant = await compteAppelant(req);
  if (!appelant) return refusAuth();
  return Response.json({ illimite: appelant.id === compteEssai }, prive);
}

export async function POST(req: Request) {
  const appelant = await compteAppelant(req);
  if (!appelant) return refusAuth();
  if (appelant.id !== compteEssai) return Response.json({ error: "acces_refuse" }, { ...prive, status: 403 });

  // Mêmes combinaisons que le booster quotidien (ouvrir_booster_exercices_v2).
  const chance = randomInt(100);
  const raretes: Carte["rarete"][] = chance < 60 ? ["commune", "commune", "epique"]
    : chance < 90 ? ["commune", "epique", "epique"]
    : chance < 95 ? ["commune", "epique", "legendaire"]
    : chance < 99 ? ["epique", "epique", "legendaire"]
    : ["epique", "legendaire", "chromatique"];
  const pool = Object.keys(mouvements) as Carte["exercice"][];
  const cartes: Carte[] = raretes.map(rarete => ({
    exercice: pool.splice(randomInt(pool.length), 1)[0],
    rarete,
  }));
  return Response.json({ cartes }, prive);
}
