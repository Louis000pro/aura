/**
 * GET /api/cron/reminders : LE RAPPEL DU SOIR
 *
 * Déclenché par Vercel Cron (voir vercel.json). Deux entrées UTC pointent
 * ici, et la route ne travaille qu'à 19 h heure de Paris : Vercel ne sait
 * planifier qu'en UTC, donc une seule entrée dérivait d'une heure deux fois
 * par an au changement d'heure. L'entrée qui tombe à côté sort en no-op.
 *
 * Cette route ne DÉCIDE rien : elle rassemble les faits, les donne à
 * `rappelsProfil.ts` (qui porte les règles de cadence et de sujet), et
 * exécute. Tout ce qu'on peut relire sans base de données vit là-bas, et
 * les MOTS vivent encore ailleurs, dans `guides.ts`, parce qu'ils changent
 * selon le Guide de la personne.
 *
 * Ce qu'elle garantit, elle :
 *  · un seul push par personne et par soir, le relais passant avant ;
 *  · chaque famille respecte le réglage de l'utilisateur ;
 *  · tout est lu en un nombre FIXE de requêtes, quel que soit le nombre de
 *    comptes (avant : trois requêtes par personne, en série).
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
import { preferencesDeLot, PAR_DEFAUT } from "@/lib/notificationPrefs";
import { EXP_BIENVENUE } from "@/lib/aura";
import {
  palierDe,
  rappelPour,
  JOURS_JOURNAL,
  type Envoi,
  type Rappel,
} from "@/lib/rappelsProfil";
import type { GuideRef } from "@/lib/guides";
import { ANNOUNCEMENTS, JOURS_ANNONCE_POUSSABLE, type Announcement } from "@/lib/announcements";

const VAPID_PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT ?? "mailto:bonjour@vaiiya.fr";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/** L'heure du rappel, en heure de Paris. Un seul endroit pour la changer. */
const HEURE_ENVOI = 19;

/** Fenêtre qui définit « cette personne note ses repas ». */
const JOURS_HABITUDE_REPAS = 7;

/** Fenêtre d'observation de l'engagement. */
const JOURS_OBSERVATION = 28;

/**
 * Le rappel du relais, envoyé UNIQUEMENT au moment décisif : le jour
 * où il reste exactement autant de jours que de maillons manquants.
 * Rater ce jour-là, c'est l'affiche qui ne pourra plus être terminée.
 *
 * Rare par construction, c'est ce qui fait qu'il veut dire quelque
 * chose quand il arrive. Il ne part pas à celui qui a franchi la
 * veille : ce n'est pas son tour, la règle le lui interdit.
 */
async function rappelsRelais(
  admin: ReturnType<typeof createAdminClient>,
  today: string,
): Promise<Map<string, Rappel>> {
  const cibles = new Map<string, Rappel>();

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
        cle:      "relais_decisif",
        variante: 0,
        title: "L'affiche se joue aujourd'hui",
        body:  "Sans un maillon aujourd'hui, elle restera incomplète. Dix minutes suffisent.",
        url:   run.conversation_id ? `/communaute/${run.conversation_id}` : "/defi",
      });
    }
  }

  return cibles;
}

/**
 * L'annonce de mise à jour à pousser ce soir, s'il y en a une.
 *
 * La source est `ANNOUNCEMENTS`, celle qui alimente déjà la cloche et le
 * récap : pas de second endroit où écrire la même chose. Deux conditions,
 * et les deux comptent :
 *  · l'annonce porte un bloc `push` (donc c'est une GROSSE mise à jour, pas
 *    une correction de bug) ;
 *  · sa date remonte à moins d'une semaine, pour qu'ajouter `push` après
 *    coup sur une vieille annonce ne réveille pas tout le monde.
 */
function annonceDuSoir(today: string): { id: string; push: NonNullable<Announcement["push"]> } | null {
  for (const a of ANNOUNCEMENTS) {
    if (!a.push) continue;
    const age = Math.round(
      (new Date(today + "T12:00:00Z").getTime() - new Date(a.date + "T12:00:00Z").getTime()) / 86_400_000,
    );
    if (age < 0 || age > JOURS_ANNONCE_POUSSABLE) continue;
    return { id: a.id, push: a.push };
  }
  return null;
}

type Portrait = {
  seancesTotal: number;
  seances28: number;
  presences28: number;
  joursDepuisVenue: number | null;
  seanceFaite: boolean;
  repasNotes: boolean;
  noteHabituellement: boolean;
  serie: number;
  seancePrevue: string | null;
  jourDeRepos: boolean;
  exp: number | null;
  pseudo: string | null;
  guide: GuideRef;
  envois: Envoi[];
};

/**
 * Le profil, avec le Guide quand la colonne existe.
 *
 * ⚠️ Deux requêtes plutôt qu'une seule, et seulement quand il le faut.
 * `guide_id` n'arrive qu'avec `20260818_guide_id.sql`, une migration qui
 * se colle à la main : tant qu'elle n'est pas passée, demander la colonne
 * fait échouer la requête ENTIÈRE, donc on perdrait aussi le pseudo, et
 * tous les rappels du soir se mettraient à tutoyer un inconnu. On retente
 * donc sans elle, et l'absence de Guide se contente de rendre la voix
 * commune. Le cas normal (colonne présente) ne coûte qu'une requête.
 */
async function lireProfils(admin: ReturnType<typeof createAdminClient>, ids: string[]) {
  const avec = await admin.from("profiles").select("id, pseudo, guide_id").in("id", ids);
  if (!avec.error) return { data: avec.data, guideLisible: true };

  console.warn("[reminders] guide_id illisible, voix commune :", avec.error.message);
  const sans = await admin.from("profiles").select("id, pseudo").in("id", ids);
  return { data: sans.data, guideLisible: false };
}

/**
 * Tout le monde en sept requêtes, au lieu de trois PAR PERSONNE en série.
 * Même compromis que /api/admin/stats : on lit large et on agrège en JS,
 * ce qui est le bon choix à quelques dizaines de comptes. Le jour où le
 * nombre de comptes change d'ordre de grandeur, c'est ici qu'il faudra
 * borner les lectures (les séances et les crédits d'EXP en premier, ce
 * sont les deux seules sans filtre de date).
 */
async function portraits(
  admin: ReturnType<typeof createAdminClient>,
  ids: string[],
  today: string,
): Promise<{ carte: Map<string, Portrait>; presenceFiable: boolean; journalFiable: boolean }> {
  const debutHabitude    = shiftDateStr(today, -JOURS_HABITUDE_REPAS);
  const debutObservation = shiftDateStr(today, -JOURS_OBSERVATION);
  const debutJournal     = shiftDateStr(today, -JOURS_JOURNAL);

  const [seancesRes, repasRes, presenceRes, planningRes, expRes, journalRes, profilsRes] =
    await Promise.all([
      admin.from("workout_sessions").select("user_id, started_at").in("user_id", ids),
      admin.from("nutrition_logs").select("user_id, date").in("user_id", ids).gte("date", debutHabitude),
      admin.from("daily_stats").select("user_id, date, streak").in("user_id", ids).gte("date", debutObservation),
      admin.from("planning_days").select("user_id, type, title, exercise_list, status").in("user_id", ids).eq("date", today),
      admin.from("aura_mission_credits").select("user_id, points").in("user_id", ids),
      admin.from("notification_rappels").select("user_id, jour, cle, variante").in("user_id", ids).gte("jour", debutJournal).order("jour", { ascending: false }),
      lireProfils(admin, ids),
    ]);

  const carte = new Map<string, Portrait>();
  for (const id of ids) {
    carte.set(id, {
      seancesTotal: 0, seances28: 0, presences28: 0, joursDepuisVenue: null,
      seanceFaite: false, repasNotes: false, noteHabituellement: false, serie: 0,
      seancePrevue: null, jourDeRepos: false, exp: null, pseudo: null, guide: null, envois: [],
    });
  }

  const ecart = (jour: string) =>
    Math.round((new Date(today + "T12:00:00Z").getTime() - new Date(jour + "T12:00:00Z").getTime()) / 86_400_000);

  // Les séances sont horodatées (timestamptz) alors que le jour métier est
  // parisien : on convertit chaque horodatage en jour de Paris plutôt que
  // de borner en SQL, ce qui décalerait d'une à deux heures selon la saison
  // et ferait compter une séance de 00 h 30 pour la veille.
  for (const s of seancesRes.data ?? []) {
    const p = carte.get(s.user_id as string);
    if (!p) continue;
    p.seancesTotal += 1;
    const jour = parisDateStr(new Date(s.started_at as string));
    if (jour === today) p.seanceFaite = true;
    if (ecart(jour) < JOURS_OBSERVATION) p.seances28 += 1;
  }

  for (const r of repasRes.data ?? []) {
    const p = carte.get(r.user_id as string);
    if (!p) continue;
    p.noteHabituellement = true;
    if (r.date === today) p.repasNotes = true;
  }

  for (const d of presenceRes.data ?? []) {
    const p = carte.get(d.user_id as string);
    if (!p) continue;
    p.presences28 += 1;
    const jours = ecart(d.date as string);
    if (p.joursDepuisVenue === null || jours < p.joursDepuisVenue) p.joursDepuisVenue = jours;
    if (d.date === today) p.serie = (d.streak as number) ?? 0;
  }

  for (const j of planningRes.data ?? []) {
    const p = carte.get(j.user_id as string);
    if (!p) continue;
    const type = String(j.type ?? "");
    const exos = Array.isArray(j.exercise_list) ? j.exercise_list.length : 0;
    // Même définition que `hasSession` côté client : un jour « Repos », ou
    // un jour sans exercice, n'est pas une séance à faire.
    if (type.toLowerCase() === "repos" || exos === 0) { p.jourDeRepos = true; continue; }
    if (j.status === "done") { p.seanceFaite = true; continue; }
    p.seancePrevue = String(j.title || type);
  }

  // Le socle de bienvenue, comme la RPC `etat_missions_aura`.
  if (!expRes.error) {
    for (const id of ids) {
      const p = carte.get(id);
      if (p) p.exp = EXP_BIENVENUE;
    }
    for (const c of expRes.data ?? []) {
      const p = carte.get(c.user_id as string);
      if (p && p.exp !== null) p.exp += Number(c.points ?? 0);
    }
  }

  // Trié par jour décroissant à la requête : `envois` reste donc du plus
  // récent au plus ancien, ce sur quoi `habiller` s'appuie pour ne jamais
  // reprendre la formulation précédente.
  for (const e of journalRes.data ?? []) {
    carte.get(e.user_id as string)?.envois.push({
      jour: e.jour as string,
      cle: e.cle as string,
      variante: Number(e.variante ?? 0),
    });
  }

  for (const pr of profilsRes.data ?? []) {
    const p = carte.get(pr.id as string);
    if (!p) continue;
    p.pseudo = (pr.pseudo as string) ?? null;
    // La colonne peut valoir NULL (personne qui n'a pas encore choisi) ou
    // manquer (migration pas collée) : les deux mènent à la voix commune,
    // ce qui est exactement le repli voulu.
    const g = "guide_id" in pr ? (pr as { guide_id?: string | null }).guide_id : null;
    p.guide = g === "nora" || g === "sasha" ? g : null;
  }

  /* Deux filets, et ils tirent dans des sens OPPOSÉS, à dessein.
     Présence illisible : on ne fait taire personne à tort, une requête ratée
     ne doit pas couper tous les rappels d'un coup.
     Journal illisible : on se TAIT. Le journal porte le plafond ; sans lui,
     « une fois par semaine » et « une fois par mois » deviennent « tous les
     soirs ». Tant que la migration n'est pas passée, mieux vaut aucun rappel
     qu'un rappel quotidien à quelqu'un qui n'a rien demandé. */
  if (journalRes.error) {
    console.warn("[reminders] notification_rappels illisible, rappels suspendus :", journalRes.error.message);
  }

  return { carte, presenceFiable: !presenceRes.error, journalFiable: !journalRes.error };
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

  const annonce = annonceDuSoir(today);

  // Qui l'a déjà reçue ? Une annonce ne part qu'une fois par personne, même
  // si le cron est rejoué ou si la personne était prioritaire sur le relais
  // hier soir (auquel cas elle la reçoit ce soir).
  const dejaAnnonce = new Set<string>();
  let annonceEnvoyable = annonce !== null;
  if (annonce) {
    const { data, error } = await admin
      .from("notification_annonces")
      .select("user_id")
      .eq("annonce_id", annonce.id)
      .in("user_id", ids);
    // Même raisonnement que le journal : sans la table qui retient à qui
    // l'annonce est déjà partie, elle repartirait CHAQUE soir. On préfère
    // ne pas l'annoncer du tout.
    if (error) {
      annonceEnvoyable = false;
      console.warn("[reminders] notification_annonces illisible, annonce suspendue :", error.message);
    }
    for (const r of data ?? []) dejaAnnonce.add(r.user_id as string);
  }

  const [relais, portraitsRes, prefs] = await Promise.all([
    rappelsRelais(admin, today),
    portraits(admin, ids, today),
    preferencesDeLot(admin, ids),
  ]);

  const { carte, presenceFiable, journalFiable } = portraitsRes;

  let sent = 0;
  let usersNotified = 0;
  let silencieux = 0;
  const parPalier: Record<string, number> = {};

  for (const [uid, userSubs] of byUser) {
    const pref = prefs.get(uid) ?? PAR_DEFAUT;
    const p = carte.get(uid);

    /* Un seul push par personne et par soir, dans cet ordre de priorité :
       le relais décisif (daté, le rater coûte l'affiche), puis l'annonce de
       mise à jour (qui peut attendre un jour, et qui repartira demain), puis
       le rappel du soir. */
    let rappel: Rappel | null = (pref.relais ? relais.get(uid) : undefined) ?? null;
    const duRelais = rappel !== null;

    // L'annonce part à TOUT LE MONDE, y compris aux endormis : c'est
    // justement la seule chose qu'on ait de neuf à leur dire, et elle ne
    // consomme pas leur cadence.
    const pourAnnonce = Boolean(
      !rappel && annonce && annonceEnvoyable && pref.maj && !dejaAnnonce.has(uid),
    );
    if (pourAnnonce && annonce) {
      rappel = {
        cle: "maj",
        variante: 0,
        title: annonce.push.title,
        body: annonce.push.body,
        url: annonce.push.url ?? "/notifications",
      };
    }

    if (!rappel && pref.rappel && journalFiable && p) {
      // Une présence illisible ne doit pas faire passer tout le monde
      // « endormi » : dans ce cas on considère la personne venue aujourd'hui.
      const signaux = {
        seancesTotal: p.seancesTotal,
        seances28: p.seances28,
        presences28: p.presences28,
        joursDepuisVenue: presenceFiable ? p.joursDepuisVenue : 0,
      };
      const palier = palierDe(signaux);
      parPalier[palier] = (parPalier[palier] ?? 0) + 1;

      rappel = rappelPour({
        aujourdHui: today,
        palier,
        pseudo: p.pseudo,
        guide: p.guide,
        joursDepuisVenue: signaux.joursDepuisVenue,
        seancePrevue: p.seancePrevue,
        jourDeRepos: p.jourDeRepos,
        seanceFaite: p.seanceFaite,
        repasNotes: p.repasNotes,
        noteHabituellement: p.noteHabituellement,
        serie: p.serie,
        exp: p.exp,
        seancesTotal: p.seancesTotal,
        envois: p.envois,
      });
    }

    if (!rappel) { silencieux += 1; continue; }

    const payload = JSON.stringify({
      title: rappel.title,
      body: rappel.body,
      icon: "/icons/icon-192.png",
      url: rappel.url,
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
    if (ok === 0) continue;

    usersNotified += 1;

    if (pourAnnonce && annonce) {
      await admin.from("notification_annonces")
        .insert({ user_id: uid, annonce_id: annonce.id })
        .then(undefined, () => {});
      continue;
    }

    // Le journal sert à la fois de plafond et de mémoire des formulations.
    // Ni le relais décisif ni l'annonce n'y entrent : ils ne sont pas soumis
    // à la cadence, et les y écrire consommerait le quota du rappel du soir.
    // `UNIQUE (user_id, jour)` fait la même garantie côté base : un seul
    // rappel par personne et par soir, même si la route est rejouée.
    if (!duRelais) {
      await admin.from("notification_rappels")
        .insert({ user_id: uid, jour: today, cle: rappel.cle, variante: rappel.variante })
        .then(undefined, () => {});
    }
  }

  return NextResponse.json({
    ok: true,
    users: usersNotified,
    sent,
    silencieux,
    paliers: parPalier,
    ...(journalFiable ? {} : { migration_manquante: "notification_rappels" }),
  });
}
