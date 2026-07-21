"use client";

/* ─────────────────────────────────────────────────────────────
   Le fil d'une conversation.

   Le défi, quand il y en a un, est épinglé en haut : c'est
   l'objet que les deux personnes partagent, et le fil est
   l'endroit où on se relance. Les maillons franchis s'écrivent
   dans la conversation, en lignes système.
   ───────────────────────────────────────────────────────────── */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Send, Loader2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { lockBodyModal } from "@/lib/bodyModal";
import { imageEtat, etatPoster } from "@/lib/defi";
import {
  chargerFil, envoyerMessage, marquerLu, titreConversation, autresMembres,
  type Conversation, type Message,
} from "@/lib/messagerie";

export default function FilPage() {
  const params = useParams<{ id: string }>();
  const convId = (params?.id ?? "").toString();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [conv, setConv]         = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [charge, setCharge]     = useState(true);
  const [texte, setTexte]       = useState("");
  const [envoi, setEnvoi]       = useState(false);

  const basRef = useRef<HTMLDivElement>(null);

  // La barre du bas laisse la place au fil, comme dans le tunnel.
  useEffect(() => lockBodyModal(), []);

  const recharger = useCallback(async () => {
    const { conversation, messages: m } = await chargerFil(convId);
    setConv(conversation);
    setMessages(m);
    setCharge(false);
  }, [convId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth"); return; }
    void recharger();
  }, [authLoading, user, router, recharger]);

  /* Temps réel : les messages de l'autre arrivent sans rafraîchir. */
  useEffect(() => {
    if (!convId || !user) return;
    const supabase = createClient();
    const canal = supabase
      .channel(`conv:${convId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
        (payload) => {
          const m = payload.new as Record<string, unknown>;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [...prev, {
                  id: m.id as string,
                  userId: (m.user_id as string | null) ?? null,
                  contenu: m.contenu as string,
                  type: m.type as "texte" | "systeme",
                  createdAt: m.created_at as string,
                }],
          );
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(canal); };
  }, [convId, user]);

  /* Lu dès qu'on est dedans. */
  useEffect(() => {
    if (!user || !convId || charge) return;
    void marquerLu(convId, user.id);
  }, [user, convId, charge, messages.length]);

  useEffect(() => {
    basRef.current?.scrollIntoView({ behavior: charge ? "auto" : "smooth" });
  }, [messages.length, charge]);

  const envoyer = async () => {
    if (!user || !texte.trim() || envoi) return;
    const contenu = texte.trim();
    setTexte("");
    setEnvoi(true);
    const r = await envoyerMessage(convId, user.id, contenu);
    setEnvoi(false);
    if (!r.ok) { setTexte(contenu); return; }   // on rend le texte plutôt que de le perdre
    void recharger();
  };

  if (authLoading || charge) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-3)" }} />
      </div>
    );
  }

  if (!conv) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-[15px]" style={{ color: "var(--text-body)" }}>Cette conversation n&apos;existe plus.</p>
        <button onClick={() => router.replace("/communaute")}
          className="rounded-2xl px-5 py-3 text-[15px] font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}>
          Retour aux discussions
        </button>
      </div>
    );
  }

  const moi    = user!.id;
  const titre  = titreConversation(conv, moi);
  const autres = autresMembres(conv, moi);

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* ─── En-tête ─── */}
      <div
        className="flex shrink-0 items-center gap-2.5 border-b px-3 py-3"
        style={{ borderColor: "rgba(var(--text-3-rgb), .18)", paddingTop: "max(.75rem, env(safe-area-inset-top))" }}
      >
        <button onClick={() => router.push("/communaute")} aria-label="Retour" className="p-1">
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-1)" }} />
        </button>
        {autres[0]?.avatar ? (
          <Image src={autres[0].avatar} alt="" width={30} height={30}
            className="h-[30px] w-[30px] rounded-full object-cover" unoptimized />
        ) : (
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[12px] font-bold text-white"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}>
            {titre.charAt(0).toUpperCase()}
          </div>
        )}
        <b className="truncate text-[15px] font-semibold" style={{ color: "var(--text-0)" }}>{titre}</b>
      </div>

      {/* ─── Le défi épinglé ─── */}
      {conv.defi && <DefiEpingle defi={conv.defi} onOuvrir={() => router.push("/defi")} />}

      {/* ─── Les messages ─── */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-[13.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
            Rien encore.<br />C&apos;est à toi d&apos;ouvrir.
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          {messages.map((m) => {
            if (m.type === "systeme") {
              return (
                <p key={m.id} className="my-1.5 px-6 text-center text-[12px] leading-relaxed"
                  style={{ color: "var(--text-3)" }}>
                  {m.contenu}
                </p>
              );
            }
            const aMoi = m.userId === moi;
            const auteur = conv.membres.find((x) => x.id === m.userId);
            return (
              <div key={m.id} className={`flex flex-col ${aMoi ? "items-end" : "items-start"}`}>
                {conv.type === "groupe" && !aMoi && (
                  <span className="mb-0.5 ml-3 text-[11px]" style={{ color: "var(--text-3)" }}>
                    {auteur?.pseudo ?? "…"}
                  </span>
                )}
                <div
                  className="max-w-[78%] px-3.5 py-2 text-[14px] leading-snug"
                  style={
                    aMoi
                      ? { background: "linear-gradient(135deg, #8B5CF6, #C13BC1)", color: "#fff",
                          borderRadius: "16px 16px 5px 16px" }
                      : { background: "rgb(var(--surface-rgb))", color: "var(--text-1)",
                          border: "1px solid rgba(var(--text-3-rgb), .18)",
                          borderRadius: "16px 16px 16px 5px" }
                  }
                >
                  {m.contenu}
                </div>
              </div>
            );
          })}
        </div>
        <div ref={basRef} />
      </div>

      {/* ─── Composer ─── */}
      <div
        className="flex shrink-0 items-end gap-2 px-3 pt-2"
        style={{ paddingBottom: "calc(.75rem + env(safe-area-inset-bottom))" }}
      >
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void envoyer(); }
          }}
          rows={1}
          placeholder="Message…"
          className="max-h-28 min-h-[40px] flex-1 resize-none rounded-[20px] border px-4 py-2.5 text-[14px] outline-none"
          style={{
            borderColor: "rgba(var(--text-3-rgb), .25)",
            background: "rgb(var(--surface-rgb))",
            color: "var(--text-1)",
          }}
        />
        <button
          onClick={envoyer}
          disabled={!texte.trim() || envoi}
          aria-label="Envoyer"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
        >
          {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/* ─── L'affiche épinglée ─────────────────────────────────────── */
function DefiEpingle({ defi, onOuvrir }: {
  defi: NonNullable<Conversation["defi"]>; onOuvrir: () => void;
}) {
  const etat = etatPoster(defi.faits, defi.objectif);
  const gagne = defi.statut === "reussi";

  return (
    <button
      onClick={onOuvrir}
      className="mx-3 mt-2.5 flex shrink-0 items-center gap-3 rounded-2xl border p-2.5 text-left"
      style={{ borderColor: "rgba(var(--text-3-rgb), .18)", background: "rgb(var(--surface-rgb))" }}
    >
      <div className="relative h-16 w-[46px] shrink-0 overflow-hidden rounded-[9px] shadow-md">
        <Image src={imageEtat(defi.serie, etat)} alt="" fill sizes="46px" className="object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <b className="block text-[13.5px] font-semibold" style={{ color: "var(--text-0)" }}>
          {gagne ? "L'affiche est à vous" : `${defi.faits} jour${defi.faits > 1 ? "s" : ""} sur ${defi.objectif}`}
        </b>
        <span className="mt-0.5 block text-[12px]" style={{ color: "var(--text-2)" }}>
          {gagne ? "Elle rejoint vos profils." : "Touche pour voir l'affiche en grand."}
        </span>

        <div className="mt-2 flex gap-[3px]">
          {Array.from({ length: defi.objectif }).map((_, i) => (
            <span
              key={i}
              className="h-1 flex-1 rounded-full"
              style={{ background: i < defi.faits ? "#2BD4A0" : "rgba(var(--text-3-rgb), .25)" }}
            />
          ))}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "var(--text-3)" }} />
    </button>
  );
}
