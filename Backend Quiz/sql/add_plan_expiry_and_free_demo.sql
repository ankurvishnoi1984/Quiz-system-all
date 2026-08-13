-- Plan expiry + Free Demo fallback
ALTER TABLE plans
  ADD COLUMN is_free TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN default_duration_days INT NULL DEFAULT NULL;

ALTER TABLE users
  ADD COLUMN plan_expires_at DATE NULL DEFAULT NULL,
  ADD COLUMN plan_expiry_email_sent_at DATETIME NULL DEFAULT NULL;

INSERT INTO plans (name, description, max_participants, is_active, is_free, default_duration_days, created_at, updated_at)
SELECT
  'Free Demo',
  'Fallback demo access after a paid plan expires. Up to 10 participants connected at once — enough for trials and small demos.',
  10,
  1,
  1,
  NULL,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Free Demo');
