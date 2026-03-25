export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiError {
  message: string
  status?: number
  code?: string
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginationData {
  totalCount: number
  totalPages: number
  currentPage: number
}

/**
 * Standard backend response wrapper.
 * All backend API responses use this structure with a success flag
 * and optional error details.
 */
export interface BackendResponse<T> {
  success: boolean
  data: T
  error?: string
  code?: string
  details?: string[]
}
