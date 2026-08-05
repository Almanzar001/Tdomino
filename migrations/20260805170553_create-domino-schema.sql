-- Domino tournament schema: players, tournaments, participation, games, leaderboards.

CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE public.tournament_players (
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tournament_id, player_id)
);

CREATE INDEX idx_tournament_players_player ON public.tournament_players(player_id);

CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  winner_id UUID NOT NULL REFERENCES public.players(id),
  loser_id UUID NOT NULL REFERENCES public.players(id),
  paseador_id UUID NOT NULL REFERENCES public.players(id),
  paseo_points INTEGER NOT NULL DEFAULT 1 CHECK (paseo_points > 0),
  played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT games_players_distinct CHECK (
    winner_id <> loser_id AND winner_id <> paseador_id AND loser_id <> paseador_id
  )
);

CREATE INDEX idx_games_tournament ON public.games(tournament_id);
CREATE INDEX idx_games_winner ON public.games(winner_id);
CREATE INDEX idx_games_loser ON public.games(loser_id);
CREATE INDEX idx_games_paseador ON public.games(paseador_id);

-- Each of the three roles in a game must belong to that tournament's roster.
CREATE OR REPLACE FUNCTION public.check_game_players_in_tournament()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.tournament_players
    WHERE tournament_id = NEW.tournament_id AND player_id = NEW.winner_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.tournament_players
    WHERE tournament_id = NEW.tournament_id AND player_id = NEW.loser_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.tournament_players
    WHERE tournament_id = NEW.tournament_id AND player_id = NEW.paseador_id
  ) THEN
    RAISE EXCEPTION 'winner, loser and paseador must all be registered players of the tournament';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER games_players_in_tournament
BEFORE INSERT OR UPDATE ON public.games
FOR EACH ROW EXECUTE FUNCTION public.check_game_players_in_tournament();

-- Per-tournament standings: ranked by paseos (tournament win condition), then points, then wins.
CREATE VIEW public.tournament_leaderboard
WITH (security_invoker = true) AS
SELECT
  tp.tournament_id,
  tp.player_id,
  p.name AS player_name,
  COUNT(*) FILTER (WHERE g.winner_id = tp.player_id) AS wins,
  COUNT(*) FILTER (WHERE g.loser_id = tp.player_id) AS losses,
  COUNT(*) FILTER (WHERE g.paseador_id = tp.player_id) AS paseos,
  COALESCE(SUM(g.paseo_points) FILTER (WHERE g.paseador_id = tp.player_id), 0) AS paseo_points,
  COUNT(*) FILTER (WHERE g.winner_id = tp.player_id OR g.loser_id = tp.player_id OR g.paseador_id = tp.player_id) AS games_played
FROM public.tournament_players tp
JOIN public.players p ON p.id = tp.player_id
LEFT JOIN public.games g
  ON g.tournament_id = tp.tournament_id
  AND (g.winner_id = tp.player_id OR g.loser_id = tp.player_id OR g.paseador_id = tp.player_id)
GROUP BY tp.tournament_id, tp.player_id, p.name;

-- All-time standings across every tournament.
CREATE VIEW public.player_leaderboard
WITH (security_invoker = true) AS
SELECT
  p.id AS player_id,
  p.name AS player_name,
  COUNT(*) FILTER (WHERE g.winner_id = p.id) AS wins,
  COUNT(*) FILTER (WHERE g.loser_id = p.id) AS losses,
  COUNT(*) FILTER (WHERE g.paseador_id = p.id) AS paseos,
  COALESCE(SUM(g.paseo_points) FILTER (WHERE g.paseador_id = p.id), 0) AS paseo_points,
  COUNT(DISTINCT g.tournament_id) AS tournaments_played
FROM public.players p
LEFT JOIN public.games g
  ON (g.winner_id = p.id OR g.loser_id = p.id OR g.paseador_id = p.id)
GROUP BY p.id, p.name;

-- Row Level Security: anyone can read; only authenticated admin can write.
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read players" ON public.players
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write players" ON public.players
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin update players" ON public.players
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin delete players" ON public.players
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "public read tournaments" ON public.tournaments
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write tournaments" ON public.tournaments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin update tournaments" ON public.tournaments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin delete tournaments" ON public.tournaments
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "public read tournament_players" ON public.tournament_players
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write tournament_players" ON public.tournament_players
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin delete tournament_players" ON public.tournament_players
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "public read games" ON public.games
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write games" ON public.games
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin update games" ON public.games
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin delete games" ON public.games
  FOR DELETE TO authenticated USING (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.players TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.players TO authenticated;

GRANT SELECT ON public.tournaments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;

GRANT SELECT ON public.tournament_players TO anon, authenticated;
GRANT INSERT, DELETE ON public.tournament_players TO authenticated;

GRANT SELECT ON public.games TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.games TO authenticated;

GRANT SELECT ON public.tournament_leaderboard TO anon, authenticated;
GRANT SELECT ON public.player_leaderboard TO anon, authenticated;
