-- Add onboarding data columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_age             smallint,
  ADD COLUMN IF NOT EXISTS onboarding_height          smallint,
  ADD COLUMN IF NOT EXISTS onboarding_weight          numeric(5,2),
  ADD COLUMN IF NOT EXISTS onboarding_gender          text,
  ADD COLUMN IF NOT EXISTS onboarding_goals           text[],
  ADD COLUMN IF NOT EXISTS onboarding_level           text,
  ADD COLUMN IF NOT EXISTS onboarding_sessions_week   smallint,
  ADD COLUMN IF NOT EXISTS onboarding_meals_day       smallint,
  ADD COLUMN IF NOT EXISTS onboarding_diet            text,
  ADD COLUMN IF NOT EXISTS onboarding_completed       boolean DEFAULT false;
