-- Existing rows continue to derive their path from the legacy global assets directory.
ALTER TABLE assets ADD COLUMN storage_path TEXT;
