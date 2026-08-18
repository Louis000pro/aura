"use client";

/* ════════════════════════════════════════════════════════════════════
   GuideContext — qui accompagne cette personne, Nora ou Sasha.

   ⚠️ PHASE 1A : CE PROVIDER N'EST MONTÉ NULLE PART, ET C'EST VOULU.
   L'infrastructure est prête, elle n'est pas active. Tant que
   `/bienvenue` n'existe pas, personne ne doit pouvoir être renvoyé vers
   un écran de choix qui n'existe pas ; et tant que la migration
   `20260818_guide_id.sql` n'est pas collée, une lecture montée dans le
   layout ferait une requête en échec à chaque ouverture, pour tout le
   monde. Le brancher est la PREMIÈRE étape de la phase 1B :
   `<GuideProvider>` dans `app/layout.tsx`, à l'intérieur d'`AuthProvider`.

   ── Pourquoi un contexte séparé, et pas `enrichUser` ────────────────
   Parce que le select d'`enrichUser` (AuthContext) est défensif : quand
   il échoue, il rejoue une requête réduite à `pseudo, avatar_url,
   is_admin`. Y ajouter `guide_id` avant que la colonne existe ferait
   donc tomber TOUT LE MONDE dans ce repli, et le repli perd
   `is_premium`, `is_certified` et `is_banned` au passage : des abonnés
   redeviendraient gratuits, et un compte banni redeviendrait normal. Le
   Guide reste donc à l'écart de cette mécanique, dans sa propre lecture.

   ── Les quatre états, à ne jamais réduire à trois ───────────────────
   `chargement` la lecture n'est pas finie.
   `aucun`      la lecture a RÉUSSI et `guide_id` vaut réellement NULL.
   `actif`      Nora ou Sasha est connu.
   `inconnu`    la lecture a échoué : colonne absente, réseau coupé,
                session expirée, profil introuvable. On ne sait pas s'il
                existe un Guide.

   `aucun` et `inconnu` se ressemblent et ne veulent pas dire la même
   chose. Seul `aucun` autorisera une redirection vers `/bienvenue`.
   Les confondre enfermerait dans un écran de choix quelqu'un qui a déjà
   choisi et qui est simplement hors ligne, et cet écran a besoin du
   réseau pour écrire : il ne pourrait même pas en sortir.
   ════════════════════════════════════════════════════════════════════ */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { GuideId, GuideRef } from "@/lib/guides";

/** Diffusé après un changement de Guide confirmé en base, sur le modèle de
 *  `THEME_EVENT` (hooks/useTheme) : de quoi resynchroniser ce qui vit hors
 *  du contexte. À l'intérieur, le contexte suffit. */
export const GUIDE_EVENT = "vaiiya:guide-change";

export type EtatGuide = "chargement" | "aucun" | "actif" | "inconnu";

export type ValeurGuide = {
  etat: EtatGuide;
  /** Le Guide, ou `null` dès que l'état n'est pas `actif`. */
  guide: GuideRef;
  /** Écrit le choix en base. Rend `false` si l'écriture a échoué, et dans ce
   *  cas RIEN n'a bougé : pas de faux succès, l'appelant doit le dire. */
  choisirGuide: (g: GuideId) => Promise<boolean>;
  /** Relit le profil (retour en ligne, réparation de profil, changement
   *  fait sur un autre appareil). */
  relire: () => void;
};

function estGuide(v: unknown): v is GuideId {
  return v === "nora" || v === "sasha";
}

/* ── Le cache local ──────────────────────────────────────────────────
   Il ne sert qu'à UNE chose : éviter qu'une lecture impossible (avion,
   métro, PWA hors ligne) ne fasse retomber en `inconnu` quelqu'un dont
   on connaît déjà le Guide. Il ne peut donc jamais produire `aucun` :
   l'absence de cache ne prouve rien, seule la base peut dire NULL.

   Il n'est écrit qu'après une confirmation de la base, lecture ou
   écriture. C'est ce qui l'empêche de devenir un défaut caché. */
const cleCache = (userId: string) => `vaiiya_guide_${userId}`;

function lireCache(userId: string): GuideId | null {
  try {
    const v = localStorage.getItem(cleCache(userId));
    return estGuide(v) ? v : null;
  } catch { return null; }
}

function ecrireCache(userId: string, g: GuideId | null) {
  try {
    if (g) localStorage.setItem(cleCache(userId), g);
    else localStorage.removeItem(cleCache(userId));
  } catch { /* navigation privée, quota : le cache est un confort */ }
}

/* Valeur rendue quand le hook est appelé HORS provider, ce qui est le cas
   normal en phase 1A puisque rien ne le monte. `inconnu` ne redirige
   jamais et `choisirGuide` ne prétend pas avoir écrit : oublier de monter
   le provider ne peut donc bloquer personne, seulement priver le Guide de
   sa voix. */
const HORS_PROVIDER: ValeurGuide = {
  etat: "inconnu",
  guide: null,
  choisirGuide: async () => false,
  relire: () => {},
};

const Ctx = createContext<ValeurGuide | null>(null);

export function useGuideActif(): ValeurGuide {
  const c = useContext(Ctx);
  if (c) return c;
  if (process.env.NODE_ENV !== "production") {
    console.warn("[guide] useGuideActif() hors <GuideProvider> : état « inconnu ». Monte le provider dans app/layout.tsx.");
  }
  return HORS_PROVIDER;
}

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  /* Un seul état, qui porte le compte auquel il se rapporte. C'est ce
     `pour` qui évite de remettre l'état à plat dans un effet quand on
     change de compte : la valeur exposée plus bas est simplement dérivée
     au rendu, donc jamais celle du compte précédent. */
  const [lu, setLu] = useState<{ pour: string; etat: EtatGuide; guide: GuideRef } | null>(null);
  const [tick, setTick] = useState(0);

  /* Une lecture partie pour un compte ne doit jamais écrire l'état d'un
     autre : on jette les réponses qui arrivent après un changement. */
  const course = useRef(0);

  const relire = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const jeton = ++course.current;

    /* Visiteur anonyme : la question ne se pose pas, et il n'y a rien à
       lire. La valeur dérivée plus bas rend déjà « inconnu ». Ce n'est
       surtout pas « aucun », qui voudrait dire « cette personne n'a pas
       choisi » et enverrait toute la vitrine publique sur l'écran de
       choix. */
    if (!userId) return;

    (async () => {
      // Valeur déjà confirmée par le passé : on l'affiche tout de suite,
      // la base la confirmera ou la corrigera juste après.
      const cache = lireCache(userId);
      if (cache && jeton === course.current) {
        setLu({ pour: userId, etat: "actif", guide: cache });
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("guide_id")
        .eq("id", userId)
        .maybeSingle();

      if (jeton !== course.current) return;

      // Colonne absente (SQL pas encore collé), réseau coupé, session
      // expirée : on ne sait pas. Si le cache tient une valeur confirmée,
      // elle reste vraie, donc on ne la jette pas.
      if (error) {
        if (!cache) setLu({ pour: userId, etat: "inconnu", guide: null });
        return;
      }

      // Profil introuvable : `enrichUser` le répare de son côté, et de
      // toute façon on n'aurait aucune ligne où écrire le Guide.
      if (!data) { setLu({ pour: userId, etat: "inconnu", guide: null }); return; }

      const v = (data as { guide_id?: unknown }).guide_id;

      if (estGuide(v)) {
        ecrireCache(userId, v);
        setLu({ pour: userId, etat: "actif", guide: v });
        return;
      }

      if (v === null || v === undefined) {
        // La seule façon d'obtenir « aucun » : la base a répondu, et elle
        // dit qu'il n'y a pas de Guide.
        ecrireCache(userId, null);
        setLu({ pour: userId, etat: "aucun", guide: null });
        return;
      }

      // Impossible via l'app (la contrainte CHECK l'interdit) : valeur
      // écrite à la main en console. On ne la traite pas comme « aucun »,
      // pour ne pas réécrire par-dessus une intention qu'on ne comprend pas.
      console.warn("[guide] valeur inattendue dans profiles.guide_id :", v);
      setLu({ pour: userId, etat: "inconnu", guide: null });
    })();
  }, [userId, tick]);

  const choisirGuide = useCallback(async (g: GuideId): Promise<boolean> => {
    if (!userId) return false;
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ guide_id: g })
      .eq("id", userId);

    // Écriture refusée : on ne touche à rien et on le dit. Un état local
    // passé à « actif » sur une écriture ratée, c'est un choix qui
    // disparaît au prochain chargement, sans que personne comprenne
    // pourquoi.
    if (error) {
      console.warn("[guide] écriture de guide_id impossible :", error.message);
      return false;
    }

    ecrireCache(userId, g);
    setLu({ pour: userId, etat: "actif", guide: g });
    if (typeof window !== "undefined") window.dispatchEvent(new Event(GUIDE_EVENT));
    return true;
  }, [userId]);

  /* Dérivé au rendu : tant que la lecture en cours ne porte pas sur le
     compte courant, on n'expose ni son état ni son Guide. */
  const aJour = lu && lu.pour === userId;
  const etat: EtatGuide = aJour ? lu.etat : userId ? "chargement" : "inconnu";
  const guide: GuideRef = aJour ? lu.guide : null;

  return (
    <Ctx.Provider value={{ etat, guide, choisirGuide, relire }}>
      {children}
    </Ctx.Provider>
  );
}
