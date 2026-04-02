-- Add unique constraints required for upsert operations in the pipeline

ALTER TABLE politicians
  ADD CONSTRAINT politicians_full_name_chamber_key UNIQUE (full_name, chamber);
