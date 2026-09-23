import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Activity, Clock3, DoorOpen, Home, LogOut, MonitorCog, UserRound, Users } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'
import AdminUsers from '../components/AdminUsers'
import AdminAccesses from '../components/AdminAccesses'
import ControlsPanel from '../components/ControlsPanel'
import SensorsPanel from '../components/SensorsPanel'
import ProfilePanel from '../components/ProfilePanel'
import HistoryPanel from '../components/HistoryPanel'
import api from '../services/api'
import { connectSocket } from '../services/socket'

const historyViews = {
  'HISTORIAL DE INGRESOS': {
    title: 'Historial de ingresos',
    description: 'Consulta los accesos registrados en el sistema.',
    endpoint: '/api/acciones/historial/ingresos',
  },
  'HISTORIAL DE LUCES': {
    title: 'Historial de luces',
    description: 'Consulta los cambios realizados en la iluminación.',
    endpoint: '/api/acciones/historial/luces',
  },
  'HISTORIAL DE SENSORES': {
    title: 'Historial de sensores',
    description: 'Consulta las lecturas registradas por los sensores.',
    endpoint: '/api/acciones/historial/sensores',
  },
  'HISTORIAL DE ACCIONES': {
    title: 'Historial de acciones',
    description: 'Consulta los eventos del modo seguro y otras acciones.',
    endpoint: '/api/acciones/historial/acciones',
  },
}

function Dashboard() {
  const navigate = useNavigate()
  const { user, perfil, loading, accessToken, cerrarSesion } = useAuth()
  const [activeView, setActiveView] = useState('home')
  const [sensorStatus, setSensorStatus] = useState('checking')
  const [realtimeMessage, setRealtimeMessage] = useState('')

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
  const tieneTodosLosPermisos = permisos.includes('ALL')
  const historyOptions = esAdmin
    ? Object.keys(historyViews)
    : Object.keys(historyViews).filter((historyLabel) => {
        const permissionByHistory = {
          'HISTORIAL DE INGRESOS': 'ingresosH',
          'HISTORIAL DE LUCES': 'lucesH',
          'HISTORIAL DE SENSORES': 'sensoresH',
          'HISTORIAL DE ACCIONES': 'seguroH',
        }
        return permisos.includes(permissionByHistory[historyLabel]) || tieneTodosLosPermisos
      })

  useEffect(() => {
    if (!accessToken) return undefined

    let active = true
    const consultarSensores = async () => {
      try {
        const { data } = await api.get('/api/acciones/datosSensores', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (active) setSensorStatus(data?.online === true ? 'online' : 'offline')
      } catch {
        if (active) setSensorStatus('offline')
      }
    }

    consultarSensores()
    const intervalId = window.setInterval(consultarSensores, 60000)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [accessToken])

  useEffect(() => {
    const socket = connectSocket()
    const onSensorUpdated = () => setSensorStatus('online')
    const onLightUpdated = ({ luz, estado }) => setRealtimeMessage(`Luz ${luz}: ${estado.toLowerCase()}.`)
    const onDoorUpdated = ({ estado }) => setRealtimeMessage(`Puerta principal: ${estado.toLowerCase()}.`)
    const onGarageUpdated = ({ estado }) => setRealtimeMessage(`Garaje: ${estado.toLowerCase()}.`)
    const onAccessRegistered = ({ nombre, tipo, fecha }) => setRealtimeMessage(`Acceso registrado: ${nombre || tipo} (${new Date(fecha).toLocaleTimeString()}).`)
    const onAccessDenied = ({ identificador, motivo }) => setRealtimeMessage(`Acceso denegado: ${identificador}${motivo ? `, ${motivo.toLowerCase()}` : ''}.`)

    socket.on('sensorActualizado', onSensorUpdated)
    socket.on('luzActualizada', onLightUpdated)
    socket.on('puertaActualizada', onDoorUpdated)
    socket.on('garajeActualizado', onGarageUpdated)
    socket.on('accesoRegistrado', onAccessRegistered)
    socket.on('accesoDenegado', onAccessDenied)

    return () => {
      socket.off('sensorActualizado', onSensorUpdated)
      socket.off('luzActualizada', onLightUpdated)
      socket.off('puertaActualizada', onDoorUpdated)
      socket.off('garajeActualizado', onGarageUpdated)
      socket.off('accesoRegistrado', onAccessRegistered)
      socket.off('accesoDenegado', onAccessDenied)
    }
  }, [])
  const navigation = esAdmin
    ? [
        { label: 'HOME', icon: Home },
        { label: 'GESTIÓN DE USUARIOS', icon: Users },
        { label: 'HISTORIAL', icon: Clock3, dropdown: historyOptions },
        { label: 'ACCESOS', icon: DoorOpen },
        { label: "CONTROLES", icon: MonitorCog},
        { label: "SENSORES", icon: Activity},
      ]
    : [
        { label: 'HOME', icon: Home },
        { label: 'PERFIL', icon: UserRound },
        ...(permisos.some((permiso) => ['controlLuces', 'garage', 'puertaPrincipal', 'activarBloqueo'].includes(permiso))
          ? [{ label: 'CONTROL', icon: MonitorCog }]
          : []),
        ...(historyOptions.length > 0 ? [{ label: 'HISTORIAL', icon: Clock3, dropdown: historyOptions }] : []),
          ...(permisos.some((permiso) => ['sensores'].includes(permiso))
          ? [{ label: "SENSORES", icon: Activity}]
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
          {navigation.map(({ label, icon: Icon, dropdown }, index) => (
            dropdown ? (
              <div key={label} className="nav-dropdown">
                <button className={`nav-item ${dropdown.includes(activeView) ? 'active' : ''}`} type="button" aria-haspopup="true"><Icon size={16} />{label}</button>
                <div className="nav-dropdown-menu">
                  {dropdown.map((historyLabel) => <button key={historyLabel} className={`nav-dropdown-option ${activeView === historyLabel ? 'active' : ''}`} type="button" onClick={() => setActiveView(historyLabel)}>{historyViews[historyLabel].title}</button>)}
                </div>
              </div>
            ) : (
              <button key={label} className={`nav-item ${activeView === (index === 0 ? 'home' : label) ? 'active' : ''}`} type="button" onClick={() => setActiveView(index === 0 ? 'home' : label)}>
                <Icon size={16} />{label}
              </button>
            )
          ))}
        </nav>
        <div className="header-user">
          <span className="avatar">{(perfil?.nombre || user?.email || 'U').charAt(0).toUpperCase()}</span>
          <span className="user-name">{perfil?.nombre || 'Mi cuenta'}</span>
          <ThemeToggle />
          <button className="logout-button" type="button" onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={17} /></button>
        </div>
      </header>

      {activeView === 'GESTIÓN DE USUARIOS' && esAdmin ? <AdminUsers /> : activeView === 'ACCESOS' && esAdmin ? <AdminAccesses /> : (activeView === 'CONTROL' || activeView === 'CONTROLES') ? <ControlsPanel sensorStatus={sensorStatus} /> : activeView === 'SENSORES' ? <SensorsPanel /> : activeView === 'PERFIL' ? <ProfilePanel /> : historyViews[activeView] ? <HistoryPanel {...historyViews[activeView]} /> : <section className="dashboard-content">
        <div className="welcome-row">
          <div><p className="form-kicker">{esAdmin ? 'CENTRO DE ADMINISTRACIÓN' : 'TU ESPACIO PERSONAL'}</p><h1>Buenos días{perfil?.nombre ? `, ${perfil.nombre}` : ''}.</h1><p className="dashboard-subtitle">Todo está tranquilo en casa.</p></div>
          <div className={`online-status ${sensorStatus === 'online' ? 'is-online' : sensorStatus === 'offline' ? 'is-offline' : 'is-checking'}`}><span /> {sensorStatus === 'online' ? 'Sistema conectado' : sensorStatus === 'offline' ? 'Sistema desconectado' : 'Verificando sistema'}</div>
        </div>
        <div className={`system-status-panel ${sensorStatus}`}>
          <span className="system-status-dot" />
          <div><strong>{sensorStatus === 'online' ? 'Sensores online' : sensorStatus === 'offline' ? 'Sensores offline' : 'Comprobando sensores'}</strong><p>{sensorStatus === 'online' ? 'Se están recibiendo datos del sistema.' : sensorStatus === 'offline' ? 'No hay datos de sensores disponibles.' : 'Consultando el estado del sistema.'}</p></div>
        </div>
        {realtimeMessage && <p className="realtime-notice" role="status">{realtimeMessage}</p>}
      </section>}
    </main>
  )
}

export default Dashboard