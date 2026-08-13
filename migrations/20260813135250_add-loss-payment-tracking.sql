-- Track whether a player has settled up for their current losses
-- ("quien pierde paga"), so the leaderboard can show a Pagar/Pagado
-- toggle that the admin can reset for everyone at once.

ALTER TABLE public.players ADD COLUMN losses_paid BOOLEAN NOT NULL DEFAULT false;
