-- Visite guidée : mémoriser si l'utilisateur a déjà vu la visite d'accueil.
-- Si la colonne existe déjà (re-run), on ne casse rien grâce à IF NOT EXISTS.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tour_completed boolean DEFAULT false;
