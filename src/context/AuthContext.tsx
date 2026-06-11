"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
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
  verifySignupOtp: (email: string, token: string) => Promise<AuthError>;
  resendSignupOtp: (email: string) => Promise<AuthError>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [user, setUser]               = useState<User | null>(null);
  const [session, setSession]         = useState<Session | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [isNewUser, setIsNewUser]     = useState(false);
  const initialized = useRef(false);

  // Enrichit l'utilisateur avec le pseudo/avatar depuis la table profiles (non-bloquant)
  const enrichUser = (sbUser: SBUser) => {
    // D'abord on set avec les metadata (immédiat, sans attendre la DB)
    setUser(mapUser(sbUser));
    // Puis on fetch le profil DB et on met à jour (async, non-bloquant)
    // Sélection défensive : si la colonne is_banned n'existe pas encore, on refetch sans.
    (async () => {
      let res = await supabase
        .from("profiles")
        .select("pseudo, avatar_url, is_admin, is_banned, is_certified, is_premium")
        .eq("id", sbUser.id)
        .maybeSingle();
      if (res.error) {
        res = await supabase
          .from("profiles")
          .select("pseudo, avatar_url, is_admin")
          .eq("id", sbUser.id)
          .maybeSingle();
      }
      const data = res.data as ({ pseudo?: string; avatar_url?: string; is_admin?: boolean; is_banned?: boolean; is_certified?: boolean; is_premium?: boolean } | null);

      // Compte banni → déconnexion immédiate
      if (data && (data as { is_banned?: boolean }).is_banned) {
        try { await supabase.auth.signOut(); } catch { /* ignore */ }
        setUser(null);
        if (typeof window !== "undefined") {
          window.alert("Ton compte a été suspendu. Si tu penses que c'est une erreur, contacte le support.");
        }
        return;
      }

      {
        if (data && data.pseudo && String(data.pseudo).trim()) {
          setUser(mapUser(sbUser, data));
        } else {
          // Profil manquant OU pseudo vide (compte Google) → création / réparation
          if (data) setUser(mapUser(sbUser, data)); // affichage immédiat avec ce qu'on a
          void fetch("/api/me/ensure-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: sbUser.id,
              email: sbUser.email,
              pseudo: (sbUser.user_metadata?.pseudo as string | undefined) ?? null,
              full_name: (sbUser.user_metadata?.full_name as string | undefined) ?? (sbUser.user_metadata?.name as string | undefined) ?? null,
              avatar_url: (sbUser.user_metadata?.avatar_url as string | undefined) ?? null,
            }),
          }).then((r) => r.json()).then((res) => {
            if (res?.profile) setUser(mapUser(sbUser, res.profile));
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
      return { message: "Un compte existe déjà avec cet email. Connecte-toi !" };
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

  const signOut = async () => { await supabase.auth.signOut(); };

  const resetPassword: AuthCtx["resetPassword"] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return error ? { message: error.message } : null;
  };

  const verifySignupOtp: AuthCtx["verifySignupOtp"] = async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
    return error ? { message: error.message } : null;
  };

  const resendSignupOtp: AuthCtx["resendSignupOtp"] = async (email) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    return error ? { message: error.message } : null;
  };

  const clearWelcome = () => setJustLoggedIn(false);

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) enrichUser(data.session.user);
  };

  return (
    <AuthContext.Provider value={{
      user, session, isLoading, justLoggedIn, isNewUser,
      signUp, signIn, signInWithGoogle, signOut, resetPassword,
      verifySignupOtp, resendSignupOtp,
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
