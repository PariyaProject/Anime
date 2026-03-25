import { describe, it, expect } from 'vitest'

describe('Utility Functions', () => {
  describe('formatTime', () => {
    it('should format seconds correctly', () => {
      const formatTime = (seconds: number): string => {
        if (!seconds || isNaN(seconds)) return '0:00'
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
      }

      expect(formatTime(0)).toBe('0:00')
      expect(formatTime(5)).toBe('0:05')
      expect(formatTime(65)).toBe('1:05')
      expect(formatTime(125)).toBe('2:05')
      expect(formatTime(3600)).toBe('60:00')
    })

    it('should handle invalid input', () => {
      const formatTime = (seconds: number): string => {
        if (!seconds || isNaN(seconds)) return '0:00'
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
      }

      expect(formatTime(NaN)).toBe('0:00')
      expect(formatTime(0)).toBe('0:00')
    })
  })
})
