"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useGuideActif } from "@/context/GuideContext";
import { fetchAuth } from "@/lib/fetchAuth";
import { CAMPAGNE_PARRAINAGE, type EtatParrainage } from "@/lib/parrainage";
import { lockBodyModal } from "@/lib/bodyModal";
import { useRetourTelephone } from "@/hooks/useRetourTelephone";
import s from "./Parrainage.module.css";

function CarteParrainage({ etat, guide, fermer, partage = false }: {
  etat: EtatParrainage; guide: string | null; fermer?: () => void; partage?: boolean;
}) {
  const [inviter, setInviter] = useState(partage);
  const [message, setMessage] = useState("");
  const lien = `https://vaiiya.fr/invitation/${etat.code}`;
  const partager = async () => {
    const texte = "Rejoins-moi sur Vaiiya 💜 Ton coach, tes séances et tes boosters t’attendent.";
    try {
      if (navigator.share) { await navigator.share({ title: "Rejoins-moi sur Vaiiya", text: texte, url: lien }); return; }
      await navigator.clipboard.writeText(lien);
      setMessage("Ton lien est copié. Envoie-le à ton ami !");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMessage("Tu peux copier le lien ci-dessous pour l’envoyer à ton ami.");
    }
  };
  return <section className={s.carte} aria-label="Parrainage Vaiiya">
    {fermer && <button type="button" className={s.fermer} aria-label="Fermer l’annonce" onClick={fermer}>×</button>}
    {!inviter ? <>
      <div className={s.tag}>✦ NOUVEAU · PARRAINAGE</div>
      <h2>Invite un ami.<span>Gagne des boosters.</span></h2>
      <div className={s.art} aria-label="Trois boosters Vaiiya offerts">
        {[-1, 1, 0].map((i, index) => <Image key={i} src={`/boosters/sachet-360/mini-${guide === "sasha" ? "sasha" : "nora"}-v3.webp`}
          width={186} height={300} alt="" unoptimized loading="eager" draggable={false}
          className={s.pack} style={{ left: `${50 + i * 20}%`, transform: `translateX(-50%) rotate(${i * 11}deg)`, zIndex: index + 1 }} />)}
        <div className={s.offre}><b>+3</b> BOOSTERS PAR AMI</div>
      </div>
      <p>Ton ami termine son inscription avec ton lien ? <strong>Tu gagnes 3 boosters.</strong> Au troisième ami, un bonus t’attend.</p>
      <div className={s.paliers}><div><small>1 ami</small><b>3 boosters</b></div><div><small>2 amis</small><b>6 boosters</b></div><div><small>3 amis</small><b>10 boosters</b></div></div>
      <p className={s.plus}>Et bien plus encore…</p>
      <button className={s.action} type="button" onClick={() => setInviter(true)}>Inviter un ami ↗</button>
      {fermer && <button className={s.secondaire} type="button" onClick={fermer}>Plus tard</button>}
      <p className={s.note}>Boosters cumulés : 3, puis 6, puis 10 au troisième ami. Ils s’ajoutent à tes boosters habituels.</p>
    </> : <>
      <div className={s.tag}>✦ TON LIEN, TES BOOSTERS</div>
      <h2>Partage Vaiiya.<span>La suite, c’est à lui.</span></h2>
      <p>3 boosters par ami inscrit. Le troisième débloque 1 booster bonus en plus : 10 au total. Puis 3 de plus par nouvel ami.</p>
      <ol className={s.etapes}><li>Envoie ton lien personnel.</li><li>Ton ami crée un nouveau compte vérifié et termine son inscription.</li><li>Tes boosters bonus arrivent dans ta réserve.</li></ol>
      <div className={s.bilan}><b>{etat.amis} {etat.amis > 1 ? "amis inscrits" : "ami inscrit"}</b><span>{etat.gagnes} boosters gagnés · {etat.bonus} disponibles</span></div>
      <label className={s.lien}>Ton lien personnel<input readOnly value={lien} onFocus={e => e.target.select()} /></label>
      <button className={s.action} type="button" onClick={() => { void partager(); }}>Partager mon lien ↗</button>
      <p className={s.note} role="status">{message}</p>
      <button className={s.secondaire} type="button" onClick={() => setInviter(false)}>Revenir à l’annonce</button>
    </>}
  </section>;
}

export default function AnnonceParrainage() {
  const { user } = useAuth();
  const { guide } = useGuideActif();
  const chemin = usePathname();
  const [etat, setEtat] = useState<EtatParrainage | null>(null);
  const [ouverte, setOuverte] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const compteEtat = useRef<string | null>(null);
  const bonusAvant = useRef<number | null>(null);
  const vus = useRef(new Set<string>());
  const rattachementFait = useRef(false);
  useEffect(() => {
    setOuverte(false); setEtat(null); compteEtat.current = null; bonusAvant.current = null; rattachementFait.current = false;
  }, [user?.id]);
  const fermer = useCallback(() => {
    if (user) { try { localStorage.setItem(`${CAMPAGNE_PARRAINAGE}:${user.id}`, "vu"); } catch { /* stockage bloqué */ } }
    setOuverte(false);
  }, [user]);
  useRetourTelephone(ouverte, "annonceParrainage", fermer);
  useEffect(() => {
    if (!user || ["/premiers-pas", "/auth", "/bienvenue"].some(p => chemin.startsWith(p))) return;
    const controle = new AbortController();
    async function charger() {
      // Le cookie signé survit à la création du compte, y compris via Google.
      if (!rattachementFait.current) {
        const reponse = await fetchAuth("/api/parrainage", { method: "POST", signal: controle.signal }).catch(() => null);
        if (reponse?.ok) {
          const resultat = await reponse.json();
          rattachementFait.current = !["inscription_en_cours", "pas_encore"].includes(resultat.raison);
        }
      }
      const r = await fetchAuth("/api/parrainage", { signal: controle.signal, cache: "no-store" });
      if (!r.ok || controle.signal.aborted) return;
      const d: EtatParrainage = await r.json();
      if (controle.signal.aborted) return;
      compteEtat.current = user!.id;
      setEtat(d);
      if (bonusAvant.current !== d.bonus && (bonusAvant.current !== null || d.bonus > 0)) window.dispatchEvent(new Event("vaiiya:bonus-boosters"));
      bonusAvant.current = d.bonus;
    }
    const lancer = () => { void charger().catch(() => {}); };
    lancer(); window.addEventListener("focus", lancer);
    const minute = window.setInterval(() => { if (!document.hidden) lancer(); }, 60_000);
    return () => { controle.abort(); clearInterval(minute); window.removeEventListener("focus", lancer); };
  }, [user?.id, chemin]);
  useEffect(() => {
    if (!user || compteEtat.current !== user.id || !etat?.actif || chemin !== "/") return;
    let stop = false;
    const proposer = () => {
      if (stop || document.hidden || document.body.classList.contains("modal-open") || document.querySelector("dialog[open]")) return;
      if (vus.current.has(user.id)) return;
      try { if (localStorage.getItem(`${CAMPAGNE_PARRAINAGE}:${user.id}`) === "vu") return; } catch { /* mémoire de session ci-dessus */ }
      vus.current.add(user.id); stop = true; setOuverte(true);
    };
    const timer = window.setInterval(proposer, 800); proposer();
    return () => { stop = true; clearInterval(timer); };
  }, [user?.id, etat?.actif, chemin]);
  useEffect(() => {
    if (!ouverte || !dialog.current) return;
    const element = dialog.current;
    element.showModal();
    const liberer = lockBodyModal();
    return () => { element.close(); liberer(); };
  }, [ouverte]);
  if (!ouverte || !etat || !user || compteEtat.current !== user.id) return null;
  return <dialog ref={dialog} className={s.dialog} aria-label="Parraine tes amis" onCancel={fermer}>
    <CarteParrainage etat={etat} guide={guide} fermer={fermer} />
  </dialog>;
}

export function PageParrainage() {
  const { user } = useAuth();
  const { guide } = useGuideActif();
  const [etat, setEtat] = useState<EtatParrainage | null>(null);
  const [erreur, setErreur] = useState(false);
  const [revision, setRevision] = useState(0);
  const compteCharge = useRef<string | null>(null);
  useEffect(() => {
    if (!user) return;
    const controle = new AbortController();
    setErreur(false);
    void fetchAuth("/api/parrainage", { signal: controle.signal, cache: "no-store" }).then(async r => {
      if (!r.ok) throw new Error(); const d = await r.json(); if (!controle.signal.aborted) { compteCharge.current = user.id; setEtat(d); }
    }).catch(() => { if (!controle.signal.aborted) setErreur(true); });
    return () => controle.abort();
  }, [user?.id, revision]);
  return <main className={s.page}>
    <a href="/profil">← Revenir au profil</a>
    {erreur ? <div role="alert"><p>Le parrainage n’est pas disponible pour le moment.</p><button type="button" onClick={() => setRevision(n => n + 1)}>Réessayer</button></div>
      : !etat || compteCharge.current !== user?.id ? <p>Chargement de ton lien…</p> : !etat.actif ? <p>Le parrainage arrive le 19 novembre.</p> : <CarteParrainage etat={etat} guide={guide} partage />}
  </main>;
}
