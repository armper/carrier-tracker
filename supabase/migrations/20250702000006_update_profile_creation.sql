-- Update profile creation function to include user_type and company_name

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company_name, user_type)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'company_name',
    COALESCE(new.raw_user_meta_data->>'user_type', 'other')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;