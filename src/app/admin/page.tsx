"use client";

/**
 * Écran d'administration — refait pour le téléphone le 2026-08-11.
 *
 * Ce qui a changé, et pourquoi :
 *
 * 1. Les chiffres sont VRAIS. L'ancienne version lisait ses statistiques
 *    depuis le navigateur, sur des tables en RLS propriétaire : « Séances »
 *    comptait les séances de l'admin, pas celles de l'app. Tout passe
 *    maintenant par /api/admin/stats, en service_role. Aucune policy
 *    Supabase n'a été assouplie — ce serait ouvrir ces données à tout le
 *    monde pour le confort d'un seul écran.
 * 2. Le mode sombre existe. L'ancienne version écrivait toutes ses couleurs
 *    en dur (#fff, #2D3748) : sur fond noir, le titre disparaissait.
 * 3. Les actions se prennent au pouce. Les quatre pastilles de 32 px en bout
 *    de ligne sont remplacées par une fiche, où chaque bascule dit ce qu'elle
 *    déclenche avant qu'on la touche.
 * 4. L'onglet « Saison ✦ » est supprimé : son composant est parti avec la
 *    direction « saison » abandonnée le 2026-07-20, et l'onglet survivant
 *    n'ouvrait plus rien.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, RefreshCw, Search, Check, Camera, AlertTriangle,
  Sparkles, ChevronRight, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import s from "./admin.module.css";

/* ═══════════ Ce que rend /api/admin/stats ═══════════ */
type Compte = {
  id: string; pseudo: string; full_name: string | null; email: string | null;
  avatar_url: string | null; is_admin: boolean; is_certified: boolean;
  is_banned: boolean; is_premium: boolean; created_at: string;
  derniereVisite: string | null; joursDepuisVisite: number | null;
  seances: number; repas: number; serie: number; exp: number;
  joursActifs: number; iaAujourdhui: number;
};

type Stats = {
  genereLe: string;
  jour: string;
  pouls: {
    actifsAujourdhui: number; actifsHier: number;
    actifs7: number; actifs7Avant: number;
    seances7: number; seances7Avant: number;
    appelsIaAujourdhui: number; appelsIaHier: number;
    comptes: number;
    parJour: { jour: string; actifs: number }[];
    retention: { semaine: number; base: number; taux: number }[];
    nouveaux: { debut: string; n: number }[];
    alertes: { niveau: "attention" | "info"; texte: string; detail: string; filtre?: string }[];
  };
  gens: Compte[];
  usage: {
    seances7: number; seancesComptes: number; minutesMoyennes: number;
    topSeances: { titre: string; n: number }[];
    composees: number; composeesComptes: number;
    repas7: number; repasComptes: number;
    creneaux: { creneau: string; n: number }[];
    relais: { enCours: number; reussis: number; arretes: number; inscription: number };
    planning: { prevus: number; faits: number };
  };
  ia: {
    total: number; comptes: number;
    parCategorie: { categorie: string; libelle: string; appels: number }[];
    top: { pseudo: string; appels: number; premium: boolean }[];
    plafonds: { pseudo: string; categorie: string; libelle: string; appels: number; plafond: number }[];
    historique: { jour: string; appels: number }[];
    registreActif: boolean;
  };
};

type Onglet = "pouls" | "gens" | "usage" | "ia";
type Filtre = "tous" | "actifs" | "endormis" | "jamais" | "premium" | "bannis";

/* ═══════════ Petits blocs ═══════════ */
function Carte({ titre, apres, children }: { titre?: string; apres?: string; children: React.ReactNode }) {
  return (
    <div className={s.carte}>
      {titre && (
        <p className={s.lab}><span>{titre}</span>{apres && <em>{apres}</em>}</p>
      )}
      {children}
    </div>
  );
}

function Delta({ valeur, avant, suffixe }: { valeur: number; avant: number; suffixe: string }) {
  const ecart = valeur - avant;
  const classe = ecart > 0 ? s.deltaHaut : ecart < 0 ? s.deltaBas : s.deltaPlat;
  return (
    <span className={`${s.delta} ${classe}`}>
      {ecart > 0 ? "+" : ""}{ecart} {suffixe}
    </span>
  );
}

function Barre({ nom, valeur, max, teinte }: { nom: React.ReactNode; valeur: number; max: number; teinte?: "teal" | "or" }) {
  const pct = max > 0 ? Math.max((valeur / max) * 100, valeur > 0 ? 3 : 0) : 0;
  const classe = teinte === "teal" ? s.remplissageTeal : teinte === "or" ? s.remplissageOr : "";
  return (
    <div className={s.barre1}>
      <span className={s.barreNom}>{nom}</span>
      <span className={s.barreVal}>{valeur}</span>
      <div className={s.piste}>
        <div className={`${s.remplissage} ${classe}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Présences par jour. Une seule teinte : c'est une magnitude, pas des identités. */
function Colonnes({ data, hauteur = 44 }: { data: { jour: string; actifs: number }[]; hauteur?: number }) {
  const max = Math.max(...data.map((d) => d.actifs), 1);
  const largeur = 320;
  const pas = largeur / data.length;
  const barre = Math.max(pas - 3, 2);
  return (
    <svg viewBox={`0 0 ${largeur} ${hauteur}`} width="100%" height={hauteur} style={{ marginTop: 12 }}
      role="img" aria-label={`Présences par jour sur ${data.length} jours, maximum ${max}`}>
      {data.map((d, i) => {
        const h = Math.max((d.actifs / max) * hauteur, d.actifs > 0 ? 3 : 0);
        const dernier = i === data.length - 1;
        return (
          <rect key={d.jour} x={i * pas} y={hauteur - h} width={barre} height={h} rx={2}
            fill="var(--accent)" opacity={dernier ? 1 : 0.32} />
        );
      })}
    </svg>
  );
}

function Avatar({ compte, eteint }: { compte: { pseudo: string; avatar_url: string | null }; eteint?: boolean }) {
  return (
    <div className={`${s.avatar} ${eteint ? s.avatarEteint : ""}`}>
      {compte.avatar_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img loading="lazy" decoding="async" src={compte.avatar_url} alt="" />
        : (compte.pseudo[0] ?? "?").toUpperCase()}
    </div>
  );
}

function Marques({ compte }: { compte: Compte }) {
  return (
    <>
      {compte.is_banned && <span className={`${s.marque} ${s.marqueBanni}`}>Banni</span>}
      {compte.is_admin && <span className={`${s.marque} ${s.marqueAdmin}`}>Admin</span>}
      {compte.is_premium && !compte.is_admin && <span className={`${s.marque} ${s.marquePremium}`}>Premium</span>}
      {compte.is_certified && <span className={`${s.marque} ${s.marqueCertifie}`}>Certifié</span>}
    </>
  );
}

/* ─── Formulations ─── */
function ilYA(jours: number | null): string {
  if (jours === null) return "jamais revenu";
  if (jours <= 0) return "vu aujourd'hui";
  if (jours === 1) return "vu hier";
  if (jours < 30) return `vu il y a ${jours} jours`;
  const mois = Math.floor(jours / 30);
  return `vu il y a ${mois} mois`;
}

function depuis(iso: string): string {
  const jours = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (jours < 1) return "inscrit aujourd'hui";
  if (jours === 1) return "inscrit hier";
  if (jours < 30) return `inscrit il y a ${jours} jours`;
  return `inscrit le ${new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
}

const CRENEAUX: Record<string, string> = {
  petit_dejeuner: "Petit-déjeuner", petitdejeuner: "Petit-déjeuner", "petit-dejeuner": "Petit-déjeuner",
  dejeuner: "Déjeuner", diner: "Dîner", gouter: "Goûter", collation: "Goûter",
};

/* ═══════════════════════ L'écran ═══════════════════════ */
export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [onglet, setOnglet] = useState<Onglet>("pouls");
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [fiche, setFiche] = useState<Compte | null>(null);
  const [confirmation, setConfirmation] = useState<Compte | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const direToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  }, []);

  /* Garde : la page se protège elle-même, la RLS protège les données. */
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace("/auth"); return; }
    if (!user.is_admin) { router.replace("/"); return; }
  }, [user, isLoading, router]);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) { setErreur("Session expirée, reconnecte-toi."); return; }
      const res = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setErreur(`Lecture impossible (${json.error ?? res.status}).`);
        return;
      }
      setStats(await res.json());
    } catch {
      setErreur("Lecture impossible. Vérifie ta connexion.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { if (user?.is_admin) charger(); }, [user?.is_admin, charger]);

  /* Appel des actions d'administration (route serveur, service_role). */
  const appelerAction = useCallback(async (
    action: string, cible: string, extra: Record<string, unknown> = {}
  ): Promise<Record<string, unknown> | null> => {
    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) { direToast("Session expirée, reconnecte-toi"); return null; }
    const res = await fetch("/api/admin/user", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, target_id: cible, ...extra }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { direToast(`Erreur : ${json.error ?? res.status}`); return null; }
    return json;
  }, [direToast]);

  const majCompte = useCallback((id: string, patch: Partial<Compte>) => {
    setStats((prev) => prev
      ? { ...prev, gens: prev.gens.map((c) => (c.id === id ? { ...c, ...patch } : c)) }
      : prev);
    setFiche((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  }, []);

  const supprimerCompte = useCallback(async (cible: Compte) => {
    const r = await appelerAction("delete", cible.id);
    if (!r) return;
    setStats((prev) => prev ? { ...prev, gens: prev.gens.filter((c) => c.id !== cible.id) } : prev);
    setConfirmation(null);
    setFiche(null);
    direToast(`@${cible.pseudo} supprimé`);
  }, [appelerAction, direToast]);

  /* ── Filtres de la liste ── */
  const compteurs = useMemo(() => {
    const g = stats?.gens ?? [];
    return {
      tous: g.length,
      actifs: g.filter((c) => c.joursDepuisVisite !== null && c.joursDepuisVisite <= 7).length,
      endormis: g.filter((c) => c.joursDepuisVisite !== null && c.joursDepuisVisite > 7).length,
      jamais: g.filter((c) => c.seances === 0).length,
      premium: g.filter((c) => c.is_premium).length,
      bannis: g.filter((c) => c.is_banned).length,
    };
  }, [stats]);

  const listeFiltree = useMemo(() => {
    let liste = stats?.gens ?? [];
    if (filtre === "actifs") liste = liste.filter((c) => c.joursDepuisVisite !== null && c.joursDepuisVisite <= 7);
    if (filtre === "endormis") liste = liste.filter((c) => c.joursDepuisVisite !== null && c.joursDepuisVisite > 7);
    if (filtre === "jamais") liste = liste.filter((c) => c.seances === 0);
    if (filtre === "premium") liste = liste.filter((c) => c.is_premium);
    if (filtre === "bannis") liste = liste.filter((c) => c.is_banned);
    const q = recherche.trim().toLowerCase();
    if (q) {
      liste = liste.filter((c) =>
        `${c.pseudo} ${c.full_name ?? ""} ${c.email ?? ""}`.toLowerCase().includes(q));
    }
    /* Trié par dernière visite : ce qui bouge en haut, ce qui dort en bas. */
    return [...liste].sort((a, b) => {
      const va = a.joursDepuisVisite ?? 9999;
      const vb = b.joursDepuisVisite ?? 9999;
      return va - vb;
    });
  }, [stats, filtre, recherche]);

  if (isLoading || !user?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div className="w-8 h-8 rounded-full border-2"
          style={{ borderColor: "rgba(var(--accent-rgb),0.25)", borderTopColor: "var(--accent)" }}
          animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
      </div>
    );
  }

  const p = stats?.pouls;
  const u = stats?.usage;
  const ia = stats?.ia;

  return (
    <div className={s.ecran}>
      {/* ── Barre : /admin porte la sienne, sinon la cloche globale vient
             se poser sur le bouton « Actualiser ». ── */}
      <div className={s.barre}>
        <button className={s.rond} onClick={() => router.back()} aria-label="Revenir">
          <ArrowLeft size={16} strokeWidth={2} />
        </button>
        <div className={s.titreBarre}>
          <b>Administration</b>
          <span>{p ? `${p.comptes} comptes` : "…"} · @{user.pseudo}</span>
        </div>
        <button className={s.rond} onClick={charger} disabled={chargement} aria-label="Actualiser">
          <motion.span
            animate={chargement ? { rotate: 360 } : { rotate: 0 }}
            transition={chargement ? { duration: 0.9, repeat: Infinity, ease: "linear" } : { duration: 0.2 }}
            style={{ display: "grid", placeItems: "center" }}
          >
            <RefreshCw size={15} strokeWidth={2} />
          </motion.span>
        </button>
      </div>

      <div className="px-4 pb-6 max-w-3xl mx-auto">
        <div className={s.onglets} role="tablist">
          {([
            ["pouls", "Pouls"], ["gens", "Gens"], ["usage", "Usage"], ["ia", "IA"],
          ] as const).map(([cle, libelle]) => (
            <button key={cle} role="tab" aria-selected={onglet === cle}
              className={`${s.onglet} ${onglet === cle ? s.ongletActif : ""}`}
              onClick={() => setOnglet(cle)}>
              {libelle}
            </button>
          ))}
        </div>

        {erreur && (
          <div className={s.corps}>
            <div className={s.avis}><b>{erreur}</b></div>
          </div>
        )}

        {!stats && chargement && (
          <div className={s.vide}>Lecture des données…</div>
        )}

        {stats && (
          <div className={s.corps}>

            {/* ═══════════ POULS ═══════════ */}
            {onglet === "pouls" && p && (
              <>
                <Carte titre="Actifs aujourd'hui" apres="30 derniers jours">
                  <div className={s.hero}>
                    <span className={s.heroN}>{p.actifsAujourdhui}</span>
                    <div className={s.heroQuoi}>
                      <b>{p.actifsAujourdhui > 1 ? "personnes" : "personne"}</b>
                      <span>venues sur l&apos;app</span>
                    </div>
                    <Delta valeur={p.actifsAujourdhui} avant={p.actifsHier} suffixe="vs hier" />
                  </div>
                  <Colonnes data={p.parJour} />
                </Carte>

                <div className={s.trio}>
                  <div className={s.tuile}>
                    <div className={s.tuileN}>{p.actifs7}</div>
                    <div className={s.tuileQ}>actifs sur 7 j</div>
                  </div>
                  <div className={s.tuile}>
                    <div className={s.tuileN}>{p.seances7}</div>
                    <div className={s.tuileQ}>séances sur 7 j</div>
                  </div>
                  <div className={s.tuile}>
                    <div className={s.tuileN}>{p.appelsIaAujourdhui}</div>
                    <div className={s.tuileQ}>appels IA aujourd&apos;hui</div>
                  </div>
                </div>

                <Carte titre="Qui reste" apres="après l'inscription">
                  <div className={s.barres}>
                    {p.retention.map((r) => (
                      <Barre key={r.semaine}
                        nom={`${r.semaine}${r.semaine === 1 ? "re" : "e"} semaine`}
                        valeur={r.taux} max={100} />
                    ))}
                  </div>
                  <p className={s.legende}>
                    Part des inscrits revenus au moins une fois pendant cette semaine-là, jour
                    d&apos;inscription exclu. Base : {p.retention[0]?.base ?? 0} comptes assez anciens
                    pour être comptés.
                  </p>
                </Carte>

                <Carte titre="Nouveaux comptes" apres="8 semaines">
                  <Colonnes data={p.nouveaux.map((n) => ({ jour: n.debut, actifs: n.n }))} hauteur={38} />
                  <p className={s.legende}>
                    {p.nouveaux.reduce((t, n) => t + n.n, 0)} inscriptions sur les 8 dernières semaines.
                  </p>
                </Carte>

                {p.alertes.length > 0 && (
                  <Carte titre="À surveiller" apres={String(p.alertes.length)}>
                    {p.alertes.map((a, i) => (
                      <button key={i} className={s.alerte}
                        onClick={() => {
                          if (!a.filtre) return;
                          setFiltre(a.filtre as Filtre);
                          setOnglet("gens");
                        }}
                        disabled={!a.filtre}>
                        <span className={`${s.alerteIcone} ${a.niveau === "attention" ? s.alerteAtt : s.alerteInf}`}>
                          {a.niveau === "attention"
                            ? <AlertTriangle size={13} strokeWidth={2.2} />
                            : <Sparkles size={13} strokeWidth={2.2} />}
                        </span>
                        <span className={s.alerteTxt}>
                          {a.texte}
                          <small>{a.niveau === "attention" ? "Attention" : "Information"} · {a.detail}</small>
                        </span>
                        {a.filtre && <span className={s.alerteGo}>Voir ›</span>}
                      </button>
                    ))}
                  </Carte>
                )}
              </>
            )}

            {/* ═══════════ GENS ═══════════ */}
            {onglet === "gens" && (
              <>
                <div className={s.recherche}>
                  <Search size={14} strokeWidth={2} style={{ color: "var(--text-3)", flex: "none" }} />
                  <input value={recherche} onChange={(e) => setRecherche(e.target.value)}
                    placeholder="Pseudo, nom ou e-mail…" aria-label="Rechercher un compte" />
                  {recherche && (
                    <button onClick={() => setRecherche("")} aria-label="Effacer"
                      style={{ background: "none", border: 0, color: "var(--text-3)", cursor: "pointer", display: "grid" }}>
                      <X size={14} strokeWidth={2} />
                    </button>
                  )}
                </div>

                <div className={s.pastilles}>
                  {([
                    ["tous", "Tous"], ["actifs", "Actifs"], ["endormis", "Endormis"],
                    ["jamais", "Jamais de séance"], ["premium", "Premium"], ["bannis", "Bannis"],
                  ] as const).map(([cle, libelle]) => (
                    <button key={cle} onClick={() => setFiltre(cle)}
                      aria-pressed={filtre === cle}
                      className={`${s.filtre} ${filtre === cle ? s.filtreActif : ""}`}>
                      {libelle}<b>{compteurs[cle]}</b>
                    </button>
                  ))}
                </div>

                {listeFiltree.length === 0 ? (
                  <div className={s.vide}>
                    {recherche ? `Aucun résultat pour « ${recherche} »` : "Aucun compte dans ce filtre"}
                  </div>
                ) : (
                  <div className={s.liste}>
                    {listeFiltree.map((c) => {
                      const endormi = c.joursDepuisVisite === null || c.joursDepuisVisite > 7;
                      return (
                        <button key={c.id} className={s.ligne} onClick={() => setFiche(c)}>
                          <Avatar compte={c} eteint={endormi} />
                          <span className={s.qui}>
                            <span className={s.quiL1}>
                              <b>{c.full_name || c.pseudo}</b>
                              <Marques compte={c} />
                            </span>
                            <span className={s.quiL2}>@{c.pseudo} · {ilYA(c.joursDepuisVisite)}</span>
                            <span className={s.quiL3}>
                              {c.seances === 0
                                ? depuis(c.created_at)
                                : `${c.seances} séance${c.seances > 1 ? "s" : ""} · ${c.repas} repas${c.serie > 1 ? ` · série ${c.serie} 🔥` : ""}`}
                            </span>
                          </span>
                          <span className={s.rang}>
                            <span className={`${s.point} ${endormi ? s.pointOff : s.pointOn}`} />
                            <b>{c.exp} EXP</b>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ═══════════ USAGE ═══════════ */}
            {onglet === "usage" && u && (
              <>
                <Carte titre="Entraînement" apres="7 jours">
                  <div className={s.hero} style={{ marginBottom: 14 }}>
                    <span className={s.heroN}>{u.seances7}</span>
                    <div className={s.heroQuoi}>
                      <b>séances terminées</b>
                      <span>{u.minutesMoyennes} min en moyenne · {u.seancesComptes} compte{u.seancesComptes > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  {u.topSeances.length > 0 && (
                    <>
                      <p className={s.lab} style={{ marginBottom: 10 }}><span>Les plus lancées</span><em>30 jours</em></p>
                      <div className={s.barres}>
                        {u.topSeances.map((t) => (
                          <Barre key={t.titre} nom={t.titre} valeur={t.n} max={u.topSeances[0].n} />
                        ))}
                      </div>
                    </>
                  )}
                  <p className={s.legende}>
                    {u.composees} séance{u.composees > 1 ? "s" : ""} composée{u.composees > 1 ? "s" : ""} par
                    {" "}{u.composeesComptes} compte{u.composeesComptes > 1 ? "s" : ""}. C&apos;est la seule mesure
                    de « Composer ma séance ».
                  </p>
                </Carte>

                <Carte titre="Nutrition" apres="7 jours">
                  <div className={s.hero} style={{ marginBottom: 14 }}>
                    <span className={s.heroN}>{u.repas7}</span>
                    <div className={s.heroQuoi}>
                      <b>repas notés</b>
                      <span>par {u.repasComptes} compte{u.repasComptes > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  {u.creneaux.length > 0 && (
                    <div className={s.barres}>
                      {u.creneaux.map((c) => (
                        <Barre key={c.creneau} nom={CRENEAUX[c.creneau] ?? c.creneau}
                          valeur={c.n} max={u.creneaux[0].n} teinte="or" />
                      ))}
                    </div>
                  )}
                </Carte>

                <Carte titre="Le relais" apres="depuis toujours">
                  <div className={s.trio}>
                    <div className={s.mini}>
                      <div className={s.miniN}>{u.relais.enCours}</div>
                      <div className={s.miniQ}>en cours</div>
                    </div>
                    <div className={s.mini}>
                      <div className={s.miniN}>{u.relais.reussis}</div>
                      <div className={s.miniQ}>réussis</div>
                    </div>
                    <div className={s.mini}>
                      <div className={s.miniN}>{u.relais.arretes}</div>
                      <div className={s.miniQ}>arrêtés</div>
                    </div>
                  </div>
                  <p className={s.legende}>
                    {u.relais.inscription > 0
                      ? `${u.relais.inscription} invitation${u.relais.inscription > 1 ? "s" : ""} en attente d'un équipier.`
                      : "Aucune invitation en attente."}
                    {" "}Le nombre de comptes créés depuis un lien n&apos;est pas mesuré : l&apos;origine
                    d&apos;une inscription n&apos;est enregistrée nulle part.
                  </p>
                </Carte>

                <Carte titre="La semaine planifiée" apres="30 jours">
                  <div className={s.barres}>
                    <Barre nom="Jours prévus" valeur={u.planning.prevus} max={Math.max(u.planning.prevus, 1)} />
                    <Barre nom="Jours faits" valeur={u.planning.faits} max={Math.max(u.planning.prevus, 1)} teinte="teal" />
                  </div>
                  <p className={s.legende}>
                    {u.planning.prevus > 0
                      ? `${Math.round((u.planning.faits / u.planning.prevus) * 100)} % des jours prévus sont faits.`
                      : "Aucun jour planifié sur la période."}
                  </p>
                </Carte>
              </>
            )}

            {/* ═══════════ IA ═══════════ */}
            {onglet === "ia" && ia && (
              <>
                <Carte titre="Appels aujourd'hui" apres={`${ia.comptes} compte${ia.comptes > 1 ? "s" : ""}`}>
                  <div className={s.hero}>
                    <span className={s.heroN}>{ia.total}</span>
                    <div className={s.heroQuoi}><b>appels</b><span>coach, vision, dictée…</span></div>
                    {p && <Delta valeur={ia.total} avant={p.appelsIaHier} suffixe="vs hier" />}
                  </div>
                </Carte>

                <Carte titre="Par catégorie" apres="aujourd'hui">
                  <div className={s.barres}>
                    {ia.parCategorie.map((c) => (
                      <Barre key={c.categorie} nom={c.libelle} valeur={c.appels}
                        max={Math.max(ia.parCategorie[0]?.appels ?? 1, 1)} />
                    ))}
                  </div>
                </Carte>

                {ia.top.length > 0 && (
                  <Carte titre="Qui consomme" apres="aujourd'hui">
                    <div className={s.barres}>
                      {ia.top.map((t) => (
                        <Barre key={t.pseudo} valeur={t.appels} max={ia.top[0].appels}
                          nom={<>@{t.pseudo}{t.premium && <span className={`${s.marque} ${s.marquePremium}`} style={{ marginLeft: 6 }}>Premium</span>}</>} />
                      ))}
                    </div>
                  </Carte>
                )}

                <Carte titre="Plafonds touchés" apres="aujourd'hui">
                  {ia.plafonds.length === 0 ? (
                    <p style={{ fontSize: 12.8, color: "var(--text-2)" }}>
                      Personne n&apos;a buté sur un plafond aujourd&apos;hui.
                    </p>
                  ) : (
                    <div className={s.barres}>
                      {ia.plafonds.map((pl, i) => (
                        <p key={i} style={{ fontSize: 12.8, color: "var(--text-1)" }}>
                          @{pl.pseudo} · {pl.appels}/{pl.plafond} {pl.libelle}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className={s.legende}>
                    Un compte gratuit qui bute n&apos;est pas un incident : c&apos;est la question de
                    savoir si le palier gratuit est au bon niveau.
                  </p>
                </Carte>

                {ia.registreActif ? (
                  <Carte titre="Historique" apres="30 jours">
                    <Colonnes data={ia.historique.map((h) => ({ jour: h.jour, actifs: h.appels }))} />
                    <p className={s.legende}>
                      Total d&apos;appels par jour, toutes catégories confondues.
                    </p>
                  </Carte>
                ) : (
                  <div className={s.avis}>
                    <b>Historique indisponible.</b> Les compteurs d&apos;usage s&apos;effacent deux jours
                    après leur expiration, cet écran ne peut donc montrer qu&apos;aujourd&apos;hui.
                    Le registre au long cours attend d&apos;être collé :
                    supabase/migrations/20260811_admin_stats.sql
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ═══════════ Fiche d'un compte ═══════════ */}
      <AnimatePresence>
        {fiche && (
          <FicheCompte
            key={fiche.id}
            compte={fiche}
            moi={user.id}
            onFermer={() => setFiche(null)}
            appelerAction={appelerAction}
            majCompte={majCompte}
            direToast={direToast}
            demanderSuppression={() => setConfirmation(fiche)}
          />
        )}
      </AnimatePresence>

      {/* ═══════════ Confirmation de suppression ═══════════ */}
      <AnimatePresence>
        {confirmation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={s.voile} style={{ alignItems: "center", padding: 20 }}
            onClick={() => setConfirmation(null)}>
            <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.22, duration: 0.4 }}
              className={s.feuille} style={{ borderRadius: 24, maxWidth: 380, padding: 24 }}
              onClick={(e) => e.stopPropagation()}>
              <p style={{ fontSize: 16, fontWeight: 800, color: "var(--text-0)", marginBottom: 8 }}>
                Supprimer @{confirmation.pseudo} ?
              </p>
              <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.5, marginBottom: 18 }}>
                Le profil, ses relations et ses notifications partent avec lui, ainsi que son compte
                de connexion. C&apos;est irréversible.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setConfirmation(null)}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 14, border: 0, cursor: "pointer",
                    background: "rgba(var(--text-3-rgb),0.16)", color: "var(--text-2)",
                    font: "inherit", fontSize: 13.5, fontWeight: 700,
                  }}>
                  Annuler
                </button>
                <button onClick={() => supprimerCompte(confirmation)}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 14, border: 0, cursor: "pointer",
                    background: "linear-gradient(135deg,#E0575C,#C7383D)", color: "#fff",
                    font: "inherit", fontSize: 13.5, fontWeight: 700,
                  }}>
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div className={s.toast}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════ La fiche ═══════════════════════ */
function FicheCompte({
  compte, moi, onFermer, appelerAction, majCompte, direToast, demanderSuppression,
}: {
  compte: Compte;
  moi: string;
  onFermer: () => void;
  appelerAction: (action: string, cible: string, extra?: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  majCompte: (id: string, patch: Partial<Compte>) => void;
  direToast: (message: string) => void;
  demanderSuppression: () => void;
}) {
  const [pseudo, setPseudo] = useState(compte.pseudo);
  const [occupe, setOccupe] = useState<string | null>(null);
  const fichier = useRef<HTMLInputElement>(null);
  const soiMeme = compte.id === moi;

  const enregistrerPseudo = async () => {
    const valeur = pseudo.trim();
    if (!valeur || valeur === compte.pseudo) return;
    setOccupe("pseudo");
    const r = await appelerAction("set_pseudo", compte.id, { pseudo: valeur });
    setOccupe(null);
    if (r) { majCompte(compte.id, { pseudo: valeur }); direToast(`Pseudo → @${valeur}`); }
  };

  const changerPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setOccupe("photo");
    try {
      const base64 = await imageCarreeBase64(f);
      const r = await appelerAction("set_avatar", compte.id, { image_base64: base64 });
      if (r?.avatar_url) {
        majCompte(compte.id, { avatar_url: r.avatar_url as string });
        direToast("Photo mise à jour");
      }
    } catch {
      direToast("Image illisible");
    } finally {
      setOccupe(null);
    }
  };

  const basculer = async (action: string, champ: keyof Compte, valeur: boolean, message: [string, string]) => {
    setOccupe(action);
    const r = await appelerAction(action, compte.id, { value: valeur });
    setOccupe(null);
    if (r) {
      majCompte(compte.id, { [champ]: valeur } as Partial<Compte>);
      direToast(valeur ? message[0] : message[1]);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={s.voile} onClick={onFermer}>
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", bounce: 0.16, duration: 0.42 }}
        className={s.feuille} onClick={(e) => e.stopPropagation()}
      >
        <div className={s.poignee} />

        <div className={s.ficheTete}>
          <Avatar compte={compte} />
          <div style={{ minWidth: 0 }}>
            <b>{compte.full_name || compte.pseudo}</b>
            <span>{compte.email ?? `@${compte.pseudo}`} · {depuis(compte.created_at)}</span>
          </div>
        </div>

        {/* On ne bannit pas quelqu'un sans savoir qui c'est : les chiffres
            passent AVANT les interrupteurs. */}
        <div className={s.six}>
          <div className={s.mini}><div className={s.miniN}>{compte.seances}</div><div className={s.miniQ}>séances</div></div>
          <div className={s.mini}><div className={s.miniN}>{compte.repas}</div><div className={s.miniQ}>repas (30 j)</div></div>
          <div className={s.mini}><div className={s.miniN}>{compte.joursActifs}</div><div className={s.miniQ}>jours actifs</div></div>
          <div className={s.mini}><div className={s.miniN}>{compte.exp}</div><div className={s.miniQ}>EXP</div></div>
          <div className={s.mini}><div className={s.miniN}>{compte.iaAujourdhui}</div><div className={s.miniQ}>appels IA du jour</div></div>
          <div className={s.mini}>
            <div className={s.miniN}>{compte.joursDepuisVisite === null ? "—" : compte.joursDepuisVisite === 0 ? "0 j" : `${compte.joursDepuisVisite} j`}</div>
            <div className={s.miniQ}>depuis sa visite</div>
          </div>
        </div>

        <div className={s.carte} style={{ marginTop: 12 }}>
          <p className={s.lab}><span>Identité</span></p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className={s.champ}>
              <span className={s.champCle}>Pseudo</span>
              <input value={pseudo} aria-label="Pseudo"
                onChange={(e) => setPseudo(e.target.value.replace(/[^\p{L}\p{N} ._-]/gu, "").slice(0, 30))} />
              <button className={s.valider} onClick={enregistrerPseudo}
                disabled={occupe === "pseudo" || !pseudo.trim() || pseudo.trim() === compte.pseudo}
                aria-label="Enregistrer le pseudo">
                <Check size={15} strokeWidth={2.5} />
              </button>
            </div>
            <button className={s.champ} onClick={() => fichier.current?.click()}
              style={{ border: 0, cursor: "pointer", font: "inherit", textAlign: "left" }}>
              <span className={s.champCle}>Photo</span>
              <span style={{ flex: 1, fontSize: 13, color: "var(--text-3)" }}>
                {occupe === "photo" ? "Envoi…" : "Toucher pour remplacer"}
              </span>
              <span className={s.valider} style={{ background: "rgba(var(--accent-rgb),0.18)", color: "var(--accent)" }}>
                <Camera size={14} strokeWidth={2} />
              </span>
            </button>
            <input ref={fichier} type="file" accept="image/*" className="hidden" onChange={changerPhoto} />
          </div>
          <Link href={`/profil/${encodeURIComponent(compte.pseudo)}`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginTop: 8, padding: "10px 12px", borderRadius: 13,
              background: "rgba(var(--tint-violet-rgb),0.6)", fontSize: 13,
              fontWeight: 600, color: "var(--text-1)",
            }}>
            Voir son profil public
            <ChevronRight size={14} strokeWidth={2} style={{ color: "var(--accent)" }} />
          </Link>
        </div>

        {/* Chaque bascule dit ce qu'elle déclenche AVANT qu'on la touche :
            « Bannir » retire aussi les publications, ce qui se faisait
            jusqu'ici en silence. */}
        <div className={s.carte} style={{ marginTop: 12 }}>
          <p className={s.lab}><span>Statut</span></p>

          <button className={s.bascule} disabled={occupe === "set_certified"}
            onClick={() => basculer("set_certified", "is_certified", !compte.is_certified,
              ["Compte certifié", "Certification retirée"])}>
            <span>
              <b>Certifié</b>
              <small>Badge vérifié bleu sur son profil</small>
            </span>
            <span className={`${s.interrupteur} ${compte.is_certified ? s.interrupteurOn : ""}`}>
              <span className={s.pastilleInterrupteur} />
            </span>
          </button>

          <button className={s.bascule} disabled={soiMeme || occupe === "set_admin"}
            onClick={() => basculer("set_admin", "is_admin", !compte.is_admin,
              ["Droits admin donnés", "Droits admin retirés"])}
            style={soiMeme ? { opacity: 0.5, cursor: "default" } : undefined}>
            <span>
              <b>Administrateur</b>
              <small>{soiMeme ? "On ne se retire pas ses propres droits" : "Accès à cet écran et à toutes les données"}</small>
            </span>
            <span className={`${s.interrupteur} ${compte.is_admin ? s.interrupteurOn : ""}`}>
              <span className={s.pastilleInterrupteur} />
            </span>
          </button>

          <button className={s.bascule} disabled={soiMeme || occupe === "set_banned"}
            onClick={() => basculer("set_banned", "is_banned", !compte.is_banned,
              ["Utilisateur banni", "Bannissement levé"])}
            style={soiMeme ? { opacity: 0.5, cursor: "default" } : undefined}>
            <span>
              <b>Banni</b>
              <small>Bloque l&apos;accès et supprime ses publications</small>
            </span>
            <span className={`${s.interrupteur} ${compte.is_banned ? s.interrupteurDanger : ""}`}>
              <span className={s.pastilleInterrupteur} />
            </span>
          </button>
        </div>

        {!soiMeme && (
          <button className={s.supprimer} onClick={demanderSuppression}>
            Supprimer ce compte définitivement
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

/** Fichier image → JPEG carré 512 px en base64 (recadrage centré). */
function imageCarreeBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const cote = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - cote) / 2;
      const sy = (img.naturalHeight - cote) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas"));
      ctx.drawImage(img, sx, sy, cote, cote, 0, 0, 512, 512);
      resolve(canvas.toDataURL("image/jpeg", 0.9).split(",")[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}
