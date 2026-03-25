export interface Episode {
  season: number
  episode: number
  title?: string
  duration?: number
}

export interface EpisodeVideoUrlMeta {
  videoUrlCacheHit?: boolean
  videoUrlExpiresAt?: number | null
  videoUrlFetchedAt?: number | null
}

export interface EpisodeData {
  bangumiId: string
  animeId?: string
  title: string
  season: number
  episode: number
  realVideoUrl?: string
  videoUrlCacheHit?: boolean
  videoUrlExpiresAt?: number | null
  videoUrlFetchedAt?: number | null
  nextEpisode?: Episode
}

export interface RefreshVideoUrlData extends EpisodeVideoUrlMeta {
  realVideoUrl: string
}

export interface EpisodeResponse {
  success: boolean
  data: EpisodeData
}
