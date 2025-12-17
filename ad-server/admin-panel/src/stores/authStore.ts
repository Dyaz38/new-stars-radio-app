import { create } from 'zustand'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
}

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
  initialize: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: (token, user) => {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    set({ token: null, user: null, isAuthenticated: false })
  },

  initialize: () => {
    const token = localStorage.getItem('auth_token')
    const userStr = localStorage.getItem('user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        set({ token, user, isAuthenticated: true })
      } catch (error) {
        console.error('Failed to parse user from localStorage:', error)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
      }
    }
  },
}))






