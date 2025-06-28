-- Add enhanced search fields to carriers table
-- Migration: Enhanced Search & Filtering feature

ALTER TABLE public.carriers 
ADD COLUMN state TEXT,
ADD COLUMN city TEXT,
ADD COLUMN vehicle_count INTEGER;

-- Add indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_carriers_state ON public.carriers(state);
CREATE INDEX IF NOT EXISTS idx_carriers_city ON public.carriers(city);
CREATE INDEX IF NOT EXISTS idx_carriers_safety_rating ON public.carriers(safety_rating);
CREATE INDEX IF NOT EXISTS idx_carriers_insurance_status ON public.carriers(insurance_status);