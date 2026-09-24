/**
 * GET /api/assistant/quota — les messages au coach déjà utilisés aujourd'hui.
 *
 * Ne consomme rien : c'est ce qui permet à l'assistant de s'ouvrir déjà
 * fermé quand les messages du jour sont épuisés, au lieu de laisser écrire
 * un message que le serveur refusera.
 */
import { NextResponse } from "next/server";
import { lireQuota } from "@/lib/aiLimits";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const quota = await lireQuota(req, "chat");
  return NextResponse.json({ quota }, { headers: { "Cache-Control": "no-store" } });
}
