-- "Reiniciar partidas" needs to delete a table's litro rows to fully
-- reset hand counts, but litros never had a DELETE policy — RLS
-- silently blocked it even though GRANT allowed it, leaving stale
-- hands_played behind after all games were wiped.

CREATE POLICY "admin delete litros" ON public.litros
  FOR DELETE TO authenticated USING (true);
