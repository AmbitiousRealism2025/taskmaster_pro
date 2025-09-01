export interface ApiResponse<T = any> {
  data?: T
  message?: string
  success: boolean
  error?: string
  code?: string
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ApiError {
  error: string
  code: string
  details?: any
}