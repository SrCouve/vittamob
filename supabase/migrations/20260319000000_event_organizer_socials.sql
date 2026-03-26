-- Add organizer social links
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS organizer_website text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS organizer_instagram text;

-- Update Kurva Klub event with logo and socials
UPDATE public.events
SET organizer_logo_url = 'kukur-logo',
    organizer_website = 'https://kurvaklub.com',
    organizer_instagram = '@kurvaklub'
WHERE organizer_name = 'Kurva Klub';
