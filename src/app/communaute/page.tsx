"use client";

/* ─────────────────────────────────────────────────────────────
   Communauté — la liste des conversations.

   Il n'y a RIEN d'autre ici : pas de fil d'activité, pas de
   classement, aucune trace de ce que font les autres. Le jour où
   cet onglet montre l'activité d'inconnus, il redevient l'écran
   social vide qu'on a supprimé le 20 juillet.
   ───────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Loader2, PenLine, Check, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { imageEtat } from "@/lib/defi";
import {
  chargerConversations, titreConversation, autresMembres, mesRelations,
  creerConversation, heureCourte, type Conversation, type Personne,
} from "@/lib/messagerie";
import { creerDefi } from "@/lib/defi";

export default function CommunautePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [convs, setConvs]     = useState<Conversation[]>([]);
  const [charge, setCharge]   = useState(true);
  const [sheet, setSheet]     = useState<"non" | "choix" | "nouvelle">("non");
  const [occupe, setOccupe]   = useState(false);
  const [erreur, setErreur]   = useState<string | null>(null);

  const recharger = useCallback(async () => {
    if (!user) return;
    setConvs(await chargerConversations(user.id));
    setCharge(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth"); return; }
    void recharger();
  }, [authLoading, user, router, recharger]);

  const lancerRelais = async () => {
    setOccupe(true);
    setErreur(null);
    const r = await creerDefi();
    setOccupe(false);
    setSheet("non");

    if (r.ok && r.conversation_id) { router.push(`/communaute/${r.conversation_id}`); return; }
    if (r.ok) { void recharger(); return; }

    const raison = String(r.raison ?? "");
    setErreur(
      /function|does not exist|schema cache|404/i.test(raison) ? "Le relais n'est pas encore activé côté serveur."
      : raison === "defi_deja_en_cours"                        ? "Tu as déjà un relais en cours."
      :                                                          "Impossible de lancer le relais pour le moment.",
    );
  };

  if (authLoading || charge) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-3)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ─── Barre du haut ─── */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <button onClick={() => router.push("/profil")} aria-label="Mon profil" className="relative shrink-0">
          {user?.avatar ? (
            <Image src={user.avatar} alt="" width={36} height={36}
              className="h-9 w-9 rounded-full object-cover" unoptimized />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}>
              {(user?.pseudo ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
        </button>

        <h1 className="flex-1 text-[21px] font-bold tracking-tight" style={{ color: "var(--text-0)" }}>
          Communauté
        </h1>

        <button
          onClick={() => setSheet("choix")}
          aria-label="Nouvelle discussion"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {erreur && (
        <p className="px-4 pb-2 text-[13.5px] font-medium" style={{ color: "#E8620C" }}>{erreur}</p>
      )}

      {convs.length === 0
        ? <Vide onRelais={lancerRelais} onDiscussion={() => setSheet("nouvelle")} occupe={occupe} />
        : <Liste convs={convs} moi={user!.id} onOuvrir={(id) => router.push(`/communaute/${id}`)} />}

      <AnimatePresence>
        {sheet === "choix" && (
          <Sheet onFermer={() => setSheet("non")}>
            <button
              onClick={lancerRelais}
              disabled={occupe}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[16px] font-semibold text-white disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
            >
              {occupe ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              Lancer un relais
            </button>
            <button
              onClick={() => setSheet("nouvelle")}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-4 text-[15px] font-medium"
              style={{ borderColor: "rgba(var(--text-3-rgb), .3)", color: "var(--text-1)" }}
            >
              <PenLine className="h-4.5 w-4.5" />
              Nouvelle discussion
            </button>
          </Sheet>
        )}

        {sheet === "nouvelle" && user && (
          <NouvelleDiscussion
            moi={user.id}
            onFermer={() => setSheet("non")}
            onCree={(id) => { setSheet("non"); router.push(`/communaute/${id}`); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Liste ──────────────────────────────────────────────────── */
function Liste({ convs, moi, onOuvrir }: {
  convs: Conversation[]; moi: string; onOuvrir: (id: string) => void;
}) {
  return (
    <div className="pb-4">
      {convs.map((c) => {
        const titre  = titreConversation(c, moi);
        const autres = autresMembres(c, moi);
        const apercu =
          c.dernier == null                 ? "Nouvelle discussion"
        : c.dernier.type === "systeme"      ? c.dernier.contenu
        : c.dernier.userId === moi          ? `Toi : ${c.dernier.contenu}`
        : c.type === "groupe"               ? `${c.membres.find((m) => m.id === c.dernier!.userId)?.pseudo ?? "…"} : ${c.dernier.contenu}`
        :                                     c.dernier.contenu;

        return (
          <button
            key={c.id}
            onClick={() => onOuvrir(c.id)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-[rgba(var(--tint-violet-rgb),.5)]"
          >
            {c.defi ? (
              <VignetteAffiche defi={c.defi} />
            ) : (
              <Avatar personne={autres[0]} taille={44} />
            )}

            <div className="min-w-0 flex-1">
              <b className="block truncate text-[14.5px] font-semibold" style={{ color: "var(--text-0)" }}>
                {titre}
              </b>
              <span
                className="mt-0.5 block truncate text-[13px]"
                style={{ color: c.nonLus > 0 ? "var(--text-1)" : "var(--text-3)", fontWeight: c.nonLus > 0 ? 600 : 400 }}
              >
                {apercu}
              </span>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
                {c.dernier ? heureCourte(c.dernier.createdAt) : ""}
              </span>
              {c.nonLus > 0 && (
                <span className="h-2 w-2 rounded-full" style={{ background: "#8B5CF6" }} />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** L'affiche remplace l'avatar quand la conversation porte un relais. */
function VignetteAffiche({ defi }: { defi: NonNullable<Conversation["defi"]> }) {
  const etat = defi.faits <= 0 ? 1
    : defi.faits >= defi.objectif ? 4
    : Math.min(3, 1 + Math.round((3 * defi.faits) / defi.objectif));

  return (
    <div className="relative h-[46px] w-[34px] shrink-0 overflow-hidden rounded-[7px] shadow-md">
      <Image src={imageEtat(defi.serie, etat)} alt="" fill sizes="34px" className="object-cover" />
      <span
        className="absolute inset-x-0 bottom-0 pb-[3px] pt-1 text-center text-[8.5px] font-extrabold tracking-wide text-white"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,.78), rgba(0,0,0,0))" }}
      >
        {defi.faits}/{defi.objectif}
      </span>
    </div>
  );
}

function Avatar({ personne, taille = 44 }: { personne?: Personne; taille?: number }) {
  const s = { width: taille, height: taille };
  if (personne?.avatar) {
    return (
      <Image src={personne.avatar} alt="" width={taille} height={taille}
        className="shrink-0 rounded-full object-cover" style={s} unoptimized />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ ...s, fontSize: taille * 0.36, background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
    >
      {(personne?.pseudo ?? "?").charAt(0).toUpperCase()}
    </div>
  );
}

/* ─── État vide ──────────────────────────────────────────────
   L'écran que verront presque tous les nouveaux. Il ne s'excuse
   pas d'être vide : il propose les deux seules choses qu'on
   puisse faire ici. */
function Vide({ onRelais, onDiscussion, occupe }: {
  onRelais: () => void; onDiscussion: () => void; occupe: boolean;
}) {
  return (
    <div className="flex flex-col items-center px-8 pt-6 text-center">
      <div className="relative w-[128px] overflow-hidden rounded-2xl shadow-2xl" style={{ aspectRatio: "9 / 16" }}>
        <Image src={imageEtat("sillage", 1)} alt="" fill sizes="128px" className="object-cover" priority />
      </div>

      <h2 className="mt-6 text-[20px] font-bold" style={{ color: "var(--text-0)" }}>
        Cette affiche est vide.
      </h2>
      <p className="mt-2 max-w-[300px] text-[14.5px] leading-relaxed" style={{ color: "var(--text-body)" }}>
        Elle se dévoile à deux, une séance à la fois. Invite quelqu&apos;un : la
        conversation se crée toute seule.
      </p>

      <button
        onClick={onRelais}
        disabled={occupe}
        className="mt-6 flex w-full max-w-[320px] items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[16px] font-semibold text-white transition-transform active:scale-[.98] disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
      >
        {occupe ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Lancer un relais
      </button>

      <button
        onClick={onDiscussion}
        className="mt-3 flex w-full max-w-[320px] items-center justify-center gap-2 rounded-2xl border px-5 py-3.5 text-[15px] font-medium"
        style={{ borderColor: "rgba(var(--text-3-rgb), .3)", color: "var(--text-1)" }}
      >
        <PenLine className="h-4 w-4" />
        Écrire à quelqu&apos;un
      </button>
    </div>
  );
}

/* ─── Bottom sheet ───────────────────────────────────────────── */
function Sheet({ children, onFermer }: { children: React.ReactNode; onFermer: () => void }) {
  return (
    <>
      <motion.div
        className="fixed inset-0 z-[90] bg-black/45"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onFermer}
      />
      <motion.div
        className="fixed inset-x-0 bottom-0 z-[91] rounded-t-[26px] px-5 pt-5"
        style={{
          background: "rgb(var(--surface-rgb))",
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
        }}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "rgba(var(--text-3-rgb), .35)" }} />
        {children}
      </motion.div>
    </>
  );
}

/* ─── Nouvelle discussion ───────────────────────────────────── */
function NouvelleDiscussion({ moi, onFermer, onCree }: {
  moi: string; onFermer: () => void; onCree: (id: string) => void;
}) {
  const [gens, setGens]       = useState<Personne[]>([]);
  const [charge, setCharge]   = useState(true);
  const [choisis, setChoisis] = useState<string[]>([]);
  const [nom, setNom]         = useState("");
  const [occupe, setOccupe]   = useState(false);
  const [erreur, setErreur]   = useState<string | null>(null);

  useEffect(() => {
    void mesRelations(moi).then((g) => { setGens(g); setCharge(false); });
  }, [moi]);

  const basculer = (id: string) =>
    setChoisis((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const creer = async () => {
    if (!choisis.length) return;
    setOccupe(true);
    setErreur(null);
    const r = await creerConversation(choisis, choisis.length > 1 ? nom : undefined);
    setOccupe(false);
    if (r.ok && r.conversation_id) { onCree(r.conversation_id); return; }
    setErreur(
      /function|does not exist|schema cache/i.test(String(r.raison ?? ""))
        ? "La messagerie n'est pas encore activée côté serveur."
        : "Impossible de créer la discussion.",
    );
  };

  return (
    <Sheet onFermer={onFermer}>
      <div className="mb-3 flex items-center justify-between">
        <b className="text-[17px] font-bold" style={{ color: "var(--text-0)" }}>Nouvelle discussion</b>
        <button onClick={onFermer} aria-label="Fermer"><X className="h-5 w-5" style={{ color: "var(--text-3)" }} /></button>
      </div>

      {choisis.length > 1 && (
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Nom du groupe (facultatif)"
          className="mb-3 w-full rounded-xl border px-4 py-3 text-[14.5px] outline-none"
          style={{ borderColor: "rgba(var(--text-3-rgb), .3)", background: "transparent", color: "var(--text-1)" }}
        />
      )}

      <div className="max-h-[42vh] overflow-y-auto">
        {charge ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-3)" }} />
          </div>
        ) : gens.length === 0 ? (
          <p className="py-6 text-center text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            Tu n&apos;as encore personne à qui écrire.<br />
            Lance un relais : le lien d&apos;invitation te trouvera quelqu&apos;un.
          </p>
        ) : (
          gens.map((p) => {
            const pris = choisis.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => basculer(p.id)}
                className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left"
              >
                <Avatar personne={p} taille={38} />
                <span className="flex-1 truncate text-[14.5px] font-medium" style={{ color: "var(--text-1)" }}>
                  {p.pseudo}
                </span>
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: pris ? "#8B5CF6" : "rgba(var(--text-3-rgb), .4)",
                    background: pris ? "#8B5CF6" : "transparent",
                  }}
                >
                  {pris && <Check className="h-3.5 w-3.5 text-white" />}
                </span>
              </button>
            );
          })
        )}
      </div>

      {erreur && <p className="mt-3 text-center text-[13.5px]" style={{ color: "#E8620C" }}>{erreur}</p>}

      <button
        onClick={creer}
        disabled={!choisis.length || occupe}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[16px] font-semibold text-white disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
      >
        {occupe ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        {choisis.length > 1 ? `Créer le groupe (${choisis.length})` : "Ouvrir la discussion"}
      </button>
    </Sheet>
  );
}
