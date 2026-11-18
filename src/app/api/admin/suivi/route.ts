import { exigerAdmin } from "@/lib/adminGuard";
import { preferencesDe } from "@/lib/notificationPrefs";
import { mouvements, raretes, type Carte } from "@/lib/cartesBooster";
import type { EvenementSuivi, SuiviAdmin } from "@/lib/adminSuivi";

const colonnesJournal = "id,user_id,cree_le,termine_le,touche_le,titre,categorie,statut,appareils,acceptes,echecs,codes_erreur";

export async function GET(req: Request) {
  const porte = await exigerAdmin(req);
  if (!porte.ok) return porte.reponse;
  const { admin } = porte;
  const params = new URL(req.url).searchParams;
  const jours = Number(params.get("jours") ?? 7);
  const limite = Number(params.get("limite") ?? 100);
  const membre = params.get("membre");
  if (![1, 7, 30].includes(jours) || !Number.isInteger(limite) || limite < 1 || limite > 1000 ||
    (membre && !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(membre))) {
    return Response.json({ error: "filtre_invalide" }, { status: 400 });
  }
  const prive = { headers: { "Cache-Control": "private, no-store" } };
  try {
    const depuis = new Date(Date.now() - jours * 86400_000).toISOString();
    const membres: SuiviAdmin["membres"] = [];
    for (let i = 0; ; i += 500) {
      const { data, error } = await admin.from("profiles").select("id,pseudo,guide_id").order("id").range(i, i + 499).abortSignal(req.signal);
      if (error) throw error;
      membres.push(...data ?? []);
      if (!data || data.length < 500) break;
    }
    let qBoosters = admin.from("boosters_illimites").select("user_id,requete_id,ouvert_le,cartes,cadence_3h").gte("ouvert_le", depuis);
    let qAnciens = admin.from("boosters_exercices").select("user_id,jour,cartes").gte("jour", depuis.slice(0, 10));
    let qJournal = admin.from("journal_push").select(colonnesJournal).gte("cree_le", depuis);
    let qClics = admin.from("journal_push").select(colonnesJournal).gte("touche_le", depuis);
    let qDerniers = admin.from("boosters_notifies").select("user_id,dernier_envoi").gte("dernier_envoi", depuis);
    if (membre) {
      qBoosters = qBoosters.eq("user_id", membre); qAnciens = qAnciens.eq("user_id", membre);
      qJournal = qJournal.eq("user_id", membre); qClics = qClics.eq("user_id", membre); qDerniers = qDerniers.eq("user_id", membre);
    }
    const [boosters, anciens, journal, clics, derniers] = await Promise.all([
      qBoosters.order("ouvert_le", { ascending: false }).order("requete_id").limit(limite + 1).abortSignal(req.signal),
      qAnciens.order("jour", { ascending: false }).order("user_id").limit(limite + 1).abortSignal(req.signal),
      qJournal.order("cree_le", { ascending: false }).order("id").limit(limite + 1).abortSignal(req.signal),
      qClics.order("touche_le", { ascending: false }).order("id").limit(limite + 1).abortSignal(req.signal),
      qDerniers.order("dernier_envoi", { ascending: false }).order("user_id").limit(limite + 1).abortSignal(req.signal),
    ]);
    if (boosters.error) throw boosters.error;
    const avertissements: string[] = [];
    if (anciens.error) avertissements.push("Les anciens boosters quotidiens n’ont pas pu être lus.");
    if (derniers.error) avertissements.push("Le dernier rappel booster n’a pas pu être lu.");
    const erreurJournal = journal.error ?? clics.error;
    if (erreurJournal && !["PGRST205", "42P01"].includes(erreurJournal.code)) avertissements.push("Le journal des notifications n’a pas pu être lu.");
    const noms = new Map(membres.map(m => [m.id, m.pseudo || "Un membre"]));
    const evenements: EvenementSuivi[] = [];
    const ajouter = (e: Omit<EvenementSuivi, "pseudo">) => evenements.push({ ...e, pseudo: noms.get(e.user_id) ?? "Compte supprimé" });
    const cartes = (valeur: unknown) => !Array.isArray(valeur) ? "Cartes non disponibles" : valeur.flatMap((c: Carte) =>
      c && Object.hasOwn(mouvements, c.exercice) && Object.hasOwn(raretes, c.rarete) ? [mouvements[c.exercice][0] + " · " + raretes[c.rarete]] : []).join(" / ");
    for (const b of boosters.data ?? []) ajouter({ id: "booster:" + b.requete_id, user_id: b.user_id, quand: b.ouvert_le,
      type: "booster", titre: b.cadence_3h ? "Booster ouvert" : "Booster d’essai ouvert", detail: cartes(b.cartes), heureConnue: true });
    for (const b of anciens.data ?? []) ajouter({ id: "ancien:" + b.user_id + ":" + b.jour, user_id: b.user_id, quand: b.jour,
      type: "booster", titre: "Booster quotidien ouvert", detail: cartes(b.cartes) + " · Heure non enregistrée à l’époque", heureConnue: false });
    const notifications = [...new Map([...(journal.data ?? []), ...(clics.data ?? [])].map(p => [p.id, p])).values()];
    for (const p of notifications) {
      const statut = p.statut === "preparation" ? "Résultat d’envoi non confirmé" : p.statut === "sans_appareil" ? "Aucun appareil abonné" :
        `${p.acceptes} envoi(s) accepté(s) · ${p.echecs} échec(s)`;
      if (p.cree_le >= depuis) ajouter({ id: "push:" + p.id, user_id: p.user_id, quand: p.termine_le ?? p.cree_le, type: "push", titre: p.titre,
        detail: statut + (p.codes_erreur?.length ? " · Code(s) " + p.codes_erreur.join(", ") : "") + " · Réception non confirmée", heureConnue: true });
      if (p.touche_le && p.touche_le >= depuis) ajouter({ id: "clic:" + p.id, user_id: p.user_id, quand: p.touche_le, type: "clic",
        titre: "Notification touchée", detail: p.titre + " · Heure d’enregistrement serveur", heureConnue: true });
    }
    for (const n of derniers.data ?? []) {
      if ((journal.data ?? []).some(p => p.user_id === n.user_id && p.categorie === "booster" && Math.abs(Date.parse(p.cree_le) - Date.parse(n.dernier_envoi)) < 60_000)) continue;
      ajouter({ id: "dernier:" + n.user_id, user_id: n.user_id, quand: n.dernier_envoi, type: "push", titre: "Ton booster est prêt",
        detail: "Dernier envoi connu de l’ancien suivi · Réception non confirmée", heureConnue: true });
    }
    evenements.sort((a, b) => Date.parse(b.quand) - Date.parse(a.quand) || a.id.localeCompare(b.id));
    let fiche: SuiviAdmin["fiche"] = null;
    if (membre) {
      const [reserve, prefs, subs] = await Promise.all([
        admin.rpc("reserve_booster", { p_user: membre, p_maintenant: new Date().toISOString() }),
        preferencesDe(admin, membre),
        admin.from("push_subscriptions").select("user_id", { count: "exact", head: true }).eq("user_id", membre),
      ]);
      const r = Array.isArray(reserve.data) ? reserve.data[0] : reserve.data;
      fiche = { stock: reserve.error ? null : r?.stock ?? null, prochain: reserve.error ? null : r?.prochain ?? null,
        rappel: prefs.rappel, appareils: subs.error ? null : subs.count };
    }
    return Response.json({ evenements: evenements.slice(0, limite), suite: evenements.length > limite ||
      [boosters, anciens, journal, clics, derniers].some(r => (r.data?.length ?? 0) > limite),
      journalActif: !erreurJournal, avertissements, membres, fiche } satisfies SuiviAdmin, prive);
  } catch {
    return Response.json({ error: "suivi_indisponible" }, { ...prive, status: 503 });
  }
}
