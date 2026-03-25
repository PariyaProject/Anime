export interface Episode {
  season: number
  episode: number
  title?: string
  duration?: number
}

export interface EpisodeData {
  bangumiId: string
  animeId?: string
  title: string
  season: number
  episode: number
  videoUrl?: string
  realVideoUrl?: string
  iframeVideoUrl?: string
  originalUrl?: string
  nextEpisode?: Episode
}

export interface EpisodeResponse {
  success: boolean
  data: EpisodeData
}
