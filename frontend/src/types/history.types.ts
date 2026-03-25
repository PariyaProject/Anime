export interface WatchRecord {
  animeId: string
  animeTitle: string
  animeCover: string
  season: number
  episode: number
  episodeTitle: string
  position: number
  duration: number
  watchDate: string
  completed: boolean
}

export interface PositionRecord {
  position: number
  lastUpdated: string
}

export interface HistoryResponse {
  success: boolean
  data: WatchRecord[]
}

export interface ContinueWatchingResponse {
  success: boolean
  data: WatchRecord[]
}
