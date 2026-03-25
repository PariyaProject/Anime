import api from './api'
import type { BackendResponse } from '@/types/api.types'
import type { AuthCredentials, AuthUser } from '@/types/auth.types'

export const authService = {
  async getCurrentUser(): Promise<AuthUser | null> {
    const response = await api.get<BackendResponse<AuthUser | null>>('/api/auth/me')
    return response.data.data
  },

  async login(credentials: AuthCredentials): Promise<AuthUser> {
    const response = await api.post<BackendResponse<AuthUser>>('/api/auth/login', credentials)
    return response.data.data
  },

  async acceptInvite(inviteCode: string, credentials: AuthCredentials): Promise<AuthUser> {
    const response = await api.post<BackendResponse<AuthUser>>('/api/auth/accept-invite', {
      inviteCode,
      ...credentials
    })
    return response.data.data
  },

  async logout(): Promise<void> {
    await api.post('/api/auth/logout')
  }
}
