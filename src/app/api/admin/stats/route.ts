/**
 * GET /api/admin/stats — tout ce que l'écran d'administration affiche.
 *
 * ⚠️ Pourquoi cette route existe : la page /admin lisait ses statistiques
 * depuis le NAVIGATEUR. Or `workout_sessions`, `daily_stats`,
 * `nutrition_logs`, `aura_mission_credits`, `planning_days` et
 * `challenge_runs` sont toutes en RLS propriétaire. Le navigateur d'un admin
 * ne voit donc que SES lignes : « Séances : 12 » affichait les douze séances
 * de l'admin, pas celles de l'app. Les chiffres étaient faux depuis toujours.
 *
 * La correction ne touche à AUCUNE policy — assouplir une policy pour un
 * écran d'administration ouvrirait ces données à tout le monde. On lit en
 * `service_role`, ici, derrière `exigerAdmin`.
 *
 * Tout est calculé en une fois : à l'échelle de Vaiiya (quelques dizaines de
 * comptes) c'est une poignée de requêtes, et l'écran devient instantané quand
 * on passe d'un onglet à l'autre. Le jour où le nombre de comptes change
 * d'ordre de grandeur, c'est ici qu'il faudra paginer et agréger en SQL.
 *
 * Auth : header « Authorization: Bearer <access_token> » d'un compte admin.
 */
import { NextRequest, NextResponse } from "next/server";
import { exigerAdmin } from "@/lib/adminGuard";
import { parisDateStr, shiftDateStr } from "@/lib/dates";
import { LIMITES, type CategorieIA } from "@/lib/aiQuotas";
import { EXP_BIENVENUE } from "@/lib/aura";

/* ─── Ce qu'on lit en base ─── */
type LigneProfil = {
  id: string; pseudo: string | null; full_name: string | null; avatar_url: string | null;
  is_admin: boolean | null; is_certified?: boolean | null; is_banned?: boolean | null;
  is_premium?: boolean | null; created_at: string;
};
type LigneJour     = { user_id: string; date: string; streak: number | null };
type LigneSeance   = { user_id: string; started_at: string; title: string | null; duration_minutes: number | null };
type LigneRepas    = { user_id: string; date: string; meal_type: string | null };
type LigneCreation = { user_id: string; created_at: string };
type LignePlanning = { user_id: string; date: string; status: string | null };
type LigneRelais   = { id: string; statut: string | null; created_at: string; ends_on: string | null };
type LigneCredit   = { user_id: string; points: number | null };
type LigneUsageIA  = { user_id: string; cle: string; compteur: number | null };
type LigneUsageJour = { jour: string; categorie: string; appels: number | null; comptes: number | null };

/** Une requête qui échoue ne doit pas emporter tout l'écran : une table pas
 *  encore migrée rend une section vide, le reste continue de s'afficher. */
async function lire<T>(
  requete: PromiseLike<{ data: unknown; error: unknown }>
): Promise<T[]> {
  const { data, error } = await requete;
  if (error || !Array.isArray(data)) return [];
  return data as T[];
}

/** Écart en jours entre deux dates YYYY-MM-DD, sans dépendre du fuseau. */
function joursEntre(depuis: string, jusqua: string): number {
  const a = Date.parse(`${depuis}T12:00:00Z`);
  const b = Date.parse(`${jusqua}T12:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.NaN;
  return Math.round((b - a) / 86_400_000);
}

const jourDe = (iso: string) => iso.slice(0, 10);

export async function GET(req: NextRequest) {
  const porte = await exigerAdmin(req);
  if (!porte.ok) return porte.reponse;
  const { admin } = porte;

  const aujourdhui = parisDateStr();
  const hier = shiftDateStr(aujourdhui, -1);
  const il_y_a = (n: number) => shiftDateStr(aujourdhui, -n);

  /* ── Lecture. `profiles` d'abord, en deux temps : les colonnes de statut
        ont été ajoutées après coup et peuvent manquer sur une base pas à
        jour. Mieux vaut une liste sans pastilles qu'un écran vide. ── */
  const profilsComplets = await admin
    .from("profiles")
    .select("id, pseudo, full_name, avatar_url, is_admin, is_certified, is_banned, is_premium, created_at")
    .order("created_at", { ascending: false });
  const profils: LigneProfil[] = profilsComplets.error
    ? await lire<LigneProfil>(
        admin.from("profiles")
          .select("id, pseudo, full_name, avatar_url, is_admin, created_at")
          .order("created_at", { ascending: false })
      )
    : ((profilsComplets.data ?? []) as LigneProfil[]);

  const [jours, seances, repas, creations, planning, relais, credits, usageIA, usageJour] = await Promise.all([
    lire<LigneJour>(admin.from("daily_stats").select("user_id, date, streak").limit(50000)),
    lire<LigneSeance>(admin.from("workout_sessions").select("user_id, started_at, title, duration_minutes").limit(50000)),
    lire<LigneRepas>(admin.from("nutrition_logs").select("user_id, date, meal_type").gte("date", il_y_a(29)).limit(50000)),
    lire<LigneCreation>(admin.from("custom_sessions").select("user_id, created_at").limit(50000)),
    lire<LignePlanning>(admin.from("planning_days").select("user_id, date, status").gte("date", il_y_a(29)).limit(50000)),
    lire<LigneRelais>(admin.from("challenge_runs").select("id, statut, created_at, ends_on").limit(5000)),
    lire<LigneCredit>(admin.from("aura_mission_credits").select("user_id, points").limit(50000)),
    lire<LigneUsageIA>(admin.from("ai_usage").select("user_id, cle, compteur").limit(50000)),
    lire<LigneUsageJour>(admin.from("ai_usage_daily").select("jour, categorie, appels, comptes").gte("jour", il_y_a(29))),
  ]);

  /* ═══════════ Index de travail ═══════════ */
  const parJourActifs = new Map<string, Set<string>>();
  const derniereVisite = new Map<string, string>();
  const serieDe = new Map<string, number>();
  const joursDuCompte = new Map<string, string[]>();
  for (const l of jours) {
    if (!l.user_id || !l.date) continue;
    if (!parJourActifs.has(l.date)) parJourActifs.set(l.date, new Set());
    parJourActifs.get(l.date)!.add(l.user_id);
    const vue = derniereVisite.get(l.user_id);
    if (!vue || l.date > vue) {
      derniereVisite.set(l.user_id, l.date);
      serieDe.set(l.user_id, l.streak ?? 0);
    }
    const liste = joursDuCompte.get(l.user_id);
    if (liste) liste.push(l.date); else joursDuCompte.set(l.user_id, [l.date]);
  }

  const seancesDe = new Map<string, number>();
  for (const s of seances) seancesDe.set(s.user_id, (seancesDe.get(s.user_id) ?? 0) + 1);

  const repasDe = new Map<string, number>();
  for (const r of repas) repasDe.set(r.user_id, (repasDe.get(r.user_id) ?? 0) + 1);

  /* Même formule que `etat_missions_aura` et `rangs_aura` : le socle de
     bienvenue plus le registre. Sans le +10, cet écran affichait 10 EXP de
     moins que le profil de la même personne. */
  const expDe = new Map<string, number>();
  for (const p of profils) expDe.set(p.id, EXP_BIENVENUE);
  for (const c of credits) expDe.set(c.user_id, (expDe.get(c.user_id) ?? EXP_BIENVENUE) + Number(c.points ?? 0));

  /* ── Compteurs IA du jour. Deux formes de clé :
        `chat:2026-08-11`         → un compte, un jour, une catégorie
        `chat:m:2026-08-11T14:32` → la rafale, une par appel ── */
  const iaJourDuCompte = new Map<string, number>();
  const iaParCategorie = new Map<string, number>();
  const iaPlafonds: { userId: string; categorie: string; appels: number; plafond: number }[] = [];
  const premiumDe = new Map<string, boolean>();
  for (const p of profils) premiumDe.set(p.id, !!p.is_premium || !!p.is_admin);

  for (const u of usageIA) {
    const [categorie, deux] = u.cle.split(":");
    if (deux === "m") continue;               // rafale : une ligne par minute, pas un total du jour
    if (deux !== aujourdhui) continue;
    const n = u.compteur ?? 0;
    iaJourDuCompte.set(u.user_id, (iaJourDuCompte.get(u.user_id) ?? 0) + n);
    iaParCategorie.set(categorie, (iaParCategorie.get(categorie) ?? 0) + n);
    const limite = LIMITES[categorie as CategorieIA];
    if (limite && !premiumDe.get(u.user_id) && n >= limite.gratuit) {
      iaPlafonds.push({ userId: u.user_id, categorie, appels: n, plafond: limite.gratuit });
    }
  }

  /* ═══════════ POULS ═══════════ */
  const actifsLe = (jour: string) => parJourActifs.get(jour)?.size ?? 0;
  const actifsSur = (depuis: string) => {
    const gens = new Set<string>();
    for (const [jour, set] of parJourActifs) if (jour >= depuis) set.forEach((g) => gens.add(g));
    return gens.size;
  };
  const actifsEntre = (depuis: string, jusqua: string) => {
    const gens = new Set<string>();
    for (const [jour, set] of parJourActifs) if (jour >= depuis && jour <= jusqua) set.forEach((g) => gens.add(g));
    return gens.size;
  };

  const parJour = Array.from({ length: 30 }, (_, i) => {
    const jour = il_y_a(29 - i);
    return { jour, actifs: actifsLe(jour) };
  });

  const seancesDepuis = (depuis: string, jusqua?: string) =>
    seances.filter((s) => {
      const j = jourDe(s.started_at);
      return j >= depuis && (!jusqua || j <= jusqua);
    });

  /* Rétention : « revenu au moins une fois pendant la semaine N qui suit son
     inscription », jour d'inscription exclu — sinon la 1re semaine ferait
     100 % pour tout le monde, puisque s'inscrire écrit déjà une présence. */
  const retention = [1, 2, 3, 4].map((semaine) => {
    let base = 0;
    let revenus = 0;
    for (const p of profils) {
      const inscrit = jourDe(p.created_at);
      if (joursEntre(inscrit, aujourdhui) < semaine * 7) continue; // sa semaine N n'est pas finie
      base += 1;
      const debut = 7 * (semaine - 1) + 1;
      const fin = 7 * semaine;
      const sesJours = joursDuCompte.get(p.id) ?? [];
      if (sesJours.some((j) => {
        const ecart = joursEntre(inscrit, j);
        return ecart >= debut && ecart <= fin;
      })) revenus += 1;
    }
    return { semaine, base, taux: base ? Math.round((revenus / base) * 100) : 0 };
  });

  const nouveaux = Array.from({ length: 8 }, (_, i) => {
    const debut = il_y_a(7 * (7 - i) + 6);
    const fin = il_y_a(7 * (7 - i) - 1 < 0 ? 0 : 7 * (7 - i) - 1);
    const n = profils.filter((p) => {
      const j = jourDe(p.created_at);
      return j >= debut && j <= fin;
    }).length;
    return { debut, n };
  });

  /* ── Alertes : chacune ouvre la liste filtrée correspondante. Une alerte
        qui ne mène nulle part n'est qu'un bandeau. ── */
  const jamaisDeSeance = profils.filter(
    (p) => !p.is_admin && !seancesDe.has(p.id) && joursEntre(jourDe(p.created_at), aujourdhui) >= 7
  );
  const endormis = profils.filter((p) => {
    const vue = derniereVisite.get(p.id);
    return !p.is_admin && vue !== undefined && joursEntre(vue, aujourdhui) > 7;
  });
  const relaisChauds = relais.filter(
    (r) => r.statut === "en_cours" && r.ends_on !== null && joursEntre(aujourdhui, r.ends_on) <= 1 && joursEntre(aujourdhui, r.ends_on) >= 0
  );

  const alertes: { niveau: "attention" | "info"; texte: string; detail: string; filtre?: string }[] = [];
  if (jamaisDeSeance.length > 0) {
    alertes.push({
      niveau: "attention",
      texte: `${jamaisDeSeance.length} compte${jamaisDeSeance.length > 1 ? "s n'ont" : " n'a"} jamais lancé de séance`,
      detail: "Inscrits depuis plus de 7 jours",
      filtre: "jamais",
    });
  }
  if (iaPlafonds.length > 0) {
    alertes.push({
      niveau: "attention",
      texte: `${iaPlafonds.length} compte${iaPlafonds.length > 1 ? "s gratuits ont" : " gratuit a"} atteint un plafond IA`,
      detail: "Aujourd'hui. Le gratuit est-il au bon niveau ?",
    });
  }
  if (relaisChauds.length > 0) {
    alertes.push({
      niveau: "info",
      texte: `${relaisChauds.length} relais se joue${relaisChauds.length > 1 ? "nt" : ""} dans les prochaines heures`,
      detail: "Dernier jour de la fenêtre",
    });
  }
  if (endormis.length > 0) {
    alertes.push({
      niveau: "info",
      texte: `${endormis.length} compte${endormis.length > 1 ? "s" : ""} sans visite depuis plus de 7 jours`,
      detail: "Venus au moins une fois, repartis depuis",
      filtre: "endormis",
    });
  }

  const appelsIaDe = (jour: string) =>
    usageJour.filter((u) => u.jour === jour).reduce((t, u) => t + (u.appels ?? 0), 0);

  /* ═══════════ GENS ═══════════ */
  // L'e-mail ne vit pas dans `profiles` : il est dans auth. On ne l'affiche
  // que dans la fiche d'un compte, jamais dans la liste.
  const emails = new Map<string, string>();
  try {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of data?.users ?? []) if (u.email) emails.set(u.id, u.email);
  } catch { /* la liste s'affiche très bien sans e-mail */ }

  const gens = profils.map((p) => {
    const vue = derniereVisite.get(p.id) ?? null;
    return {
      id: p.id,
      pseudo: p.pseudo ?? "sans-pseudo",
      full_name: p.full_name ?? null,
      email: emails.get(p.id) ?? null,
      avatar_url: p.avatar_url ?? null,
      is_admin: !!p.is_admin,
      is_certified: !!p.is_certified,
      is_banned: !!p.is_banned,
      is_premium: !!p.is_premium,
      created_at: p.created_at,
      derniereVisite: vue,
      joursDepuisVisite: vue ? joursEntre(vue, aujourdhui) : null,
      seances: seancesDe.get(p.id) ?? 0,
      repas: repasDe.get(p.id) ?? 0,
      serie: serieDe.get(p.id) ?? 0,
      exp: Math.round(expDe.get(p.id) ?? 0),
      joursActifs: (joursDuCompte.get(p.id) ?? []).length,
      iaAujourdhui: iaJourDuCompte.get(p.id) ?? 0,
    };
  });

  /* ═══════════ USAGE ═══════════ */
  const seances7 = seancesDepuis(il_y_a(6));
  const minutes7 = seances7.reduce((t, s) => t + (s.duration_minutes ?? 0), 0);
  const titres = new Map<string, number>();
  for (const s of seancesDepuis(il_y_a(29))) {
    const t = (s.title ?? "").trim();
    if (t) titres.set(t, (titres.get(t) ?? 0) + 1);
  }

  const repas7 = repas.filter((r) => r.date >= il_y_a(6));
  const creneaux = new Map<string, number>();
  for (const r of repas7) {
    const c = (r.meal_type ?? "autre").trim();
    creneaux.set(c, (creneaux.get(c) ?? 0) + 1);
  }

  const planning30 = planning.filter((p) => p.date >= il_y_a(29) && p.date <= aujourdhui);

  /* ═══════════ IA ═══════════ */
  const categoriesConnues = Object.keys(LIMITES) as CategorieIA[];
  const iaAujourdhui = categoriesConnues
    .map((categorie) => {
      const registre = usageJour.find((u) => u.jour === aujourdhui && u.categorie === categorie);
      return {
        categorie,
        libelle: LIMITES[categorie].libelle,
        // Le registre compte TOUS les appels (admins compris) ; les compteurs
        // bruts ne comptent que ceux qui ont un plafond journalier.
        appels: registre?.appels ?? iaParCategorie.get(categorie) ?? 0,
      };
    })
    .sort((a, b) => b.appels - a.appels);

  const pseudoDe = new Map(profils.map((p) => [p.id, p.pseudo ?? "sans-pseudo"]));
  const topIA = Array.from(iaJourDuCompte.entries())
    .map(([id, appels]) => ({ pseudo: pseudoDe.get(id) ?? "compte supprimé", appels, premium: !!premiumDe.get(id) }))
    .sort((a, b) => b.appels - a.appels)
    .slice(0, 6);

  return NextResponse.json({
    genereLe: new Date().toISOString(),
    jour: aujourdhui,
    pouls: {
      actifsAujourdhui: actifsLe(aujourdhui),
      actifsHier: actifsLe(hier),
      actifs7: actifsSur(il_y_a(6)),
      actifs7Avant: actifsEntre(il_y_a(13), il_y_a(7)),
      seances7: seances7.length,
      seances7Avant: seancesDepuis(il_y_a(13), il_y_a(7)).length,
      appelsIaAujourdhui: appelsIaDe(aujourdhui) || Array.from(iaParCategorie.values()).reduce((a, b) => a + b, 0),
      appelsIaHier: appelsIaDe(hier),
      comptes: profils.length,
      parJour,
      retention,
      nouveaux,
      alertes,
    },
    gens,
    usage: {
      seances7: seances7.length,
      seancesComptes: new Set(seances7.map((s) => s.user_id)).size,
      minutesMoyennes: seances7.length ? Math.round(minutes7 / seances7.length) : 0,
      topSeances: Array.from(titres.entries())
        .map(([titre, n]) => ({ titre, n }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 6),
      composees: creations.length,
      composeesComptes: new Set(creations.map((c) => c.user_id)).size,
      repas7: repas7.length,
      repasComptes: new Set(repas7.map((r) => r.user_id)).size,
      creneaux: Array.from(creneaux.entries())
        .map(([creneau, n]) => ({ creneau, n }))
        .sort((a, b) => b.n - a.n),
      relais: {
        enCours: relais.filter((r) => r.statut === "en_cours").length,
        reussis: relais.filter((r) => r.statut === "reussi").length,
        arretes: relais.filter((r) => r.statut === "annule" || r.statut === "termine").length,
        inscription: relais.filter((r) => r.statut === "inscription").length,
      },
      planning: {
        prevus: planning30.filter((p) => p.status !== "skipped").length,
        faits: planning30.filter((p) => p.status === "done").length,
      },
    },
    ia: {
      total: iaAujourdhui.reduce((t, c) => t + c.appels, 0),
      comptes: iaJourDuCompte.size,
      parCategorie: iaAujourdhui,
      top: topIA,
      plafonds: iaPlafonds.map((p) => ({
        pseudo: pseudoDe.get(p.userId) ?? "compte supprimé",
        categorie: p.categorie,
        libelle: LIMITES[p.categorie as CategorieIA]?.libelle ?? p.categorie,
        appels: p.appels,
        plafond: p.plafond,
      })),
      // Vide tant que 20260811_admin_stats.sql n'est pas collé : `ai_usage`
      // seul oublie au bout de deux jours.
      historique: Array.from({ length: 30 }, (_, i) => {
        const jour = il_y_a(29 - i);
        return { jour, appels: appelsIaDe(jour) };
      }),
      registreActif: usageJour.length > 0,
    },
  });
}
