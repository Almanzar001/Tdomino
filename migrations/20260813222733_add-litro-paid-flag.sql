-- Closed litros used to drop out of litro_debts the instant the next
-- litro opened, wiping the debt before anyone had a chance to collect
-- it. Track payment explicitly per litro instead: a litro's debts stay
-- visible until marked paid, and the still-open litro's running total
-- always stays visible regardless of the paid flag.

ALTER TABLE public.litros ADD COLUMN paid BOOLEAN NOT NULL DEFAULT false;

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
  COUNT(*) FILTER (WHERE g.loser_id = p.id) AS losses
FROM public.litros l
JOIN public.tables t ON t.id = l.table_id
JOIN public.table_players tp ON tp.table_id = t.id
JOIN public.players p ON p.id = tp.player_id
LEFT JOIN public.games g ON g.litro_id = l.id AND g.loser_id = p.id
WHERE l.is_open OR NOT l.paid
GROUP BY t.tournament_id, t.id, t.table_number, p.id, p.name, p.avatar_url
HAVING COUNT(*) FILTER (WHERE g.loser_id = p.id) > 0;

GRANT SELECT ON public.litro_debts TO anon, authenticated;
