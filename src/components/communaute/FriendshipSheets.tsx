"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, Check, Copy, Loader2, Search, Share2, UserPlus, Users, X,
} from "lucide-react";
import { PersonAvatar } from "@/components/communaute/ConversationAvatar";
import {
  accepterDemandeAmi, chargerDemandesAmi, creerConversation, demanderAmi,
  ignorerDemandeAmi, rechercherAmiParPseudo,
  type Personne, type ResultatRechercheAmi,
} from "@/lib/messagerie";

export type VueAmis = "ajouter" | "demandes" | null;

type Props = {
  vue: VueAmis;
  moi: string;
  monPseudo: string;
  accessToken?: string;
  pseudoInitial?: string;
  onFermer: () => void;
  onVue: (vue: Exclude<VueAmis, null>) => void;
  onNombreDemandes: (nombre: number) => void;
  onConversation: (id: string) => void;
};

export default function FriendshipSheets({
  vue,
  moi,
  monPseudo,
  accessToken,
  pseudoInitial = "",
  onFermer,
  onVue,
  onNombreDemandes,
  onConversation,
}: Props) {
  const [demandes, setDemandes] = useState<Personne[]>([]);
  const [chargeDemandes, setChargeDemandes] = useState(true);
  const [erreurDemandes, setErreurDemandes] = useState<string | null>(null);

  const rechargerDemandes = useCallback(async () => {
    setChargeDemandes(true);
    try {
      const prochaines = await chargerDemandesAmi(moi);
      setDemandes(prochaines);
      onNombreDemandes(prochaines.length);
      setErreurDemandes(null);
    } catch {
      setErreurDemandes("Impossible de charger tes demandes.");
    } finally {
      setChargeDemandes(false);
    }
  }, [moi, onNombreDemandes]);

  useEffect(() => {
    const minuterie = window.setTimeout(() => {
      void rechargerDemandes();
    }, 0);
    return () => window.clearTimeout(minuterie);
  }, [rechargerDemandes]);

  return (
    <AnimatePresence>
      {vue && (
        <Sheet onFermer={onFermer}>
          {vue === "ajouter" ? (
            <AjouterAmi
              moi={moi}
              monPseudo={monPseudo}
              accessToken={accessToken}
              pseudoInitial={pseudoInitial}
              nombreDemandes={demandes.length}
              onDemandes={() => onVue("demandes")}
              onConversation={onConversation}
              onDemandeEnvoyee={() => void rechargerDemandes()}
              onFermer={onFermer}
            />
          ) : (
            <DemandesAmi
              demandes={demandes}
              charge={chargeDemandes}
              erreur={erreurDemandes}
              onRetour={() => onVue("ajouter")}
              onRecharger={() => void rechargerDemandes()}
              onDemandesChange={(prochaines) => {
                setDemandes(prochaines);
                onNombreDemandes(prochaines.length);
              }}
              onConversation={onConversation}
            />
          )}
        </Sheet>
      )}
    </AnimatePresence>
  );
}

function Sheet({ children, onFermer }: { children: React.ReactNode; onFermer: () => void }) {
  return (
    <>
      <motion.div
        className="fixed inset-0 z-[90] bg-black/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onFermer}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Amis"
        className="fixed inset-x-0 bottom-0 z-[91] max-h-[86dvh] overflow-y-auto rounded-t-[26px] px-5 pt-4 md:left-[88px] md:right-auto md:bottom-6 md:w-[440px] md:rounded-[26px]"
        style={{
          background: "rgb(var(--surface-rgb))",
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
          boxShadow: "0 24px 70px rgba(17, 10, 34, .24)",
        }}
        initial={{ y: "100%", opacity: 0.7 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0.7 }}
        transition={{ type: "spring", damping: 32, stiffness: 340 }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "rgba(var(--text-3-rgb), .35)" }} />
        {children}
      </motion.div>
    </>
  );
}

function Entete({
  titre,
  onRetour,
  onFermer,
}: {
  titre: string;
  onRetour?: () => void;
  onFermer?: () => void;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {onRetour && (
        <button onClick={onRetour} aria-label="Retour" className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: "rgba(var(--text-3-rgb), .1)", color: "var(--text-1)" }}>
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
      )}
      <b className="min-w-0 flex-1 truncate text-[18px] font-bold" style={{ color: "var(--text-0)" }}>
        {titre}
      </b>
      {onFermer && (
        <button onClick={onFermer} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ color: "var(--text-3)" }}>
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

function AjouterAmi({
  moi,
  monPseudo,
  accessToken,
  pseudoInitial,
  nombreDemandes,
  onDemandes,
  onConversation,
  onDemandeEnvoyee,
  onFermer,
}: {
  moi: string;
  monPseudo: string;
  accessToken?: string;
  pseudoInitial: string;
  nombreDemandes: number;
  onDemandes: () => void;
  onConversation: (id: string) => void;
  onDemandeEnvoyee: () => void;
  onFermer: () => void;
}) {
  const [pseudo, setPseudo] = useState(pseudoInitial);
  const [resultat, setResultat] = useState<ResultatRechercheAmi | null>(null);
  const [rechercheFaite, setRechercheFaite] = useState(false);
  const [charge, setCharge] = useState(false);
  const [action, setAction] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const rechercher = useCallback(async (saisie: string) => {
    if (!saisie.trim()) return;
    setCharge(true);
    setErreur(null);
    setMessage(null);
    try {
      setResultat(await rechercherAmiParPseudo(moi, saisie));
      setRechercheFaite(true);
    } catch {
      setErreur("La recherche n'a pas abouti. Réessaie.");
    } finally {
      setCharge(false);
    }
  }, [moi]);

  useEffect(() => {
    if (!pseudoInitial) return;
    const minuterie = window.setTimeout(() => {
      void rechercher(pseudoInitial);
    }, 0);
    return () => window.clearTimeout(minuterie);
  }, [pseudoInitial, rechercher]);

  const soumettre = (event: FormEvent) => {
    event.preventDefault();
    void rechercher(pseudo);
  };

  const notifier = (cible: string) => {
    if (!accessToken) return;
    void fetch("/api/notifications/follow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ follower_id: moi, followed_id: cible, kind: "friend_request" }),
    }).catch(() => {});
  };

  const agir = async () => {
    if (!resultat || action) return;
    setAction(true);
    setErreur(null);
    setMessage(null);

    if (resultat.relation === "ami") {
      const conversation = await creerConversation([resultat.id]);
      setAction(false);
      if (conversation.ok && conversation.conversation_id) onConversation(conversation.conversation_id);
      else setErreur("Impossible d'ouvrir votre discussion.");
      return;
    }

    if (resultat.relation === "recue") {
      const accepte = await accepterDemandeAmi(resultat.id);
      setAction(false);
      if (!accepte.ok) {
        setErreur(messageMigration(accepte.raison));
        return;
      }
      setResultat({ ...resultat, relation: "ami" });
      onDemandeEnvoyee();
      if (accepte.conversation_id) onConversation(accepte.conversation_id);
      return;
    }

    const demande = await demanderAmi(resultat.id);
    setAction(false);
    if (!demande.ok) {
      setErreur(messageMigration(demande.raison));
      return;
    }
    if (demande.statut === "ami" && demande.conversation_id) {
      setResultat({ ...resultat, relation: "ami" });
      onConversation(demande.conversation_id);
      return;
    }
    notifier(resultat.id);
    setResultat({ ...resultat, relation: "envoyee" });
    setMessage("Demande envoyée.");
  };

  const partager = async () => {
    const url = `${window.location.origin}/communaute?ajouter=${encodeURIComponent(monPseudo)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Ajoute-moi sur Vaiiya",
          text: `Ajoute @${monPseudo} sur Vaiiya`,
          url,
        });
        setMessage("Lien partagé.");
      } else {
        await navigator.clipboard.writeText(url);
        setMessage("Lien copié.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        setMessage("Lien copié.");
      } catch {
        setErreur("Impossible de partager le lien sur cet appareil.");
      }
    }
  };

  return (
    <>
      <Entete titre="Ajouter des amis" onFermer={onFermer} />

      {nombreDemandes > 0 && (
        <button
          onClick={onDemandes}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left"
          style={{ background: "rgba(var(--tint-violet-rgb), .48)", color: "var(--text-1)" }}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full text-white"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}>
            <Users className="h-4.5 w-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[14.5px]">Demandes d&apos;amis</b>
            <span className="text-[12.5px]" style={{ color: "var(--text-3)" }}>
              {nombreDemandes} en attente
            </span>
          </span>
          <span className="flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold text-white"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}>
            {nombreDemandes > 99 ? "99+" : nombreDemandes}
          </span>
        </button>
      )}

      <form onSubmit={soumettre} className="flex items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border px-3 py-3"
          style={{ borderColor: "rgba(var(--text-3-rgb), .22)", background: "rgb(var(--bg-rgb))" }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-3)" }} />
          <input
            value={pseudo}
            onChange={(event) => setPseudo(event.target.value)}
            placeholder="@pseudo exact"
            autoCapitalize="none"
            autoCorrect="off"
            className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none"
            style={{ color: "var(--text-1)" }}
          />
        </label>
        <button
          type="submit"
          disabled={!pseudo.trim() || charge}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
          aria-label="Rechercher"
        >
          {charge ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
        </button>
      </form>

      <p className="mt-2 px-1 text-[12px]" style={{ color: "var(--text-3)" }}>
        Recherche exacte uniquement : Vaiiya ne suggère jamais d&apos;inconnus.
      </p>

      <button
        onClick={() => void partager()}
        className="mt-4 flex w-full items-center gap-3 border-y px-1 py-3.5 text-left"
        style={{ borderColor: "rgba(var(--text-3-rgb), .14)", color: "var(--text-1)" }}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "rgba(var(--tint-violet-rgb), .5)", color: "var(--accent)" }}>
          <Share2 className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[14.5px]">Partager mon lien</b>
          <span className="block truncate text-[12.5px]" style={{ color: "var(--text-3)" }}>
            Ton ami ouvre Vaiiya et te retrouve directement
          </span>
        </span>
        <Copy className="h-4 w-4" style={{ color: "var(--text-3)" }} />
      </button>

      <div className="min-h-[112px]">
        {rechercheFaite && !resultat && !charge && (
          <p className="py-8 text-center text-[14px]" style={{ color: "var(--text-3)" }}>
            Aucun compte ne correspond exactement à ce pseudo.
          </p>
        )}
        {resultat && (
          <div className="flex items-center gap-3 py-4">
            <PersonAvatar personne={resultat} taille={44} />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[15px]" style={{ color: "var(--text-0)" }}>
                {resultat.pseudo}
              </b>
              <span className="block truncate text-[12.5px]" style={{ color: "var(--text-3)" }}>
                @{resultat.pseudo}
              </span>
            </span>
            <button
              onClick={() => void agir()}
              disabled={action || resultat.relation === "envoyee"}
              className="flex min-w-[92px] items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white disabled:opacity-55"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
            >
              {action ? <Loader2 className="h-4 w-4 animate-spin" />
                : resultat.relation === "envoyee" ? <Check className="h-4 w-4" />
                : resultat.relation === "ami" ? null
                : <UserPlus className="h-4 w-4" />}
              {resultat.relation === "ami" ? "Écrire"
                : resultat.relation === "recue" ? "Accepter"
                : resultat.relation === "envoyee" ? "Envoyée"
                : "Ajouter"}
            </button>
          </div>
        )}
      </div>

      {message && <p className="text-center text-[13px] font-medium" style={{ color: "#2BD4A0" }}>{message}</p>}
      {erreur && <p className="text-center text-[13px] font-medium" style={{ color: "#E8620C" }}>{erreur}</p>}
    </>
  );
}

function DemandesAmi({
  demandes,
  charge,
  erreur,
  onRetour,
  onRecharger,
  onDemandesChange,
  onConversation,
}: {
  demandes: Personne[];
  charge: boolean;
  erreur: string | null;
  onRetour: () => void;
  onRecharger: () => void;
  onDemandesChange: (demandes: Personne[]) => void;
  onConversation: (id: string) => void;
}) {
  const [occupe, setOccupe] = useState<string | null>(null);
  const [erreurAction, setErreurAction] = useState<string | null>(null);

  const accepter = async (personne: Personne) => {
    setOccupe(personne.id);
    setErreurAction(null);
    const resultat = await accepterDemandeAmi(personne.id);
    setOccupe(null);
    if (!resultat.ok) {
      setErreurAction(messageMigration(resultat.raison));
      return;
    }
    onDemandesChange(demandes.filter((demande) => demande.id !== personne.id));
    if (resultat.conversation_id) onConversation(resultat.conversation_id);
  };

  const ignorer = async (personne: Personne) => {
    setOccupe(personne.id);
    setErreurAction(null);
    const resultat = await ignorerDemandeAmi(personne.id);
    setOccupe(null);
    if (!resultat.ok) {
      setErreurAction(messageMigration(resultat.raison));
      return;
    }
    onDemandesChange(demandes.filter((demande) => demande.id !== personne.id));
  };

  return (
    <>
      <Entete titre="Demandes d'amis" onRetour={onRetour} />
      {charge ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-3)" }} />
        </div>
      ) : erreur ? (
        <div className="py-8 text-center">
          <p className="text-[14px]" style={{ color: "#E8620C" }}>{erreur}</p>
          <button onClick={onRecharger} className="mt-3 text-[13px] font-semibold" style={{ color: "var(--accent)" }}>
            Réessayer
          </button>
        </div>
      ) : demandes.length === 0 ? (
        <div className="py-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "rgba(var(--tint-violet-rgb), .45)", color: "var(--accent)" }}>
            <Users className="h-5 w-5" />
          </span>
          <p className="mt-3 text-[14px] font-medium" style={{ color: "var(--text-2)" }}>
            Aucune demande en attente.
          </p>
        </div>
      ) : (
        <div>
          {demandes.map((personne) => (
            <div key={personne.id} className="flex items-center gap-3 border-b py-3"
              style={{ borderColor: "rgba(var(--text-3-rgb), .12)" }}>
              <PersonAvatar personne={personne} taille={42} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[14.5px]" style={{ color: "var(--text-0)" }}>
                  {personne.pseudo}
                </b>
                <span className="text-[12px]" style={{ color: "var(--text-3)" }}>veut t&apos;ajouter</span>
              </span>
              <button
                onClick={() => void accepter(personne)}
                disabled={!!occupe}
                className="rounded-xl px-3 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
              >
                {occupe === personne.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accepter"}
              </button>
              <button
                onClick={() => void ignorer(personne)}
                disabled={!!occupe}
                className="px-1 py-2 text-[12.5px] font-medium disabled:opacity-50"
                style={{ color: "var(--text-3)" }}
              >
                Ignorer
              </button>
            </div>
          ))}
        </div>
      )}
      {erreurAction && <p className="mt-3 text-center text-[13px]" style={{ color: "#E8620C" }}>{erreurAction}</p>}
    </>
  );
}

function messageMigration(raison?: string) {
  return /function|schema cache|does not exist|404/i.test(String(raison ?? ""))
    ? "Le nouvel ajout d'amis n'est pas encore activé côté serveur."
    : "L'action n'a pas abouti. Réessaie.";
}
