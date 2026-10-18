"use client";

/* ─────────────────────────────────────────────────────────────
   Le fil des potes (maquette « Progresser avec ses potes »,
   écran 1, validée par Louis le 2026-10-18).

   En haut, qui s'est entraîné aujourd'hui (anneau violet). En
   dessous, les affiches que mes AMIS ont choisi de montrer, avec
   trois réactions d'un geste et une réponse en message privé.

   Entre les affiches, les ÉVÉNEMENTS de mes amis (maquette « Le fil
   des événements », 2026-10-18) : une séance faite, un rang, une
   flamme, un badge. Ceux qui se suivent sont posés dans un seul
   groupe à filets, chacun avec son « Bravo ».

   ⚠️ CE QUI N'EST PAS ICI, ET NE DOIT PAS Y VENIR : un inconnu,
   un classement, un commentaire public, un compteur de vues, une
   absence ou une série cassée.
   ───────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, MoreHorizontal, UserPlus, X } from "lucide-react";
import Sheet from "@/components/communaute/Sheet";
import { PersonAvatar } from "@/components/communaute/ConversationAvatar";
import { motCouverture, useMotAjuste, STYLE_MOT } from "@/components/profil/CouvertureSeance";
import { creerConversation, type Personne } from "@/lib/messagerie";
import GemmeRang from "@/components/GemmeRang";
import FlammeSerie from "@/components/serie/FlammeSerie";
import { RANGS } from "@/lib/aura";
import type { IdFlamme } from "@/lib/flammesSerie";
import {
  chargerEvenements, basculerBravo, phraseEvenement, lireMontrerSeances, reglerMontrerSeances,
  type EvenementFil,
} from "@/lib/evenementsFil";
import {
  mesAmis, chargerFilPotes, presenceAmis, basculerReaction, poserBrouillon, quandAffiche,
  ecrireMot, retirerDuFil, supprimerAffiche, MOT_MAX, SORTES, type AfficheDuFil, type SorteReaction,
} from "@/lib/filPotes";

export default function FilPotes({ moi, monPseudo, monAvatar, onAjouterAmi }: {
  moi: string;
  monPseudo: string;
  monAvatar: string | null;
  onAjouterAmi: () => void;
}) {
  const router = useRouter();
  const [amis, setAmis] = useState<Personne[] | null>(null);
  const [fil, setFil] = useState<AfficheDuFil[]>([]);
  const [evts, setEvts] = useState<EvenementFil[]>([]);
  const [montrer, setMontrer] = useState<boolean | null>(null);
  /** Mon affiche dont le menu « ⋯ » est ouvert. */
  const [gerer, setGerer] = useState<AfficheDuFil | null>(null);
  const [presence, setPresence] = useState<Map<string, boolean>>(new Map());
  const [erreur, setErreur] = useState(false);
  const [ouverture, setOuverture] = useState<string | null>(null);

  const lire = useCallback(async () => {
    const a = await mesAmis(moi);
    const moiP = { id: moi, pseudo: monPseudo, avatar: monAvatar };
    const [f, p, e] = await Promise.all([
      chargerFilPotes(moiP, a), presenceAmis(),
      chargerEvenements(moiP, a),
    ]);
    return { a, f, p, e };
  }, [moi, monPseudo, monAvatar]);

  const appliquer = useCallback((r: { a: Personne[]; f: AfficheDuFil[]; p: Map<string, boolean>; e: EvenementFil[] }) => {
    setAmis(r.a); setFil(r.f); setPresence(r.p); setEvts(r.e); setErreur(false);
  }, []);
  const echec = useCallback(() => { setErreur(true); setAmis((x) => x ?? []); }, []);

  const charger = useCallback(() => lire().then(appliquer, echec), [lire, appliquer, echec]);

  useEffect(() => {
    let actif = true;
    lire().then((r) => { if (actif) appliquer(r); }, () => { if (actif) echec(); });
    return () => { actif = false; };
  }, [lire, appliquer, echec]);

  useEffect(() => {
    let actif = true;
    void lireMontrerSeances().then((v) => { if (actif) setMontrer(v); }, () => {});
    return () => { actif = false; };
  }, []);

  const changerMontrer = async () => {
    if (montrer === null) return;
    const v = !montrer;
    setMontrer(v);
    if (!(await reglerMontrerSeances(v))) setMontrer(!v);
  };

  const direBravo = async (e: EvenementFil) => {
    const mettre = !e.bravos.includes(moi);
    const maj = (l: EvenementFil[], m: boolean) => l.map((x) => x.id !== e.id ? x : {
      ...x, bravos: m ? [...x.bravos, moi] : x.bravos.filter((id) => id !== moi),
    });
    setEvts((l) => maj(l, mettre));
    if (!(await basculerBravo(e.id, moi, mettre))) setEvts((l) => maj(l, !mettre));
  };

  const reagir = async (a: AfficheDuFil, sorte: SorteReaction) => {
    const mettre = !a.reactions[sorte].includes(moi);
    const maj = (liste: AfficheDuFil[], m: boolean) => liste.map((x) => x.id !== a.id ? x : {
      ...x,
      reactions: { ...x.reactions, [sorte]: m ? [...x.reactions[sorte], moi] : x.reactions[sorte].filter((id) => id !== moi) },
    });
    setFil((l) => maj(l, mettre));
    const ok = await basculerReaction(a.id, moi, sorte, mettre);
    if (!ok) setFil((l) => maj(l, !mettre));
  };

  /** La réponse passe en privé : on ouvre le fil à deux, avec un début de message. */
  const repondre = async (a: AfficheDuFil) => {
    setOuverture(a.id);
    const r = await creerConversation([a.auteur.id]);
    setOuverture(null);
    if (!r?.ok || !r.conversation_id) return;
    poserBrouillon(r.conversation_id, `Ton affiche « ${motCouverture(a.data.title || "Séance")} » : `);
    router.push(`/communaute/${r.conversation_id}`);
  };

  if (amis === null) {
    return (
      <div className="flex flex-1 justify-center pt-10">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-3)" }} />
      </div>
    );
  }

  const moments = enMoments(fil, evts);
  const prenoms = new Map(amis.map((a) => [a.id, a.pseudo]));

  const rangee: (Personne & { moi?: boolean })[] = [
    { id: moi, pseudo: "Toi", avatar: monAvatar, moi: true },
    ...amis,
  ];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28">
      {/* ─── Aujourd'hui : qui a bougé ─── */}
      <p className="vy-label mb-2" style={{ color: "var(--text-3)" }}>Aujourd’hui</p>
      <div className="-mx-4 mb-5 flex gap-3.5 overflow-x-auto px-4 pb-1">
        {rangee.map((p) => {
          const actif = presence.get(p.id) ?? false;
          return (
            <div key={p.id} className="flex w-[62px] flex-shrink-0 flex-col items-center gap-1.5">
              <span
                className="flex items-center justify-center rounded-full p-[3px]"
                style={{ background: actif ? "linear-gradient(135deg, #8B5CF6, #C13BC1)" : "rgba(var(--text-3-rgb), .2)" }}
                aria-label={actif ? `${p.moi ? monPseudo : p.pseudo} a fait sa séance aujourd’hui` : undefined}
              >
                <span className="rounded-full p-[2px]" style={{ background: "rgb(var(--bg-rgb))" }}>
                  <PersonAvatar personne={p} taille={50} />
                </span>
              </span>
              <span className="w-full truncate text-center text-[11px]" style={{ color: "var(--text-2)" }}>{p.pseudo}</span>
            </div>
          );
        })}
        <button onClick={onAjouterAmi} className="flex w-[62px] flex-shrink-0 flex-col items-center gap-1.5" aria-label="Ajouter un ami">
          <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-dashed"
            style={{ borderColor: "rgba(var(--text-3-rgb), .4)", color: "var(--exp-encre)" }}>
            <UserPlus className="h-5 w-5" />
          </span>
          <span className="text-[11px]" style={{ color: "var(--text-3)" }}>Ajouter</span>
        </button>
      </div>

      {erreur && (
        <button onClick={() => void charger()} className="mb-3 w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-medium"
          style={{ background: "rgba(232,98,12,.1)", color: "#E8620C" }}>
          Impossible d’actualiser le fil. Toucher pour réessayer.
        </button>
      )}

      {/* ─── Le fil ─── */}
      {moments.length === 0 ? (
        <div className="px-4 pt-6 text-center">
          <p className="text-[16px] font-semibold" style={{ color: "var(--text-1)" }}>
            {amis.length === 0 ? "Ajoute tes potes" : "Rien de neuf pour l’instant"}
          </p>
          <p className="mx-auto mt-1.5 max-w-[290px] text-[13px] leading-relaxed" style={{ color: "var(--text-3)" }}>
            {amis.length === 0
              ? "Quand vous serez amis, vous verrez les séances que chacun choisit de montrer."
              : "Quand un pote fait une séance, gagne un rang ou une flamme, ça arrive ici."}
          </p>
          {amis.length === 0 && (
            <button onClick={onAjouterAmi}
              className="mt-4 px-5 py-3 text-[16px] font-semibold text-white"
              style={{ borderRadius: "var(--r-controle)", background: "linear-gradient(135deg, #8B5CF6, #C13BC1)", boxShadow: "var(--ombre-action)" }}>
              Ajouter un ami
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {moments.map((m) => m.k === "evts" ? (
            <div key={m.cle} style={{ borderRadius: "var(--r-bloc)", background: "rgb(var(--surface-rgb))", boxShadow: "var(--ombre-pose)" }}>
              {m.liste.map((e) => (
                <LigneEvenement key={e.id} e={e} moi={moi} prenoms={prenoms} onBravo={() => void direBravo(e)} />
              ))}
            </div>
          ) : ((a) => (
            <article key={a.id} className="overflow-hidden"
              style={{ borderRadius: "var(--r-bloc)", background: "rgb(var(--surface-rgb))", boxShadow: "var(--ombre-pose)" }}>
              <header className="flex items-center gap-2.5 px-3.5 pb-2.5 pt-3">
                <PersonAvatar personne={a.auteur} taille={34} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[16px]" style={{ color: "var(--text-0)" }}>{a.auteur.pseudo}</b>
                  <span className="block text-[11px]" style={{ color: "var(--text-3)" }}>{quandAffiche(a.creeLe)}</span>
                </span>
                {a.auteur.id === moi && (
                  <button onClick={() => setGerer(a)} aria-label="Gérer mon affiche"
                    className="flex h-9 w-9 items-center justify-center rounded-full" style={{ color: "var(--text-2)" }}>
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                )}
              </header>

              {a.mot && (
                <p className="mx-3.5 mb-2.5 whitespace-pre-line text-[16px] leading-snug" style={{ color: "var(--text-1)" }}>{a.mot}</p>
              )}

              <MiniAffiche affiche={a} />

              {a.auteur.id === moi ? (
                /* Mon affiche : on ne se dit pas bravo à soi-même, on voit
                   qui l'a dit. */
                <p className="px-3.5 py-3 text-[13px]" style={{ color: "var(--text-3)" }}>
                  {quiADitBravo(a.reactions.feu, prenoms) ?? "Tes potes peuvent te dire bravo ici."}
                </p>
              ) : (
              <div className="flex items-center gap-2 px-3 py-3">
                {SORTES.map((s) => {
                  const qui = a.reactions[s.id];
                  const mien = qui.includes(moi);
                  return (
                    <button key={s.id} onClick={() => void reagir(a, s.id)} aria-pressed={mien}
                      className="flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors"
                      style={mien
                        ? { background: "linear-gradient(135deg, #8B5CF6, #C13BC1)", color: "#fff" }
                        : { background: "rgba(var(--tint-violet-rgb), .5)", color: "var(--exp-encre)" }}>
                      {s.libelle}
                      {qui.length > 0 && <span className="vy-nombre" style={{ fontWeight: 700 }}>{qui.length}</span>}
                    </button>
                  );
                })}
                <span className="flex-1" />
                <button onClick={() => void repondre(a)} aria-label={`Répondre à ${a.auteur.pseudo} en privé`}
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ color: "var(--exp-encre)" }} disabled={ouverture === a.id}>
                  {ouverture === a.id ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
                </button>
              </div>
              )}
            </article>
          ))(m.a))}
          <p className="pt-1 text-center text-[13px]" style={{ color: "var(--text-3)" }}>C’est tout pour l’instant.</p>
        </div>
      )}

      {gerer && (
        <FeuilleMonAffiche
          affiche={gerer}
          moi={moi}
          onFermer={() => setGerer(null)}
          onMot={(mot) => { setFil((l) => l.map((x) => x.id === gerer.id ? { ...x, mot } : x)); setGerer(null); }}
          onRetiree={() => { setFil((l) => l.filter((x) => x.id !== gerer.id)); setGerer(null); }}
        />
      )}

      {montrer !== null && (
        <button onClick={() => void changerMontrer()} role="switch" aria-checked={montrer}
          className="mt-6 flex w-full items-center gap-3 px-1 py-2 text-left">
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>Montrer mes séances à mes potes</span>
            <span className="block text-[11px]" style={{ color: "var(--text-3)" }}>Une ligne dans leur fil quand tu finis une séance.</span>
          </span>
          <span aria-hidden className="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
            style={{ background: montrer ? "linear-gradient(135deg, #8B5CF6, #C13BC1)" : "rgba(var(--text-3-rgb), .3)" }}>
            <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: montrer ? 18 : 2 }} />
          </span>
        </button>
      )}
    </div>
  );
}

/** Le menu de mon affiche : changer le mot, la retirer du fil, la supprimer. */
function FeuilleMonAffiche({ affiche, moi, onFermer, onMot, onRetiree }: {
  affiche: AfficheDuFil; moi: string;
  onFermer: () => void; onMot: (mot: string) => void; onRetiree: () => void;
}) {
  const [mot, setMot] = useState(affiche.mot);
  const [occupe, setOccupe] = useState(false);
  /** Retirer et supprimer se confirment d'un second toucher. */
  const [confirmer, setConfirmer] = useState<"retirer" | "supprimer" | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const faire = async (geste: () => Promise<boolean>, ensuite: () => void) => {
    setOccupe(true); setErreur(null);
    const ok = await geste();
    setOccupe(false);
    if (ok) ensuite(); else setErreur("Ça n’a pas abouti. Réessaie.");
  };

  const ligne = "flex min-h-12 w-full items-center px-1 text-left text-[16px] font-semibold disabled:opacity-60";
  return (
    <Sheet onFermer={onFermer}>
      <div className="mb-3 flex items-center justify-between">
        <b className="text-[20px] font-bold" style={{ color: "var(--text-0)" }}>Ton affiche</b>
        <button onClick={onFermer} aria-label="Fermer"><X className="h-5 w-5" style={{ color: "var(--text-3)" }} /></button>
      </div>

      <label htmlFor="mot-fil" className="vy-label mb-1.5 block" style={{ color: "var(--text-3)" }}>Ton petit mot</label>
      <textarea
        id="mot-fil" value={mot} rows={2} maxLength={MOT_MAX}
        onChange={(e) => setMot(e.target.value.slice(0, MOT_MAX))}
        placeholder="Dur aujourd’hui mais fait."
        className="w-full resize-none px-3 py-2.5 text-[16px] outline-none"
        style={{ borderRadius: "var(--r-controle)", background: "rgba(var(--tint-violet-rgb), .3)", color: "var(--text-0)" }}
      />
      {mot.trim() !== affiche.mot && (
        <button onClick={() => void faire(() => ecrireMot(moi, affiche.id, mot), () => onMot(mot.trim()))} disabled={occupe}
          className="mt-2 min-h-11 w-full text-[16px] font-semibold text-white disabled:opacity-60"
          style={{ borderRadius: "var(--r-controle)", background: "linear-gradient(135deg, #8B5CF6, #C13BC1)", boxShadow: "var(--ombre-action)" }}>
          Enregistrer le mot
        </button>
      )}

      <div className="mt-4">
        {confirmer === "retirer" ? (
          <button className={`vy-filet ${ligne}`} style={{ color: "#D93A3A" }} disabled={occupe}
            onClick={() => void faire(() => retirerDuFil(moi, affiche.id), onRetiree)}>
            Oui, retirer du fil
            <span className="ml-auto text-[11px] font-normal" style={{ color: "var(--text-3)" }}>Elle reste dans ton profil</span>
          </button>
        ) : (
          <button className={`vy-filet ${ligne}`} style={{ color: "var(--text-1)" }} disabled={occupe}
            onClick={() => setConfirmer("retirer")}>
            Retirer du fil
            <span className="ml-auto text-[11px] font-normal" style={{ color: "var(--text-3)" }}>Elle reste dans ton profil</span>
          </button>
        )}
        {confirmer === "supprimer" ? (
          <button className={`vy-filet ${ligne}`} style={{ color: "#D93A3A" }} disabled={occupe}
            onClick={() => void faire(() => supprimerAffiche(moi, affiche.id), onRetiree)}>
            Oui, supprimer l’affiche
            <span className="ml-auto text-[11px] font-normal" style={{ color: "var(--text-3)" }}>La séance reste dans ton historique</span>
          </button>
        ) : (
          <button className={`vy-filet ${ligne}`} style={{ color: "#D93A3A" }} disabled={occupe} onClick={() => setConfirmer("supprimer")}>
            Supprimer l’affiche
          </button>
        )}
      </div>
      {erreur && <p className="mt-2 text-[13px]" style={{ color: "#D93A3A" }}>{erreur}</p>}
    </Sheet>
  );
}

type Moment =
  | { k: "aff"; at: string; a: AfficheDuFil }
  | { k: "evts"; at: string; cle: string; liste: EvenementFil[] };

/** Affiches et événements dans l'ordre du temps ; les événements qui se
 *  suivent tiennent dans un seul groupe. */
function enMoments(fil: AfficheDuFil[], evts: EvenementFil[]): Moment[] {
  const tout = [
    ...fil.map((a) => ({ at: a.creeLe, a, e: null as EvenementFil | null })),
    ...evts.map((e) => ({ at: e.creeLe, a: null as AfficheDuFil | null, e })),
  ].sort((x, y) => y.at.localeCompare(x.at));
  const out: Moment[] = [];
  for (const x of tout) {
    if (x.a) { out.push({ k: "aff", at: x.at, a: x.a }); continue; }
    const der = out[out.length - 1];
    if (der && der.k === "evts") der.liste.push(x.e!);
    else out.push({ k: "evts", at: x.at, cle: `evts-${x.e!.id}`, liste: [x.e!] });
  }
  return out;
}

/** « Marc et Sarah ont dit bravo », « Marc a dit bravo », « 4 bravos ». */
function quiADitBravo(ids: string[], prenoms: Map<string, string>): string | null {
  if (!ids.length) return null;
  const noms = ids.map((id) => prenoms.get(id)).filter((n): n is string => !!n);
  if (noms.length !== ids.length || noms.length > 2) return `${ids.length} bravo${ids.length > 1 ? "s" : ""}`;
  return noms.length === 1 ? `${noms[0]} a dit bravo` : `${noms[0]} et ${noms[1]} ont dit bravo`;
}

function LigneEvenement({ e, moi, prenoms, onBravo }: {
  e: EvenementFil; moi: string; prenoms: Map<string, string>; onBravo: () => void;
}) {
  const cEstMoi = e.auteur.id === moi;
  const phrase = phraseEvenement(e, cEstMoi);
  if (!phrase) return null;
  const mien = e.bravos.includes(moi);
  const minutes = e.sorte === "seance" && Number.isFinite(Number(e.data.minutes)) ? Number(e.data.minutes) : null;
  const bravos = cEstMoi ? quiADitBravo(e.bravos, prenoms) : null;
  return (
    <div className="vy-filet flex items-center gap-3 px-3.5 py-3.5">
      <span className="relative flex-shrink-0">
        <PersonAvatar personne={e.auteur} taille={44} />
        <span className="absolute -bottom-1 -right-1 flex h-[22px] w-[22px] items-center justify-center">
          <SigneEvenement e={e} />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] leading-snug" style={{ color: "var(--text-1)" }}>
          {phrase.map((m, i) => m.gras ? <b key={i} style={{ color: "var(--text-0)" }}>{m.t}</b> : <span key={i}>{m.t}</span>)}
        </span>
        <span className="mt-0.5 block text-[11px]" style={{ color: "var(--text-3)" }}>
          {quandAffiche(e.creeLe)}
          {minutes !== null && <> · <span className="vy-nombre">{minutes}</span> min</>}
          {bravos && <> · {bravos}</>}
        </span>
      </span>
      {!cEstMoi && (
        <button onClick={onBravo} aria-pressed={mien}
          className="flex min-h-9 flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold"
          style={mien
            ? { background: "linear-gradient(135deg, #8B5CF6, #C13BC1)", color: "#fff" }
            : { background: "rgba(var(--tint-violet-rgb), .5)", color: "var(--exp-encre)" }}>
          Bravo
          {e.bravos.length > 0 && <span className="vy-nombre" style={{ fontWeight: 700 }}>{e.bravos.length}</span>}
        </button>
      )}
    </div>
  );
}

/** Le petit signe posé sur la photo : la gemme, la flamme, le badge, la coche. */
function SigneEvenement({ e }: { e: EvenementFil }) {
  if (e.sorte === "rang") {
    const rang = RANGS.find((r) => r.id === e.data.rang);
    if (rang) return <GemmeRang rang={rang} size={22} flotte={false} />;
  }
  if (e.sorte === "flamme") return <FlammeSerie palier={e.data.palier as IdFlamme} taille={18} />;
  const violet = "linear-gradient(135deg, #8B5CF6, #C13BC1)";
  return (
    <span aria-hidden className="flex h-[22px] w-[22px] items-center justify-center rounded-full"
      style={{ background: violet, border: "2px solid rgb(var(--surface-rgb))" }}>
      {e.sorte === "badge"
        ? <svg width="11" height="11" viewBox="0 0 24 24"><path d="M12 2l3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1z" fill="#fff" /></svg>
        : <svg width="11" height="11" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </span>
  );
}

/** L'affiche du pote, en bande sombre : le mot de la séance en grand, ses chiffres dessous. */
function MiniAffiche({ affiche }: { affiche: AfficheDuFil }) {
  const d = affiche.data;
  const texte = motCouverture(d.title || "Séance").toUpperCase();
  const { boite, mesure, taille } = useMotAjuste(texte, 76);
  const chiffres = (d.metrics ?? []).slice(0, 3);
  return (
    <div className="mx-3 overflow-hidden" style={{ borderRadius: "var(--r-controle)", background: "#120C22", color: "#F4F1FB" }}>
      <div aria-hidden style={{ height: 3, background: "linear-gradient(90deg, #8B5CF6, #C13BC1)" }} />
      <div className="px-4 pb-3.5 pt-3">
        <p className="truncate text-[11px]" style={{ color: "rgba(244,241,251,.65)" }}>{d.title}</p>
        <div ref={boite} aria-hidden className="relative mt-1 overflow-hidden">
          <span ref={mesure} className="pointer-events-none invisible absolute left-0 top-0" style={{ ...STYLE_MOT, fontSize: 100 }}>{texte}</span>
          <span className="block" style={{ ...STYLE_MOT, fontSize: taille || 1, opacity: taille ? 1 : 0 }}>{texte}</span>
        </div>
        {chiffres.length > 0 && (
          <div className="mt-3 flex gap-5">
            {chiffres.map((m) => (
              <span key={m.label}>
                <span className="vy-nombre text-[20px]" style={{ fontWeight: 800 }}>{m.value}</span>
                {m.unit && <span className="ml-1 text-[11px]" style={{ color: "rgba(244,241,251,.65)" }}>{m.unit}</span>}
                <span className="block text-[11px]" style={{ color: "rgba(244,241,251,.65)" }}>{m.label}</span>
              </span>
            ))}
          </div>
        )}
        {d.highlight && <p className="mt-2 text-[13px] font-semibold" style={{ color: "#F0ABFC" }}>{d.highlight}</p>}
      </div>
    </div>
  );
}
