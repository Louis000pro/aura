-- ============================================================
-- Migration : table profiles + trigger auto-création
-- Doit être la PREMIÈRE migration (toutes les autres en dépendent)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pseudo      TEXT        UNIQUE,
  full_name   TEXT,
  bio         TEXT,
  avatar_url  TEXT,
  is_admin    BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les profils publics
DROP POLICY IF EXISTS "Profiles lisibles par tous" ON public.profiles;
CREATE POLICY "Profiles lisibles par tous"
  ON public.profiles FOR SELECT USING (true);

-- Chaque utilisateur peut modifier son propre profil
DROP POLICY IF EXISTS "Utilisateur modifie son profil" ON public.profiles;
CREATE POLICY "Utilisateur modifie son profil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Index sur pseudo pour la recherche
CREATE INDEX IF NOT EXISTS profiles_pseudo_idx ON public.profiles (pseudo);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON public.profiles (created_at DESC);

-- ── Trigger : crée automatiquement un profil à l'inscription ──────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, pseudo, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'pseudo',
    TRIM(
      COALESCE(NEW.raw_user_meta_data->>'name', '') || ' ' ||
      COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
