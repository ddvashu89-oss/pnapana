-- Plant ownership, favorites, and richer care history.
ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS purchased_on DATE DEFAULT NULL;

ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS is_favorite TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE care_events
  ADD COLUMN IF NOT EXISTS details TEXT DEFAULT NULL;
