-- Routine Assist v0.9
-- Execute uma única vez no Supabase > SQL Editor para um banco criado nas versões v0.3-v0.8.

alter table public.demands
  add column if not exists vpu_count integer,
  add column if not exists uhf_antenna_count integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'demands_vpu_count_nonnegative'
  ) THEN
    ALTER TABLE public.demands
      ADD CONSTRAINT demands_vpu_count_nonnegative CHECK (vpu_count IS NULL OR vpu_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'demands_uhf_antenna_count_nonnegative'
  ) THEN
    ALTER TABLE public.demands
      ADD CONSTRAINT demands_uhf_antenna_count_nonnegative CHECK (uhf_antenna_count IS NULL OR uhf_antenna_count >= 0);
  END IF;
END $$;
