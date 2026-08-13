-- The "General" leaderboard listed every player ever created, even ones
-- with zero games and zero tournament rosters (e.g. leftover test players
-- removed from their only tournament). Filter those out, and clean up any
-- that already exist today.

DELETE FROM public.players p
WHERE NOT EXISTS (SELECT 1 FROM public.tournament_players tp WHERE tp.player_id = p.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.winner_id = p.id OR g.loser_id = p.id OR g.paseador_id = p.id
  );

DROP VIEW IF EXISTS public.player_leaderboard;

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
GROUP BY p.id, p.name, p.avatar_url
HAVING COUNT(g.id) > 0
   OR EXISTS (SELECT 1 FROM public.tournament_players tp WHERE tp.player_id = p.id);

GRANT SELECT ON public.player_leaderboard TO anon, authenticated;
