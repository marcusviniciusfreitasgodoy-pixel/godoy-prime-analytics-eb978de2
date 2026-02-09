
-- Phase 4: Add superadmin role (must be in its own transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';
