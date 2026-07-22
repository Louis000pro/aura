-- ─────────────────────────────────────────────────────────────────────────────
-- Lieu d'entraînement persistant (cross-device)
--
-- Bug : le lieu (salle/maison) + le matériel vivaient uniquement en localStorage,
-- donc PAR APPAREIL. Réglé sur PC → absent sur téléphone → le planning ne pouvait
-- pas se générer → « repos tous les jours » sur mobile.
--
-- On stocke maintenant le lieu dans le profil. Le code reste défensif : tant que
-- ces colonnes n'existent pas, il retombe sur le localStorage (aucune régression).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists training_location  text,   -- 'salle' | 'maison' | null
  add column if not exists training_equipment text;   -- 'halteres' | 'poids' | null
