export interface Anime {
  id: number | string
  title: string
  cover: string
  type?: string
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
}

export interface AnimeDetails {
  id: number | string
  title: string
  cover: string
  type: string
  year: string
  episodes: number
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
