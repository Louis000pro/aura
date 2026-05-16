-- ── Mensurations corporelles ─────────────────────────────────
CREATE TABLE IF NOT EXISTS body_measurements (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       date        NOT NULL DEFAULT CURRENT_DATE,
  chest_cm   numeric(5,1),
  waist_cm   numeric(5,1),
  hips_cm    numeric(5,1),
  arms_cm    numeric(5,1),
  thighs_cm  numeric(5,1),
  neck_cm    numeric(5,1),
  body_fat   numeric(4,1),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own measurements"
  ON body_measurements FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Records personnels ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personal_records (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise   text        NOT NULL,
  value      numeric(6,2) NOT NULL,
  unit       text        NOT NULL DEFAULT 'kg',
  reps       int,
  date       date        NOT NULL DEFAULT CURRENT_DATE,
  note       text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own PRs"
  ON personal_records FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_personal_records_user_date ON personal_records(user_id, date DESC);
