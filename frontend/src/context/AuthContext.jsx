import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../services/supabase'
import api from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const preserveAuthError = useRef(false)

  const validarSesion = async (session) => {
    if (!session?.access_token) {
      setUser(null)
      setAccessToken(null)
      setPerfil(null)
      if (preserveAuthError.current) {
        preserveAuthError.current = false
        return false
      }
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
      setAccessToken(session.access_token)
      setPerfil(data.data)
      setAuthError('')
      return true
    } catch (error) {
      console.error('Error validando la sesión:', error)
      setUser(null)
      setAccessToken(null)
      setPerfil(null)
      const mensaje = error.response?.status === 403
        ? 'Usuario bloqueado.'
        : error.response?.data?.error || 'La sesión no es válida o el usuario no existe.'
      setAuthError(mensaje)
      preserveAuthError.current = true
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

    const validarSesionPeriodicamente = window.setInterval(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) validarSesion(data.session)
      })
    }, 60000)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await validarSesion(session)
      }
    )

    return () => {
      window.clearInterval(validarSesionPeriodicamente)
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
    preserveAuthError.current = false
    setAuthError('')
    return await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
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