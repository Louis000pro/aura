"use client";

/* ═══ Les premiers pas, montés ═══
   `moteur.ts` dessine et décide ; ici, on le relie au compte et à la base.
   Les réponses restent sur l'appareil tant que le compte n'existe pas
   (`lib/premiersPas/reponses.ts`) : c'est l'écriture ci-dessous qui les fait
   partir, une seule fois.

   ⚠️ L'ÉTAT DU GUIDE N'EST PAS LU ICI POUR CHOISIR L'ÉCRAN DE DÉPART D'UN
   COMPTE NEUF. Seules comptent les réponses gardées : elles disent où en
   était la personne, y compris après l'aller-retour chez Google.

   ⚠️ UNE ÉCRITURE RATÉE NE BLOQUE RIEN. Personne ne doit rester devant son
   téléphone parce qu'une colonne n'a pas répondu : on passe, on le dit dans
   la console, et ce qui manque se rattrape dans « Mon corps et mes objectifs ». */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useGuideActif } from "@/context/GuideContext";
import { enregistrerConsentement } from "@/lib/consentementSante";
import { localDateStr } from "@/lib/dates";
import { destinationDepuisUrl, destinationInterne } from "@/lib/destinationInterne";
import { enregistrerJours } from "@/lib/joursEntrainement";
import { persistLieu } from "@/lib/planning";
import { etatVide, lireParcours, lireSuite, marquerPremiersPas, oublierParcours, regimesDe, retenirSuite, versLieu, versProfil, type EtatParcours } from "@/lib/premiersPas/reponses";
import { enregistrerProfil } from "@/lib/profilOnboarding";
import { getOrCreateProgramme } from "@/lib/programme";
import { subscribeToPush } from "@/lib/push";
import { createClient } from "@/lib/supabase";
import { demarrerParcours, type ConfigParcours } from "./moteur";
import "./premiersPas.css";

const json = async (chemin: string, corps: unknown) => {
  const res = await fetch(chemin, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  const donnees = await res.json().catch(() => ({}));
  return { ok: res.ok, donnees: donnees as { error?: string; token?: string; existe?: boolean } };
};

/** Tente une écriture, et ne laisse jamais son échec arrêter le parcours. */
async function tenter(nom: string, geste: () => Promise<unknown>) {
  try {
    await geste();
  } catch (e) {
    console.warn(`[premiers pas] ${nom} impossible :`, e);
  }
}

export default function PremiersPas() {
  const racine = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, isLoading, signIn, signInWithGoogle } = useAuth();
  const { etat, guide, choisirGuide } = useGuideActif();

  /* Le moteur vit hors de React : il lit le compte par une référence, tenue à
     jour à chaque rendu d'un effet, jamais pendant le rendu. */
  const fraiche = useRef({ user, etat, guide, signIn, signInWithGoogle, choisirGuide, router });
  useEffect(() => { fraiche.current = { user, etat, guide, signIn, signInWithGoogle, choisirGuide, router }; });

  /* ⚠️ Le moteur démarre une seule fois, quand la session ET le Guide sont
     connus : le relancer effacerait ce que la personne est en train de faire.
     `pret` retombe à faux au moment où le compte se crée, le temps de lire son
     Guide : c'est `moteur` qui empêche de repartir, et seul le départ de la page
     l'arrête. */
  const pret = !isLoading && (!user || etat !== "chargement");
  const moteur = useRef<{ vivant: boolean; arret?: () => void } | null>(null);
  useEffect(() => {
    const el = racine.current;
    if (!pret || !el || moteur.current) return;
    const m: { vivant: boolean; arret?: () => void } = { vivant: true };
    moteur.current = m;

    const gardee = lireParcours();
    const f = () => fraiche.current;
    /* ⚠️ La visite suppose un Guide choisi : sans lui, elle en montrerait un que
       personne n'a choisi. Le parcours repart alors du choix. */
    const visite = new URLSearchParams(window.location.search).get("visite") === "1" && !!f().user && f().etat !== "aucun";
    /* ⚠️ UN COMPTE QUI A DÉJÀ SON GUIDE REJOUE LE PARCOURS, IL NE LE REFAIT PAS.
       Louis le teste sur Vercel avec son vrai compte : ses réponses, son lieu et
       ses jours ne doivent pas être écrasés par un essai. Le parcours ne s'écrit
       que pour un compte qui n'a encore rien choisi. */
    let essai = false;
    const compteLa = () => new Promise<string | null>((fini) => {
      const debut = Date.now();
      const voir = () => {
        const id = f().user?.id;
        if (id) fini(id);
        else if (Date.now() - debut > 8000) fini(null);
        else setTimeout(voir, 120);
      };
      voir();
    });

    const ecrire: ConfigParcours["ecrire"] = async (e: EtatParcours) => {
      /* ⚠️ `signIn` rend la main avant que le contexte n'ait le compte : sans
         cette attente, ni le Guide ni les réponses ne partiraient. */
      const id = await compteLa();
      if (!id) return { numero: null };
      const supabase = createClient();
      const numero = async () => {
        const { data } = await supabase.from("profiles").select("member_number, pseudo, pseudo_choisi").eq("id", id).maybeSingle();
        const p = data as { member_number?: number | null; pseudo?: string | null; pseudo_choisi?: boolean } | null;
        /* Un compte Google choisit son pseudo en arrivant dans l'app : d'ici là,
           la carte garde le prénom plutôt qu'un pseudo fabriqué. */
        return { numero: p?.member_number ?? null, pseudo: p?.pseudo_choisi === false ? null : p?.pseudo ?? null };
      };
      essai = f().etat === "actif";
      if (essai) return numero();
      if (e.guide) await tenter("le Guide", () => f().choisirGuide(e.guide as "nora" | "sasha"));
      if (e.accord) await tenter("le consentement", () => enregistrerConsentement());
      await tenter("le profil", () => enregistrerProfil(id, versProfil(e)));
      const lieu = versLieu(e);
      if (lieu) await tenter("le lieu", () => persistLieu(id, lieu));
      await tenter("la durée", async () => {
        await supabase.from("contexte_entrainement").upsert({ user_id: id, duree_cible_min: e.duree }, { onConflict: "user_id" });
      });
      /* ⚠️ La semaine ne s'écrit pas : Vaiiya garde les jours choisis, et le
         programme se projette dessus. C'est la semaine que l'écran vient de montrer. */
      await tenter("les jours", () => enregistrerJours(id, e.jours.map((j) => j + 1), localDateStr()));
      await tenter("le programme", () => getOrCreateProgramme(id));
      /* Ce qu'on ne mange pas : sur l'appareil pour les recettes, et dans le
         compte pour le retrouver ailleurs. */
      try { localStorage.setItem(`vaiiya_diet_${id}`, JSON.stringify(regimesDe(e.sans))); } catch { /* stockage bloqué */ }
      await tenter("les aliments", () => supabase.auth.updateUser({ data: { aliments_exclus: e.sans } }));
      return numero();
    };

    const cfg: ConfigParcours = {
      /* ⚠️ « apres-compte » sans compte : Google a été refermé en chemin. On
         repart de la semaine, sinon la carte arriverait sans aucun compte. */
      depart: visite ? "visite" : gardee?.ecran === "apres-compte" && !f().user ? "semaine" : gardee?.ecran ?? "guide",
      etat: visite ? { ...etatVide(), guide: f().guide, prenom: f().user?.pseudo ?? "" } : gardee?.etat,
      prenomDefaut: f().user?.pseudo ?? "",
      connecte: () => !!f().user,
      pseudoLibre: async (pseudo) => {
        /* Une panne ne bloque personne : le serveur refusera un doublon. */
        const r = await json("/api/auth/login-pseudo", { identifiant: pseudo }).catch(() => null);
        return !r?.donnees.existe;
      },
      envoyerCode: async (email) => {
        const r = await json("/api/auth/send-otp", { email }).catch(() => null);
        if (!r) return { erreur: "Le code n'est pas parti. Vérifie ta connexion." };
        if (!r.ok || r.donnees.error || !r.donnees.token) return { erreur: r.donnees.error ?? "Le code n'est pas parti. Réessaie." };
        return { erreur: null, jeton: r.donnees.token };
      },
      verifierCode: async ({ jeton, code, pseudo, email, motDePasse, prenom }) => {
        const r = await json("/api/auth/verify-otp", { token: jeton, otp: code, pseudo, name: prenom, lastName: "", password: motDePasse }).catch(() => null);
        if (!r) return { erreur: "Vérifie ta connexion et réessaie." };
        if (!r.ok || r.donnees.error) return { erreur: r.donnees.error ?? "Code incorrect ou expiré." };
        const erreur = await f().signIn({ email, password: motDePasse });
        if (erreur) return { erreur: "Ton compte est créé. Connecte-toi avec ton e-mail et ton mot de passe." };
        return { erreur: null };
      },
      google: async () => {
        retenirSuite(destinationDepuisUrl());
        const erreur = await f().signInWithGoogle();
        return { erreur: erreur?.message ?? null };
      },
      ecrire,
      activerRappels: async () => { if (!essai) await tenter("les rappels", () => subscribeToPush()); },
      enregistrerSource: async (source) => {
        if (!essai) await tenter("la source", () => createClient().auth.updateUser({ data: { source_inscription: source } }));
      },
      peutInstaller: () => !!window.__vaiiyaInstallation,
      installer: async () => {
        const invite = window.__vaiiyaInstallation;
        if (!invite) return false;
        window.__vaiiyaInstallation = null;
        await invite.prompt();
        return true;
      },
      terminer: () => {
        const id = f().user?.id;
        if (id) marquerPremiersPas(id);
        const suite = destinationInterne(lireSuite(), destinationDepuisUrl());
        oublierParcours();
        f().router.replace(suite);
      },
    };

    /* ⚠️ Un compte qui a déjà répondu à l'ancien questionnaire choisit son Guide,
       et passe directement à la visite : il ne repasse pas les questions. */
    void (async () => {
      let dejaRepondu = false;
      if (f().user && f().etat === "aucun" && !gardee && !visite) {
        const { data } = await createClient().from("mon_profil").select("onboarding_completed").maybeSingle();
        dejaRepondu = (data as { onboarding_completed?: boolean } | null)?.onboarding_completed === true;
      }
      if (!m.vivant) return;
      m.arret = demarrerParcours(el, dejaRepondu
        ? { ...cfg, apresGuide: "visite", surGuide: (g) => { void tenter("le Guide", () => f().choisirGuide(g)); } }
        : cfg);
    })();
  }, [pret]);
  useEffect(() => () => {
    const m = moteur.current;
    if (m) { m.vivant = false; m.arret?.(); }
    moteur.current = null;
  }, []);

  return (
    <div className="pp-fond">
      <div className="pp-tel" ref={racine} />
    </div>
  );
}
