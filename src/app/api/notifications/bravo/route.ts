import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/sendPushToUser";

/**
 * POST /api/notifications/bravo
 *
 * Un ami vient de dire bravo, sous une affiche ou sous un événement du fil
 * (Louis, 2026-10-21). Le client ne dit que CE qu'il a félicité ; le serveur
 * vérifie que le bravo existe bien en base, retrouve à qui il revient, et
 * prévient cette personne.
 *
 * Une seule notification par ami et par chose félicitée : retirer puis
 * remettre son bravo ne renvoie rien. Jamais à soi-même.
 *
 * ⚠️ Le type `bravo` demande `20261021_notif_bravo.sql` (contrainte de
 * `notifications`). Sans elle, l'écriture en cloche échoue et seul le push
 * part : c'est voulu, la notification ne doit jamais faire échouer le bravo.
 */

const POUR_EVENEMENT: Record<string, string> = {
  seance: "pour ta séance",
  rang: "pour ton nouveau rang",
  flamme: "pour ta nouvelle flamme",
  badge: "pour ton badge",
};

export async function POST(req: NextRequest) {
  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ ok: false, error: "non_authentifie" }, { status: 401 });

    const admin = createAdminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const caller = authData?.user;
    if (authError || !caller) return NextResponse.json({ ok: false, error: "session_invalide" }, { status: 401 });

    const { cible, id } = await req.json() as { cible?: "affiche" | "evenement"; id?: string };
    if (!id || (cible !== "affiche" && cible !== "evenement")) {
      return NextResponse.json({ ok: false, error: "requete_invalide" }, { status: 400 });
    }

    // Le bravo doit exister : on ne prévient de rien qu'on ne peut relire.
    let destinataire: string | null = null;
    let pourQuoi = "";
    if (cible === "affiche") {
      const [{ data: bravo }, { data: post }] = await Promise.all([
        admin.from("reactions_affiche").select("post_id").eq("post_id", id).eq("user_id", caller.id).eq("sorte", "feu").maybeSingle(),
        admin.from("posts").select("user_id, performance_data").eq("id", id).maybeSingle(),
      ]);
      if (!bravo || !post) return NextResponse.json({ ok: false, error: "bravo_introuvable" }, { status: 403 });
      destinataire = post.user_id as string;
      const titre = ((post.performance_data as { title?: string } | null)?.title ?? "").trim();
      pourQuoi = titre ? `pour ta séance « ${titre} »` : "pour ton affiche";
    } else {
      const [{ data: bravo }, { data: evt }] = await Promise.all([
        admin.from("bravos_evenement").select("evenement_id").eq("evenement_id", id).eq("user_id", caller.id).maybeSingle(),
        admin.from("evenements_fil").select("user_id, sorte").eq("id", id).maybeSingle(),
      ]);
      if (!bravo || !evt) return NextResponse.json({ ok: false, error: "bravo_introuvable" }, { status: 403 });
      destinataire = evt.user_id as string;
      pourQuoi = POUR_EVENEMENT[evt.sorte as string] ?? "";
    }
    if (!destinataire || destinataire === caller.id) return NextResponse.json({ ok: true, envoyee: false });

    const lien = `/communaute?bravo=${encodeURIComponent(id)}`;

    // Une fois par ami et par chose félicitée.
    const { data: deja } = await admin.from("notifications").select("id")
      .eq("user_id", destinataire).eq("from_user_id", caller.id).eq("type", "bravo").eq("lien", lien).limit(1);
    if (deja && deja.length) return NextResponse.json({ ok: true, envoyee: false });

    const { data: profil } = await admin.from("profiles").select("pseudo, avatar_url").eq("id", caller.id).maybeSingle();
    const pseudo = profil?.pseudo ?? "Un ami";

    const { error: insErr } = await admin.from("notifications").insert({
      user_id: destinataire,
      from_user_id: caller.id,
      from_pseudo: pseudo,
      from_avatar_url: profil?.avatar_url ?? null,
      type: "bravo",
      lien,
    });
    if (insErr) console.warn("[bravo] notification non écrite :", insErr.message);

    await sendPushToUser({
      user_id: destinataire,
      categorie: "ami",
      title: `${pseudo} t’a dit bravo`,
      body: pourQuoi ? `${pourQuoi.charAt(0).toUpperCase()}${pourQuoi.slice(1)}.` : "Dans le fil de tes potes.",
      url: lien,
    });
    return NextResponse.json({ ok: true, envoyee: true });
  } catch {
    // Une notification ratée ne doit jamais faire échouer le bravo.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
