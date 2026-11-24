import { exigerAdmin } from "@/lib/adminGuard";

/* Une ouverture à blanc (Louis, 2026-11-24) : le vrai tirage, avec les vraies chances, et rien
   n'est écrit. Ni carte, ni EXP, ni réserve, ni statistique. Réservée aux administrateurs. */
export async function POST(req: Request) {
  const garde = await exigerAdmin(req);
  if (!garde.ok) return garde.reponse;
  const prive = { headers: { "Cache-Control": "private, no-store" } };
  const { data, error } = await garde.admin.rpc("tirer_booster_exercices", { p_user: garde.userId });
  if (error || !data) return Response.json({ error: "tirage_indisponible" }, { ...prive, status: 503 });
  return Response.json({ cartes: data }, prive);
}
