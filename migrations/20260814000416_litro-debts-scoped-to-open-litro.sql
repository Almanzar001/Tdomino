-- A player should stay in the pending-payments list after being marked
-- paid — only "Reiniciar" (closing the current litro and opening the
-- next) should clear the mesa's list. Scope debts to the table's
-- currently open litro (there's only ever one, since rollover is now a
-- manual action) and expose whether all of that player's losses in it
-- are already paid, so the frontend can show them struck through
-- instead of removing the row.

DROP VIEW public.litro_debts;

CREATE VIEW public.litro_debts
WITH (security_invoker = true) AS
SELECT
  t.tournament_id,
  t.id AS table_id,
  t.table_number,
  p.id AS player_id,
  p.name AS player_name,
  p.avatar_url AS player_avatar_url,
  COUNT(*) AS losses,
  BOOL_AND(g.paid) AS all_paid
FROM public.litros l
JOIN public.tables t ON t.id = l.table_id
JOIN public.table_players tp ON tp.table_id = t.id
JOIN public.players p ON p.id = tp.player_id
JOIN public.games g ON g.litro_id = l.id AND g.loser_id = p.id
WHERE l.is_open
GROUP BY t.tournament_id, t.id, t.table_number, p.id, p.name, p.avatar_url;

GRANT SELECT ON public.litro_debts TO anon, authenticated;
