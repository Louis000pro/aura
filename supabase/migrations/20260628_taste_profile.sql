-- Profil de goûts de l'utilisateur (popup de personnalisation nutrition).
-- Réponses : aime cuisiner, temps dispo, accès aux ingrédients, bases préférées.
-- Alimente les recommandations de plats (menu généré par l'IA).
-- À coller à la main dans le SQL Editor Supabase au moment de la mise à jour.
alter table profiles add column if not exists taste_profile jsonb;
