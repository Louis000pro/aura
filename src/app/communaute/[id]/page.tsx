"use client";

/* ─────────────────────────────────────────────────────────────
   Le fil d'une conversation.

   Quand la conversation porte un relais, elle se déroule DANS
   son affiche : le fond est l'état courant, flouté et assombri,
   et il s'éclaircit d'un cran à chaque maillon franchi. La
   conversation devient la jauge, sans afficher un chiffre.

   Le défi est épinglé en haut : c'est l'objet que les deux
   personnes partagent, et le fil est l'endroit où on se relance.
   Les maillons franchis s'écrivent dans la conversation, en
   lignes système.
   ───────────────────────────────────────────────────────────── */

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Loader2, ChevronRight, ChevronUp, Sparkles, Reply, Copy, Trash2, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { lockBodyModal } from "@/lib/bodyModal";
import { imageEtat, etatPoster, lancerRelaisDansConversation } from "@/lib/defi";
import {
  chargerFil, chargerMessagesAvant, envoyerMessage, marquerLu, titreConversation, autresMembres,
  reagir, supprimerMessage, heureExacte, memeJour, libelleJour,
  type Conversation, type Message,
} from "@/lib/messagerie";

/** Les réactions proposées à l'appui long. Cinq, pas plus : au-delà
 *  on choisit au lieu de réagir. */
const EMOJIS = ["🔥", "💪", "👏", "😂", "❤️"];

export default function FilPage() {
  const params = useParams<{ id: string }>();
  const convId = (params?.id ?? "").toString();
  const router = useRouter();
  const { user, session, isLoading: authLoading } = useAuth();

  const [conv, setConv]         = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [charge, setCharge]     = useState(true);
  const [chargeAvant, setChargeAvant] = useState(false);
  const [encoreAvant, setEncoreAvant] = useState(false);
  const [texte, setTexte]       = useState("");
  const [envoi, setEnvoi]       = useState(false);
  const [repondA, setRepondA]   = useState<Message | null>(null);
  const [menu, setMenu]         = useState<Message | null>(null);
  const [ecrivent, setEcrivent] = useState<string[]>([]);
  const [occupe, setOccupe]     = useState(false);
  const [erreur, setErreur]     = useState<string | null>(null);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

  const listeRef = useRef<HTMLDivElement>(null);
  const basRef   = useRef<HTMLDivElement>(null);
  const canalRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const dernierSignal = useRef(0);
  const hauteurAvant = useRef<number | null>(null);
  const ignorerAutoScroll = useRef(false);

  // La barre du bas laisse la place au fil, comme dans le tunnel.
  useEffect(() => lockBodyModal(), []);

  const recharger = useCallback(async () => {
    try {
      setErreurChargement(null);
      const { conversation, messages: m, encoreAvant: encore } = await chargerFil(convId);
      setConv(conversation);
      setMessages(m);
      setEncoreAvant(encore);
    } catch {
      setErreurChargement("Impossible de charger cette conversation.");
    } finally {
      setCharge(false);
    }
  }, [convId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth"); return; }
    void recharger();
  }, [authLoading, user, router, recharger]);

  /* Temps réel : messages, réactions, et « en train d'écrire ».
     Les deux premiers passent par la base, le troisième par un
     simple broadcast — un état aussi éphémère n'a rien à faire
     dans une table. */
  useEffect(() => {
    if (!convId || !user) return;
    const supabase = createClient();
    const canal = supabase
      .channel(`conv:${convId}`, { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
        (payload) => {
          const m = payload.new as Record<string, unknown>;
          setEcrivent((p) => p.filter((x) => x !== (m.user_id as string)));
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [...prev, {
                  id: m.id as string,
                  userId: (m.user_id as string | null) ?? null,
                  contenu: m.contenu as string,
                  type: m.type as "texte" | "systeme",
                  createdAt: m.created_at as string,
                  repondA: (m.repond_a as string | null) ?? null,
                  reactions: [],
                }],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => { void recharger(); },
      )
      .on("broadcast", { event: "ecrit" }, ({ payload }) => {
        const id = (payload as { id?: string })?.id;
        if (!id || id === user.id) return;
        setEcrivent((p) => (p.includes(id) ? p : [...p, id]));
        window.setTimeout(() => setEcrivent((p) => p.filter((x) => x !== id)), 3200);
      })
      .subscribe();

    canalRef.current = canal;
    return () => { canalRef.current = null; void supabase.removeChannel(canal); };
  }, [convId, user, recharger]);

  /* Lu dès qu'on est dedans. */
  useEffect(() => {
    if (!user || !convId || charge) return;
    void marquerLu(convId, user.id);
  }, [user, convId, charge, messages.length]);

  useLayoutEffect(() => {
    if (hauteurAvant.current == null || !listeRef.current) return;
    listeRef.current.scrollTop = listeRef.current.scrollHeight - hauteurAvant.current;
    hauteurAvant.current = null;
    ignorerAutoScroll.current = true;
  }, [messages.length]);

  useEffect(() => {
    if (ignorerAutoScroll.current) {
      ignorerAutoScroll.current = false;
      return;
    }
    basRef.current?.scrollIntoView({ behavior: charge ? "auto" : "smooth" });
  }, [messages.length, charge, ecrivent.length]);

  const chargerAvant = async () => {
    const premier = messages[0];
    if (!premier || chargeAvant || !encoreAvant) return;

    setChargeAvant(true);
    setErreur(null);
    hauteurAvant.current = listeRef.current?.scrollHeight ?? null;
    try {
      const page = await chargerMessagesAvant(convId, premier.createdAt);
      setMessages((actuels) => [
        ...page.messages.filter((m) => !actuels.some((a) => a.id === m.id)),
        ...actuels,
      ]);
      setEncoreAvant(page.encoreAvant);
    } catch {
      hauteurAvant.current = null;
      setErreur("Les messages précédents n'ont pas pu être chargés.");
    } finally {
      setChargeAvant(false);
    }
  };

  /* On signale qu'on écrit au plus une fois toutes les 2 s. */
  const signalerFrappe = () => {
    const t = Date.now();
    if (!user || !canalRef.current || t - dernierSignal.current < 2000) return;
    dernierSignal.current = t;
    void canalRef.current.send({ type: "broadcast", event: "ecrit", payload: { id: user.id } });
  };

  /** Envoi d'un contenu déjà décidé (le « Salut l'ami ! » d'ouverture). */
  const envoyerTexte = async (contenu: string) => {
    if (!user || envoi) return;
    setEnvoi(true);
    const r = await envoyerMessage(convId, user.id, contenu, null, session?.access_token);
    setEnvoi(false);
    if (r.ok) {
      setErreur(null);
      void recharger();
    } else {
      setErreur("Le message n'est pas parti. Réessaie.");
    }
  };

  const envoyer = async () => {
    if (!user || !texte.trim() || envoi) return;
    const contenu = texte.trim();
    const cite = repondA?.id ?? null;
    setTexte("");
    setRepondA(null);
    setEnvoi(true);
    const r = await envoyerMessage(convId, user.id, contenu, cite, session?.access_token);
    setEnvoi(false);
    if (!r.ok) {
      setTexte(contenu);
      setRepondA(cite ? messages.find((m) => m.id === cite) ?? null : null);
      setErreur("Le message n'est pas parti. Ton texte est resté ici.");
      return;
    }
    setErreur(null);
    void recharger();
  };

  const surEtincelle = async () => {
    if (!conv) return;
    if (conv.defi) { router.push("/defi"); return; }

    setOccupe(true);
    setErreur(null);
    const r = await lancerRelaisDansConversation(convId);
    setOccupe(false);
    if (r.ok) { void recharger(); return; }

    const raison = String(r.raison ?? "");
    setErreur(
      /function|does not exist|schema cache|404/i.test(raison) ? "Le relais n'est pas encore activé côté serveur."
      : raison === "pas_un_duo"          ? "Le relais se joue à deux. Ouvre une discussion avec une seule personne."
      : raison === "defi_deja_en_cours"  ? "L'un de vous a déjà un relais en cours."
      : raison === "relais_deja_ici"     ? "Il y a déjà un relais dans cette discussion."
      :                                    "Impossible de lancer le relais pour le moment.",
    );
  };

  const surReaction = async (m: Message, emoji: string) => {
    if (!user) return;
    setMenu(null);
    const mienne = m.reactions.find((r) => r.userIds.includes(user.id))?.emoji ?? null;
    const r = await reagir(m.id, user.id, emoji, mienne);
    if (!r.ok) {
      setErreur("La réaction n'a pas pu être ajoutée.");
      return;
    }
    void recharger();
  };

  const surSuppression = async (m: Message) => {
    setMenu(null);
    const r = await supprimerMessage(m.id);
    if (!r.ok) {
      setErreur("Le message n'a pas pu être supprimé.");
      return;
    }
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    setErreur(null);
  };

  if (authLoading || charge) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-3)" }} />
      </div>
    );
  }

  if (erreurChargement) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-[15px]" style={{ color: "var(--text-body)" }}>{erreurChargement}</p>
        <button
          onClick={() => { setCharge(true); void recharger(); }}
          className="rounded-2xl px-5 py-3 text-[15px] font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
        >
          Réessayer
        </button>
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

  /* Sur une affiche, le fil assume le sombre en permanence — comme
     le tunnel de séance. Sans affiche, il suit les tokens du thème. */
  const surAffiche = !!conv.defi;
  const etat = conv.defi ? etatPoster(conv.defi.faits, conv.defi.objectif) : 0;

  const c = surAffiche
    ? { t0: "#F4F1F9", t1: "#DCD6E6", t2: "#A79FB6", t3: "#807891",
        carte: "rgba(255,255,255,.10)", trait: "rgba(255,255,255,.15)" }
    : { t0: "var(--text-0)", t1: "var(--text-1)", t2: "var(--text-2)", t3: "var(--text-3)",
        carte: "rgb(var(--surface-rgb))", trait: "rgba(var(--text-3-rgb), .18)" };

  /* Le « Vu » ne se pose que sous MON dernier message, et seulement
     si tout le monde l'a lu. */
  const monDernier = [...messages].reverse().find((m) => m.userId === moi && m.type === "texte");
  const vu = !!monDernier && autres.length > 0
    && autres.every((p) => !!p.luA && p.luA >= monDernier.createdAt);

  return (
    <div className="relative flex h-[100dvh] flex-col">
      {/* ─── Le fond : l'affiche à son état courant ─── */}
      {surAffiche && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <Image
            key={etat}
            src={imageEtat(conv.defi!.serie, etat)}
            alt=""
            fill
            sizes="100vw"
            priority
            className="scale-125 object-cover"
            style={{ filter: "blur(22px) saturate(1.15)" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,7,16,.82), rgba(10,7,16,.64) 38%, rgba(10,7,16,.88))",
            }}
          />
        </div>
      )}

      {/* ─── En-tête ─── */}
      <div
        className="relative z-10 flex shrink-0 items-center gap-2.5 px-3 py-3"
        style={{
          borderBottom: surAffiche ? "none" : `1px solid ${c.trait}`,
          paddingTop: "max(.75rem, env(safe-area-inset-top))",
        }}
      >
        <button onClick={() => router.push("/communaute")} aria-label="Retour" className="p-1">
          <ArrowLeft className="h-5 w-5" style={{ color: c.t0 }} />
        </button>

        <button
          onClick={() => router.push(`/communaute/${convId}/infos`)}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <Vignette conv={conv} autres={autres} titre={titre} taille={32} />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[15px] font-semibold" style={{ color: c.t0 }}>{titre}</b>
            <span className="block truncate text-[11.5px]" style={{ color: c.t2 }}>
              {conv.type === "groupe"
                ? `${autres.map((p) => p.pseudo).join(", ")}, toi`
                : "Touche pour les infos"}
            </span>
          </span>
        </button>
      </div>

      {/* ─── Le défi épinglé ─── */}
      {conv.defi && <DefiEpingle defi={conv.defi} etat={etat} onOuvrir={() => router.push("/defi")} />}

      {erreur && (
        <p className="relative z-10 px-4 pb-1 text-center text-[12.5px] font-medium" style={{ color: "#FFB27A" }}>
          {erreur}
        </p>
      )}

      {/* ─── Les messages ─── */}
      <div ref={listeRef} className="relative z-10 flex-1 overflow-y-auto px-3 py-2">
        {encoreAvant && (
          <div className="flex justify-center pb-2 pt-1">
            <button
              onClick={() => void chargerAvant()}
              disabled={chargeAvant}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold disabled:opacity-60"
              style={{ background: c.carte, border: `1px solid ${c.trait}`, color: c.t2 }}
            >
              {chargeAvant
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <ChevronUp className="h-3.5 w-3.5" />}
              Messages précédents
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="mt-8 flex flex-col items-center px-6 text-center">
            <p className="text-[13.5px] leading-relaxed" style={{ color: c.t3 }}>
              Rien encore.<br />C&apos;est à toi d&apos;ouvrir.
            </p>

            {/* Le premier message est le plus dur à écrire. On en pose
                un tout fait : personne n'a jamais eu honte d'un
                « Salut l'ami ! ». */}
            <button
              onClick={() => void envoyerTexte("Salut l'ami ! 👋")}
              disabled={envoi}
              className="mt-4 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
            >
              Salut l&apos;ami&nbsp;! 👋
            </button>
          </div>
        )}

        <div className="flex flex-col">
          {messages.map((m, i) => {
            const precedent = messages[i - 1];
            const nouveauJour = !precedent || !memeJour(precedent.createdAt, m.createdAt);

            return (
              <div key={m.id}>
                {nouveauJour && (
                  <p
                    className="mx-auto my-3 w-fit rounded-full px-3 py-1 text-[10.5px] font-bold tracking-wide"
                    style={{ background: surAffiche ? "rgba(255,255,255,.09)" : "rgba(var(--text-3-rgb), .12)", color: c.t2 }}
                  >
                    {libelleJour(m.createdAt)}
                  </p>
                )}

                {m.type === "systeme" ? (
                  <LigneSysteme message={m} serie={conv.defi?.serie} etat={etat} couleur={c} />
                ) : (
                  <Bulle
                    message={m}
                    moi={moi}
                    conv={conv}
                    couleur={c}
                    surAffiche={surAffiche}
                    cite={m.repondA ? messages.find((x) => x.id === m.repondA) ?? null : null}
                    onMenu={() => setMenu(m)}
                  />
                )}
              </div>
            );
          })}
        </div>

        {vu && (
          <p className="mr-1.5 mt-0.5 text-right text-[10px]" style={{ color: c.t3 }}>Vu</p>
        )}

        {ecrivent.length > 0 && (
          <EnTrainDEcrire
            noms={ecrivent.map((id) => conv.membres.find((p) => p.id === id)?.pseudo ?? "…")}
            couleur={c}
            surAffiche={surAffiche}
          />
        )}

        <div ref={basRef} />
      </div>

      {/* ─── La réponse en cours ─── */}
      {repondA && (
        <div
          className="relative z-10 mx-3 mb-1 flex items-center gap-2 rounded-t-xl px-3 py-2"
          style={{ background: c.carte, borderLeft: "2.5px solid #D7A62A" }}
        >
          <span className="min-w-0 flex-1">
            <b className="block text-[10.5px] font-bold" style={{ color: "#D7A62A" }}>
              {repondA.userId === moi ? "Toi" : conv.membres.find((p) => p.id === repondA.userId)?.pseudo ?? "…"}
            </b>
            <span className="block truncate text-[12px]" style={{ color: c.t2 }}>{repondA.contenu}</span>
          </span>
          <button onClick={() => setRepondA(null)} aria-label="Annuler la réponse">
            <X className="h-4 w-4" style={{ color: c.t3 }} />
          </button>
        </div>
      )}

      {/* ─── Composer ─── */}
      <div
        className="relative z-10 flex shrink-0 items-end gap-2 px-3 pt-2"
        style={{ paddingBottom: "calc(.75rem + env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={surEtincelle}
          disabled={occupe}
          aria-label={conv.defi ? "Voir l'affiche" : "Lancer un relais"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
          style={{
            background: "rgba(215,166,42,.16)",
            border: "1px solid rgba(215,166,42,.45)",
            color: "#D7A62A",
          }}
        >
          {occupe ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-[18px] w-[18px]" />}
        </button>

        <textarea
          value={texte}
          onChange={(e) => { setTexte(e.target.value); signalerFrappe(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void envoyer(); }
          }}
          rows={1}
          placeholder="Message…"
          className="max-h-28 min-h-[40px] flex-1 resize-none rounded-[20px] border px-4 py-2.5 text-[14px] outline-none"
          style={{ borderColor: c.trait, background: c.carte, color: c.t1 }}
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

      {/* ─── Appui long ─── */}
      <AnimatePresence>
        {menu && user && (
          <MenuMessage
            message={menu}
            moi={moi}
            mienne={menu.reactions.find((r) => r.userIds.includes(moi))?.emoji ?? null}
            onFermer={() => setMenu(null)}
            onReaction={(e) => surReaction(menu, e)}
            onRepondre={() => { setRepondA(menu); setMenu(null); }}
            onCopier={() => { void navigator.clipboard?.writeText(menu.contenu); setMenu(null); }}
            onSupprimer={() => surSuppression(menu)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Une bulle ──────────────────────────────────────────────── */
type Couleurs = { t0: string; t1: string; t2: string; t3: string; carte: string; trait: string };

function Bulle({ message: m, moi, conv, couleur: c, surAffiche, cite, onMenu }: {
  message: Message; moi: string; conv: Conversation; couleur: Couleurs;
  surAffiche: boolean; cite: Message | null; onMenu: () => void;
}) {
  const aMoi = m.userId === moi;
  const auteur = conv.membres.find((x) => x.id === m.userId);

  /* Appui long : 420 ms sans bouger. Un glissement annule, sinon on
     ouvrirait le menu à chaque scroll. */
  const timer = useRef<number | null>(null);
  const debut = useRef<{ x: number; y: number } | null>(null);

  const stop = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null; } };

  return (
    <div className={`flex flex-col ${aMoi ? "items-end" : "items-start"}`}>
      {conv.type === "groupe" && !aMoi && (
        <span className="mb-0.5 ml-3 mt-1.5 text-[10.5px]" style={{ color: c.t3 }}>
          {auteur?.pseudo ?? "…"}
        </span>
      )}

      <div
        onContextMenu={(e) => { e.preventDefault(); onMenu(); }}
        onPointerDown={(e) => {
          debut.current = { x: e.clientX, y: e.clientY };
          timer.current = window.setTimeout(onMenu, 420);
        }}
        onPointerMove={(e) => {
          if (!debut.current) return;
          const d = Math.hypot(e.clientX - debut.current.x, e.clientY - debut.current.y);
          if (d > 8) stop();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        className="max-w-[80%] select-none px-3.5 py-2 text-[13.5px] leading-snug"
        style={
          aMoi
            ? { background: "linear-gradient(135deg, #8B5CF6, #C13BC1)", color: "#fff",
                borderRadius: "16px 16px 5px 16px" }
            : { background: c.carte, color: c.t1, border: `1px solid ${c.trait}`,
                borderRadius: "16px 16px 16px 5px",
                backdropFilter: surAffiche ? "blur(6px)" : undefined }
        }
      >
        {cite && (
          <span
            className="mb-1.5 block border-l-[2.5px] pl-2 opacity-85"
            style={{ borderColor: "#D7A62A" }}
          >
            <b className="block text-[10px] font-bold" style={{ color: aMoi ? "#F5D98A" : "#D7A62A" }}>
              {cite.userId === moi ? "Toi" : conv.membres.find((p) => p.id === cite.userId)?.pseudo ?? "…"}
            </b>
            <span className="block truncate text-[11.5px]">{cite.contenu}</span>
          </span>
        )}
        {m.contenu}
      </div>

      {m.reactions.length > 0 && (
        <div className={`-mt-1.5 flex gap-1 ${aMoi ? "mr-2" : "ml-2"}`}>
          {m.reactions.map((r) => (
            <span
              key={r.emoji}
              className="rounded-xl px-1.5 py-[1px] text-[10.5px]"
              style={{ background: c.carte, border: `1px solid ${c.trait}`, color: c.t1 }}
            >
              {r.emoji}{r.userIds.length > 1 ? ` ${r.userIds.length}` : ""}
            </span>
          ))}
        </div>
      )}

      <span className="mx-1 mt-[3px] text-[9.5px] tabular-nums" style={{ color: c.t3 }}>
        {heureExacte(m.createdAt)}
      </span>
    </div>
  );
}

/* ─── Un maillon franchi ─────────────────────────────────────
   La ligne système montre la vignette qui VIENT de changer :
   on raconte ce qui est arrivé à l'affiche, on ne réclame rien. */
function LigneSysteme({ message, serie, etat, couleur: c }: {
  message: Message; serie?: string; etat: number; couleur: Couleurs;
}) {
  const avecAffiche = !!serie && etat > 0;

  if (!avecAffiche) {
    return (
      <p className="my-2 px-6 text-center text-[11.5px] leading-relaxed" style={{ color: c.t3 }}>
        {message.contenu}
      </p>
    );
  }

  return (
    <div
      className="mx-auto my-3 flex w-fit max-w-[88%] items-center gap-2.5 rounded-2xl py-2 pl-2 pr-3"
      style={{ background: "rgba(215,166,42,.14)", border: "1px solid rgba(215,166,42,.3)" }}
    >
      <div className="relative h-[37px] w-[26px] shrink-0 overflow-hidden rounded-[5px]">
        <Image src={imageEtat(serie!, etat)} alt="" fill sizes="26px" className="object-cover" />
      </div>
      <p className="text-[11.5px] leading-snug" style={{ color: c.t1 }}>{message.contenu}</p>
    </div>
  );
}

function EnTrainDEcrire({ noms, couleur: c, surAffiche }: {
  noms: string[]; couleur: Couleurs; surAffiche: boolean;
}) {
  return (
    <div className="mb-1 mt-2 flex items-center gap-2">
      <span
        className="flex gap-1 px-3 py-2.5"
        style={{
          background: c.carte, border: `1px solid ${c.trait}`,
          borderRadius: "16px 16px 16px 5px",
          backdropFilter: surAffiche ? "blur(6px)" : undefined,
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.i
            key={i}
            className="block h-[5px] w-[5px] rounded-full"
            style={{ background: c.t3 }}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
            transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </span>
      <span className="text-[10.5px]" style={{ color: c.t3 }}>
        {noms.length === 1 ? `${noms[0]} écrit…` : "plusieurs personnes écrivent…"}
      </span>
    </div>
  );
}

/* ─── Vignette d'en-tête ─────────────────────────────────────── */
function Vignette({ conv, autres, titre, taille }: {
  conv: Conversation; autres: Conversation["membres"]; titre: string; taille: number;
}) {
  const src = conv.image ?? (conv.type === "duo" ? autres[0]?.avatar : null);
  const s = { width: taille, height: taille };

  if (src) {
    return (
      <Image src={src} alt="" width={taille} height={taille}
        className="shrink-0 rounded-full object-cover" style={s} unoptimized />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ ...s, fontSize: taille * 0.4, background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
    >
      {titre.charAt(0).toUpperCase()}
    </div>
  );
}

/* ─── L'affiche épinglée ─────────────────────────────────────── */
function DefiEpingle({ defi, etat, onOuvrir }: {
  defi: NonNullable<Conversation["defi"]>; etat: number; onOuvrir: () => void;
}) {
  const gagne = defi.statut === "reussi";

  return (
    <button
      onClick={onOuvrir}
      className="relative z-10 mx-3 mb-1 mt-1 flex shrink-0 items-center gap-3 rounded-2xl p-2.5 text-left"
      style={{
        border: "1px solid rgba(255,255,255,.15)",
        background: "rgba(255,255,255,.08)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="relative h-16 w-[46px] shrink-0 overflow-hidden rounded-[9px] shadow-lg">
        <Image src={imageEtat(defi.serie, etat)} alt="" fill sizes="46px" className="object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <b className="block text-[13.5px] font-semibold" style={{ color: "#F4F1F9" }}>
          {gagne ? "L'affiche est à vous" : `${defi.faits} jour${defi.faits > 1 ? "s" : ""} sur ${defi.objectif}`}
        </b>
        <span className="mt-0.5 block text-[12px]" style={{ color: "#A79FB6" }}>
          {gagne ? "Elle rejoint vos profils." : "Touche pour voir l'affiche en grand."}
        </span>

        <div className="mt-2 flex gap-[3px]">
          {Array.from({ length: defi.objectif }).map((_, i) => (
            <span
              key={i}
              className="h-1 flex-1 rounded-full"
              style={{ background: i < defi.faits ? "#2BD4A0" : "rgba(255,255,255,.22)" }}
            />
          ))}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "#807891" }} />
    </button>
  );
}

/* ─── Le menu d'appui long ───────────────────────────────────── */
function MenuMessage({ message, moi, mienne, onFermer, onReaction, onRepondre, onCopier, onSupprimer }: {
  message: Message; moi: string; mienne: string | null;
  onFermer: () => void; onReaction: (emoji: string) => void;
  onRepondre: () => void; onCopier: () => void; onSupprimer: () => void;
}) {
  const aMoi = message.userId === moi;

  const actions = useMemo(() => [
    { cle: "repondre", libelle: "Répondre",  Icone: Reply, action: onRepondre, danger: false },
    { cle: "copier",   libelle: "Copier",    Icone: Copy,  action: onCopier,   danger: false },
    ...(aMoi
      ? [{ cle: "suppr", libelle: "Supprimer", Icone: Trash2, action: onSupprimer, danger: true }]
      : []),
  ], [aMoi, onRepondre, onCopier, onSupprimer]);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[90] bg-black/50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onFermer}
      />
      <motion.div
        className="fixed inset-x-0 bottom-0 z-[91] rounded-t-[26px] px-4 pt-4"
        style={{
          background: "rgb(var(--surface-rgb))",
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
        }}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "rgba(var(--text-3-rgb), .35)" }} />

        <div className="mb-3 flex justify-between px-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => onReaction(e)}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[22px] transition-transform active:scale-90"
              style={{ background: mienne === e ? "rgba(139,92,246,.22)" : "transparent" }}
            >
              {e}
            </button>
          ))}
        </div>

        {actions.map(({ cle, libelle, Icone, action, danger }) => (
          <button
            key={cle}
            onClick={action}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left text-[15px] font-medium"
            style={{ color: danger ? "#E05A5A" : "var(--text-1)" }}
          >
            <Icone className="h-[18px] w-[18px]" />
            {libelle}
          </button>
        ))}
      </motion.div>
    </>
  );
}
