import axios from 'axios'

/** Vite env sometimes picks up stray newlines from hosting dashboards — breaks every request. */
export function normalizeApiBaseUrl(raw: string | undefined): string {
  const fallback = 'http://localhost:8000/api/v1'
  if (!raw || !String(raw).trim()) return fallback
  return String(raw).trim().replace(/[\r\n]+/g, '').replace(/\/+$/, '')
}

const api = axios.create({
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined),
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Let browser set Content-Type (with boundary) for FormData uploads
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api








