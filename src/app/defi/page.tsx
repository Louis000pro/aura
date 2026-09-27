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
  chargerDefi, annulerRelais, lienInvitation, etatPoster,
  joursRestants, fenetreFinie, etatCoop, niveauxCoop,
  defiFactice, SERIES, CLE_DEVOILE, EVT_RELAIS, type Defi, type Membre,
} from "@/lib/defi";
import { badgesDuDefi } from "@/lib/badges";
import { chargerBadges } from "@/lib/messagerie";
import RangeeBadges from "@/components/defi/RangeeBadges";
import { partagerAffiche } from "@/lib/defiShareExport";
import { proposerAvis } from "@/lib/invitationAvis";
import { createClient } from "@/lib/supabase";
import { useWorkoutLaunch } from "@/context/WorkoutLaunchContext";
import {
  genererMaillon, sessionIdMaillon, dureeMaillon, niveauDepuisProfil,
} from "@/lib/relaisSeance";

export default function DefiPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { launchWorkout } = useWorkoutLaunch();
  // La difficulté des maillons se cale sur le NIVEAU (débutant / inter /
  // avancé), jamais sur le rang (qui mesure la régularité, pas la force).
  const [niveau, setNiveau] = useState(() => niveauDepuisProfil(null));

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

  /* Le niveau d'entraînement du joueur, pour caler la difficulté des maillons. */
  useEffect(() => {
    if (!user?.id || apercu) return;
    const supabase = createClient();
    void supabase.from("profiles").select("onboarding_level").eq("id", user.id).maybeSingle()
      .then(({ data }) => setNiveau(niveauDepuisProfil((data?.onboarding_level as string | null) ?? null)));
  }, [user?.id, apercu]);

  /* Un maillon vient d'être franchi dans le tunnel (overlay global) : on
     recharge pour montrer le nouvel état co-op, et on rejoue la bascule. */
  useEffect(() => {
    const on = () => { setDevoile(true); void recharger(); };
    window.addEventListener(EVT_RELAIS, on);
    return () => window.removeEventListener(EVT_RELAIS, on);
  }, [recharger]);

  /* Un relais gagné (pas un aperçu) est un pic de satisfaction : on propose un
     avis, une seule fois par personne (garde-fou dans `invitationAvis.ts`). */
  useEffect(() => {
    if (apercu || !user?.id) return;
    if (defi?.statut === "reussi") proposerAvis(user.id);
  }, [apercu, user?.id, defi?.statut]);

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
        ? "L’arrêt du relais n’est pas encore activé côté serveur."
        : "Impossible d’arrêter le relais pour le moment.",
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
          <p className="mt-2 text-[16px] leading-relaxed" style={{ color: "var(--text-body)" }}>
            Elle se dévoile à deux. Vous grimpez la même échelle de 4 maillons,
            et on avance quand les deux ont fait le maillon en cours.
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
            <p className="mt-4 text-center text-[13px] font-medium" style={{ color: "#E8620C" }}>
              {erreur}
            </p>
          )}
        </div>
      </Cadre>
    );
  }

  const noms     = defi.membres.map((m) => m.pseudo);
  const moi      = user!.id;
  // Co-op : chacun grimpe ses 4 maillons ; l'affiche suit l'avancée COMMUNE
  // (le min des deux). On ne compte plus des « jours », on compte des maillons.
  const nv       = niveauxCoop(defi, moi);
  const faits    = nv.min;                       // avancée commune, pour l'affiche
  const etat     = etatPoster(nv.min, defi.objectif);
  const coop     = etatCoop(defi, moi);
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
              className="flex-1 rounded-xl py-2.5 text-[16px] font-semibold text-white disabled:opacity-60"
              style={{ background: "#E8620C" }}>
              Arrêter le relais
            </button>
            <button onClick={() => setConfirmeArret(false)}
              className="rounded-xl px-4 py-2.5 text-[16px] font-semibold"
              style={{ color: "var(--text-2)", background: "rgba(var(--text-3-rgb), .10)" }}>
              Garder
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirmeArret(true)}
          className="w-full py-2 text-[13px] font-medium"
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

          <h1 className="mt-7 text-[26px] font-bold leading-tight" style={{ color: "var(--text-0)" }}>
            Il manque une personne.
          </h1>
          <p className="mt-2 text-[16px] leading-relaxed" style={{ color: "var(--text-body)" }}>
            Le relais démarre à la seconde où quelqu&apos;un rejoint. Envoie-lui
            ce lien, il n&apos;a pas besoin d&apos;avoir Vaiiya pour l&apos;ouvrir.
          </p>

          {/* L'affiche en jeu se nomme : c'est ce qui rend la deuxième
              semaine désirable, puisque la série tourne d'un relais à
              l'autre (Sillage, puis Aurore, puis Brume). */}
          <p className="mt-3 text-[13px]" style={{ color: "var(--text-3)" }}>
            Vous jouez pour <b style={{ color: "var(--or-encre)" }}>{serie.nom}</b> · {serie.promesse.toLowerCase()}.
          </p>

          {lien && (
            <>
              <button
                onClick={() => partager(lien, "Rejoins mon relais sur Vaiiya", "On grimpe les 4 maillons ensemble. On y va ?")}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[16px] font-semibold text-white transition-transform active:scale-[.98]"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
              >
                <Share2 className="h-5 w-5" />
                Envoyer l&apos;invitation
              </button>

              <button
                onClick={() => partager(lien, "", "")}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[16px] font-medium"
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

          <h1 className="mt-7 text-[26px] font-bold leading-tight" style={{ color: "var(--text-0)" }}>
            {gagne ? "L’affiche est à vous." : "La semaine est finie."}
          </h1>
          <p className="mt-2 text-[16px] leading-relaxed" style={{ color: "var(--text-body)" }}>
            {gagne
              ? `« ${serie.nom} » rejoint ta galerie. Tu peux la réutiliser en fond de tes prochains posters de perf.`
              : `Vous êtes allés à ${faits} jour${faits > 1 ? "s" : ""} sur ${defi.objectif}. L’affiche garde ce que vous avez dévoilé.`}
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

  /* ── En cours (co-op) ─────────────────────────────────────── */
  return (
    <Cadre equipier={equipier} fil={fil}>
      <div className="mx-auto w-full max-w-[360px]">
        {/* Le trésor à dévoiler */}
        <PosterDefi
          serie={defi.serie}
          etat={etat}
          hauteurMax="34vh"
          noms={noms}
          titre={serie.nom}
          devoile={devoile}
          className="shadow-2xl"
        />
        <p className="mt-3 text-center text-[12.5px] font-medium" style={{ color: "var(--text-3)" }}>
          {finie
            ? "L’affiche reste comme elle est."
            : <>Vous dévoilez <b style={{ color: "var(--exp-encre)" }}>{serie.nom}</b> ensemble</>}
        </p>

        {/* Votre montée : les 4 maillons + les deux joueurs (vraies PDP) */}
        <MonteeCoop
          objectif={defi.objectif}
          mine={nv.mine}
          partner={nv.partner}
          restants={restants}
          moiAvatar={user?.avatar ?? null}
          equipier={equipier}
        />

        {finie ? (
          <p className="mt-4 text-center text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            La semaine est finie. Vous en relancerez une quand vous voulez.
          </p>
        ) : coop.quoi === "a_moi" ? (
          <>
            {/* Ta marche du jour */}
            <div className="mt-4 rounded-[20px] p-4"
              style={{ background: "linear-gradient(135deg, rgba(139,92,246,.10), rgba(193,59,193,.06))", border: "1px solid rgba(139,92,246,.22)" }}>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--or-encre)" }}>Ta marche</span>
              <div className="mt-1 flex items-baseline gap-2">
                <b className="text-[24px] font-extrabold leading-none" style={{ color: "var(--text-0)" }}>Maillon {coop.maillon}</b>
                <span className="text-[13px] font-bold" style={{ color: "var(--exp-encre)" }}>· {coop.maillon} mouvement{coop.maillon > 1 ? "s" : ""}</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "var(--text-1)" }}>
                Une séance courte, donnée par le relais. Termine-la et ton maillon est franchi.
              </p>
              <span className="mt-2.5 inline-block rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-[0.05em]"
                style={{ background: "rgba(245,177,32,.16)", color: "var(--or-encre)", border: "1px solid rgba(245,177,32,.4)" }}>
                À ton niveau · {NIVEAU_FR[niveau]}
              </span>
            </div>
            <button
              onClick={() => {
                const exos = genererMaillon(coop.maillon, niveau);
                launchWorkout({
                  sessionId: sessionIdMaillon(defi.runId, coop.maillon),
                  title: `Maillon ${coop.maillon}`,
                  duration: dureeMaillon(exos),
                  difficulty: "Relais",
                  exerciseList: exos,
                  relaisRunId: defi.runId,
                });
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[16px] font-bold text-white transition-transform active:scale-[.98]"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)", boxShadow: "0 12px 30px rgba(139,92,246,.36)" }}
            >
              <Dumbbell className="h-5 w-5" />
              Lancer mon maillon
            </button>
            <p className="mt-3 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
              2 maillons par jour maximum · finissable en 2 jours.
            </p>
          </>
        ) : coop.quoi === "bloque" ? (
          <BoiteAttente
            fait={`Ton maillon ${nv.mine} est fait`}
            titre={`On attend ${coop.equipier?.pseudo ?? "ton binôme"}`}
            texte={`Le maillon ${Math.min(nv.mine + 1, defi.objectif)} se débloque dès que ${coop.equipier?.pseudo ?? "ton binôme"} a fait le sien. Un petit coup de pression ?`}
            equipier={coop.equipier}
            fil={fil}
            onEcrire={() => fil && router.push(`/communaute/${fil}`)}
          />
        ) : coop.quoi === "fini_pour_moi" ? (
          <BoiteAttente
            fait={`Tu as bouclé tes ${defi.objectif} maillons`}
            titre={`On attend ${coop.equipier?.pseudo ?? "ton binôme"}`}
            texte={`L’affiche se complète dès que ${coop.equipier?.pseudo ?? "ton binôme"} a fini les siens.`}
            equipier={coop.equipier}
            fil={fil}
            onEcrire={() => fil && router.push(`/communaute/${fil}`)}
          />
        ) : coop.quoi === "plafond_jour" ? (
          <p className="mt-4 text-center text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            Tu as fait tes 2 maillons du jour. Reviens demain pour la suite.
          </p>
        ) : null}

        {arret}

        <div className="mt-8">
          <RangeeBadges badges={badgesDuDefi(defi.serie)} debloques={debloques} />
        </div>
      </div>
    </Cadre>
  );
}

/** Libellé français du niveau d'entraînement (pour « à ton niveau · … »). */
const NIVEAU_FR: Record<string, string> = {
  debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé",
};

/* ─── La montée co-op : les 4 maillons + les deux joueurs ─────
   Violet = maillon fait par les DEUX, jaune = le maillon commun en cours.
   Les avatars sont les VRAIES photos de profil, avec un liseré de couleur
   (jaune = toi, violet = le binôme). On ne désigne jamais un retard comme
   une faute. */
function MonteeCoop({ objectif, mine, partner, restants, moiAvatar, equipier }: {
  objectif: number; mine: number; partner: number; restants: number;
  moiAvatar: string | null; equipier: Membre | null;
}) {
  const min = Math.min(mine, partner);
  return (
    <div className="mt-5 rounded-[22px] p-4"
      style={{ background: "rgb(var(--surface-rgb))", border: "1px solid rgba(var(--text-3-rgb), .12)", boxShadow: "var(--ombre-pose)" }}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.13em]" style={{ color: "var(--text-3)" }}>Votre montée</span>
        <span className="text-[11px] font-bold" style={{ color: "var(--text-3)" }}>
          {restants > 1 ? `${restants} j restants` : "dernier jour"}
        </span>
      </div>
      <div className="flex gap-[7px]">
        {Array.from({ length: objectif }).map((_, i) => {
          const done = min > i;    // les DEUX ont fait ce maillon
          const now  = i === min;  // le maillon commun en cours
          const fond = done
            ? "linear-gradient(90deg,#8B5CF6,#C13BC1)"
            : now ? "linear-gradient(90deg,#F5B120,#FFD34E)" : "rgba(var(--text-3-rgb), .16)";
          return (
            <motion.span key={i} initial={false} animate={{ opacity: 1 }}
              className="h-2 flex-1 rounded-full" style={{ background: fond }} />
          );
        })}
      </div>
      <div className="mt-3.5 flex gap-2.5">
        <JoueurChip avatar={moiAvatar} pseudo="Toi" ring="jaune" compte={`Maillon ${mine} / ${objectif}`} encre="var(--or-encre)" />
        <JoueurChip avatar={equipier?.avatar ?? null} pseudo={equipier?.pseudo ?? "L’autre"} ring="violet" compte={`Maillon ${partner} / ${objectif}`} encre="var(--exp-encre)" />
      </div>
    </div>
  );
}

/** La photo de profil, ronde, avec un liseré de couleur. Repli sur
 *  l'initiale seulement s'il n'y a pas de photo : on garde la vraie PDP
 *  de l'utilisateur quand elle existe (choix de Louis). */
function Pdp({ avatar, pseudo, ring, taille = 34, pulse = false }: {
  avatar: string | null; pseudo: string; ring: "jaune" | "violet"; taille?: number; pulse?: boolean;
}) {
  const couleur = ring === "jaune" ? "#F5B120" : "#8B5CF6";
  const halo = ring === "jaune" ? "rgba(245,177,32,.28)" : "rgba(139,92,246,.24)";
  const ombre = `0 0 0 2.5px ${couleur}, 0 0 0 4px ${halo}` + (pulse ? ", 0 0 0 11px rgba(139,92,246,.08)" : "");
  if (avatar) {
    return (
      <Image src={avatar} alt="" width={taille} height={taille} unoptimized
        className="shrink-0 rounded-full object-cover"
        style={{ width: taille, height: taille, boxShadow: ombre }} />
    );
  }
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-extrabold"
      style={{ width: taille, height: taille, fontSize: Math.round(taille * 0.4),
        background: "linear-gradient(135deg,#DCDAE6,#EEECF4)", color: "#8A8698", boxShadow: ombre }}>
      {pseudo.charAt(0).toUpperCase()}
    </span>
  );
}

function JoueurChip({ avatar, pseudo, ring, compte, encre }: {
  avatar: string | null; pseudo: string; ring: "jaune" | "violet"; compte: string; encre: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[14px] px-2.5 py-2"
      style={{ background: "rgba(var(--text-3-rgb), .07)", border: "1px solid rgba(var(--text-3-rgb), .10)" }}>
      <Pdp avatar={avatar} pseudo={pseudo} ring={ring} />
      <span className="min-w-0">
        <b className="block truncate text-[12px] font-extrabold leading-none" style={{ color: "var(--text-0)" }}>{pseudo}</b>
        <span className="mt-1 block text-[11px] font-bold" style={{ color: encre }}>{compte}</span>
      </span>
    </div>
  );
}

/** L'état d'attente (bloqué / fini pour moi) : ton maillon marqué fait,
 *  la PDP du binôme qui « pulse », et un bouton pour le relancer. */
function BoiteAttente({ fait, titre, texte, equipier, fil, onEcrire }: {
  fait: string; titre: string; texte: string; equipier: Membre | null; fil: string | null; onEcrire: () => void;
}) {
  return (
    <div className="mt-4 rounded-[20px] p-[18px] text-center"
      style={{ background: "rgb(var(--surface-rgb))", border: "1px solid rgba(var(--text-3-rgb), .12)", boxShadow: "var(--ombre-pose)" }}>
      <span className="mb-3.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold"
        style={{ color: "var(--or-encre)", background: "rgba(245,177,32,.14)", border: "1px solid rgba(245,177,32,.4)" }}>
        <Check className="h-3 w-3" strokeWidth={3} /> {fait}
      </span>
      <div className="mb-2.5 flex justify-center">
        <Pdp avatar={equipier?.avatar ?? null} pseudo={equipier?.pseudo ?? "?"} ring="violet" taille={56} pulse />
      </div>
      <p className="text-[16px] font-extrabold" style={{ color: "var(--text-0)" }}>{titre}</p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>{texte}</p>
      {fil && (
        <button onClick={onEcrire}
          className="mt-3.5 inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-[15px] font-bold"
          style={{ borderColor: "rgba(var(--text-3-rgb), .18)", color: "var(--exp-encre)" }}>
          <MessageCircle className="h-4 w-4" /> Écrire à {equipier?.pseudo ?? "ton binôme"}
        </button>
      )}
    </div>
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
                className="flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold text-white"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
              >
                {equipier.pseudo.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate text-[16px] font-semibold" style={{ color: "var(--text-1)" }}>
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
    if (a) setTexte(a === "gagne" ? "Aperçu, affiche terminée" : `Aperçu, ${a} jour${Number(a) > 1 ? "s" : ""} franchi${Number(a) > 1 ? "s" : ""}`);
  }, []);
  if (!texte) return null;
  return (
    <p
      className="mb-3 rounded-xl px-3 py-2 text-center text-[13px] font-semibold"
      style={{ background: "rgba(245,177,32,.14)", color: "#E8620C" }}
    >
      {texte} · aucune donnée réelle
    </p>
  );
}
