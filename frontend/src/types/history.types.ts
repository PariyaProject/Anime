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

export type HistoryImportMode = 'merge' | 'replace'

export interface HistoryExportPayload {
  format: 'anime-watch-history'
  version: 1
  exportedAt: string
  recordCount: number
  records: WatchRecord[]
}

export interface HistoryImportResult {
  importedCount: number
  totalCount: number
  mode: HistoryImportMode
}
