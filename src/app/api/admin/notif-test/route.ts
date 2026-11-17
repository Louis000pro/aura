/**
 * /api/admin/notif-test — un admin s'envoie une notification d'essai, sur ses propres appareils.
 */
import { NextResponse } from "next/server";
import { exigerAdmin } from "@/lib/adminGuard";
import { guideDe, iconeGuide, pousserA, type MessagePush } from "@/lib/pushServeur";

export async function POST(req: Request) {
  const v = await exigerAdmin(req);
  if (!v.ok) return v.reponse;
  const { genre } = await req.json().catch(() => ({})) as { genre?: string };
  const guide = await guideDe(v.admin, v.userId);
  const prenom = guide === "nora" ? "Nora" : guide === "sasha" ? "Sasha" : "Vaiiya";
  const messages: Record<string, MessagePush> = {
    rappel: { title: prenom, body: "Ta séance t’attend ce soir. Une vingtaine de minutes et c’est fait.", url: "/", icon: iconeGuide(guide) },
    booster: { title: "Ton booster est prêt", body: "Trois nouvelles cartes t’attendent. Viens l’ouvrir.", url: "/", icon: iconeGuide(guide) },
    logo: { title: "Vaiiya", body: "Notification d’essai avec l’icône de Vaiiya.", url: "/" },
  };
  const msg = messages[genre ?? "rappel"] ?? messages.rappel;
  try {
    const envoyes = await pousserA(v.admin, v.userId, msg);
    return NextResponse.json({ ok: true, envoyes });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
