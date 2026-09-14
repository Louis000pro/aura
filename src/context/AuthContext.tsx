"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { fetchAuth } from "@/lib/fetchAuth";
import type { Session, User as SBUser } from "@supabase/supabase-js";

export type User = {
  id: string;
  pseudo: string;
  name: string;
  lastName: string;
  email: string;
  avatar?: string;
  is_admin?: boolean;
  is_certified?: boolean;
  is_premium?: boolean;
};

type AuthError = { message: string } | null;

type AuthCtx = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  justLoggedIn: boolean;
  isNewUser: boolean;
  signUp: (d: { pseudo: string; name: string; lastName: string; email: string; password: string }) => Promise<AuthError>;
  signIn: (d: { email: string; password: string }) => Promise<AuthError>;
  signInWithGoogle: () => Promise<AuthError>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthError>;
  clearWelcome: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

function mapUser(sbUser: SBUser, profile?: { pseudo?: string; avatar_url?: string; is_admin?: boolean; is_certified?: boolean; is_premium?: boolean } | null): User {
  const m = sbUser.user_metadata ?? {};
  return {
    id: sbUser.id,
    pseudo: profile?.pseudo ?? m.pseudo ?? sbUser.email?.split("@")[0] ?? "utilisateur",
    name: m.name ?? (m.full_name as string | undefined)?.split(" ")[0] ?? "",
    lastName: m.last_name ?? (m.full_name as string | undefined)?.split(" ").slice(1).join(" ") ?? "",
    email: sbUser.email ?? "",
    avatar: profile?.avatar_url ?? m.avatar_url ?? m.picture,
    is_admin: profile?.is_admin ?? false,
    is_certified: profile?.is_certified ?? false,
    is_premium: profile?.is_premium ?? false,
  };
}

/** Vrai si les deux objets décrivent exactement le même compte, champ par champ. */
function memeUser(a: User, b: User): boolean {
  return a.id === b.id
    && a.pseudo === b.pseudo
    && a.name === b.name
    && a.lastName === b.lastName
    && a.email === b.email
    && a.avatar === b.avatar
    && !!a.is_admin === !!b.is_admin
    && !!a.is_certified === !!b.is_certified
    && !!a.is_premium === !!b.is_premium;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [user, setUser]               = useState<User | null>(null);
  const [session, setSession]         = useState<Session | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [isNewUser, setIsNewUser]     = useState(false);
  const initialized = useRef(false);
  /* ⚠️ LE NUMÉRO DE LA LECTURE EN COURS, ET IL N'EST PAS DÉCORATIF.
     `enrichUser` lance une lecture asynchrone puis écrit `setUser`. Elle est
     appelée à chaque évènement d'authentification (session initiale,
     connexion, rafraîchissement de jeton) et par `refreshProfile`, donc
     plusieurs lectures peuvent se chevaucher. Deux conséquences réelles
     sans ce compteur :
       · une déconnexion pendant une lecture en vol était ANNULÉE par elle
         (`setUser(null)` puis, une fraction de seconde après, `setUser(…)`) :
         l'app se croyait connectée avec une session morte, donc tous les
         écrans interrogeaient Supabase sans jeton et revenaient vides ;
       · deux comptes enchaînés pouvaient se croiser, et c'est la lecture la
         plus LENTE qui gagnait, pas la plus récente.
     Toute écriture issue d'une lecture périmée est donc jetée. Le
     `setUser` SYNCHRONE du début, lui, est l'intention de l'appelant : il
     n'a rien à vérifier. */
  const lecture = useRef(0);

  /* ⚠️ UNE VALEUR IDENTIQUE NE DOIT PAS CRÉER UN NOUVEL OBJET, ET CE N'EST PAS
     une élégance : une trentaine d'effets de l'app ont `user` dans leurs
     dépendances, donc chaque nouvelle identité relance leurs lectures. La
     journée de l'accueil, à elle seule, en refait sept ou huit
     (`useJournee.charger` dépend de `user`). Or `enrichUser` posait DEUX
     objets neufs par évènement d'authentification, et il y en a au moins un
     par heure (rafraîchissement du jeton) : on payait donc ces lectures en
     double, pour un compte qui n'avait pas changé d'un caractère. */
  const poserUser = (u: User) => {
    setUser((prev) => (prev && memeUser(prev, u) ? prev : u));
  };

  // Enrichit l'utilisateur avec le pseudo/avatar depuis la table profiles (non-bloquant)
  const enrichUser = (sbUser: SBUser) => {
    const numero = ++lecture.current;
    const perimee = () => lecture.current !== numero;
    /* ⚠️ ET ON NE REDESCEND JAMAIS À `user_metadata` POUR UN COMPTE DÉJÀ
       CHARGÉ. C'était le second défaut du même geste : ce `setUser` partait
       inconditionnellement, or les metadata ne portent ni `is_premium`, ni
       `is_certified`, ni `is_admin`, et pas toujours le pseudo (un compte
       Google n'en a pas). À chaque rafraîchissement de jeton, un abonné
       redevenait donc un compte gratuit et un pseudo Google redevenait le
       début de son adresse e-mail, le temps d'un aller-retour avec la base :
       cadenas Premium, bouclier d'administration et pseudo clignotaient.
       Ce qu'on a déjà est strictement plus riche ; on ne le remplace que
       s'il s'agit d'un AUTRE compte, ou du premier chargement. */
    setUser((prev) => (prev && prev.id === sbUser.id ? prev : mapUser(sbUser)));
    // Puis on fetch le profil DB et on met à jour (async, non-bloquant)
    (async () => {
      let res = await supabase
        .from("profiles")
        .select("pseudo, avatar_url, is_admin, is_banned, is_certified, is_premium")
        .eq("id", sbUser.id)
        .maybeSingle();
      /* ⚠️ LE REPLI NE VISE QUE LES COLONNES ABSENTES, ET C'EST TOUT L'ENJEU.
         Il retirait `is_banned`, `is_certified` et `is_premium` sur N'IMPORTE
         QUELLE erreur, réseau compris : un accroc passager suffisait donc à
         faire passer un abonné pour un compte gratuit le temps de sa session,
         et à sauter la vérification de suspension. On ne retente sans elles
         que si la base dit qu'elle ne les connaît pas. */
      if (res.error && /is_banned|is_certified|is_premium|schema cache|does not exist|column/i.test(res.error.message)) {
        res = await supabase
          .from("profiles")
          .select("pseudo, avatar_url, is_admin")
          .eq("id", sbUser.id)
          .maybeSingle();
      }
      if (perimee()) return;
      const data = res.data as ({ pseudo?: string; avatar_url?: string; is_admin?: boolean; is_banned?: boolean; is_certified?: boolean; is_premium?: boolean } | null);

      // Compte banni → déconnexion immédiate
      if (data && (data as { is_banned?: boolean }).is_banned) {
        try { await supabase.auth.signOut(); } catch { /* ignore */ }
        if (perimee()) return;
        setUser(null);
        if (typeof window !== "undefined") {
          window.alert("Ton compte a été suspendu. Si tu penses que c’est une erreur, contacte le support.");
        }
        return;
      }

      {
        if (data && data.pseudo && String(data.pseudo).trim()) {
          poserUser(mapUser(sbUser, data));
        } else {
          // Profil manquant OU pseudo vide (compte Google) → création / réparation
          if (data) poserUser(mapUser(sbUser, data)); // affichage immédiat avec ce qu'on a
          // `fetchAuth` pose le jeton : la route identifie le compte par là,
          // elle n'accepte plus d'identifiant venu du client.
          void fetchAuth("/api/me/ensure-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: sbUser.email,
              pseudo: (sbUser.user_metadata?.pseudo as string | undefined) ?? null,
              full_name: (sbUser.user_metadata?.full_name as string | undefined) ?? (sbUser.user_metadata?.name as string | undefined) ?? null,
              avatar_url: (sbUser.user_metadata?.avatar_url as string | undefined) ?? null,
            }),
          }).then((r) => r.json()).then((res) => {
            if (perimee()) return;
            if (res?.profile) poserUser(mapUser(sbUser, res.profile));
          }).catch(() => {});
        }
      }
    })();
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        enrichUser(data.session.user);
      }
      setIsLoading(false);
      initialized.current = true;
    }).catch(() => {
      // Sécurité : si getSession() lève une exception (réseau, etc.)
      setIsLoading(false);
      initialized.current = true;
    });

    // Sécurité timeout : si rien ne répond en 3s, on force isLoading = false
    const timeout = setTimeout(() => {
      if (!initialized.current) {
        setIsLoading(false);
        initialized.current = true;
      }
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if (sess) {
        setSession(sess);
        enrichUser(sess.user);
        if (event === "SIGNED_IN" && initialized.current) {
          setJustLoggedIn(true);
          const createdAt = new Date(sess.user.created_at).getTime();
          setIsNewUser(Date.now() - createdAt < 15_000);
        }
      } else {
        // Une lecture de profil encore en vol appartient à la session qui
        // vient de mourir : on la périme, sinon elle repose un `user` juste
        // après ce `setUser(null)`.
        lecture.current++;
        setSession(null);
        setUser(null);
        setJustLoggedIn(false);
      }
      if (!initialized.current) {
        setIsLoading(false);
        initialized.current = true;
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp: AuthCtx["signUp"] = async ({ pseudo, name, lastName, email, password }) => {
    // Normalise les espaces (évite les pseudos "  La France  " qui cassent les URLs/profils)
    const clean = (s: string) => s.replace(/\s+/g, " ").trim();
    pseudo = clean(pseudo); name = clean(name); lastName = clean(lastName);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { pseudo, name, last_name: lastName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) return { message: error.message };
    // Supabase ne retourne pas d'erreur pour un email déjà utilisé,
    // mais l'utilisateur retourné aura un tableau "identities" vide.
    if (data.user?.identities?.length === 0) {
      return { message: "Un compte existe déjà avec cet email. Connecte-toi." };
    }
    return null;
  };

  const signIn: AuthCtx["signIn"] = async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { message: error.message } : null;
  };

  const signInWithGoogle: AuthCtx["signInWithGoogle"] = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    return error ? { message: error.message } : null;
  };

  /* ⚠️ SE DÉCONNECTER N'EST PAS UNE NAVIGATION, C'EST UNE REMISE À ZÉRO, ET LE
     BOUTON QUI L'APPELLE DOIT FAIRE UNE VRAIE NAVIGATION (`window.location`),
     jamais un `router.push`. Un `router.push` garde l'arbre React monté : la
     cloche garde les notifications du compte précédent et son compteur de
     non-lus, le profil corporel de la nutrition (âge, poids, sexe) reste en
     mémoire, la journée et le programme aussi. Une trentaine d'écrans gardent
     ainsi un état par compte, et aucun ne le remet à zéro de lui-même.
     Repartir du document est la seule garantie qui couvre les trente d'un
     coup, et c'est aussi le comportement attendu d'une déconnexion.
     Cette fonction reste volontairement pure : elle ferme la session, elle
     ne décide pas où va la personne ensuite. */
  const signOut = async () => { await supabase.auth.signOut(); };

  const resetPassword: AuthCtx["resetPassword"] = async (email) => {
    // Envoi via Resend (fiable) au lieu de l'email Supabase intégré (limité/spam)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        return { message: j.error ?? "L’envoi a échoué, réessaie." };
      }
      return null;
    } catch {
      return { message: "Erreur réseau, réessaie." };
    }
  };

  /* Les codes de confirmation d'inscription NE passent pas par Supabase :
     ils sont émis et vérifiés par /api/auth/send-otp et /api/auth/verify-otp,
     qui envoient l'e-mail via Resend et scellent le jeton en HMAC. Les deux
     méthodes Supabase équivalentes (`verifyOtp` / `resend`) étaient exposées
     ici sans que personne ne les appelle, et proposaient un second chemin
     d'authentification silencieusement mort. Retirées le 2026-08-11. */

  const clearWelcome = () => setJustLoggedIn(false);

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) enrichUser(data.session.user);
  };

  return (
    <AuthContext.Provider value={{
      user, session, isLoading, justLoggedIn, isNewUser,
      signUp, signIn, signInWithGoogle, signOut, resetPassword,
      clearWelcome, logout: signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
};
