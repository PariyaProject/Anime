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
