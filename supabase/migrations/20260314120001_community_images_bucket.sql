-- Create community-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('community-images', 'community-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS: anyone can read
CREATE POLICY "Public read community images" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-images');

-- RLS: auth users can upload to their own folder
CREATE POLICY "Users upload own community images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'community-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: users can delete their own images
CREATE POLICY "Users delete own community images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'community-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
