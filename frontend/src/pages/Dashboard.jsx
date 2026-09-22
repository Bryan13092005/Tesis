import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Activity, Clock3, DoorOpen, Home, LogOut, Settings, ShieldCheck, UserRound, Users, Wifi } from 'lucide-react'
import api from '../services/api'
import { supabase } from '../services/supabase'

function Dashboard() {
  const navigate = useNavigate()
  const { user, loading, cerrarSesion } = useAuth()
  const [perfil, setPerfil] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    const obtenerPerfil = async () => {
      if (!user) {
        setProfileLoading(false)
        return
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !sessionData.session) {
        setProfileError('No se pudo validar la sesión.')
        setProfileLoading(false)
        return
      }

      try {
        const { data } = await api.get('/api/clientes/perfil', {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        })

        setPerfil(data.data ?? null)
      } catch (error) {
        console.error('Error obteniendo perfil:', error)
        setProfileError('No se pudo cargar la información del usuario.')
      } finally {
        setProfileLoading(false)
      }
    }

    obtenerPerfil()
  }, [user])

  const rol = perfil?.rol?.toLowerCase() ?? ''
  const permisosOriginales = perfil?.permisos ?? perfil?.permisosAcceso
  let permisos = []

  if (Array.isArray(permisosOriginales)) {
    permisos = permisosOriginales
  } else if (typeof permisosOriginales === 'string') {
    try {
      const permisosParseados = JSON.parse(permisosOriginales)
      permisos = Array.isArray(permisosParseados) ? permisosParseados : [permisosOriginales]
    } catch {
      permisos = permisosOriginales === 'ALL'
        ? ['ALL']
        : permisosOriginales.split(',').map((permiso) => permiso.trim())
    }
  }

  const esAdmin = rol === 'admin' || rol === 'administrador'
  const navigation = esAdmin
    ? [
        { label: 'HOME', icon: Home },
        { label: 'GESTIÓN DE USUARIOS', icon: Users },
        { label: 'HISTORIAL', icon: Clock3 },
        { label: 'ACCESOS', icon: DoorOpen },
      ]
    : [
        { label: 'HOME', icon: Home },
        { label: 'PERFIL', icon: UserRound },
        ...(permisos.some((permiso) => ['controlLuces', 'garage', 'sensores', 'puertaPrincipal'].includes(permiso))
          ? [{ label: 'CONTROL', icon: Settings }]
          : []),
        ...(permisos.some((permiso) => permiso.endsWith('H')) || permisos.includes('ALL')
          ? [{ label: 'HISTORIAL', icon: Clock3 }]
          : []),
      ]

  const handleLogout = async () => {
    await cerrarSesion()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return <div className="loading-screen">Cargando tu espacio...</div>
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-brand"><span className="brand-mark small"><Home size={16} /></span><span>Casa <strong>en calma</strong></span></div>
        <nav className="main-nav" aria-label="Navegación principal">
          {navigation.map(({ label, icon: Icon }, index) => (
            <button key={label} className={`nav-item ${index === 0 ? 'active' : ''}`} type="button">
              <Icon size={16} />{label}
            </button>
          ))}
        </nav>
        <div className="header-user">
          <span className="avatar">{(perfil?.nombre || user?.email || 'U').charAt(0).toUpperCase()}</span>
          <span className="user-name">{perfil?.nombre || 'Mi cuenta'}</span>
          <button className="logout-button" type="button" onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={17} /></button>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="welcome-row">
          <div><p className="form-kicker">{esAdmin ? 'CENTRO DE ADMINISTRACIÓN' : 'TU ESPACIO PERSONAL'}</p><h1>Buenos días{perfil?.nombre ? `, ${perfil.nombre}` : ''}.</h1><p className="dashboard-subtitle">Todo está tranquilo en casa.</p></div>
          <div className="online-status"><span /> Sistema conectado</div>
        </div>

        {profileLoading && <p className="profile-loading">Sincronizando permisos...</p>}
        {profileError && <p className="form-error" role="alert">{profileError}</p>}
        <div className="dashboard-grid">
          <article className="status-card featured-card"><div className="card-heading"><span>ESTADO GENERAL</span><ShieldCheck size={19} /></div><div className="big-status">Todo en orden</div><p>Tu hogar funciona con normalidad.</p><div className="status-progress"><span /></div><small>Actualizado hace un momento</small></article>
          <article className="status-card"><div className="card-heading"><span>ACTIVIDAD</span><Activity size={19} /></div><div className="metric">24<span>°C</span></div><p>Temperatura interior</p><div className="metric-detail"><Wifi size={15} /> Sensores activos</div></article>
          <article className="status-card"><div className="card-heading"><span>ACCESOS</span><DoorOpen size={19} /></div><div className="metric">{esAdmin ? '04' : '02'}</div><p>{esAdmin ? 'accesos registrados hoy' : 'dispositivos conectados'}</p><div className="metric-detail"><Settings size={15} /> Configuración disponible</div></article>
        </div>
      </section>
    </main>
  )
}

export default Dashboard