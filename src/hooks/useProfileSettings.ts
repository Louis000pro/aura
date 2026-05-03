"use client";

import { useState, useEffect } from "react";

export type Gender = "homme" | "femme";

export type ProfileSettings = {
  gender: Gender;
};

const DEFAULT: ProfileSettings = { gender: "homme" };
const KEY = "aura_profile_settings";

export function useProfileSettings() {
  const [settings, setSettings] = useState<ProfileSettings>(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings(JSON.parse(raw));
    } catch {}
  }, []);

  const updateSettings = (updates: Partial<ProfileSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return { settings, updateSettings };
}
