import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/sendPushToUser";

/**
 * POST /api/notifications/message
 *
 * Le client ne choisit ni l'émetteur ni les destinataires : le serveur
 * authentifie le token, relit le message et cible les autres membres du fil.
 */
export async function POST(req: NextRequest) {
  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ ok: false, error: "non_authentifie" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const caller = authData?.user;
    if (authError || !caller) {
      return NextResponse.json({ ok: false, error: "session_invalide" }, { status: 401 });
    }

    const { message_id } = await req.json() as { message_id?: string };
    if (!message_id) {
      return NextResponse.json({ ok: false, error: "message_manquant" }, { status: 400 });
    }

    const { data: message, error: messageError } = await admin
      .from("messages")
      .select("id, conversation_id, user_id, contenu, type")
      .eq("id", message_id)
      .maybeSingle();

    if (
      messageError
      || !message
      || !["texte", "image"].includes(message.type)
      || message.user_id !== caller.id
    ) {
      return NextResponse.json({ ok: false, error: "message_invalide" }, { status: 403 });
    }

    const [membresRes, profilRes] = await Promise.all([
      (async () => {
        const moderne = await admin
          .from("conversation_members")
          .select("user_id, muted")
          .eq("conversation_id", message.conversation_id);
        if (!moderne.error || !/muted|schema cache|column/i.test(moderne.error.message)) {
          return moderne;
        }
        return admin
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", message.conversation_id);
      })(),
      admin
        .from("profiles")
        .select("pseudo, avatar_url")
        .eq("id", caller.id)
        .maybeSingle(),
    ]);

    const membres = (membresRes.data ?? []).map((m) => m.user_id as string);
    if (!membres.includes(caller.id)) {
      return NextResponse.json({ ok: false, error: "pas_membre" }, { status: 403 });
    }

    const cibles = (membresRes.data ?? [])
      .filter((m) => m.user_id !== caller.id && !("muted" in m && m.muted))
      .map((m) => m.user_id as string);
    const pseudo = profilRes.data?.pseudo ?? "Quelqu'un";
    const lien = `/communaute/${message.conversation_id}`;
    const apercu = message.type === "image"
      ? "📷 Photo"
      : String(message.contenu).replace(/\s+/g, " ").trim().slice(0, 110);

    const resultats = await Promise.allSettled(
      cibles.map(async (userId): Promise<boolean> => {
        const reservation = await admin
          .from("message_notification_deliveries")
          .insert({ message_id: message.id, user_id: userId });

        if (reservation.error?.code === "23505") return false;
        const migrationManquante = reservation.error
          && /message_notification_deliveries|schema cache|does not exist|relation/i.test(reservation.error.message);
        if (reservation.error && !migrationManquante) return false;

        const notification = await admin.from("notifications").insert({
          user_id: userId,
          from_user_id: caller.id,
          from_pseudo: pseudo,
          from_avatar_url: profilRes.data?.avatar_url ?? null,
          type: "message",
          lien,
        });
        if (notification.error) {
          if (!migrationManquante) {
            await admin
              .from("message_notification_deliveries")
              .delete()
              .eq("message_id", message.id)
              .eq("user_id", userId);
          }
          throw notification.error;
        }

        await sendPushToUser({
          user_id: userId,
          categorie: "message",
          title: `${pseudo} t'a écrit`,
          body: apercu || "Nouveau message",
          url: lien,
        });
        return true;
      }),
    );

    const envoyees = resultats.filter((resultat) => resultat.status === "fulfilled" && resultat.value).length;
    return NextResponse.json({ ok: true, envoyees });
  } catch {
    // Une notification ratée ne doit jamais faire échouer l'envoi du message.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
