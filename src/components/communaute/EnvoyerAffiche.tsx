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

   ⚠️ AUCUN FIL D'ACTIVITÉ N'EST ROUVERT. On choisit un fil et on y
   envoie une image ; personne ne reçoit rien qu'il n'ait pas déjà
   accepté de recevoir.
   ───────────────────────────────────────────────────────────── */

import { useState, useEffect } from "react";
import { Loader2, X, Check, Share2 } from "lucide-react";
import Sheet from "@/components/communaute/Sheet";
import ConversationAvatar from "@/components/communaute/ConversationAvatar";
import {
  chargerConversations, titreConversation, autresMembres, envoyerPhoto,
  type Conversation,
} from "@/lib/messagerie";
import { renderPerfCardBlob, sharePerfCard, type PerfShareData } from "@/lib/perfShareExport";

export default function EnvoyerAffiche({ data, moi, accessToken, onFermer }: {
  data: PerfShareData;
  moi: string;
  accessToken?: string;
  onFermer: () => void;
}) {
  const [fils, setFils]     = useState<Conversation[]>([]);
  const [charge, setCharge] = useState(true);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

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
      setErreur("L'envoi n'a pas abouti. Réessaie.");
    } finally {
      setOccupe(null);
    }
  };

  return (
    // 106 : elle s'ouvre depuis le tunnel de séance, qui est à 100.
    <Sheet onFermer={onFermer} niveau={106}>
      <div className="mb-1 flex items-center justify-between">
        <b className="text-[17px] font-bold" style={{ color: "var(--text-0)" }}>Envoyer à quelqu&apos;un</b>
        <button onClick={onFermer} aria-label="Fermer"><X className="h-5 w-5" style={{ color: "var(--text-3)" }} /></button>
      </div>
      <p className="mb-3 text-[13.5px]" style={{ color: "var(--text-2)" }}>
        Ton affiche part dans la discussion, comme une photo.
      </p>

      <div className="max-h-[38vh] overflow-y-auto">
        {charge ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-3)" }} />
          </div>
        ) : fils.length === 0 ? (
          <p className="py-4 text-center text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
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
              <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium" style={{ color: "var(--text-1)" }}>
                {titreConversation(fil, moi)}
              </span>
              {occupe === fil.id ? (
                <Loader2 className="h-4.5 w-4.5 flex-shrink-0 animate-spin" style={{ color: "var(--text-3)" }} />
              ) : envoye === fil.id ? (
                <Check className="h-4.5 w-4.5 flex-shrink-0" style={{ color: "#2BD4A0" }} />
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
          <b className="block text-[14.5px] font-medium" style={{ color: "var(--text-1)" }}>
            Quelqu&apos;un en dehors de Vaiiya
          </b>
          <small className="block text-[12.5px]" style={{ color: "var(--text-3)" }}>
            L&apos;image part dans ton téléphone.
          </small>
        </span>
      </button>

      {erreur && (
        <p className="mt-3 text-center text-[13.5px] leading-snug" style={{ color: "#E8620C" }}>{erreur}</p>
      )}
    </Sheet>
  );
}
