import { describe, it, expect, vi } from 'vitest'
import { retryRequest } from './retry'

describe('Retry Utility', () => {
  it('should succeed on first attempt', async () => {
    const mockFn = vi.fn().mockResolvedValue('success')
    const result = await retryRequest(mockFn, { maxRetries: 3 })

    expect(result).toBe('success')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('should retry on retryable error', async () => {
    let attempts = 0
    const mockFn = vi.fn(() => {
      attempts++
      if (attempts < 3) {
        throw {
          response: { status: 500 }
        }
      }
      return 'success'
    })

    const result = await retryRequest(mockFn, { maxRetries: 3 })

    expect(result).toBe('success')
    expect(mockFn).toHaveBeenCalledTimes(3)
  })

  it('should fail after max retries', async () => {
    const mockFn = vi.fn().mockRejectedValue({
      response: { status: 500 }
    })

    await expect(retryRequest(mockFn, { maxRetries: 2 })).rejects.toThrow()
    expect(mockFn).toHaveBeenCalledTimes(3) // Initial + 2 retries
  })

  it('should not retry on non-retryable error', async () => {
    const mockFn = vi.fn().mockRejectedValue({
      response: { status: 404 }
    })

    await expect(retryRequest(mockFn, { maxRetries: 3 })).rejects.toThrow()
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('should call onRetry callback', async () => {
    let attempts = 0
    const mockFn = vi.fn(() => {
      attempts++
      if (attempts < 2) {
        throw { response: { status: 500 } }
      }
      return 'success'
    })

    const onRetry = vi.fn()
    await retryRequest(mockFn, { maxRetries: 3, onRetry })

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Object))
  })
})
