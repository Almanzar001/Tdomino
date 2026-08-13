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
  table_id: string | null
  litro_id: string | null
  played_at: string
  created_at: string
}

export interface TableRow {
  id: string
  tournament_id: string
  table_number: number
  hands_per_litro: number
  created_at: string
}

export interface TablePlayer {
  table_id: string
  player_id: string
}

export interface LitroRow {
  id: string
  table_id: string
  litro_number: number
  hands_played: number
  is_open: boolean
  created_at: string
  closed_at: string | null
}

export interface LitroDebtRow {
  tournament_id: string
  table_id: string
  table_number: number
  litro_id: string
  litro_number: number
  hands_played: number
  hands_per_litro: number
  player_id: string
  player_name: string
  player_avatar_url: string | null
  losses: number
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

export const PESO_PER_HAND = 300
