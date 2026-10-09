/**
 * POST /api/notifications/relais
 * Appelée quand un maillon vient d'être franchi.
 *
 * Le message raconte ce qui s'est passé, il ne demande rien :
 * « L'affiche s'est dévoilée » plutôt que « c'est à toi ». C'est
 * la seule formulation qui fait ouvrir l'app par curiosité au
 * lieu de mettre une dette dans la poche de l'équipier
 * (décision Louis, 2026-07-21).
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/sendPushToUser";
import { compteAppelant, refusAuth } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  try {
    // L'acteur est celui qui vient de franchir le maillon : c'est donc
    // l'appelant, pas un identifiant envoyé dans la requête. Sinon n'importe
    // qui pouvait déclencher une notification au nom de quelqu'un d'autre.
    const appelant = await compteAppelant(req);
    if (!appelant) return refusAuth();
    const actor_id = appelant.id;

    const { run_id, evenement } = await req.json();
    if (!run_id) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }
    // « lance » : le relais vient de démarrer. Sans cette annonce, on
    // peut engager quelqu'un sur sept jours sans qu'il l'apprenne
    // autrement qu'en ouvrant l'app par hasard.
    const lancement = evenement === "lance";
    // « invitation » : l'auteur vient d'inviter des amis. Elle va aux
    // invités en attente, qui ne sont pas encore membres.
    // « demarre » : le dernier à répondre vient de faire partir le relais.
    const invitation = evenement === "invitation";
    const demarrage = evenement === "demarre";

    const admin = createAdminClient();

    // L'acteur doit appartenir au défi qu'il prétend faire avancer.
    const { data: adhesion } = await admin
      .from("challenge_run_members")
      .select("user_id")
      .eq("run_id", run_id)
      .eq("user_id", actor_id)
      .maybeSingle();
    if (!adhesion) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { data: run } = await admin
      .from("challenge_runs")
      .select("id, conversation_id, target_days, statut")
      .eq("id", run_id)
      .maybeSingle();

    if (!run) return NextResponse.json({ error: "Défi introuvable" }, { status: 404 });

    const [membresRes, actionsRes, acteurRes] = await Promise.all([
      admin.from("challenge_run_members").select("user_id").eq("run_id", run_id),
      admin.from("challenge_actions").select("id", { count: "exact", head: true }).eq("run_id", run_id).eq("user_id", actor_id),
      admin.from("profiles").select("pseudo, avatar_url").eq("id", actor_id).maybeSingle(),
    ]);

    // Les maillons franchis par CELUI qui vient de jouer (co-op : chacun
    // grimpe les siens). L'affiche complète se lit sur le statut.
    const faits   = actionsRes.count ?? 0;
    const pseudo  = acteurRes.data?.pseudo ?? "Quelqu’un";
    let cible = (membresRes.data ?? [])
      .map((m) => m.user_id as string)
      .filter((id) => id !== actor_id);

    if (invitation) {
      const { data: invites } = await admin
        .from("relais_invitations")
        .select("user_id")
        .eq("run_id", run_id)
        .eq("invite_par", actor_id)
        .eq("statut", "en_attente");
      cible = (invites ?? []).map((i) => i.user_id as string);
    }

    if (!cible.length) return NextResponse.json({ ok: true, envoyees: 0 });

    const complete = run.statut === "reussi";
    // Le message raconte, il ne réclame pas : c'est ce qui fait ouvrir
    // par curiosité au lieu de mettre une dette dans la poche de l'autre.
    const titre = invitation
      ? "Invitation à un relais"
      : demarrage
      ? "Le relais commence"
      : lancement
      ? "Un relais commence"
      : complete
      ? "L’affiche est complète"
      : "L’affiche s’est dévoilée";
    const corps = invitation
      ? `${pseudo} t’invite à un relais. Accepte pour le rejoindre.`
      : demarrage
      ? `Tout le monde a répondu : ${run.target_days} maillons chacun, et l’affiche se dévoile.`
      : lancement
      ? `${pseudo} a lancé un relais avec toi. ${run.target_days} maillons chacun, et l’affiche se dévoile.`
      : complete
      ? `${pseudo} a franchi le dernier maillon. Elle est à vous.`
      : `${pseudo} a franchi le maillon ${faits} sur ${run.target_days}.`;
    const lien = invitation
      ? "/notifications"
      : run.conversation_id ? `/communaute/${run.conversation_id}` : "/communaute";

    await Promise.allSettled(
      cible.map(async (userId) => {
        await admin.from("notifications").insert({
          user_id:         userId,
          from_user_id:    actor_id,
          from_pseudo:     pseudo,
          from_avatar_url: acteurRes.data?.avatar_url ?? null,
          type:            invitation ? "relais_invitation" : "relais",
          lien:            invitation ? `/defi?invitation=${run_id}` : lien,
        });

        await sendPushToUser({ user_id: userId, categorie: "relais", title: titre, body: corps, url: lien });
      }),
    );

    return NextResponse.json({ ok: true, envoyees: cible.length });
  } catch {
    // Une notification ratée ne doit jamais casser une fin de séance.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
