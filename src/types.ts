export interface Player {
  id: string
  name: string
  avatar_url: string | null
  avatar_key: string | null
  created_at: string
}

export interface Tournament {
  id: string
  name: string
  status: 'active' | 'finished'
  created_at: string
  finished_at: string | null
}

export interface TournamentPlayer {
  tournament_id: string
  player_id: string
  joined_at: string
}

export interface Game {
  id: string
  tournament_id: string
  winner_id: string
  loser_id: string
  paseador_id: string
  played_at: string
  created_at: string
}

export interface TournamentLeaderboardRow {
  tournament_id: string
  player_id: string
  player_name: string
  player_avatar_url: string | null
  wins: number
  losses: number
  paseos: number
  points: number
  games_played: number
}

export interface PlayerLeaderboardRow {
  player_id: string
  player_name: string
  player_avatar_url: string | null
  wins: number
  losses: number
  paseos: number
  points: number
  tournaments_played: number
}

export const GAME_POINTS = {
  win: 25,
  paseo: 20,
  loss: 0,
} as const
