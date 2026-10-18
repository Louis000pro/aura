"use client";

/* ─────────────────────────────────────────────────────────────
   Le fil des potes (maquette « Progresser avec ses potes »,
   écran 1, validée par Louis le 2026-10-18).

   En haut, qui s'est entraîné aujourd'hui (anneau violet). En
   dessous, les affiches que mes AMIS ont choisi de montrer, avec
   trois réactions d'un geste et une réponse en message privé.

   ⚠️ CE QUI N'EST PAS ICI, ET NE DOIT PAS Y VENIR : un inconnu,
   un classement, un commentaire public, un compteur de vues.
   ───────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, UserPlus } from "lucide-react";
import { PersonAvatar } from "@/components/communaute/ConversationAvatar";
import { motCouverture, useMotAjuste, STYLE_MOT } from "@/components/profil/CouvertureSeance";
import { creerConversation, type Personne } from "@/lib/messagerie";
import {
  mesAmis, chargerFilPotes, presenceAmis, basculerReaction, poserBrouillon, quandAffiche,
  SORTES, type AfficheDuFil, type SorteReaction,
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
  const [presence, setPresence] = useState<Map<string, boolean>>(new Map());
  const [erreur, setErreur] = useState(false);
  const [ouverture, setOuverture] = useState<string | null>(null);

  const lire = useCallback(async () => {
    const a = await mesAmis(moi);
    const [f, p] = await Promise.all([chargerFilPotes(a), presenceAmis()]);
    return { a, f, p };
  }, [moi]);

  const appliquer = useCallback((r: { a: Personne[]; f: AfficheDuFil[]; p: Map<string, boolean> }) => {
    setAmis(r.a); setFil(r.f); setPresence(r.p); setErreur(false);
  }, []);
  const echec = useCallback(() => { setErreur(true); setAmis((x) => x ?? []); }, []);

  const charger = useCallback(() => lire().then(appliquer, echec), [lire, appliquer, echec]);

  useEffect(() => {
    let actif = true;
    lire().then((r) => { if (actif) appliquer(r); }, () => { if (actif) echec(); });
    return () => { actif = false; };
  }, [lire, appliquer, echec]);

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
      {fil.length === 0 ? (
        <div className="px-4 pt-6 text-center">
          <p className="text-[16px] font-semibold" style={{ color: "var(--text-1)" }}>
            {amis.length === 0 ? "Ajoute tes potes" : "Rien de neuf pour l’instant"}
          </p>
          <p className="mx-auto mt-1.5 max-w-[290px] text-[13px] leading-relaxed" style={{ color: "var(--text-3)" }}>
            {amis.length === 0
              ? "Quand vous serez amis, vous verrez les séances que chacun choisit de montrer."
              : "Quand un pote montre sa séance, elle arrive ici. La tienne aussi, depuis la fin de séance."}
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
          {fil.map((a) => (
            <article key={a.id} className="overflow-hidden"
              style={{ borderRadius: "var(--r-bloc)", background: "rgb(var(--surface-rgb))", boxShadow: "var(--ombre-pose)" }}>
              <header className="flex items-center gap-2.5 px-3.5 pb-2.5 pt-3">
                <PersonAvatar personne={a.auteur} taille={34} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[16px]" style={{ color: "var(--text-0)" }}>{a.auteur.pseudo}</b>
                  <span className="block text-[11px]" style={{ color: "var(--text-3)" }}>{quandAffiche(a.creeLe)}</span>
                </span>
              </header>

              <MiniAffiche affiche={a} />

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
            </article>
          ))}
        </div>
      )}
    </div>
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
