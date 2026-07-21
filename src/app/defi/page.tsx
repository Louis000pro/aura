"use client";

/* ─────────────────────────────────────────────────────────────
   Le relais — l'écran du défi.

   Un seul objet à l'écran : l'affiche. Tout le reste est une
   ligne d'état et un bouton. Pas d'empilement de cartes.
   ───────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Copy, Share2, Dumbbell, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PosterDefi from "@/components/defi/PosterDefi";
import {
  chargerDefi, creerDefi, lienInvitation, etatPoster, tourDeJeu,
  joursDeLaFenetre, joursRestants, encoreJouable, aujourdhui,
  SERIES, CLE_DEVOILE, type Defi,
} from "@/lib/defi";

export default function DefiPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [defi, setDefi]         = useState<Defi | null>(null);
  const [chargement, setChargement] = useState(true);
  const [creation, setCreation] = useState(false);
  const [copie, setCopie]       = useState(false);
  const [devoile, setDevoile]   = useState(false);
  const [erreur, setErreur]     = useState<string | null>(null);

  const recharger = useCallback(async () => {
    if (!user) return;
    const d = await chargerDefi(user.id);
    setDefi(d);
    setChargement(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth"); return; }
    void recharger();
  }, [authLoading, user, router, recharger]);

  /* Le maillon vient d'être franchi à la fin d'une séance :
     l'affiche bascule sous les yeux, une seule fois. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(CLE_DEVOILE)) {
      sessionStorage.removeItem(CLE_DEVOILE);
      setDevoile(true);
    }
  }, []);

  const lancer = async () => {
    setCreation(true);
    setErreur(null);
    const r = await creerDefi();
    setCreation(false);
    if (r.ok) { void recharger(); return; }

    // Un échec muet est pire qu'un message maladroit : on dit ce qui
    // s'est passé, et on nomme le cas « migration pas encore appliquée »
    // parce que c'est celui qu'on rencontrera le plus au lancement.
    const raison = String(r.raison ?? "");
    const pasDeFonction = /function|does not exist|schema cache|404/i.test(raison);
    setErreur(
      pasDeFonction                          ? "Le défi n'est pas encore activé côté serveur."
    : raison === "defi_deja_en_cours"        ? "Tu as déjà un relais en cours."
    : raison === "non_connecte"              ? "Reconnecte-toi pour lancer un relais."
    :                                          "Impossible de lancer le relais pour le moment.",
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

  /* ── Aucun défi : l'invitation ──────────────────────────── */
  if (!defi) {
    return (
      <Cadre>
        <div className="mx-auto w-full max-w-[360px]">
          <PosterDefi serie="sillage" etat={1} className="shadow-2xl" />

          <h1 className="mt-7 text-[26px] font-bold leading-tight" style={{ color: "var(--text-0)" }}>
            Cette affiche est vide.
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--text-body)" }}>
            Elle se dévoile à chaque séance de la semaine — mais elle ne se
            dévoile qu&apos;à deux. Quatre jours sur sept, chacun son tour, jamais
            deux jours de suite la même personne.
          </p>

          <button
            onClick={lancer}
            disabled={creation}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[16px] font-semibold text-white transition-transform active:scale-[.98] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
          >
            {creation ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Lancer un relais
          </button>
          <p className="mt-3 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
            Tu obtiendras un lien à envoyer à la personne de ton choix.
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

  /* ── En attente de l'équipier ───────────────────────────── */
  if (defi.statut === "inscription") {
    const lien = defi.code ? lienInvitation(defi.code) : "";
    return (
      <Cadre>
        <div className="mx-auto w-full max-w-[360px]">
          <PosterDefi serie={defi.serie} etat={1} noms={noms} className="shadow-2xl" />

          <h1 className="mt-7 text-[24px] font-bold leading-tight" style={{ color: "var(--text-0)" }}>
            Il manque une personne.
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--text-body)" }}>
            Le relais démarre à la seconde où quelqu&apos;un rejoint. Envoie-lui
            ce lien — il n&apos;a pas besoin d&apos;avoir Vaiiya pour l&apos;ouvrir.
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
        </div>
      </Cadre>
    );
  }

  /* ── Réussi ─────────────────────────────────────────────── */
  if (defi.statut === "reussi" || defi.statut === "termine") {
    const gagne = defi.statut === "reussi";
    return (
      <Cadre>
        <div className="mx-auto w-full max-w-[360px]">
          <PosterDefi
            serie={defi.serie}
            etat={gagne ? 4 : etat}
            noms={noms}
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

          {gagne && (
            <button
              onClick={() => partager(lienInvitation(defi.code ?? ""), "Notre relais est bouclé", "Quatre jours sur sept, à deux.")}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[16px] font-semibold text-white transition-transform active:scale-[.98]"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
            >
              <Share2 className="h-5 w-5" />
              Partager l&apos;affiche
            </button>
          )}
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
    <Cadre>
      <div className="mx-auto w-full max-w-[360px]">
        <PosterDefi
          serie={defi.serie}
          etat={etat}
          noms={noms}
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
            {restants > 0 ? `${restants} jour${restants > 1 ? "s" : ""} restant${restants > 1 ? "s" : ""}` : "dernier jour"}
          </span>
        </div>

        <ChaineDesJours defi={defi} moi={moi} />

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
      </div>
    </Cadre>
  );
}

/* ─── La chaîne des sept jours ───────────────────────────────
   Ce qui est fait est en teal, aujourd'hui est cerclé de violet.
   Un jour manqué n'est pas rouge et n'est attribué à personne :
   on ne désigne jamais celui qui a lâché. */
function ChaineDesJours({ defi, moi }: { defi: Defi; moi: string }) {
  const jours = joursDeLaFenetre(defi);
  const auj = aujourdhui();

  return (
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
  );
}

/* ─── Cadre commun ──────────────────────────────────────────── */
function Cadre({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="px-5 pb-10 pt-4">
      <button
        onClick={() => router.back()}
        aria-label="Retour"
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-full"
        style={{ background: "rgba(var(--surface-rgb), .7)", color: "var(--text-1)" }}
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      {children}
    </div>
  );
}
