import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { insforge } from '../lib/insforge'

interface AuthUser {
  id: string
  email: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function hydrateAuth() {
    const { data, error } = await insforge.auth.getCurrentUser()
    setUser(error ? null : (data?.user ?? null))
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      const { data, error } = await insforge.auth.getCurrentUser()
      if (cancelled) return
      setUser(error ? null : (data?.user ?? null))
      setLoading(false)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refresh: hydrateAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
