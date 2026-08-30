"use client";

/* ─────────────────────────────────────────────────────────────
   Le relais — l'écran du défi.

   Un seul objet à l'écran : l'affiche. Tout le reste est une
   ligne d'état et un bouton. Pas d'empilement de cartes.
   ───────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Copy, Share2, Dumbbell, Loader2, ImageDown, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import PosterDefi from "@/components/defi/PosterDefi";
import {
  chargerDefi, annulerRelais, lienInvitation, etatPoster, tourDeJeu,
  joursDeLaFenetre, joursRestants, encoreJouable, aujourdhui, fenetreFinie,
  defiFactice, SERIES, CLE_DEVOILE, type Defi, type Membre,
} from "@/lib/defi";
import { badgesDuDefi } from "@/lib/badges";
import { chargerBadges } from "@/lib/messagerie";
import RangeeBadges from "@/components/defi/RangeeBadges";
import { partagerAffiche } from "@/lib/defiShareExport";

export default function DefiPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [defi, setDefi]         = useState<Defi | null>(null);
  const [chargement, setChargement] = useState(true);
  const [creation, setCreation] = useState(false);
  const [copie, setCopie]       = useState(false);
  const [devoile, setDevoile]   = useState(false);
  const [erreur, setErreur]     = useState<string | null>(null);
  const [debloques, setDebloques] = useState<string[]>([]);
  const [carte, setCarte] = useState<"repos" | "occupe" | "fait" | "rate">("repos");
  const [confirmeArret, setConfirmeArret] = useState(false);

  /* /defi?apercu=1..4 ou ?apercu=gagne → on REGARDE un écran sans
     jouer la semaine. Rien n'est lu ni écrit en base. */
  const apercu = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("apercu")
    : null;

  const recharger = useCallback(async () => {
    if (!user) return;

    if (apercu) {
      const faux = defiFactice(apercu, user.id, user.pseudo ?? "Toi");
      if (faux) {
        setDefi(faux);
        setDebloques(faux.statut === "reussi" ? ["serie-sillage", "premier-relais"] : []);
        setChargement(false);
        return;
      }
    }

    const [d, b] = await Promise.all([chargerDefi(user.id), chargerBadges(user.id)]);
    setDefi(d);
    setDebloques(b);
    setChargement(false);
  }, [user, apercu]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth"); return; }
    void recharger();
  }, [authLoading, user, router, recharger]);

  /* Le maillon vient d'être franchi à la fin d'une séance :
     l'affiche bascule sous les yeux, une seule fois. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    // ?devoile=1 rejoue la bascule à volonté, pour la regarder.
    if (new URLSearchParams(window.location.search).get("devoile")) { setDevoile(true); return; }
    if (sessionStorage.getItem(CLE_DEVOILE)) {
      sessionStorage.removeItem(CLE_DEVOILE);
      setDevoile(true);
    }
  }, []);

  /* Arrêter depuis ICI, et pas seulement depuis les infos d'une
     conversation : un relais créé par `creer_defi_duo` n'a PAS de
     conversation (invitation envoyée par lien, jamais rejointe). Ces
     runs-là bloquent le lancement suivant et n'étaient joignables
     nulle part — cet écran est le seul qui les affiche. */
  const arreter = async () => {
    if (!defi) return;
    setCreation(true);
    setErreur(null);
    const r = await annulerRelais(defi.runId);
    setCreation(false);
    setConfirmeArret(false);
    if (r.ok) { void recharger(); return; }

    const raison = String(r.raison ?? "");
    setErreur(
      /function|does not exist|schema cache|404/i.test(raison)
        ? "L'arrêt du relais n'est pas encore activé côté serveur."
        : "Impossible d'arrêter le relais pour le moment.",
    );
  };

  const partager = async (lien: string, titre: string, texte: string) => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: titre, text: texte, url: lien }); return; } catch { /* annulé */ }
    }
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      setTimeout(() => setCopie(false), 2200);
    } catch { /* pas de presse-papier */ }
  };

  /* ── Chargement ─────────────────────────────────────────── */
  if (authLoading || chargement) {
    return (
      <Cadre>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-3)" }} />
        </div>
      </Cadre>
    );
  }

  /* ── Aucun défi ─────────────────────────────────────────────
     ⚠️ CET ÉCRAN NE LANCE PLUS RIEN. Il y avait cinq boutons « Lancer un
     relais » dans l'app, avec deux mécanismes derrière, et celui-ci
     fabriquait une conversation vide où l'on atterrissait seul. Le relais
     commence par une PERSONNE : la seule porte est la feuille « Avec
     qui ? » des discussions, et c'est là qu'on renvoie. */
  if (!defi) {
    return (
      <Cadre>
        <div className="mx-auto w-full max-w-[360px]">
          <PosterDefi serie="sillage" etat={1} titre={SERIES.sillage.nom} hauteurMax="40vh" className="shadow-2xl" />

          <h1 className="mt-7 text-[26px] font-bold leading-tight" style={{ color: "var(--text-0)" }}>
            Cette affiche est vide.
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--text-body)" }}>
            Elle se dévoile à chaque séance de la semaine, mais elle ne se
            dévoile qu&apos;à deux. Quatre jours sur sept, chacun son tour, jamais
            deux jours de suite la même personne.
          </p>

          <button
            onClick={() => router.push("/communaute")}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[16px] font-semibold text-white transition-transform active:scale-[.98]"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
          >
            <MessageCircle className="h-5 w-5" />
            Choisir avec qui
          </button>
          <p className="mt-3 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
            Un ami, ou un lien à envoyer à quelqu&apos;un qui n&apos;a pas Vaiiya.
          </p>

          {erreur && (
            <p className="mt-4 text-center text-[14px] font-medium" style={{ color: "#E8620C" }}>
              {erreur}
            </p>
          )}
        </div>
      </Cadre>
    );
  }

  const faits    = defi.actions.length;
  const etat     = etatPoster(faits, defi.objectif);
  const noms     = defi.membres.map((m) => m.pseudo);
  const moi      = user!.id;
  const tour     = tourDeJeu(defi, moi);
  const restants = joursRestants(defi);
  const serie    = SERIES[defi.serie as keyof typeof SERIES] ?? SERIES.sillage;
  const equipier = defi.membres.find((m) => m.userId !== moi) ?? null;
  const fil      = defi.conversationId;

  /* La semaine peut être passée sans que la base l'ait encore écrit :
     `fermer_relais_expires()` tourne le soir et à chaque lancement, donc
     entre minuit et ce moment-là le statut dit encore « en cours ».
     L'écran ne doit dépendre d'aucune écriture pour dire la vérité. */
  const finie = fenetreFinie(defi);

  /* ── En attente de l'équipier ───────────────────────────── */
  /* Le rappel discret « on arrête là », partagé par l'écran d'attente et
     l'écran en cours. Discret exprès : c'est une sortie, pas une action
     qu'on met en avant. */
  const arret = (
    <div className="mt-7">
      {confirmeArret ? (
        <div className="rounded-2xl border p-3.5"
          style={{ borderColor: "rgba(232,98,12,.35)", background: "rgba(232,98,12,.06)" }}>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            Le relais s&apos;arrête pour vous deux. L&apos;affiche reste dans votre
            discussion, et vous pouvez en relancer un tout de suite.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={arreter} disabled={creation}
              className="flex-1 rounded-xl py-2.5 text-[14px] font-semibold text-white disabled:opacity-60"
              style={{ background: "#E8620C" }}>
              Arrêter le relais
            </button>
            <button onClick={() => setConfirmeArret(false)}
              className="rounded-xl px-4 py-2.5 text-[14px] font-semibold"
              style={{ color: "var(--text-2)", background: "rgba(var(--text-3-rgb), .10)" }}>
              Garder
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirmeArret(true)}
          className="w-full py-2 text-[13.5px] font-medium"
          style={{ color: "var(--text-3)" }}>
          Arrêter le relais
        </button>
      )}
    </div>
  );

  if (defi.statut === "inscription") {
    const lien = defi.code ? lienInvitation(defi.code) : "";
    return (
      <Cadre equipier={equipier} fil={fil}>
        <div className="mx-auto w-full max-w-[360px]">
          <PosterDefi serie={defi.serie} etat={1} noms={noms} titre={serie.nom} className="shadow-2xl" />

          <h1 className="mt-7 text-[24px] font-bold leading-tight" style={{ color: "var(--text-0)" }}>
            Il manque une personne.
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--text-body)" }}>
            Le relais démarre à la seconde où quelqu&apos;un rejoint. Envoie-lui
            ce lien, il n&apos;a pas besoin d&apos;avoir Vaiiya pour l&apos;ouvrir.
          </p>

          {/* L'affiche en jeu se nomme : c'est ce qui rend la deuxième
              semaine désirable, puisque la série tourne d'un relais à
              l'autre (Sillage, puis Aurore, puis Brume). */}
          <p className="mt-3 text-[13.5px]" style={{ color: "var(--text-3)" }}>
            Vous jouez pour <b style={{ color: "var(--or-encre)" }}>{serie.nom}</b> · {serie.promesse.toLowerCase()}.
          </p>

          {lien && (
            <>
              <button
                onClick={() => partager(lien, "Rejoins mon relais sur Vaiiya", "Quatre jours sur sept, chacun son tour. On y va ?")}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[16px] font-semibold text-white transition-transform active:scale-[.98]"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
              >
                <Share2 className="h-5 w-5" />
                Envoyer l&apos;invitation
              </button>

              <button
                onClick={() => partager(lien, "", "")}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[14px] font-medium"
                style={{ borderColor: "rgba(var(--text-3-rgb), .3)", color: "var(--text-2)" }}
              >
                {copie ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copie ? "Lien copié" : lien.replace(/^https?:\/\//, "")}
              </button>
            </>
          )}

          {arret}

          <div className="mt-8">
            <RangeeBadges badges={badgesDuDefi(defi.serie)} debloques={debloques} />
          </div>
        </div>
      </Cadre>
    );
  }

  /* ── Fini : gagné, ou semaine passée ────────────────────── */
  if (defi.statut === "reussi" || defi.statut === "termine" || finie) {
    const gagne = defi.statut === "reussi";
    return (
      <Cadre equipier={equipier} fil={fil}>
        <div className="mx-auto w-full max-w-[360px]">
          <PosterDefi
            serie={defi.serie}
            etat={gagne ? 4 : etat}
            noms={noms}
            titre={serie.nom}
            devoile={devoile}
            className="shadow-2xl"
          />

          <h1 className="mt-7 text-[24px] font-bold leading-tight" style={{ color: "var(--text-0)" }}>
            {gagne ? "L'affiche est à vous." : "La semaine est finie."}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--text-body)" }}>
            {gagne
              ? `« ${serie.nom} » rejoint ta galerie. Tu peux la réutiliser en fond de tes prochains posters de perf.`
              : `Vous êtes allés à ${faits} jour${faits > 1 ? "s" : ""} sur ${defi.objectif}. L'affiche garde ce que vous avez dévoilé.`}
          </p>

          {/* On ne reste pas devant une semaine finie : la suite est un
              bouton, et il mène à la seule porte du relais. Sans reproche
              et sans nommer personne, c'est la règle du 21 juillet. */}
          {!gagne && (
            <button
              onClick={() => router.push("/communaute")}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[16px] font-semibold text-white transition-transform active:scale-[.98]"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
            >
              <MessageCircle className="h-5 w-5" />
              En relancer un
            </button>
          )}

          {gagne && (
            <button
              onClick={async () => {
                if (carte === "occupe") return;
                setCarte("occupe");
                const r = await partagerAffiche({
                  serie: defi.serie,
                  noms,
                  objectif: defi.objectif,
                  fenetre: defi.fenetre,
                  date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
                });
                setCarte(r === "error" ? "rate" : "fait");
                setTimeout(() => setCarte("repos"), 2200);
              }}
              disabled={carte === "occupe"}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[16px] font-semibold text-white transition-transform active:scale-[.98] disabled:opacity-70"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
            >
              {carte === "occupe" ? <Loader2 className="h-5 w-5 animate-spin" />
               : carte === "fait" ? <Check className="h-5 w-5" />
               : <ImageDown className="h-5 w-5" />}
              {carte === "occupe" ? "Génération…"
               : carte === "fait" ? "Enregistré ✦"
               : carte === "rate" ? "Réessaie"
               : "Télécharger la carte"}
            </button>
          )}

          <div className="mt-8">
            <RangeeBadges badges={badgesDuDefi(defi.serie)} debloques={debloques} />
          </div>
        </div>
      </Cadre>
    );
  }

  /* ── En cours ───────────────────────────────────────────── */
  const perdu = !encoreJouable(defi);

  const phrase =
    perdu                       ? "L'affiche restera comme elle est. Ce n'est pas grave — vous en relancerez une."
  : tour.quoi === "deja_franchi" ? (tour.parMoi ? "C'est fait pour aujourd'hui. Le relais repart demain." : "Le maillon d'aujourd'hui est franchi.")
  : tour.quoi === "pas_mon_tour" ? `Tu as franchi hier — aujourd'hui, c'est à ${tour.equipier?.pseudo ?? "l'autre"}.`
  :                                "À toi de jouer.";

  return (
    <Cadre equipier={equipier} fil={fil}>
      <div className="mx-auto w-full max-w-[360px]">
        <PosterDefi
          serie={defi.serie}
          etat={etat}
          hauteurMax="38vh"
          noms={noms}
          titre={serie.nom}
          devoile={devoile}
          className="shadow-2xl"
        />

        {/* Compte + fenêtre */}
        <div className="mt-6 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[34px] font-bold leading-none" style={{ color: "var(--text-0)" }}>
              {faits}
            </span>
            <span className="text-[15px] font-medium" style={{ color: "var(--text-2)" }}>
              / {defi.objectif} jours
            </span>
          </div>
          <span className="text-[13px] font-medium" style={{ color: "var(--text-3)" }}>
            {restants > 1 ? `${restants} jours restants` : "dernier jour"}
          </span>
        </div>

        <ChaineDesJours defi={defi} moi={moi} equipier={equipier} />

        <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--text-body)" }}>
          {phrase}
        </p>

        {tour.quoi === "a_moi" && !perdu && (
          <button
            onClick={() => router.push("/progression")}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[16px] font-semibold text-white transition-transform active:scale-[.98]"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
          >
            <Dumbbell className="h-5 w-5" />
            Lancer une séance
          </button>
        )}
        {tour.quoi === "a_moi" && (
          <p className="mt-3 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
            Dix minutes minimum pour que le maillon compte.
          </p>
        )}

        {arret}

        <div className="mt-8">
          <RangeeBadges badges={badgesDuDefi(defi.serie)} debloques={debloques} />
        </div>
      </div>
    </Cadre>
  );
}

/* ─── La chaîne des sept jours ───────────────────────────────
   Ce qui est fait est en teal, aujourd'hui est cerclé de violet.
   Un jour manqué n'est pas rouge et n'est attribué à personne :
   on ne désigne jamais celui qui a lâché.

   ⚠️ La légende n'est pas un ornement. C'est le SEUL endroit de l'app
   où le teal ne veut pas dire « réussi » mais « toi », et rien ne le
   disait : trois couleurs qu'on devait deviner. */
function ChaineDesJours({ defi, moi, equipier }: {
  defi: Defi; moi: string; equipier: Membre | null;
}) {
  const jours = joursDeLaFenetre(defi);
  const auj = aujourdhui();

  return (
    <>
    <div className="mt-4 flex gap-1.5">
      {jours.map((j) => {
        const action = defi.actions.find((a) => a.jour === j);
        const estAuj = j === auj;
        const passe  = j < auj;

        let fond = "rgba(var(--text-3-rgb), .16)";
        if (action) fond = action.userId === moi ? "#2BD4A0" : "#8B5CF6";
        else if (passe) fond = "rgba(var(--text-3-rgb), .28)";

        return (
          <motion.div
            key={j}
            initial={false}
            animate={{ opacity: 1 }}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background: fond,
              outline: estAuj ? "2px solid rgba(139,92,246,.55)" : "none",
              outlineOffset: "2px",
            }}
          />
        );
      })}
    </div>

    <div className="mt-2 flex items-center gap-3.5">
      <Pastille couleur="#2BD4A0" texte="Toi" />
      <Pastille couleur="#8B5CF6" texte={equipier?.pseudo ?? "L'autre"} />
      <Pastille couleur="rgba(var(--text-3-rgb), .38)" texte="Passé" />
    </div>
    </>
  );
}

function Pastille({ couleur, texte }: { couleur: string; texte: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="h-1.5 w-4 shrink-0 rounded-full" style={{ background: couleur }} />
      <span className="truncate text-[11.5px] font-medium" style={{ color: "var(--text-3)" }}>
        {texte}
      </span>
    </span>
  );
}

/* ─── Cadre commun ────────────────────────────────────────────
   ⚠️ Le retour ne peut PAS être `router.back()` tout seul : on arrive
   ici depuis une notification ou depuis la fin d'une séance, et il n'y
   a alors rien derrière. Quand le relais a un fil, le retour y mène
   directement, avec le visage de l'équipier : cet écran montre
   l'affiche, la conversation est l'endroit où on se parle. */
function Cadre({ children, equipier, fil }: {
  children: React.ReactNode;
  equipier?: Membre | null;
  fil?: string | null;
}) {
  const router = useRouter();
  return (
    <div className="px-5 pb-10 pt-4">
      <div className="mb-4 flex items-center gap-2.5">
        <button
          onClick={() => (fil ? router.push(`/communaute/${fil}`) : router.push("/communaute"))}
          aria-label={equipier ? `Retour à la discussion avec ${equipier.pseudo}` : "Retour"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(var(--surface-rgb), .7)", color: "var(--text-1)" }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {equipier && (
          <button
            onClick={() => (fil ? router.push(`/communaute/${fil}`) : undefined)}
            disabled={!fil}
            className="flex min-w-0 items-center gap-2 disabled:cursor-default"
          >
            {equipier.avatar ? (
              <Image
                src={equipier.avatar}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold text-white"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
              >
                {equipier.pseudo.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate text-[14.5px] font-semibold" style={{ color: "var(--text-1)" }}>
              Avec {equipier.pseudo}
            </span>
          </button>
        )}
      </div>
      <Bandeau />
      {children}
    </div>
  );
}

/** Rappel visible qu'on regarde du décor, pas ses vraies données. */
function Bandeau() {
  const [texte, setTexte] = useState<string | null>(null);
  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get("apercu");
    if (a) setTexte(a === "gagne" ? "Aperçu — affiche terminée" : `Aperçu — ${a} jour${Number(a) > 1 ? "s" : ""} franchi${Number(a) > 1 ? "s" : ""}`);
  }, []);
  if (!texte) return null;
  return (
    <p
      className="mb-3 rounded-xl px-3 py-2 text-center text-[12px] font-semibold"
      style={{ background: "rgba(245,177,32,.14)", color: "#E8620C" }}
    >
      {texte} · aucune donnée réelle
    </p>
  );
}
