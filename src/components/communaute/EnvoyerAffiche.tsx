"use client";

/* ─────────────────────────────────────────────────────────────
   Envoyer une affiche de perf à quelqu'un.

   Avant, « Partager la séance » créait une publication avec
   `audience: "friends"`. La policy de `posts` étant
   `audience = 'public' OR auth.uid() = user_id`, ce mot ne donnait
   accès à PERSONNE : la rangée « Ses affiches de perf » d'un profil
   public était vide par construction, et l'app annonçait quand même
   « visible par tes amis ». Le bouton ne partageait avec personne.

   L'affiche part donc là où sont les gens : dans une conversation,
   comme une photo. Et la dernière ligne mène dehors, parce que
   partager son affiche hors de Vaiiya est la seule boucle
   d'acquisition automatique du produit.

   ⭐ 2026-10-18 (maquette « Progresser avec ses potes ») : la première
   ligne montre l'affiche dans LE FIL DE TES POTES (amis réciproques
   seulement, jamais un inconnu). C'est un choix, éteint par défaut,
   et on peut le retirer.
   ───────────────────────────────────────────────────────────── */

import { useState, useEffect } from "react";
import { Loader2, X, Check, Share2, Users } from "lucide-react";
import Sheet from "@/components/communaute/Sheet";
import ConversationAvatar from "@/components/communaute/ConversationAvatar";
import {
  chargerConversations, titreConversation, autresMembres, envoyerPhoto,
  type Conversation,
} from "@/lib/messagerie";
import { afficheDansFil, montrerDansFil, ecrireMotSeance, MOT_MAX } from "@/lib/filPotes";
import { renderPerfCardBlob, sharePerfCard, type PerfShareData } from "@/lib/perfShareExport";

export default function EnvoyerAffiche({ data, moi, accessToken, seanceId, onFermer }: {
  data: PerfShareData;
  /** La séance de l'affiche : sans elle, pas de ligne « fil des potes ». */
  seanceId?: string | null;
  moi: string;
  accessToken?: string;
  onFermer: () => void;
}) {
  const [fils, setFils]     = useState<Conversation[]>([]);
  const [charge, setCharge] = useState(true);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  /** `null` : l'affiche n'est pas (encore) en base, la ligne ne s'affiche pas. */
  const [dansFil, setDansFil] = useState<boolean | null>(null);
  const [filOccupe, setFilOccupe] = useState(false);
  /** Le petit mot posé sur l'affiche, et ce qui est déjà enregistré. */
  const [mot, setMot] = useState("");
  const [motEnBase, setMotEnBase] = useState("");
  const [motOccupe, setMotOccupe] = useState(false);

  useEffect(() => {
    if (!seanceId) return;
    void afficheDansFil(moi, seanceId).then((r) => {
      setDansFil(r ? r.dansFil : null);
      setMot(r?.mot ?? "");
      setMotEnBase(r?.mot ?? "");
    });
  }, [moi, seanceId]);

  const enregistrerMot = async () => {
    if (!seanceId) return;
    setMotOccupe(true);
    const ok = await ecrireMotSeance(moi, seanceId, mot);
    setMotOccupe(false);
    if (ok) setMotEnBase(mot.trim());
    else setErreur("Impossible d’enregistrer ton mot. Réessaie.");
  };

  const basculerFil = async () => {
    if (!seanceId || dansFil === null) return;
    setFilOccupe(true);
    const ok = await montrerDansFil(moi, seanceId, !dansFil);
    setFilOccupe(false);
    if (ok) setDansFil(!dansFil);
    else setErreur("Impossible de changer qui voit ton affiche. Réessaie.");
  };

  useEffect(() => {
    void chargerConversations(moi)
      .then((c) => setFils(c.filter((f) => !f.archivee)))
      .catch(() => setErreur("Impossible de charger tes discussions."))
      .finally(() => setCharge(false));
  }, [moi]);

  const envoyer = async (fil: Conversation) => {
    setOccupe(fil.id);
    setErreur(null);
    try {
      const blob = await renderPerfCardBlob(data);
      if (!blob) throw new Error("rendu_impossible");
      const fichier = new File([blob], "vaiiya-affiche.png", { type: "image/png" });
      const r = await envoyerPhoto(fil.id, moi, fichier, null, accessToken, "Affiche de séance");
      if (!r.ok) throw new Error(r.raison ?? "envoi_impossible");
      setEnvoye(fil.id);
    } catch {
      setErreur("L’envoi n’a pas abouti. Réessaie.");
    } finally {
      setOccupe(null);
    }
  };

  return (
    // 106 : elle s'ouvre depuis le tunnel de séance, qui est à 100.
    <Sheet onFermer={onFermer} niveau={106}>
      <div className="mb-1 flex items-center justify-between">
        <b className="text-[20px] font-bold" style={{ color: "var(--text-0)" }}>Envoyer à quelqu&apos;un</b>
        <button onClick={onFermer} aria-label="Fermer"><X className="h-5 w-5" style={{ color: "var(--text-3)" }} /></button>
      </div>
      <p className="mb-3 text-[13px]" style={{ color: "var(--text-2)" }}>
        Ton affiche part dans la discussion, comme une photo.
      </p>

      {dansFil !== null && (
        <button
          role="switch"
          aria-checked={dansFil}
          onClick={() => void basculerFil()}
          disabled={filOccupe}
          className="mb-3 flex w-full items-center gap-3 px-3.5 py-3 text-left disabled:opacity-60"
          style={{ borderRadius: "var(--r-bloc)", background: "rgba(var(--tint-violet-rgb), .45)" }}
        >
          <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}>
            <Users className="h-4.5 w-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[16px] font-semibold" style={{ color: "var(--text-0)" }}>Dans le fil de tes potes</b>
            <small className="block text-[13px]" style={{ color: "var(--text-3)" }}>Seuls tes amis la voient.</small>
          </span>
          <span aria-hidden className="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
            style={{ background: dansFil ? "linear-gradient(135deg, #8B5CF6, #C13BC1)" : "rgba(var(--text-3-rgb), .3)" }}>
            <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: dansFil ? 18 : 2 }} />
          </span>
        </button>
      )}

      {dansFil && (
        <div className="mb-3">
          <label htmlFor="mot-affiche" className="vy-label mb-1.5 block" style={{ color: "var(--text-3)" }}>
            Un petit mot (facultatif)
          </label>
          <div className="flex items-end gap-2">
            <textarea
              id="mot-affiche"
              value={mot}
              onChange={(e) => setMot(e.target.value.slice(0, MOT_MAX))}
              rows={2}
              maxLength={MOT_MAX}
              placeholder="Dur aujourd’hui mais fait."
              className="min-w-0 flex-1 resize-none px-3 py-2.5 text-[16px] outline-none"
              style={{ borderRadius: "var(--r-controle)", background: "rgba(var(--tint-violet-rgb), .3)", color: "var(--text-0)" }}
            />
            {mot.trim() !== motEnBase && (
              <button onClick={() => void enregistrerMot()} disabled={motOccupe}
                className="min-h-11 px-4 text-[13px] font-semibold text-white disabled:opacity-60"
                style={{ borderRadius: "var(--r-controle)", background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}>
                {motOccupe ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="max-h-[38vh] overflow-y-auto">
        {charge ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-3)" }} />
          </div>
        ) : fils.length === 0 ? (
          <p className="py-4 text-center text-[16px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            Tu n&apos;as encore aucune discussion.<br />
            Tu peux quand même partager ton affiche ailleurs.
          </p>
        ) : (
          fils.map((fil) => (
            <button
              key={fil.id}
              onClick={() => void envoyer(fil)}
              disabled={occupe !== null || envoye === fil.id}
              className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left disabled:opacity-60"
            >
              <ConversationAvatar
                conversation={fil}
                autres={autresMembres(fil, moi)}
                titre={titreConversation(fil, moi)}
                taille={38}
                afficherDefi={false}
              />
              <span className="min-w-0 flex-1 truncate text-[16px] font-medium" style={{ color: "var(--text-1)" }}>
                {titreConversation(fil, moi)}
              </span>
              {occupe === fil.id ? (
                <Loader2 className="h-4.5 w-4.5 flex-shrink-0 animate-spin" style={{ color: "var(--text-3)" }} />
              ) : envoye === fil.id ? (
                <Check className="h-4.5 w-4.5 flex-shrink-0" style={{ color: "var(--teal-encre)" }} />
              ) : null}
            </button>
          ))
        )}
      </div>

      {/* La sortie vers le dehors. Elle reste ici, et pas ailleurs :
          c'est la même intention, « quelqu'un » n'est pas toujours
          dans Vaiiya. */}
      <button
        onClick={() => void sharePerfCard(data)}
        disabled={occupe !== null}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left disabled:opacity-50"
        style={{ borderColor: "rgba(var(--text-3-rgb), .3)" }}
      >
        <span
          className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(var(--accent-rgb), .12)" }}
        >
          <Share2 className="h-4.5 w-4.5" style={{ color: "var(--accent)" }} />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[16px] font-medium" style={{ color: "var(--text-1)" }}>
            Quelqu&apos;un en dehors de Vaiiya
          </b>
          <small className="block text-[13px]" style={{ color: "var(--text-3)" }}>
            L&apos;image part dans ton téléphone.
          </small>
        </span>
      </button>

      {erreur && (
        <p className="mt-3 text-center text-[13px] leading-snug" style={{ color: "#E8620C" }}>{erreur}</p>
      )}
    </Sheet>
  );
}
