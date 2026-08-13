-- Payment now settles per player instead of per mesa: track "paid" on
-- each losing game directly. A mesa's litro round no longer auto-rolls
-- over the instant the agreed hand count is hit (that reset the counter
-- before anyone could review the last hand) — hands_played still counts
-- up automatically as games are registered, but starting the next round
-- is now a deliberate "Reiniciar" action per mesa from the frontend.

ALTER TABLE public.games ADD COLUMN paid BOOLEAN NOT NULL DEFAULT false;

DROP VIEW public.litro_debts;

ALTER TABLE public.litros DROP COLUMN paid;

CREATE OR REPLACE FUNCTION public.advance_litro_on_game_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF NEW.litro_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.litros
  SET hands_played = hands_played + 1
  WHERE id = NEW.litro_id AND is_open;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'litro_id must reference an open litro';
  END IF;

  RETURN NEW;
END;
$$;

CREATE VIEW public.litro_debts
WITH (security_invoker = true) AS
SELECT
  t.tournament_id,
  t.id AS table_id,
  t.table_number,
  p.id AS player_id,
  p.name AS player_name,
  p.avatar_url AS player_avatar_url,
  COUNT(*) AS losses
FROM public.tables t
JOIN public.table_players tp ON tp.table_id = t.id
JOIN public.players p ON p.id = tp.player_id
JOIN public.games g ON g.table_id = t.id AND g.loser_id = p.id AND NOT g.paid
GROUP BY t.tournament_id, t.id, t.table_number, p.id, p.name, p.avatar_url;

GRANT SELECT ON public.litro_debts TO anon, authenticated;
