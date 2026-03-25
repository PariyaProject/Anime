export interface AuthUser {
  id: string
  username: string
  isAdmin: boolean
  createdAt: string
  lastLoginAt?: string | null
  disabledAt?: string | null
  disabledReason?: string
  invitedBy?: string | null
  inviteAcceptedAt?: string | null
}

export interface AuthCredentials {
  username: string
  password: string
}

export interface PublicSiteBootstrap {
  siteName: string
  loginTitle: string
  supportContact: string
  allowInvites: boolean
}

export interface AdminInvite {
  id: string
  code: string
  note: string
  createdAt: string
  expiresAt: string | null
  revokedAt: string | null
  usedAt: string | null
  status: 'active' | 'used' | 'expired' | 'revoked'
  createdBy: {
    id: string
    username: string
  }
  usedBy: {
    id: string
    username: string
  } | null
}

export interface SiteSettings extends PublicSiteBootstrap {}

export interface RuntimeInfo {
  databaseFile: string
  authMode: 'invite-only'
  sessionDays: number
  allowInvites: boolean
  superAdminConfigured: boolean
  ports: {
    backend: string
    frontend: string
  }
}

export interface AdminOverview {
  settings: SiteSettings
  invites: AdminInvite[]
  runtime: RuntimeInfo
}

export interface AdminDatabaseRestoreResult {
  restoredAt: string
  importedFileName: string
  preImportBackupFileName: string
  requiresReload: boolean
}

export interface InviteValidationResponse {
  invite: AdminInvite
  site: PublicSiteBootstrap
}

export interface AdminManagedUser {
  id: string
  username: string
  isAdmin: boolean
  isEnvSuperAdmin?: boolean
  createdAt: string
  lastLoginAt: string | null
  disabledAt: string | null
  disabledReason: string
  invitedBy: {
    id: string
    username: string
  } | null
  inviteAcceptedAt: string | null
  activeSessionCount: number
  watchProgressCount: number
  lastWatchedAt: string | null
  status: 'active' | 'disabled'
}

export interface AdminLoginEvent {
  id: string
  attemptedUsername: string
  success: boolean
  reason: string
  ipAddress: string
  userAgent: string
  createdAt: string
}

export interface AdminActiveSession {
  id: string
  createdAt: string
  lastSeenAt: string
  expiresAt: string
  userAgent: string
  ipAddress: string
}

export interface AdminWatchProgressRecord {
  animeId: string
  animeTitle: string
  animeCover: string
  season: number
  episode: number
  episodeTitle: string
  position: number
  duration: number
  completed: boolean
  watchDate: string
  updatedAt: string
  sourceDeviceId: string
}

export interface AdminUserDetails {
  user: AdminManagedUser
  activeSessions: AdminActiveSession[]
  loginEvents: AdminLoginEvent[]
  watchProgress: AdminWatchProgressRecord[]
  loginPagination: AdminPaginationMeta
  watchPagination: AdminPaginationMeta
}

export interface AdminPaginationMeta {
  total: number
  overallTotal?: number
  adminTotal?: number
  userTotal?: number
  disabledTotal?: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AdminPaginatedUsers {
  items: AdminManagedUser[]
  pagination: AdminPaginationMeta
}
