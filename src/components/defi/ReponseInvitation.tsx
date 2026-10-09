"use client";

/* ─────────────────────────────────────────────────────────────
   Accepter ou refuser une invitation à un relais.

   Posé dans la cloche ET sur la page des notifications : une
   invitation se règle là où elle arrive, sans détour. Elle relit
   son état à l'affichage, donc une invitation passée (relais
   démarré, arrêté, ou déjà répondue) ne propose plus rien.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { invitationOuverte, repondreInvitation } from "@/lib/defi";
import { refusRelais } from "@/lib/defiErreurs";

/** L'identifiant du relais, porté par le lien de la notification. */
export function runDeLien(lien: string | null | undefined): string | null {
  const m = lien?.match(/[?&]invitation=([0-9a-f-]{36})/i);
  return m ? m[1] : null;
}

export default function ReponseInvitation({ runId, moi, onFini }: {
  runId: string;
  moi: string;
  onFini?: () => void;
}) {
  const router = useRouter();
  const [ouverte, setOuverte] = useState<boolean | null>(null);
  const [occupe, setOccupe] = useState<"oui" | "non" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    void invitationOuverte(runId, moi).then((o) => { if (vivant) setOuverte(o); });
    return () => { vivant = false; };
  }, [runId, moi]);

  const repondre = async (accepte: boolean) => {
    setOccupe(accepte ? "oui" : "non");
    setMessage(null);
    const r = await repondreInvitation(runId, accepte);
    setOccupe(null);
    if (!r.ok) { setMessage(refusRelais(r).texte); return; }
    setOuverte(false);
    if (!accepte) { setMessage("Invitation déclinée."); return; }
    onFini?.();
    router.push(r.lance && typeof r.conversation_id === "string"
      ? `/communaute/${r.conversation_id}`
      : "/defi");
  };

  if (ouverte === null) return null;
  if (!ouverte) {
    return message
      ? <p className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>{message}</p>
      : <p className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>Invitation passée.</p>;
  }

  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); void repondre(true); }}
          disabled={occupe !== null}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-white disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
        >
          {occupe === "oui" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Accepter
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); void repondre(false); }}
          disabled={occupe !== null}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium disabled:opacity-60"
          style={{ color: "var(--text-2)" }}
        >
          {occupe === "non" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Refuser
        </button>
      </div>
      {message && <p className="mt-1 text-[11px]" style={{ color: "#E8620C" }}>{message}</p>}
    </div>
  );
}
