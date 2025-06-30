-- Add missing columns to carriers table for enhanced scraper functionality
-- This migration adds all the columns that the SAFER scraper expects to exist
-- Migration: Fix missing columns for scraper functionality

-- Add operation_classification column
ALTER TABLE public.carriers 
ADD COLUMN IF NOT EXISTS operation_classification TEXT[];

-- Add driver_count column
ALTER TABLE public.carriers 
ADD COLUMN IF NOT EXISTS driver_count INTEGER;

-- Add mc_number column (Motor Carrier number)
ALTER TABLE public.carriers 
ADD COLUMN IF NOT EXISTS mc_number TEXT;

-- Add hazmat_flag column
ALTER TABLE public.carriers 
ADD COLUMN IF NOT EXISTS hazmat_flag BOOLEAN;

-- Add interstate_operation column
ALTER TABLE public.carriers 
ADD COLUMN IF NOT EXISTS interstate_operation BOOLEAN;

-- Add entity_type column
ALTER TABLE public.carriers 
ADD COLUMN IF NOT EXISTS entity_type TEXT;

-- Add total_mileage column
ALTER TABLE public.carriers 
ADD COLUMN IF NOT EXISTS total_mileage INTEGER;

-- Add operating_status column
ALTER TABLE public.carriers 
ADD COLUMN IF NOT EXISTS operating_status TEXT;

-- Add out_of_service_date column
ALTER TABLE public.carriers 
ADD COLUMN IF NOT EXISTS out_of_service_date TEXT;

-- Add mcs_150_date column
ALTER TABLE public.carriers 
ADD COLUMN IF NOT EXISTS mcs_150_date TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.carriers.carrier_operation IS 'Type of carrier operation (freight, passenger, etc.)';
COMMENT ON COLUMN public.carriers.operation_classification IS 'Operation classification details';
COMMENT ON COLUMN public.carriers.driver_count IS 'Number of drivers';
COMMENT ON COLUMN public.carriers.mc_number IS 'Motor Carrier number';
COMMENT ON COLUMN public.carriers.hazmat_flag IS 'Hazmat transportation authorization flag';
COMMENT ON COLUMN public.carriers.interstate_operation IS 'Interstate operation authorization flag';
COMMENT ON COLUMN public.carriers.entity_type IS 'Business entity type (Corporation, Partnership, etc.)';
COMMENT ON COLUMN public.carriers.total_mileage IS 'Total miles operated';
COMMENT ON COLUMN public.carriers.operating_status IS 'Current operating status';
COMMENT ON COLUMN public.carriers.out_of_service_date IS 'Out of service date if applicable';
COMMENT ON COLUMN public.carriers.mcs_150_date IS 'MCS-150 form filing date';
