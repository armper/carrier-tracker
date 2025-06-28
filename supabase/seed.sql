-- Sample data for development

-- Insert sample carrier data
-- Update existing carriers with new search fields
UPDATE public.carriers SET 
  state = 'TX', 
  city = 'Dallas', 
  vehicle_count = 25 
WHERE dot_number = '123456';

UPDATE public.carriers SET 
  state = 'CA', 
  city = 'Los Angeles', 
  vehicle_count = 42 
WHERE dot_number = '789012';

UPDATE public.carriers SET 
  state = 'IL', 
  city = 'Chicago', 
  vehicle_count = 18 
WHERE dot_number = '345678';

UPDATE public.carriers SET 
  state = 'FL', 
  city = 'Miami', 
  vehicle_count = 35 
WHERE dot_number = '901234';

UPDATE public.carriers SET 
  state = 'AZ', 
  city = 'Phoenix', 
  vehicle_count = 8 
WHERE dot_number = '567890';

UPDATE public.carriers SET 
  state = 'CO', 
  city = 'Denver', 
  vehicle_count = 52 
WHERE dot_number = '112233';

UPDATE public.carriers SET 
  state = 'CA', 
  city = 'San Francisco', 
  vehicle_count = 31 
WHERE dot_number = '445566';

UPDATE public.carriers SET 
  state = 'MO', 
  city = 'Kansas City', 
  vehicle_count = 15 
WHERE dot_number = '778899';

UPDATE public.carriers SET 
  state = 'GA', 
  city = 'Atlanta', 
  vehicle_count = 67 
WHERE dot_number = '998877';

UPDATE public.carriers SET 
  state = 'NV', 
  city = 'Las Vegas', 
  vehicle_count = 12 
WHERE dot_number = '556644';