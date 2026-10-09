-- =========================================================
-- Seed Takeaway slots in dining_tables for Takeaway Consolidated Billing
-- =========================================================

INSERT INTO dining_tables (label, seats, zone, sort_order, is_active)
VALUES
  ('Takeaway 1', 1, 'Takeaway', 101, true),
  ('Takeaway 2', 1, 'Takeaway', 102, true),
  ('Takeaway 3', 1, 'Takeaway', 103, true),
  ('Takeaway 4', 1, 'Takeaway', 104, true),
  ('Takeaway 5', 1, 'Takeaway', 105, true)
ON CONFLICT (label) DO NOTHING;
