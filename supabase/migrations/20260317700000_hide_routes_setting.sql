-- Privacy setting: user can hide route maps from others
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hide_routes boolean DEFAULT false;
