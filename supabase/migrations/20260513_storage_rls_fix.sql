-- Fix: Storage RLS policies for avatars bucket
-- Allows authenticated users to upload to any subfolder of their own userId/
-- Run this in Supabase SQL editor → https://supabase.com/dashboard/project/_/sql

-- 1. Drop any old/conflicting policies on storage.objects for avatars bucket
DROP POLICY IF EXISTS "Users can upload their own avatar."            ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own avatar."             ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar."           ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar."           ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible."       ON storage.objects;
DROP POLICY IF EXISTS "Public Access"                                ON storage.objects;
DROP POLICY IF EXISTS "Allow upload to own folder"                   ON storage.objects;
DROP POLICY IF EXISTS "Allow update own files"                       ON storage.objects;
DROP POLICY IF EXISTS "Allow read all avatars"                       ON storage.objects;
DROP POLICY IF EXISTS "Allow delete own files"                       ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder"              ON storage.objects;

-- 2. INSERT: authenticated users can upload to their own folder (any depth)
--    matches: userId/avatar.jpg, userId/stories/file.jpg, userId/posts/file.jpg, etc.
CREATE POLICY "Allow upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. UPDATE: authenticated users can overwrite (upsert) their own files
CREATE POLICY "Allow update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. SELECT: public read access (bucket is already public but add policy for safety)
CREATE POLICY "Allow read all avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

-- 5. DELETE: authenticated users can delete their own files
CREATE POLICY "Allow delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
