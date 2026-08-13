-- Physical tables (mesas) assigned by the roulette, persisted so
-- registered hands can be tied to a table. Each table plays through a
-- sequence of "litros" (a betting round of N hands); once a litro's
-- hand count is reached it auto-closes and a fresh litro starts,
-- which is what makes the pending-payment count reset on its own.

CREATE TABLE public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL CHECK (table_number > 0),
  hands_per_litro INTEGER NOT NULL DEFAULT 10 CHECK (hands_per_litro > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tables_tournament ON public.tables(tournament_id);

CREATE TABLE public.table_players (
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  PRIMARY KEY (table_id, player_id)
);

CREATE INDEX idx_table_players_player ON public.table_players(player_id);

CREATE TABLE public.litros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  litro_number INTEGER NOT NULL CHECK (litro_number > 0),
  hands_played INTEGER NOT NULL DEFAULT 0,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_litros_table ON public.litros(table_id);

-- Exactly one open litro per table at a time.
CREATE UNIQUE INDEX idx_litros_one_open_per_table ON public.litros(table_id) WHERE is_open;

ALTER TABLE public.games ADD COLUMN table_id UUID REFERENCES public.tables(id);
ALTER TABLE public.games ADD COLUMN litro_id UUID REFERENCES public.litros(id);

CREATE INDEX idx_games_litro ON public.games(litro_id);

-- Every hand registered against an open litro counts toward it; once
-- the agreed hand count is reached, close it and open the next one.
CREATE OR REPLACE FUNCTION public.advance_litro_on_game_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_table_id UUID;
  v_litro_number INTEGER;
  v_hands_per_litro INTEGER;
  v_hands_played INTEGER;
BEGIN
  IF NEW.litro_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT l.table_id, l.litro_number, t.hands_per_litro
    INTO v_table_id, v_litro_number, v_hands_per_litro
  FROM public.litros l
  JOIN public.tables t ON t.id = l.table_id
  WHERE l.id = NEW.litro_id AND l.is_open;

  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'litro_id must reference an open litro';
  END IF;

  UPDATE public.litros
  SET hands_played = hands_played + 1
  WHERE id = NEW.litro_id
  RETURNING hands_played INTO v_hands_played;

  IF v_hands_played >= v_hands_per_litro THEN
    UPDATE public.litros SET is_open = false, closed_at = now() WHERE id = NEW.litro_id;
    INSERT INTO public.litros (table_id, litro_number, hands_played, is_open)
    VALUES (v_table_id, v_litro_number + 1, 0, true);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER games_advance_litro
AFTER INSERT ON public.games
FOR EACH ROW EXECUTE FUNCTION public.advance_litro_on_game_insert();

-- Pending money debts: losses within each table's currently OPEN litro
-- only, so the amount owed naturally resets to zero the moment a new
-- litro starts (no manual "mark as paid" needed).
CREATE VIEW public.litro_debts
WITH (security_invoker = true) AS
SELECT
  t.tournament_id,
  t.id AS table_id,
  t.table_number,
  l.id AS litro_id,
  l.litro_number,
  l.hands_played,
  t.hands_per_litro,
  p.id AS player_id,
  p.name AS player_name,
  p.avatar_url AS player_avatar_url,
  COUNT(*) FILTER (WHERE g.loser_id = p.id) AS losses
FROM public.litros l
JOIN public.tables t ON t.id = l.table_id
JOIN public.table_players tp ON tp.table_id = t.id
JOIN public.players p ON p.id = tp.player_id
LEFT JOIN public.games g ON g.litro_id = l.id AND g.loser_id = p.id
WHERE l.is_open
GROUP BY t.tournament_id, t.id, t.table_number, l.id, l.litro_number, l.hands_played, t.hands_per_litro, p.id, p.name, p.avatar_url
HAVING COUNT(*) FILTER (WHERE g.loser_id = p.id) > 0;

-- RLS: public read, admin write — same pattern as the rest of the app.
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.litros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read tables" ON public.tables
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write tables" ON public.tables
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin update tables" ON public.tables
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin delete tables" ON public.tables
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "public read table_players" ON public.table_players
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write table_players" ON public.table_players
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin delete table_players" ON public.table_players
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "public read litros" ON public.litros
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write litros" ON public.litros
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin update litros" ON public.litros
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.tables TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tables TO authenticated;

GRANT SELECT ON public.table_players TO anon, authenticated;
GRANT INSERT, DELETE ON public.table_players TO authenticated;

GRANT SELECT ON public.litros TO anon, authenticated;
GRANT INSERT, UPDATE ON public.litros TO authenticated;

GRANT SELECT ON public.litro_debts TO anon, authenticated;
