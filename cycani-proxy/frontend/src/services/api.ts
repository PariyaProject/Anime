import axios from 'axios'
import type { ApiResponse, ApiError } from '@/types/api.types'
import { createRetryInterceptor } from '@/utils/retry'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor with retry logic
const retryInterceptor = createRetryInterceptor({
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  onRetry: (attempt, error) => {
    console.log(`Retrying request (attempt ${attempt}):`, error.message)
  }
})

api.interceptors.response.use(
  (response) => {
    return response
  },
  (error): Promise<ApiError> => {
    // Try to retry if error is retryable
    if (error.config && error.response) {
      return retryInterceptor(error)
    }

    // If not retryable or retry failed, format error
    const apiError: ApiError = {
      message: error.message || 'An error occurred'
    }

    if (error.response) {
      apiError.status = error.response.status
      apiError.code = error.response.data?.code

      if (error.response.status === 404) {
        apiError.message = 'Resource not found'
      } else if (error.response.status === 500) {
        apiError.message = 'Server error'
      } else if (error.response.data?.message) {
        apiError.message = error.response.data.message
      }
    } else if (error.request) {
      apiError.message = 'Network error - please check your connection'
    }

    return Promise.reject(apiError)
  }
)

export default api
