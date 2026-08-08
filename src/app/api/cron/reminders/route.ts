/**
 * GET /api/cron/reminders
 * Déclenché chaque jour par Vercel Cron (voir vercel.json).
 * Envoie une notification de rappel personnalisée à chaque utilisateur abonné,
 * selon son activité du jour (séance faite ? repas loggés ?).
 *
 * Sécurité : header "Authorization: Bearer <CRON_SECRET>" (ajouté auto par Vercel
 * quand la variable CRON_SECRET existe). La vérification est fail-closed :
 * sans CRON_SECRET défini en production, la route refuse tout (401) et les
 * rappels ne partent plus. C'est volontaire, et c'est le bon sens du risque.
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

/**
 * Le rappel du relais, envoyé UNIQUEMENT au moment décisif : le jour
 * où il reste exactement autant de jours que de maillons manquants.
 * Rater ce jour-là, c'est l'affiche qui ne pourra plus être terminée.
 *
 * Rare par construction — c'est ce qui fait qu'il veut dire quelque
 * chose quand il arrive. Il ne part pas à celui qui a franchi la
 * veille : ce n'est pas son tour, la règle le lui interdit.
 */
async function rappelsRelais(
  admin: ReturnType<typeof createAdminClient>,
  today: string,
): Promise<Map<string, Reminder>> {
  const cibles = new Map<string, Reminder>();

  const { data: runs } = await admin
    .from("challenge_runs")
    .select("id, conversation_id, target_days, ends_on")
    .eq("statut", "en_cours");

  if (!runs?.length) return cibles;

  const hier = new Date(today + "T12:00:00");
  hier.setDate(hier.getDate() - 1);
  const hierStr = hier.toISOString().slice(0, 10);

  for (const run of runs) {
    const [actionsRes, membresRes] = await Promise.all([
      admin.from("challenge_actions").select("jour, user_id").eq("run_id", run.id),
      admin.from("challenge_run_members").select("user_id").eq("run_id", run.id),
    ]);

    const actions = actionsRes.data ?? [];
    if (actions.some((a) => a.jour === today)) continue;      // déjà franchi aujourd'hui

    const manquants = (run.target_days as number) - actions.length;
    if (manquants <= 0) continue;

    // Jours restants, aujourd'hui compris.
    const fin = new Date((run.ends_on as string) + "T12:00:00");
    const jour = new Date(today + "T12:00:00");
    const restants = Math.floor((fin.getTime() - jour.getTime()) / 86_400_000) + 1;

    if (restants <= 0 || manquants !== restants) continue;    // pas encore décisif

    const bloque = actions.find((a) => a.jour === hierStr)?.user_id as string | undefined;

    for (const m of membresRes.data ?? []) {
      const uid = m.user_id as string;
      if (uid === bloque) continue;
      cibles.set(uid, {
        title: "L'affiche se joue aujourd'hui",
        body:  "Sans un maillon aujourd'hui, elle restera incomplète. Dix minutes suffisent.",
        url:   run.conversation_id ? `/communaute/${run.conversation_id}` : "/defi",
      });
    }
  }

  return cibles;
}

export async function GET(req: NextRequest) {
  // ── Auth cron (fail-closed) ──
  // Sans CRON_SECRET configuré, ou avec un en-tête absent ou faux, on refuse
  // TOUJOURS. Avant, l'absence de la variable ouvrait la route à tout internet :
  // n'importe qui pouvait déclencher l'envoi des notifications à tous les
  // comptes. Une porte dont la serrure est optionnelle n'est pas une serrure.
  // Vercel Cron ajoute l'en-tête automatiquement quand la variable existe.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "non_autorisé" }, { status: 401 });
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

  // Le relais passe AVANT le rappel générique : on n'envoie jamais
  // deux notifications le même soir à la même personne.
  const relais = await rappelsRelais(admin, today);

  for (const [uid, userSubs] of byUser) {
    const duRelais = relais.get(uid);

    // Activité du jour
    const [wRes, nRes, dRes] = await Promise.all([
      admin.from("workout_sessions").select("id", { count: "exact", head: true })
        .eq("user_id", uid).gte("started_at", today + "T00:00:00").lte("started_at", today + "T23:59:59"),
      admin.from("nutrition_logs").select("id", { count: "exact", head: true })
        .eq("user_id", uid).eq("date", today),
      admin.from("daily_stats").select("streak").eq("user_id", uid).eq("date", today).maybeSingle(),
    ]);

    const reminder = duRelais ?? pickReminder(
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
