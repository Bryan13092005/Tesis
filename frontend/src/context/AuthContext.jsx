import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import api from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  const validarSesion = async (session) => {
    if (!session?.access_token) {
      setUser(null)
      setPerfil(null)
      setAuthError('Debes iniciar sesión para acceder al dashboard.')
      return false
    }

    try {
      const { data } = await api.get('/api/clientes/perfil', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!data?.success || !data.data) {
        throw new Error('Perfil no encontrado')
      }

      setUser(session.user)
      setPerfil(data.data)
      setAuthError('')
      return true
    } catch (error) {
      console.error('Error validando la sesión:', error)
      setUser(null)
      setPerfil(null)
      setAuthError(error.response?.data?.error || 'La sesión no es válida o el usuario no existe.')
      await supabase.auth.signOut()
      return false
    }
  }

  useEffect(() => {
    const obtenerSesion = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Error obteniendo sesión:', error)
      }

      await validarSesion(data.session)
      setLoading(false)
    }

    obtenerSesion()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true)
        await validarSesion(session)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const iniciarSesion = async (email, password) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    })
  }

  const cerrarSesion = async () => {
    return await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        perfil,
        loading,
        authError,
        iniciarSesion,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}