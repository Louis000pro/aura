"use client";

import { useEffect, useState } from "react";
import { fetchAuth } from "@/lib/fetchAuth";
import type { SuiviAdmin } from "@/lib/adminSuivi";
import s from "./SuiviBoosters.module.css";

const heure = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const date = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });
const dateHeure = (iso: string) => `${date.format(new Date(iso))} à ${heure.format(new Date(iso))}`;

export default function SuiviBoosters() {
  const [donnees, setDonnees] = useState<SuiviAdmin | null>(null);
  const [erreur, setErreur] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [membre, setMembre] = useState("");
  const [recherche, setRecherche] = useState("");
  const [jours, setJours] = useState(7);
  const [limite, setLimite] = useState(100);
  const [type, setType] = useState("tous");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controle = new AbortController();
    setChargement(true); setErreur(false);
    void fetchAuth(`/api/admin/suivi?jours=${jours}&limite=${limite}${membre ? "&membre=" + membre : ""}`, { signal: controle.signal, cache: "no-store" })
      .then(async r => { if (!r.ok) throw new Error(); return r.json() as Promise<SuiviAdmin>; })
      .then(d => { if (!controle.signal.aborted) setDonnees(d); })
      .catch(() => { if (!controle.signal.aborted) setErreur(true); })
      .finally(() => { if (!controle.signal.aborted) setChargement(false); });
    return () => controle.abort();
  }, [jours, membre, limite, revision]);
  const choisir = (id: string) => { setMembre(id); setLimite(100); };
  const evenements = donnees?.evenements ?? [];
  const visibles = evenements.filter(e => type === "tous" || e.type === type);
  const profil = donnees?.membres.find(p => p.id === membre);
  return <section className={s.suivi} aria-label="Boosters et notifications">
    <header className={s.tete}><div><h2>Boosters & notifications</h2><p>Les heures sont affichées à l’heure de Paris.</p></div>
      <button type="button" disabled={chargement} onClick={() => setRevision(r => r + 1)}>Actualiser</button></header>
    <div className={s.filtres}>
      <label>Période<select value={jours} onChange={e => { setJours(Number(e.target.value)); setLimite(100); }}><option value={1}>24 dernières heures</option><option value={7}>7 derniers jours</option><option value={30}>30 derniers jours</option></select></label>
      <label>Rechercher un membre<input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Filtrer les pseudos…" type="search" /></label>
      <label>Membre<select value={membre} onChange={e => choisir(e.target.value)}><option value="">Tous les membres</option>
        {donnees?.membres.filter(p => p.id === membre || (p.pseudo ?? "").toLocaleLowerCase("fr").includes(recherche.toLocaleLowerCase("fr")))
          .sort((a, b) => (a.pseudo ?? "").localeCompare(b.pseudo ?? "", "fr")).map(p => <option key={p.id} value={p.id}>{p.pseudo || "Sans pseudo"}</option>)}
      </select></label>
      <label>Événement<select value={type} onChange={e => setType(e.target.value)}><option value="tous">Tous les événements</option><option value="booster">Ouvertures de booster</option><option value="push">Envois de notification</option><option value="clic">Notifications touchées</option></select></label>
    </div>
    <div aria-live="polite" aria-busy={chargement}>
      {erreur ? <p role="alert" className={s.avis}>Le suivi n’a pas pu être chargé. <button type="button" onClick={() => setRevision(r => r + 1)}>Réessayer</button></p> : chargement ? <p>Lecture du journal…</p> : donnees && <>
        {!donnees.journalActif && <p className={s.avis}>L’historique détaillé des notifications n’est pas encore activé. Les ouvertures et le dernier rappel connu restent visibles. Activation : migration 20261118_admin_notifications.sql.</p>}
        {donnees.avertissements.map(a => <p key={a} className={s.avis}>{a}</p>)}
        {profil && <div className={s.fiche}><h3>{profil.pseudo || "Sans pseudo"}</h3><p>Coach actuel : {profil.guide_id === "nora" ? "Nora" : profil.guide_id === "sasha" ? "Sacha" : "non choisi"}</p>
          {donnees.fiche && <><p>Rappels {donnees.fiche.rappel ? "activés" : "désactivés"} · {donnees.fiche.appareils ?? "?"} appareil(s) abonné(s)</p>
            <p>Réserve : {donnees.fiche.stock ?? "non disponible"}{donnees.fiche.stock !== null ? " / 3" : ""}</p>
            <p>Prochain booster : {donnees.fiche.prochain ? dateHeure(donnees.fiche.prochain) : donnees.fiche.stock === 3 ? "réserve pleine" : "non disponible"}</p>
          </>}
          <button type="button" onClick={() => choisir("")}>Revenir à tous les membres</button></div>}
        <div className={s.chiffres}><div><b>{evenements.filter(e => e.type === "booster").length}</b><span>Ouvertures</span></div><div><b>{evenements.filter(e => e.type === "push").length}</b><span>Tentatives d’envoi</span></div><div><b>{evenements.filter(e => e.type === "clic").length}</b><span>Notifications touchées</span></div></div>
        <p className={s.note}>Comptes sur les {evenements.length} événements chargés, pas un total de toute la période. Les boosters d’essai sont signalés dans le journal.</p>
        <ol className={s.journal}>{visibles.map(e => <li key={e.id}>
          <div className={s.quand}><span>{date.format(new Date(e.quand))}</span><time dateTime={e.quand}>{e.heureConnue ? heure.format(new Date(e.quand)) : "Heure inconnue"}</time></div>
          <div className={s.evenement}><button className={s.pseudo} type="button" onClick={() => choisir(e.user_id)}>{e.pseudo}</button><h3>{e.titre}</h3><p>{e.detail}</p></div>
        </li>)}</ol>
        {!visibles.length && <p>Aucun événement pour ces filtres dans le journal chargé.</p>}
        {donnees.suite && (limite < 1000 ? <button type="button" onClick={() => setLimite(n => Math.min(1000, n + 100))}>Afficher les événements précédents</button> : <p>1 000 événements affichés. Sélectionne un membre ou une période plus courte pour préciser la recherche.</p>)}
      </>}
    </div>
    <p className={s.note}>Un envoi accepté par le service push ne confirme pas l’affichage sur le téléphone. « Touchée » correspond à l’heure d’enregistrement du signal par le serveur ; un téléphone hors ligne peut ne pas le transmettre.</p>
    <p className={s.note}>Les rappels booster sont vérifiés toutes les 15 minutes, de 8 h à 22 h. Les heures prévues ne garantissent pas un envoi.</p>
  </section>;
}
