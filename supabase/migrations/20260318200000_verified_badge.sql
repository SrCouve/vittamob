-- Verified badge column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Set Kaio and Igor as verified
UPDATE public.profiles SET is_verified = true WHERE id = 'f2cafac2-1a52-4bff-8820-99ffa79b676c'; -- Kaio
UPDATE public.profiles SET is_verified = true WHERE id = 'cc6cafd8-28dd-4632-b6bd-9ad9d25d7e4a'; -- Igor De Sousa
