/**
 * GET /api/cron/reminders
 * Déclenché chaque jour par Vercel Cron (voir vercel.json).
 * Envoie une notification de rappel personnalisée à chaque utilisateur abonné,
 * selon son activité du jour (séance faite ? repas loggés ?).
 *
 * Sécurité : header "Authorization: Bearer <CRON_SECRET>" (ajouté auto par Vercel
 * quand la variable CRON_SECRET existe).
 */
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-admin";

const VAPID_PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT ?? "mailto:bonjour@vaiiya.fr";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

type Reminder = { title: string; body: string; url: string };

function pickReminder(hasWorkout: boolean, hasMeals: boolean, streak: number): Reminder {
  if (!hasWorkout) {
    return {
      title: "Ta séance t'attend 💪",
      body: streak > 0
        ? `Garde ta série de ${streak} jour${streak > 1 ? "s" : ""} ! Ouvre Vaiiya pour ta séance du jour.`
        : "Prêt à bouger ? Ta séance du jour est dans Vaiiya.",
      url: "/progression",
    };
  }
  if (!hasMeals) {
    return {
      title: "Et tes repas ? 🍽️",
      body: "Pense à enregistrer ce que tu manges aujourd'hui pour suivre ta progression.",
      url: "/nutrition",
    };
  }
  return {
    title: "Tu gères aujourd'hui 🔥",
    body: streak > 1
      ? `${streak} jours d'affilée ! Continue comme ça, c'est exactement ça la régularité.`
      : "Séance ✓ et repas ✓ — beau travail. Garde le rythme !",
    url: "/",
  };
}

export async function GET(req: NextRequest) {
  // ── Auth cron (fail-closed) ──
  // Sans CRON_SECRET configuré, ou avec un en-tête absent/incorrect, on refuse
  // TOUJOURS. Vercel Cron ajoute automatiquement "Authorization: Bearer <CRON_SECRET>"
  // quand la variable existe. ⚠️ Ne pas déployer sans avoir défini CRON_SECRET
  // en production, sinon le cron des rappels renverra 401.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "non_autorise" }, { status: 401 });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID non configuré" }, { status: 500 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  // ── Utilisateurs abonnés aux push ──
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");
  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, users: 0, sent: 0 });
  }

  // Regroupe les abonnements par utilisateur
  const byUser = new Map<string, { endpoint: string; p256dh: string; auth: string }[]>();
  for (const s of subs) {
    const arr = byUser.get(s.user_id) ?? [];
    arr.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
    byUser.set(s.user_id, arr);
  }

  let sent = 0;
  let usersNotified = 0;

  for (const [uid, userSubs] of byUser) {
    // Activité du jour
    const [wRes, nRes, dRes] = await Promise.all([
      admin.from("workout_sessions").select("id", { count: "exact", head: true })
        .eq("user_id", uid).gte("started_at", today + "T00:00:00").lte("started_at", today + "T23:59:59"),
      admin.from("nutrition_logs").select("id", { count: "exact", head: true })
        .eq("user_id", uid).eq("date", today),
      admin.from("daily_stats").select("streak").eq("user_id", uid).eq("date", today).maybeSingle(),
    ]);

    const reminder = pickReminder(
      (wRes.count ?? 0) > 0,
      (nRes.count ?? 0) > 0,
      (dRes.data?.streak as number) ?? 0
    );

    const payload = JSON.stringify({
      title: reminder.title,
      body: reminder.body,
      icon: "/icons/icon-192.png",
      url: reminder.url,
    });

    const results = await Promise.allSettled(
      userSubs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        ).catch(async (err: { statusCode?: number }) => {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await admin.from("push_subscriptions").delete().match({ endpoint: sub.endpoint });
          }
          throw err;
        })
      )
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    sent += ok;
    if (ok > 0) usersNotified += 1;
  }

  return NextResponse.json({ ok: true, users: usersNotified, sent });
}
