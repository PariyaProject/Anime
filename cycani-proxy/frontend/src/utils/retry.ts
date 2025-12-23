/**
 * Retry utility for failed API requests
 */

export interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  retryableStatusCodes?: number[]
  onRetry?: (attempt: number, error: any) => void
}

export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryableStatusCodes = [408, 429, 500, 502, 503, 504],
    onRetry
  } = options

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn()
    } catch (error: any) {
      lastError = error

      // Check if error is retryable
      const isRetryable =
        error.response &&
        retryableStatusCodes.includes(error.response.status)

      // Don't retry if not retryable or if we've exhausted retries
      if (!isRetryable || attempt === maxRetries) {
        throw error
      }

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error)
      }

      // Wait before retrying with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Axios interceptor that adds retry logic
 */
export function createRetryInterceptor(options: RetryOptions = {}) {
  return async (error: any) => {
    const config = error.config

    // Skip if no config or already retried too many times
    if (!config || config.__retryCount >= (options.maxRetries || 3)) {
      return Promise.reject(error)
    }

    // Initialize retry count
    config.__retryCount = config.__retryCount || 0

    // Check if error is retryable
    const retryableStatusCodes = options.retryableStatusCodes || [408, 429, 500, 502, 503, 504]
    const isRetryable =
      error.response && retryableStatusCodes.includes(error.response.status)

    if (!isRetryable) {
      return Promise.reject(error)
    }

    // Increment retry count
    config.__retryCount++

    // Call onRetry callback if provided
    if (options.onRetry) {
      options.onRetry(config.__retryCount, error)
    }

    // Calculate delay with exponential backoff
    const retryDelay = options.retryDelay || 1000
    const delay = retryDelay * Math.pow(2, config.__retryCount - 1)

    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, delay))

    return config.httpApi?.request(config)
  }
}
