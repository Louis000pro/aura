"use client";

import { createContext, useContext, useState, useEffect } from "react";

export type User = {
  pseudo: string;
  name: string;
  lastName: string;
  email: string;
};

type AuthCtx = {
  user: User | null;
  isLoading: boolean;
  justLoggedIn: boolean;
  isNewUser: boolean;
  login: (user: User, isNew?: boolean) => void;
  logout: () => void;
  clearWelcome: () => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem("aura_user");
      if (s) setUser(JSON.parse(s));
    } catch {}
    setIsLoading(false);
  }, []);

  const login = (u: User, isNew = false) => {
    setUser(u);
    setJustLoggedIn(true);
    setIsNewUser(isNew);
    localStorage.setItem("aura_user", JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    setJustLoggedIn(false);
    localStorage.removeItem("aura_user");
  };

  const clearWelcome = () => setJustLoggedIn(false);

  return (
    <AuthContext.Provider value={{ user, isLoading, justLoggedIn, isNewUser, login, logout, clearWelcome }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
};
