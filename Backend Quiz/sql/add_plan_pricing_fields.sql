-- Store plan prices in DB for the marketing website.
ALTER TABLE plans
  ADD COLUMN price_monthly INT NULL DEFAULT NULL,
  ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'INR';

UPDATE plans SET price_monthly = 999, currency = 'INR' WHERE name = 'Starter';
UPDATE plans SET price_monthly = 2499, currency = 'INR' WHERE name = 'Standard';
UPDATE plans SET price_monthly = 5999, currency = 'INR' WHERE name = 'Professional';
UPDATE plans SET price_monthly = 14999, currency = 'INR' WHERE name = 'Enterprise';
