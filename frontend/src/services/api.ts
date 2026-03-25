import axios from 'axios'
import type { ApiResponse, ApiError } from '@/types/api.types'
import { createRetryInterceptor } from '@/utils/retry'

function getBackendErrorMessage(data: any): string | null {
  if (!data) {
    return null
  }

  if (typeof data === 'string' && data.trim()) {
    return data.trim()
  }

  if (typeof data.error === 'string' && data.error.trim()) {
    return data.error.trim()
  }

  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message.trim()
  }

  return null
}

function getDefaultErrorMessage(status?: number): string {
  switch (status) {
    case 400:
      return '请求参数有误'
    case 401:
      return '请先登录'
    case 403:
      return '当前没有权限执行此操作'
    case 404:
      return '请求的内容不存在'
    case 408:
      return '请求超时，请稍后重试'
    case 409:
      return '请求冲突，请刷新后重试'
    case 422:
      return '提交的数据格式不正确'
    case 429:
      return '请求过于频繁，请稍后再试'
    case 500:
      return '服务器暂时开小差了，请稍后再试'
    case 502:
    case 503:
    case 504:
      return '服务暂时不可用，请稍后再试'
    default:
      return '操作失败，请稍后重试'
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000, // Increased to 30s for episode API calls (Puppeteer can be slow)
  withCredentials: true,
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

function formatApiError(error: any): ApiError {
  const apiError: ApiError = {
    message: '操作失败，请稍后重试'
  }

  if (error.response) {
    apiError.status = error.response.status
    apiError.code = error.response.data?.code
    const backendMessage = getBackendErrorMessage(error.response.data)

    if (error.response.status === 401) {
      const requestUrl = String(error.config?.url || '')
      const isAuthScreen = window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/invite/')
      const isLoginAttempt = requestUrl.includes('/api/auth/login') || requestUrl.includes('/api/auth/accept-invite')

      if (!isAuthScreen && !isLoginAttempt) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?redirect=${redirect}`
      }

      apiError.message = backendMessage || '请先登录'
    } else {
      apiError.message = backendMessage || getDefaultErrorMessage(error.response.status)
    }
  } else if (error.request) {
    apiError.message = error.code === 'ECONNABORTED'
      ? '请求超时，请检查网络后重试'
      : '网络连接异常，请检查后重试'
  } else if (typeof error.message === 'string' && error.message.trim() && !error.message.startsWith('Request failed')) {
    apiError.message = error.message
  }

  return apiError
}

api.interceptors.response.use(
  (response) => {
    // Check for backend success wrapper
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      if (!response.data.success) {
        throw {
          message: getBackendErrorMessage(response.data) || '请求失败，请稍后重试',
          status: response.status,
          code: response.data.code
        }
      }
    }
    return response
  },
  (error): Promise<ApiError> => {
    const isRetryable = Boolean(
      error.config &&
      error.response &&
      [408, 429, 500, 502, 503, 504].includes(error.response.status)
    )

    if (isRetryable) {
      return retryInterceptor(error)
        .catch((retryError: any) => Promise.reject(formatApiError(retryError)))
    }

    return Promise.reject(formatApiError(error))
  }
)

export default api
