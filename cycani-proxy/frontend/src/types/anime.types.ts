export interface Anime {
  id: number | string
  title: string
  cover: string
  type?: string
  channel?: 'tv' | 'movie'  // Channel field for distinguishing TV vs theater anime
  year?: string
  episodes?: number
  score?: number
  status?: string
  description?: string
  genres?: string[]
}

export interface AnimeListResponse {
  success: boolean
  data: {
    animeList: Anime[]
    totalCount: number
    totalPages: number
    currentPage: number
  }
}

export interface FilterParams {
  page?: number
  limit?: number
  search?: string
  genre?: string
  year?: string
  month?: string
  sort?: 'time' | 'hits' | 'score'
  channel?: 'tv' | 'movie'  // Channel parameter for filtering
}

/**
 * Episode information from backend API
 */
export interface EpisodeInfo {
  season: number
  episode: number
  title: string
  url: string
}

export interface AnimeDetails {
  id: number | string
  title: string
  cover: string
  type: string
  year: string
  episodes: EpisodeInfo[]
  totalEpisodes: number
  totalSeasons: number
  score: number
  status: string
  description: string
  genres: string[]
  seasons?: SeasonInfo[]
}

export interface SeasonInfo {
  season: number
  episodeCount: number
}

/**
 * Anime entry in weekly schedule
 */
export interface WeeklyAnime {
  id: string
  title: string
  cover: string
  rating: string
  status: string
  broadcastTime: string
  url: string
  watchUrl: string | null
  day: string
}

/**
 * Weekly schedule response from backend
 */
export interface WeeklySchedule {
  schedule: Record<string, WeeklyAnime[]>
  updated: string
  filter: string
}

/**
 * Individual search result
 */
export interface SearchResult {
  id: string
  title: string
  cover: string
  url: string
}

/**
 * Search response from backend
 */
export interface SearchResponse {
  animeList: SearchResult[]
  searchQuery: string
  totalCount: number
}
