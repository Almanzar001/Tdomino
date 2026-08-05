-- Fixed scoring rule: winner +25, paseador +20, loser +0 per hand.
-- Points are no longer per-game configurable; drop the column and derive
-- totals from fixed constants in the leaderboard views.

DROP VIEW IF EXISTS public.tournament_leaderboard;
DROP VIEW IF EXISTS public.player_leaderboard;

ALTER TABLE public.games DROP COLUMN paseo_points;

CREATE VIEW public.tournament_leaderboard
WITH (security_invoker = true) AS
SELECT
  tp.tournament_id,
  tp.player_id,
  p.name AS player_name,
  p.avatar_url AS player_avatar_url,
  COUNT(*) FILTER (WHERE g.winner_id = tp.player_id) AS wins,
  COUNT(*) FILTER (WHERE g.loser_id = tp.player_id) AS losses,
  COUNT(*) FILTER (WHERE g.paseador_id = tp.player_id) AS paseos,
  (COUNT(*) FILTER (WHERE g.winner_id = tp.player_id) * 25
    + COUNT(*) FILTER (WHERE g.paseador_id = tp.player_id) * 20) AS points,
  COUNT(*) FILTER (WHERE g.winner_id = tp.player_id OR g.loser_id = tp.player_id OR g.paseador_id = tp.player_id) AS games_played
FROM public.tournament_players tp
JOIN public.players p ON p.id = tp.player_id
LEFT JOIN public.games g
  ON g.tournament_id = tp.tournament_id
  AND (g.winner_id = tp.player_id OR g.loser_id = tp.player_id OR g.paseador_id = tp.player_id)
GROUP BY tp.tournament_id, tp.player_id, p.name, p.avatar_url;

CREATE VIEW public.player_leaderboard
WITH (security_invoker = true) AS
SELECT
  p.id AS player_id,
  p.name AS player_name,
  p.avatar_url AS player_avatar_url,
  COUNT(*) FILTER (WHERE g.winner_id = p.id) AS wins,
  COUNT(*) FILTER (WHERE g.loser_id = p.id) AS losses,
  COUNT(*) FILTER (WHERE g.paseador_id = p.id) AS paseos,
  (COUNT(*) FILTER (WHERE g.winner_id = p.id) * 25
    + COUNT(*) FILTER (WHERE g.paseador_id = p.id) * 20) AS points,
  COUNT(DISTINCT g.tournament_id) AS tournaments_played
FROM public.players p
LEFT JOIN public.games g
  ON (g.winner_id = p.id OR g.loser_id = p.id OR g.paseador_id = p.id)
GROUP BY p.id, p.name, p.avatar_url;

GRANT SELECT ON public.tournament_leaderboard TO anon, authenticated;
GRANT SELECT ON public.player_leaderboard TO anon, authenticated;
