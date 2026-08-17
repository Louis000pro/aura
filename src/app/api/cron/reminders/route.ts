/**
 * GET /api/cron/reminders : LE RAPPEL DU SOIR
 *
 * Déclenché par Vercel Cron (voir vercel.json). Deux entrées UTC pointent
 * ici, et la route ne travaille qu'à 19 h heure de Paris : Vercel ne sait
 * planifier qu'en UTC, donc une seule entrée dérivait d'une heure deux fois
 * par an au changement d'heure. L'entrée qui tombe à côté sort en no-op.
 *
 * ── Ce qu'on s'autorise à envoyer (règles posées avec Louis) ──
 *
 * 1. RIEN à qui a déjà fait sa séance du jour. L'ancienne version envoyait
 *    « Tu gères aujourd'hui 🔥 » : une notification qui ne demande rien, ne
 *    mène nulle part, et arrive quand même tous les soirs. C'est celle qu'on
 *    coupe, et en la coupant on coupait aussi les quatre autres familles.
 *
 * 2. Le rappel nutrition ne part QU'À qui note habituellement ses repas (au
 *    moins un dans les 7 derniers jours). Proposer un usage que la personne
 *    n'a pas, c'est prescrire ; on réagit à sa réalité.
 *
 * 3. SILENCE après 14 jours sans une seule venue. Pas de « tu nous manques » :
 *    ce serait exactement le message culpabilisant qu'on s'interdit. On se
 *    tait, et le rappel repart tout seul à la première présence.
 *
 * 4. Un seul push par personne et par soir : le relais passe avant le rappel.
 *
 * 5. Chaque famille respecte le réglage de l'utilisateur (notification_prefs).
 *
 * Sécurité : header « Authorization: Bearer <CRON_SECRET> » (ajouté auto par
 * Vercel quand la variable existe). Fail-closed : sans CRON_SECRET en
 * production, la route refuse tout (401). Une serrure optionnelle n'est pas
 * une serrure.
 */
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-admin";
import { parisDateStr, parisHour, shiftDateStr } from "@/lib/dates";
import { preferencesDeLot, type Preferences } from "@/lib/notificationPrefs";

const VAPID_PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT ?? "mailto:bonjour@vaiiya.fr";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/** L'heure du rappel, en heure de Paris. Un seul endroit pour la changer. */
const HEURE_ENVOI = 19;

/** Au-delà, on se tait. Le rappel repart seul dès la première venue. */
const JOURS_AVANT_SILENCE = 14;

/** Fenêtre qui définit « cette personne note ses repas ». */
const JOURS_HABITUDE_REPAS = 7;

type Reminder = { title: string; body: string; url: string };

/**
 * Le rappel du soir, ou `null` quand il n'y a rien à dire.
 * Renvoyer `null` est le cas NORMAL, pas un cas d'erreur : le plus souvent,
 * la bonne notification est celle qu'on n'envoie pas.
 */
function rappelDuSoir(opts: {
  seanceFaite: boolean;
  repasNotes: boolean;
  noteHabituellement: boolean;
  streak: number;
}): Reminder | null {
  if (!opts.seanceFaite) {
    return {
      title: "Ta séance t'attend 💪",
      body: opts.streak > 0
        ? `Garde ta série de ${opts.streak} jour${opts.streak > 1 ? "s" : ""} ! Ouvre Vaiiya pour ta séance du jour.`
        : "Prêt à bouger ? Ta séance du jour est dans Vaiiya.",
      url: "/progression",
    };
  }

  if (!opts.repasNotes && opts.noteHabituellement) {
    return {
      title: "Et tes repas ? 🍽️",
      body: "Séance faite ✓, il ne te manque que ce que tu as mangé aujourd'hui.",
      url: "/nutrition",
    };
  }

  // Séance faite (et repas à jour, ou personne qui ne les note pas) : on se tait.
  return null;
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

  const hierStr = shiftDateStr(today, -1);

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
    const fin = new Date((run.ends_on as string) + "T12:00:00Z");
    const jour = new Date(today + "T12:00:00Z");
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

/**
 * L'activité de tout le monde en trois requêtes, au lieu de trois par
 * personne comme avant. Même compromis que /api/admin/stats : on lit large
 * et on agrège en JS, ce qui est le bon choix à quelques dizaines de comptes.
 * Le jour où le nombre de comptes change d'ordre de grandeur, c'est ici
 * qu'il faudra paginer.
 */
async function activiteDuJour(
  admin: ReturnType<typeof createAdminClient>,
  ids: string[],
  today: string,
) {
  const debutHabitude = shiftDateStr(today, -JOURS_HABITUDE_REPAS);
  const debutPresence = shiftDateStr(today, -JOURS_AVANT_SILENCE);

  // Les séances sont horodatées (timestamptz) alors que le jour métier est
  // parisien : on ratisse large, puis on compare des jours parisiens en JS.
  // Borner en SQL décalerait d'une à deux heures selon la saison, et une
  // séance faite à 00 h 30 compterait pour la veille.
  const depuis = new Date(Date.now() - 40 * 3_600_000).toISOString();

  const [seancesRes, repasRes, presenceRes] = await Promise.all([
    admin.from("workout_sessions").select("user_id, started_at").in("user_id", ids).gte("started_at", depuis),
    admin.from("nutrition_logs").select("user_id, date").in("user_id", ids).gte("date", debutHabitude),
    admin.from("daily_stats").select("user_id, date, streak").in("user_id", ids).gte("date", debutPresence),
  ]);

  const seanceFaite  = new Set<string>();
  const repasNotes   = new Set<string>();
  const habitude     = new Set<string>();
  const vuRecemment  = new Set<string>();
  const streaks      = new Map<string, number>();

  for (const s of seancesRes.data ?? []) {
    if (parisDateStr(new Date(s.started_at as string)) === today) seanceFaite.add(s.user_id as string);
  }
  for (const r of repasRes.data ?? []) {
    habitude.add(r.user_id as string);
    if (r.date === today) repasNotes.add(r.user_id as string);
  }
  for (const d of presenceRes.data ?? []) {
    vuRecemment.add(d.user_id as string);
    if (d.date === today) streaks.set(d.user_id as string, (d.streak as number) ?? 0);
  }

  // Filet : si la lecture de présence échoue, on ne coupe personne. Une
  // requête ratée ne doit jamais faire taire tous les rappels d'un coup.
  const presenceFiable = !presenceRes.error;

  return { seanceFaite, repasNotes, habitude, vuRecemment, streaks, presenceFiable };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "non_autorisé" }, { status: 401 });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID non configuré" }, { status: 500 });
  }

  // ── L'heure de Paris, pas celle d'UTC ──
  const maintenant = new Date();
  if (parisHour(maintenant) !== HEURE_ENVOI) {
    return NextResponse.json({ ok: true, ignore: "hors_heure", heure: parisHour(maintenant) });
  }

  const admin = createAdminClient();
  const today = parisDateStr(maintenant);

  // ── Utilisateurs abonnés aux push ──
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");
  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, users: 0, sent: 0 });
  }

  const byUser = new Map<string, { endpoint: string; p256dh: string; auth: string }[]>();
  for (const s of subs) {
    const arr = byUser.get(s.user_id) ?? [];
    arr.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
    byUser.set(s.user_id, arr);
  }

  const ids = [...byUser.keys()];

  const [relais, activite, prefs] = await Promise.all([
    rappelsRelais(admin, today),
    activiteDuJour(admin, ids, today),
    preferencesDeLot(admin, ids),
  ]);

  let sent = 0;
  let usersNotified = 0;
  let silencieux = 0;

  for (const [uid, userSubs] of byUser) {
    const pref: Preferences = prefs.get(uid) ?? { rappel: true, message: true, ami: true, relais: true };

    // Le relais passe AVANT : on n'envoie jamais deux push le même soir.
    const duRelais = pref.relais ? relais.get(uid) : undefined;

    let reminder: Reminder | null = duRelais ?? null;

    if (!reminder && pref.rappel) {
      const endormi = activite.presenceFiable && !activite.vuRecemment.has(uid);
      if (!endormi) {
        reminder = rappelDuSoir({
          seanceFaite:        activite.seanceFaite.has(uid),
          repasNotes:         activite.repasNotes.has(uid),
          noteHabituellement: activite.habitude.has(uid),
          streak:             activite.streaks.get(uid) ?? 0,
        });
      }
    }

    if (!reminder) { silencieux += 1; continue; }

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

  return NextResponse.json({ ok: true, users: usersNotified, sent, silencieux });
}
