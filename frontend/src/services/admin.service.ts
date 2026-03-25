import api from './api'
import type { BackendResponse } from '@/types/api.types'
import type {
  AdminDatabaseRestoreResult,
  AdminInvite,
  AdminManagedUser,
  AdminOverview,
  AdminPaginatedUsers,
  AdminUserDetails,
  InviteValidationResponse,
  PublicSiteBootstrap,
  SiteSettings
} from '@/types/auth.types'

export const adminService = {
  async getPublicBootstrap(): Promise<PublicSiteBootstrap> {
    const response = await api.get<BackendResponse<PublicSiteBootstrap>>('/api/public/bootstrap')
    return response.data.data
  },

  async getInviteInfo(code: string): Promise<InviteValidationResponse> {
    const response = await api.get<BackendResponse<InviteValidationResponse>>(`/api/auth/invite/${code}`)
    return response.data.data
  },

  async getOverview(): Promise<AdminOverview> {
    const response = await api.get<BackendResponse<AdminOverview>>('/api/admin/overview')
    return response.data.data
  },

  async updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    const response = await api.put<BackendResponse<SiteSettings>>('/api/admin/settings', settings)
    return response.data.data
  },

  async createInvite(payload: { note: string; expiresInDays: number }): Promise<AdminInvite> {
    const response = await api.post<BackendResponse<AdminInvite>>('/api/admin/invites', payload)
    return response.data.data
  },

  async getUsers(params?: {
    page?: number
    pageSize?: number
    keyword?: string
    role?: 'all' | 'admin' | 'user'
    status?: 'all' | 'active' | 'disabled'
  }): Promise<AdminPaginatedUsers> {
    const response = await api.get<BackendResponse<AdminPaginatedUsers>>('/api/admin/users', {
      params
    })
    return response.data.data
  },

  async getUserDetails(
    userId: string,
    params?: {
      loginPage?: number
      loginPageSize?: number
      watchPage?: number
      watchPageSize?: number
    }
  ): Promise<AdminUserDetails> {
    const response = await api.get<BackendResponse<AdminUserDetails>>(`/api/admin/users/${userId}`, {
      params
    })
    return response.data.data
  },

  async updateUserAccess(
    userId: string,
    payload: { disabled: boolean; disabledReason?: string }
  ): Promise<AdminManagedUser> {
    const response = await api.patch<BackendResponse<AdminManagedUser>>(
      `/api/admin/users/${userId}/access`,
      payload
    )
    return response.data.data
  },

  async updateUserRole(
    userId: string,
    payload: { isAdmin: boolean }
  ): Promise<AdminManagedUser> {
    const response = await api.patch<BackendResponse<AdminManagedUser>>(
      `/api/admin/users/${userId}/role`,
      payload
    )
    return response.data.data
  },

  async downloadDatabaseBackup(): Promise<Blob> {
    const response = await api.get('/api/admin/backup/database', {
      responseType: 'blob'
    })
    return response.data
  },

  async restoreDatabaseBackup(file: File): Promise<AdminDatabaseRestoreResult> {
    const response = await api.post<BackendResponse<AdminDatabaseRestoreResult>>(
      '/api/admin/restore/database',
      file,
      {
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Backup-Filename': encodeURIComponent(file.name)
        }
      }
    )
    return response.data.data
  },

  async revokeInvite(inviteId: string): Promise<void> {
    await api.post(`/api/admin/invites/${inviteId}/revoke`)
  }
}
