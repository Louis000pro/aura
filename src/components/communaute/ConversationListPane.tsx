"use client";

/* ─────────────────────────────────────────────────────────────
   Communauté — la liste des conversations.

   Il n'y a RIEN d'autre ici : pas de fil d'activité, pas de
   classement, aucune trace de ce que font les autres. Le jour où
   cet onglet montre l'activité d'inconnus, il redevient l'écran
   social vide qu'on a supprimé le 20 juillet.
   ───────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence } from "framer-motion";
import {
  Plus, Loader2, PenLine, Check, X, Search, MoreHorizontal,
  Pin, Volume2, VolumeX, Archive, ArchiveRestore, UserPlus,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import ConversationAvatar, { PersonAvatar } from "@/components/communaute/ConversationAvatar";
import Sheet from "@/components/communaute/Sheet";
import AvecQui from "@/components/communaute/AvecQui";
import FriendshipSheets, { type VueAmis } from "@/components/communaute/FriendshipSheets";
import { PseudoRang } from "@/components/rang/IdentiteRang";
import { useRangs } from "@/lib/rangsPublics";
import { createClient } from "@/lib/supabase";
import { imageEtat } from "@/lib/defi";
import {
  chargerConversations, titreConversation, autresMembres, mesRelations,
  creerConversation, reglerConversation, heureCourte, prechargerFil,
  type Conversation, type Personne,
} from "@/lib/messagerie";

export default function ConversationListPane({
  activeId,
  className = "",
}: {
  activeId?: string;
  className?: string;
}) {
  const { user, session, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [convs, setConvs]     = useState<Conversation[]>([]);
  const [charge, setCharge]   = useState(true);
  const [sheet, setSheet]     = useState<"non" | "choix" | "avecqui" | "nouvelle" | "actions">("non");
  const [occupe, setOccupe]   = useState(false);
  const [erreur, setErreur]   = useState<string | null>(null);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [voirArchives, setVoirArchives] = useState(false);
  const [selection, setSelection] = useState<Conversation | null>(null);
  const [vueAmis, setVueAmis] = useState<VueAmis>(null);
  const [nombreDemandes, setNombreDemandes] = useState(0);
  const [pseudoInvite, setPseudoInvite] = useState("");

  const recharger = useCallback(async () => {
    if (!user) return;
    try {
      const prochaines = await chargerConversations(user.id);
      setErreurChargement(null);
      setConvs(prochaines);
    } catch {
      setErreurChargement("Impossible d’actualiser tes discussions.");
    } finally {
      setCharge(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const destination = `${window.location.pathname}${window.location.search}`;
      router.replace(`/auth?next=${encodeURIComponent(destination)}`);
      return;
    }
    let actif = true;
    void chargerConversations(user.id)
      .then((prochaines) => {
        if (!actif) return;
        setErreurChargement(null);
        setConvs(prochaines);
      })
      .catch(() => {
        if (actif) setErreurChargement("Impossible d’actualiser tes discussions.");
      })
      .finally(() => {
        if (actif) setCharge(false);
      });
    return () => { actif = false; };
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    let minuterie: number | null = null;
    const actualiserBientot = () => {
      if (minuterie) window.clearTimeout(minuterie);
      minuterie = window.setTimeout(() => { void recharger(); }, 180);
    };

    const canal = supabase
      .channel(`liste-conversations:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        actualiserBientot,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_members", filter: `user_id=eq.${user.id}` },
        actualiserBientot,
      )
      .subscribe();

    const surVisibilite = () => {
      if (document.visibilityState === "visible") void recharger();
    };
    document.addEventListener("visibilitychange", surVisibilite);

    return () => {
      if (minuterie) window.clearTimeout(minuterie);
      document.removeEventListener("visibilitychange", surVisibilite);
      void supabase.removeChannel(canal);
    };
  }, [user, recharger]);

  useEffect(() => {
    const minuterie = window.setTimeout(() => {
      // Les deux fils les plus récents couvrent l'usage courant sans lancer
      // une rafale de requêtes et de signatures photo sur toute la liste.
      for (const conversation of convs.slice(0, 2)) {
        void prechargerFil(conversation.id).catch(() => {});
        router.prefetch(`/communaute/${conversation.id}`);
      }
    }, 250);
    return () => window.clearTimeout(minuterie);
  }, [convs, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pseudo = params.get("ajouter")?.trim() ?? "";
    const ouvrirDemandes = params.get("amis") === "demandes";
    if (!pseudo && !ouvrirDemandes) return;

    const minuterie = window.setTimeout(() => {
      if (pseudo) {
        setPseudoInvite(pseudo);
        setVueAmis("ajouter");
      } else {
        setVueAmis("demandes");
      }
    }, 0);
    window.history.replaceState(null, "", window.location.pathname);
    return () => window.clearTimeout(minuterie);
  }, []);

  /* ── Le relais commence par une PERSONNE ──
     Avant, « Lancer un relais » créait un run, une conversation vide et
     t'y déposait : elle s'appelait « Moi », et le lien qu'il fallait
     envoyer vivait ailleurs. La feuille « Avec qui ? » remplace ce
     bouton. Le lien devient une option parmi tes amis, pas le
     comportement par défaut. */
  const ouvrirAvecQui = () => { setErreur(null); setSheet("avecqui"); };

  const agirSurConversation = async (
    conversation: Conversation,
    reglage: "epinglee" | "sourde" | "archivee",
    active: boolean,
  ) => {
    if (!user) return;
    setOccupe(true);
    setErreur(null);
    const r = await reglerConversation(conversation.id, user.id, reglage, active);
    setOccupe(false);
    if (!r.ok) {
      setErreur(
        /pinned_at|muted|archived_at|schema cache|column/i.test(String(r.raison ?? ""))
          ? "Les réglages de discussion ne sont pas encore activés côté serveur."
          : "Impossible de modifier cette discussion.",
      );
      return;
    }
    setConvs((actuelles) => actuelles
      .map((c) => c.id === conversation.id
        ? {
            ...c,
            epinglee: reglage === "epinglee" ? active : c.epinglee,
            sourde: reglage === "sourde" ? active : c.sourde,
            archivee: reglage === "archivee" ? active : c.archivee,
          }
        : c)
      .sort((a, b) => a.epinglee === b.epinglee
        ? new Date(b.majLe).getTime() - new Date(a.majLe).getTime()
        : a.epinglee ? -1 : 1));
    setSheet("non");
    setSelection(null);
    if (reglage === "archivee" && !active) setVoirArchives(false);
    if (reglage === "archivee" && active && activeId === conversation.id) {
      router.push("/communaute");
    }
  };

  const normaliser = (valeur: string) => valeur
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const terme = normaliser(recherche.trim());
  const nombreArchives = convs.filter((c) => c.archivee).length;
  const archivesActives = voirArchives && nombreArchives > 0;
  const convsVisibles = convs.filter((c) => {
    if (c.archivee !== archivesActives) return false;
    if (!terme) return true;
    const texte = `${titreConversation(c, user!.id)} ${c.dernier?.contenu ?? ""}`;
    return normaliser(texte).includes(terme);
  });

  if (authLoading || charge) {
    return (
      <section
        className={`flex min-h-screen items-center justify-center md:h-[100dvh] md:min-h-0 ${className}`}
        style={{ background: "rgb(var(--bg-rgb))" }}
      >
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-3)" }} />
      </section>
    );
  }

  return (
    <section
      className={`flex min-h-screen flex-col md:h-[100dvh] md:min-h-0 ${className}`}
      style={{ background: "rgb(var(--bg-rgb))" }}
    >
      {/* ─── Barre du haut ─── */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        {/* Mon avatar = le seul chemin vers mon profil dans toute l'app :
            le raccourci flottant qui traînait sur chaque page a été retiré. */}
        <button onClick={() => router.push("/profil")} aria-label="Mon profil"
          data-tour-anchor="nav-profil" className="relative shrink-0">
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

        <h1 className="flex-1 text-2xl font-extralight tracking-tight" style={{ color: "var(--text-1)" }}>
          <em className="not-italic font-light" style={{
            background: "linear-gradient(135deg,var(--accent),var(--gold))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            fontStyle: "italic",
            display: "inline-block", paddingRight: "0.14em",
          }}>Communauté</em>
        </h1>

        {/* La cloche vit ICI sur mobile : cet écran a sa propre barre du
            haut, donc la cloche flottante globale s'y poserait par-dessus
            le « + ». Sur desktop c'est la sidebar qui la porte. */}
        <div className="md:hidden">
          <NotificationBell side="top" />
        </div>

        <button
          onClick={() => { setPseudoInvite(""); setVueAmis("ajouter"); }}
          aria-label="Ajouter un ami"
          className="relative flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: "rgba(var(--tint-violet-rgb), .52)", color: "var(--accent)" }}
        >
          <UserPlus className="h-4.5 w-4.5" />
          {nombreDemandes > 0 && (
            <span
              className="absolute -right-1 -top-1 flex min-w-4.5 items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
            >
              {nombreDemandes > 9 ? "9+" : nombreDemandes}
            </span>
          )}
        </button>

        <button
          onClick={() => setSheet("choix")}
          aria-label="Nouvelle discussion"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {convs.length > 0 && (
        <div className="px-4 pb-3">
          <label
            className="flex items-center gap-2 rounded-xl border px-3 py-2.5"
            style={{
              borderColor: "rgba(var(--text-3-rgb), .18)",
              background: "rgb(var(--surface-rgb))",
            }}
          >
            <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-3)" }} />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher une discussion"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-[var(--text-3)]"
              style={{ color: "var(--text-1)" }}
            />
            {recherche && (
              <button type="button" onClick={() => setRecherche("")} aria-label="Effacer la recherche">
                <X className="h-3.5 w-3.5" style={{ color: "var(--text-3)" }} />
              </button>
            )}
          </label>

          {nombreArchives > 0 && (
            <div className="mt-2 flex gap-1 rounded-xl p-1" style={{ background: "rgba(var(--text-3-rgb), .08)" }}>
              <button
                onClick={() => setVoirArchives(false)}
                className="flex-1 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors"
                style={{
                  color: archivesActives ? "var(--text-3)" : "var(--text-0)",
                  background: archivesActives ? "transparent" : "rgb(var(--surface-rgb))",
                }}
              >
                Discussions
              </button>
              <button
                onClick={() => setVoirArchives(true)}
                className="flex-1 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors"
                style={{
                  color: archivesActives ? "var(--text-0)" : "var(--text-3)",
                  background: archivesActives ? "rgb(var(--surface-rgb))" : "transparent",
                }}
              >
                Archives · {nombreArchives}
              </button>
            </div>
          )}
        </div>
      )}

      {erreur && (
        <p className="px-4 pb-2 text-[13.5px] font-medium" style={{ color: "#E8620C" }}>{erreur}</p>
      )}

      {erreurChargement && (
        <div className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
          style={{ background: "rgba(232,98,12,.1)", color: "#E8620C" }}>
          <p className="text-[12.5px] font-medium">{erreurChargement}</p>
          <button onClick={() => void recharger()} className="shrink-0 text-[12px] font-bold">
            Réessayer
          </button>
        </div>
      )}

      {convs.length === 0
        ? <Vide onRelais={ouvrirAvecQui} onDiscussion={() => setSheet("nouvelle")} occupe={occupe} />
        : convsVisibles.length === 0
        ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 pb-16 text-center">
            <Search className="h-6 w-6" style={{ color: "var(--text-3)" }} />
            <p className="mt-3 text-[14px] font-medium" style={{ color: "var(--text-2)" }}>
              {recherche ? "Aucune discussion trouvée." : "Aucune discussion archivée."}
            </p>
          </div>
        )
        : <Liste
            convs={convsVisibles}
            moi={user!.id}
            activeId={activeId}
            onPrefetch={(id) => {
              router.prefetch(`/communaute/${id}`);
              void prechargerFil(id).catch(() => {});
            }}
            onActions={(conversation) => {
              setSelection(conversation);
              setSheet("actions");
            }}
          />}

      <AnimatePresence>
        {sheet === "actions" && selection && (
          <Sheet onFermer={() => { setSheet("non"); setSelection(null); }}>
            <div className="mb-3 px-1">
              <b className="block truncate text-[16px]" style={{ color: "var(--text-0)" }}>
                {titreConversation(selection, user!.id)}
              </b>
              <span className="text-[12px]" style={{ color: "var(--text-3)" }}>
                Ces réglages ne concernent que toi.
              </span>
            </div>

            <button
              disabled={occupe}
              onClick={() => void agirSurConversation(selection, "epinglee", !selection.epinglee)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left disabled:opacity-50"
              style={{ color: "var(--text-1)" }}
            >
              <Pin className="h-4.5 w-4.5" />
              <span className="text-[14.5px] font-medium">
                {selection.epinglee ? "Désépingler" : "Épingler"}
              </span>
            </button>
            <button
              disabled={occupe}
              onClick={() => void agirSurConversation(selection, "sourde", !selection.sourde)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left disabled:opacity-50"
              style={{ color: "var(--text-1)" }}
            >
              {selection.sourde
                ? <Volume2 className="h-4.5 w-4.5" />
                : <VolumeX className="h-4.5 w-4.5" />}
              <span className="text-[14.5px] font-medium">
                {selection.sourde ? "Réactiver les notifications" : "Mettre en sourdine"}
              </span>
            </button>
            <button
              disabled={occupe}
              onClick={() => void agirSurConversation(selection, "archivee", !selection.archivee)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left disabled:opacity-50"
              style={{ color: "var(--text-1)" }}
            >
              {selection.archivee
                ? <ArchiveRestore className="h-4.5 w-4.5" />
                : <Archive className="h-4.5 w-4.5" />}
              <span className="text-[14.5px] font-medium">
                {selection.archivee ? "Sortir des archives" : "Archiver"}
              </span>
            </button>
          </Sheet>
        )}

        {sheet === "choix" && (
          <Sheet onFermer={() => setSheet("non")}>
            <button
              onClick={ouvrirAvecQui}
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

        {sheet === "avecqui" && user && (
          <AvecQui
            moi={user.id}
            onFermer={() => setSheet("non")}
            onFil={(id) => {
              setSheet("non");
              void recharger();
              void prechargerFil(id).catch(() => {});
              router.push(`/communaute/${id}`);
            }}
            onLien={() => { setSheet("non"); router.push("/defi"); }}
          />
        )}

        {sheet === "nouvelle" && user && (
          <NouvelleDiscussion
            moi={user.id}
            onFermer={() => setSheet("non")}
            onCree={(id) => { setSheet("non"); router.push(`/communaute/${id}`); }}
          />
        )}
      </AnimatePresence>

      {user && (
        <FriendshipSheets
          vue={vueAmis}
          moi={user.id}
          monPseudo={user.pseudo}
          accessToken={session?.access_token}
          pseudoInitial={pseudoInvite}
          onFermer={() => setVueAmis(null)}
          onVue={setVueAmis}
          onNombreDemandes={setNombreDemandes}
          onConversation={(id) => {
            setVueAmis(null);
            void recharger();
            void prechargerFil(id).catch(() => {});
            router.push(`/communaute/${id}`);
          }}
        />
      )}
    </section>
  );
}

/* ─── Liste ──────────────────────────────────────────────────── */
function Liste({ convs, moi, activeId, onPrefetch, onActions }: {
  convs: Conversation[];
  moi: string;
  activeId?: string;
  onPrefetch: (id: string) => void;
  onActions: (conversation: Conversation) => void;
}) {
  // Le rang ne s'affiche qu'en duo : un groupe n'a pas UN rang à montrer.
  const idsDuo = useMemo(
    () => convs.filter((c) => c.type === "duo").map((c) => autresMembres(c, moi)[0]?.id).filter(Boolean) as string[],
    [convs, moi],
  );
  const rangs = useRangs(idsDuo);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-4">
      {convs.map((c) => {
        const titre  = titreConversation(c, moi);
        const autres = autresMembres(c, moi);
        const rang   = c.type === "duo" ? rangs.get(autres[0]?.id ?? "") : undefined;
        // Un fil ouvert par une amitié mutuelle n'a aucun message :
        // il ne dit pas « vide », il dit quoi en faire.
        const apercu =
          c.dernier == null                 ? "Dis-lui bonjour 👋"
        : c.dernier.type === "systeme"      ? c.dernier.contenu
        : c.dernier.type === "image"         ? c.dernier.userId === moi ? "Toi : 📷 Photo" : "📷 Photo"
        : c.dernier.userId === moi          ? `Toi : ${c.dernier.contenu}`
        : c.type === "groupe"               ? `${c.membres.find((m) => m.id === c.dernier!.userId)?.pseudo ?? "…"} : ${c.dernier.contenu}`
        :                                     c.dernier.contenu;

        return (
          <div
            key={c.id}
            className="group flex w-full items-center text-left transition-colors hover:bg-[rgba(var(--tint-violet-rgb),.42)]"
            style={{
              background: activeId === c.id
                ? "rgba(var(--tint-violet-rgb),.58)"
                : c.nonLus > 0
                ? "rgba(var(--tint-violet-rgb),.18)"
                : "transparent",
              borderBottom: "1px solid rgba(var(--text-3-rgb), .10)",
            }}
          >
            <Link
              href={`/communaute/${c.id}`}
              scroll={false}
              onPointerEnter={() => onPrefetch(c.id)}
              onPointerDown={() => onPrefetch(c.id)}
              onFocus={() => onPrefetch(c.id)}
              className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left active:bg-[rgba(var(--tint-violet-rgb),.6)]"
            >
              <ConversationAvatar conversation={c} autres={autres} titre={titre} rang={rang} />

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  {rang ? (
                    <PseudoRang
                      rang={rang.rang}
                      cosmetiques={rang.cosmetiques}
                      pseudo={titre}
                      classNameEnveloppe="flex min-w-0 items-center gap-1.5"
                      className="block min-w-0 truncate text-[14.5px]"
                      style={{ color: "var(--text-0)", fontWeight: c.nonLus > 0 ? 750 : 600 }}
                      tailleGemme={14}
                    />
                  ) : (
                    <b
                      className="block min-w-0 truncate text-[14.5px]"
                      style={{ color: "var(--text-0)", fontWeight: c.nonLus > 0 ? 750 : 600 }}
                    >
                      {titre}
                    </b>
                  )}
                  {c.epinglee && <Pin className="h-3 w-3 shrink-0" style={{ color: "var(--text-3)" }} />}
                  {c.sourde && <VolumeX className="h-3 w-3 shrink-0" style={{ color: "var(--text-3)" }} />}
                </div>
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
                  <span
                    className="flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
                  >
                    {c.nonLus > 99 ? "99+" : c.nonLus}
                  </span>
                )}
              </div>
            </Link>
            <button
              onClick={() => onActions(c)}
              aria-label={`Options de ${titre}`}
              className="mr-2 flex h-9 w-8 shrink-0 items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100"
              style={{ color: "var(--text-3)" }}
            >
              <MoreHorizontal className="h-4.5 w-4.5" />
            </button>
          </div>
        );
      })}
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
        Elle se dévoile à deux, une séance à la fois. Choisis avec qui : le
        relais démarre dans votre discussion.
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
  const rangs = useRangs(useMemo(() => gens.map((g) => g.id), [gens]));

  useEffect(() => {
    void mesRelations(moi)
      .then((g) => setGens(g))
      .catch(() => setErreur("Impossible de charger tes contacts."))
      .finally(() => setCharge(false));
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
        ? "La messagerie n’est pas encore activée côté serveur."
        : r.raison === "groupe_complet"
        ? "Un groupe peut réunir cinq personnes maximum."
        : r.raison === "relation_requise"
        ? "Tu peux écrire uniquement aux personnes déjà liées à ton compte."
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
            const rang = rangs.get(p.id);
            return (
              <button
                key={p.id}
                onClick={() => basculer(p.id)}
                className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left"
              >
                <PersonAvatar personne={p} taille={38} rang={rang} />
                {rang ? (
                  <PseudoRang
                    rang={rang.rang}
                    cosmetiques={rang.cosmetiques}
                    pseudo={p.pseudo}
                    classNameEnveloppe="flex min-w-0 flex-1 items-center gap-1.5"
                    className="truncate text-[14.5px] font-medium"
                    style={{ color: "var(--text-1)" }}
                    tailleGemme={14}
                  />
                ) : (
                  <span className="flex-1 truncate text-[14.5px] font-medium" style={{ color: "var(--text-1)" }}>
                    {p.pseudo}
                  </span>
                )}
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
