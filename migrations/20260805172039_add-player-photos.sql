-- Player photos: avatar columns + RLS on the public player-photos bucket.

ALTER TABLE public.players ADD COLUMN avatar_url TEXT;
ALTER TABLE public.players ADD COLUMN avatar_key TEXT;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storage_objects_owner_select ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_insert ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_update ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_delete ON storage.objects;

CREATE POLICY "player_photos_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket = 'player-photos');

CREATE POLICY "player_photos_admin_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket = 'player-photos');

CREATE POLICY "player_photos_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket = 'player-photos')
  WITH CHECK (bucket = 'player-photos');

CREATE POLICY "player_photos_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket = 'player-photos');

GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT ON storage.objects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
