"use client";

/* ─────────────────────────────────────────────────────────────
   Les infos d'une conversation.

   Photo, nom, membres, et le lancement du relais quand il n'y
   en a pas encore. Pas de rôle admin : n'importe quel membre
   renomme et rhabille le groupe — ce sont deux à cinq personnes
   qui se connaissent déjà, des droits seraient du décor.
   ───────────────────────────────────────────────────────────── */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Loader2, Pencil, Check, X, UserPlus, LogOut, Sparkles, Camera,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import ConversationListPane from "@/components/communaute/ConversationListPane";
import { imageEtat, etatPoster, lancerRelaisDansConversation, annulerRelais } from "@/lib/defi";
import {
  chargerFil, titreConversation, autresMembres, mesRelations, majConversation,
  ajouterMembres, quitterConversation,
  type Conversation, type Personne,
} from "@/lib/messagerie";

export default function InfosPage() {
  const params = useParams<{ id: string }>();
  const convId = (params?.id ?? "").toString();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [conv, setConv]     = useState<Conversation | null>(null);
  const [charge, setCharge] = useState(true);
  const [edite, setEdite]   = useState(false);
  const [nom, setNom]       = useState("");
  const [occupe, setOccupe] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [ajout, setAjout]   = useState(false);
  const [confirmeAnnul, setConfirmeAnnul] = useState(false);

  const fichierRef = useRef<HTMLInputElement>(null);

  const recharger = useCallback(async () => {
    try {
      setErreurChargement(null);
      const { conversation } = await chargerFil(convId);
      setConv(conversation);
      setNom(conversation?.nom ?? "");
    } catch {
      setErreurChargement("Impossible de charger les informations de cette discussion.");
    } finally {
      setCharge(false);
    }
  }, [convId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth"); return; }
    void recharger();
  }, [authLoading, user, router, recharger]);

  const enregistrerNom = async () => {
    setOccupe("nom");
    const r = await majConversation(convId, { nom });
    setOccupe(null);
    if (!r.ok) {
      setErreur("Le nom du groupe n'a pas pu être enregistré.");
      return;
    }
    setErreur(null);
    setEdite(false);
    void recharger();
  };

  const changerPhoto = async (fichier: File) => {
    if (!user) return;
    setOccupe("photo");
    setErreur(null);

    const supabase = createClient();
    const ext = (fichier.name.split(".").pop() ?? "jpg").toLowerCase();
    // Le premier dossier DOIT être mon user_id : la policy Storage du
    // bucket « avatars » n'autorise l'upload que dans son propre
    // dossier. Un chemin en `groupes/…` est refusé d'office.
    // Chemin unique + cache long : le fichier n'est jamais écrasé,
    // donc il peut être mis en cache pour de bon (règle egress).
    const chemin = `${user.id}/groupes/${convId}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("avatars").upload(chemin, fichier, { upsert: false, cacheControl: "31536000" });

    if (error) {
      setOccupe(null);
      setErreur(`La photo n'est pas passée — ${error.message}`);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(chemin);
    const maj = await majConversation(convId, { image: data.publicUrl });
    setOccupe(null);
    if (!maj.ok) {
      setErreur("La photo a été envoyée, mais le groupe n'a pas pu être mis à jour.");
      return;
    }
    setErreur(null);
    void recharger();
  };

  const lancer = async () => {
    setOccupe("relais");
    setErreur(null);
    const r = await lancerRelaisDansConversation(convId);
    setOccupe(null);
    if (r.ok) { router.push(`/communaute/${convId}`); return; }

    const raison = String(r.raison ?? "");
    setErreur(
      /function|does not exist|schema cache|404/i.test(raison) ? "Le relais n'est pas encore activé côté serveur."
      : raison === "pas_un_duo"         ? "Le relais se joue à deux. Ouvre une discussion avec une seule personne."
      : raison === "defi_deja_en_cours" ? "L'un de vous a déjà un relais en cours."
      :                                   "Impossible de lancer le relais pour le moment.",
    );
  };

  /* Arrêter le relais. Deux temps : le bouton demande confirmation avant
     d'agir — c'est irréversible et ça engage deux personnes, un doigt qui
     glisse ne doit pas suffire. */
  const annuler = async () => {
    if (!conv?.defi) return;
    setOccupe("annuler");
    setErreur(null);
    const r = await annulerRelais(conv.defi.runId);
    setOccupe(null);
    setConfirmeAnnul(false);
    if (r.ok) { void recharger(); return; }

    const raison = String(r.raison ?? "");
    setErreur(
      /function|does not exist|schema cache|404/i.test(raison)
        ? "L'arrêt du relais n'est pas encore activé côté serveur."
        : raison === "deja_fini" ? "Ce relais est déjà terminé."
        : "Impossible d'arrêter le relais pour le moment.",
    );
  };

  const quitter = async () => {
    if (!user) return;
    setOccupe("quitter");
    setErreur(null);
    const r = await quitterConversation(convId, user.id);
    setOccupe(null);
    if (!r.ok) {
      setErreur(
        /policy|permission|row-level security/i.test(String(r.raison ?? ""))
          ? "Le départ n'est pas encore activé côté serveur."
          : "Impossible de quitter cette discussion pour le moment.",
      );
      return;
    }
    router.replace("/communaute");
  };

  if (authLoading || charge) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-3)" }} />
      </div>
    );
  }

  if (erreurChargement) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-4 px-8 text-center">
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

  if (!conv || !user) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-[15px]" style={{ color: "var(--text-body)" }}>Cette conversation n&apos;existe plus.</p>
      </div>
    );
  }

  const moi     = user.id;
  const titre   = titreConversation(conv, moi);
  const autres  = autresMembres(conv, moi);
  const groupe  = conv.type === "groupe";
  const etat    = conv.defi ? etatPoster(conv.defi.faits, conv.defi.objectif) : 0;
  const photo   = conv.image ?? (groupe ? null : autres[0]?.avatar ?? null);
  const dejaLa  = conv.membres.map((m) => m.id);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <ConversationListPane
        activeId={convId}
        className="hidden w-[440px] shrink-0 border-r border-[rgba(var(--text-3-rgb),.14)] md:flex"
      />

      <div className="min-w-0 flex-1 overflow-y-auto pb-10">
      {/* ─── Barre ─── */}
      <div className="flex items-center gap-2 px-3 py-3" style={{ paddingTop: "max(.75rem, env(safe-area-inset-top))" }}>
        <button onClick={() => router.push(`/communaute/${convId}`)} aria-label="Retour" className="p-1">
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-0)" }} />
        </button>
        <b className="text-[16px] font-bold" style={{ color: "var(--text-0)" }}>Infos</b>
      </div>

      {/* ─── Identité ─── */}
      <div className="flex flex-col items-center px-6 pt-2">
        <div className="relative">
          {photo ? (
            <Image src={photo} alt="" width={96} height={96}
              className="h-24 w-24 rounded-full object-cover" unoptimized />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full text-[34px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}>
              {titre.charAt(0).toUpperCase()}
            </div>
          )}

          {groupe && (
            <button
              onClick={() => fichierRef.current?.click()}
              aria-label="Changer la photo"
              className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full text-white"
              style={{
                background: "linear-gradient(135deg, #8B5CF6, #C13BC1)",
                border: "2.5px solid rgb(var(--bg-rgb))",
              }}
            >
              {occupe === "photo" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        <input
          ref={fichierRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void changerPhoto(f); e.target.value = ""; }}
        />

        {edite ? (
          <div className="mt-4 flex w-full max-w-[300px] items-center gap-2">
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              autoFocus
              maxLength={40}
              placeholder="Nom du groupe"
              className="flex-1 rounded-xl border px-3 py-2.5 text-center text-[16px] font-semibold outline-none"
              style={{ borderColor: "rgba(var(--text-3-rgb), .3)", background: "transparent", color: "var(--text-0)" }}
            />
            <button onClick={enregistrerNom} aria-label="Enregistrer"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}>
              {occupe === "nom" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
            <button onClick={() => { setEdite(false); setNom(conv.nom ?? ""); }} aria-label="Annuler">
              <X className="h-5 w-5" style={{ color: "var(--text-3)" }} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => groupe && setEdite(true)}
            className="mt-3 flex items-center gap-2"
            disabled={!groupe}
          >
            <b className="text-[19px] font-extrabold tracking-tight" style={{ color: "var(--text-0)" }}>{titre}</b>
            {groupe && <Pencil className="h-3.5 w-3.5" style={{ color: "#8B5CF6" }} />}
          </button>
        )}

        <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
          {groupe ? `Groupe · ${conv.membres.length} membres` : "Discussion"}
        </p>
      </div>

      {erreur && (
        <p className="mt-4 px-6 text-center text-[13px] font-medium" style={{ color: "#E8620C" }}>{erreur}</p>
      )}

      {/* ─── Le relais ─── */}
      <div className="mt-7 px-4">
        <p className="mb-2 pl-1 text-[10.5px] font-bold uppercase tracking-[.1em]" style={{ color: "var(--text-3)" }}>
          Le relais
        </p>
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(var(--text-3-rgb), .18)", background: "rgb(var(--surface-rgb))" }}>
          {conv.defi ? (
            <button onClick={() => router.push("/defi")} className="flex w-full items-center gap-3 p-3 text-left">
              <div className="relative h-[52px] w-[37px] shrink-0 overflow-hidden rounded-[7px] shadow-md">
                <Image src={imageEtat(conv.defi.serie, etat)} alt="" fill sizes="37px" className="object-cover" />
              </div>
              <span className="min-w-0 flex-1">
                <b className="block text-[14px] font-semibold" style={{ color: "var(--text-0)" }}>
                  {conv.defi.statut === "reussi"
                    ? "L'affiche est à vous"
                    : `${conv.defi.faits} jour${conv.defi.faits > 1 ? "s" : ""} sur ${conv.defi.objectif}`}
                </b>
                <span className="mt-0.5 block text-[12px]" style={{ color: "var(--text-2)" }}>
                  Voir l&apos;affiche en grand
                </span>
              </span>
            </button>
          ) : null}

          {/* Arrêter — seulement tant que ce n'est pas gagné : une affiche
              gagnée est à eux, elle ne s'annule pas. En deux temps, et sans
              rien dramatiser : on ne perd rien, on remet le compteur à zéro. */}
          {conv.defi && conv.defi.statut !== "reussi" && (
            <div className="border-t" style={{ borderColor: "rgba(var(--text-3-rgb), .14)" }}>
              {confirmeAnnul ? (
                <div className="p-3">
                  <p className="mb-2.5 text-[12.5px]" style={{ color: "var(--text-2)" }}>
                    Le relais s&apos;arrête pour vous deux et l&apos;affiche reste ici.
                    Vous pourrez en relancer un tout de suite.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={annuler} disabled={occupe === "annuler"}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-semibold text-white disabled:opacity-60"
                      style={{ background: "#E8620C" }}>
                      {occupe === "annuler" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Arrêter le relais
                    </button>
                    <button onClick={() => setConfirmeAnnul(false)}
                      className="rounded-xl px-4 py-2 text-[13px] font-semibold"
                      style={{ color: "var(--text-2)", background: "rgba(var(--text-3-rgb), .10)" }}>
                      Garder
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmeAnnul(true)}
                  className="w-full p-3 text-left text-[13.5px] font-semibold"
                  style={{ color: "#E8620C" }}>
                  Arrêter le relais
                </button>
              )}
            </div>
          )}

          {!conv.defi && (
            <button onClick={lancer} disabled={occupe === "relais"}
              className="flex w-full items-center gap-3 p-3 text-left disabled:opacity-60">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: "rgba(215,166,42,.16)", color: "#D7A62A" }}>
                {occupe === "relais" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-[14px] font-semibold" style={{ color: "#8B5CF6" }}>Lancer un relais</b>
                <span className="mt-0.5 block text-[12px]" style={{ color: "var(--text-2)" }}>
                  4 jours sur 7, chacun son tour
                </span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Membres ─── */}
      <div className="mt-6 px-4">
        <p className="mb-2 pl-1 text-[10.5px] font-bold uppercase tracking-[.1em]" style={{ color: "var(--text-3)" }}>
          Membres
        </p>
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(var(--text-3-rgb), .18)", background: "rgb(var(--surface-rgb))" }}>
          {conv.membres.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 p-3"
              style={{ borderTop: i ? "1px solid rgba(var(--text-3-rgb), .14)" : "none" }}>
              <Avatar personne={p} taille={34} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium" style={{ color: "var(--text-1)" }}>
                {p.id === moi ? "Toi" : p.pseudo}
              </span>
            </div>
          ))}

          <button
            onClick={() => setAjout(true)}
            className="flex w-full items-center gap-3 p-3 text-left"
            style={{ borderTop: "1px solid rgba(var(--text-3-rgb), .14)" }}
          >
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px]"
              style={{ background: "rgba(139,92,246,.14)", color: "#8B5CF6" }}>
              <UserPlus className="h-4 w-4" />
            </span>
            <b className="text-[14px] font-semibold" style={{ color: "#8B5CF6" }}>Ajouter quelqu&apos;un</b>
          </button>

          <button
            onClick={quitter}
            disabled={occupe === "quitter"}
            className="flex w-full items-center gap-3 p-3 text-left disabled:opacity-60"
            style={{ borderTop: "1px solid rgba(var(--text-3-rgb), .14)" }}
          >
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px]"
              style={{ background: "rgba(224,90,90,.12)", color: "#E05A5A" }}>
              {occupe === "quitter" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            </span>
            <b className="text-[14px] font-semibold" style={{ color: "#E05A5A" }}>
              {groupe ? "Quitter le groupe" : "Quitter la discussion"}
            </b>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {ajout && (
          <AjouterDesGens
            moi={moi}
            dejaLa={dejaLa}
            onFermer={() => setAjout(false)}
            onAjoute={() => { setAjout(false); void recharger(); }}
            convId={convId}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

function Avatar({ personne, taille = 34 }: { personne?: Personne; taille?: number }) {
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
      style={{ ...s, fontSize: taille * 0.38, background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
    >
      {(personne?.pseudo ?? "?").charAt(0).toUpperCase()}
    </div>
  );
}

/* ─── Ajouter des gens ───────────────────────────────────────
   Les mêmes que partout : ceux qu'on suit et ceux qui nous
   suivent. Pas d'annuaire global. */
function AjouterDesGens({ moi, dejaLa, convId, onFermer, onAjoute }: {
  moi: string; dejaLa: string[]; convId: string; onFermer: () => void; onAjoute: () => void;
}) {
  const [gens, setGens]       = useState<Personne[]>([]);
  const [charge, setCharge]   = useState(true);
  const [choisis, setChoisis] = useState<string[]>([]);
  const [occupe, setOccupe]   = useState(false);
  const [erreur, setErreur]   = useState<string | null>(null);

  useEffect(() => {
    void mesRelations(moi)
      .then((g) => setGens(g.filter((p) => !dejaLa.includes(p.id))))
      .catch(() => setErreur("Impossible de charger tes contacts."))
      .finally(() => setCharge(false));
  }, [moi, dejaLa]);

  const placesRestantes = Math.max(0, 5 - dejaLa.length);

  const valider = async () => {
    if (!choisis.length) return;
    setOccupe(true);
    const r = await ajouterMembres(convId, choisis);
    setOccupe(false);
    if (r.ok) { onAjoute(); return; }
    setErreur(
      r.raison === "groupe_complet"
        ? "Ce groupe compte déjà cinq personnes."
        : r.raison === "relation_requise"
        ? "Tu peux ajouter uniquement une personne déjà liée à ton compte."
        : "Impossible d'ajouter pour le moment.",
    );
  };

  return (
    <>
      <motion.div className="fixed inset-0 z-[90] bg-black/45"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onFermer} />
      <motion.div
        className="fixed inset-x-0 bottom-0 z-[91] rounded-t-[26px] px-5 pt-5"
        style={{ background: "rgb(var(--surface-rgb))", paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "rgba(var(--text-3-rgb), .35)" }} />
        <b className="mb-3 block text-[17px] font-bold" style={{ color: "var(--text-0)" }}>Ajouter quelqu&apos;un</b>

        <div className="max-h-[42vh] overflow-y-auto">
          {charge ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-3)" }} />
            </div>
          ) : gens.length === 0 ? (
            <p className="py-6 text-center text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
              Tout le monde est déjà là.
            </p>
          ) : (
            gens.map((p) => {
              const pris = choisis.includes(p.id);
              return (
                <button key={p.id}
                  onClick={() => {
                    setErreur(null);
                    setChoisis((c) => {
                      if (pris) return c.filter((x) => x !== p.id);
                      if (c.length >= placesRestantes) {
                        setErreur("Un groupe peut réunir cinq personnes maximum.");
                        return c;
                      }
                      return [...c, p.id];
                    });
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left">
                  <Avatar personne={p} taille={38} />
                  <span className="flex-1 truncate text-[14.5px] font-medium" style={{ color: "var(--text-1)" }}>
                    {p.pseudo}
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border-2"
                    style={{
                      borderColor: pris ? "#8B5CF6" : "rgba(var(--text-3-rgb), .4)",
                      background: pris ? "#8B5CF6" : "transparent",
                    }}>
                    {pris && <Check className="h-3.5 w-3.5 text-white" />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {erreur && <p className="mt-3 text-center text-[13.5px]" style={{ color: "#E8620C" }}>{erreur}</p>}

        <button onClick={valider} disabled={!choisis.length || occupe}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[16px] font-semibold text-white disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}>
          {occupe ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Ajouter{choisis.length ? ` (${choisis.length})` : ""}
        </button>
      </motion.div>
    </>
  );
}
