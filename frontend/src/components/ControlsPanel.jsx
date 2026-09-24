import { useEffect, useState } from 'react'
import { CarFront, DoorOpen, Lightbulb, LockKeyhole, UnlockKeyhole } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { connectSocket } from '../services/socket'

const rooms = ['baño', 'dormitorio', 'sala', 'cocina', 'pasillo']

function ControlsPanel({ sensorStatus }) {
  const { accessToken, perfil } = useAuth()
  const [lights, setLights] = useState({})
  const [security, setSecurity] = useState(null)
  const [lightsLoading, setLightsLoading] = useState(true)
  const [securityLoading, setSecurityLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const permissionsValue = perfil?.permisosAcceso ?? perfil?.permisos
  const permissions = Array.isArray(permissionsValue)
    ? permissionsValue
    : typeof permissionsValue === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(permissionsValue)
            return Array.isArray(parsed) ? parsed : [permissionsValue]
          } catch {
            return permissionsValue.split(',').map((permission) => permission.trim()).filter(Boolean)
          }
        })()
      : []
  const allPermissions = permissions.includes('ALL')
  const can = (permission) => allPermissions || permissions.includes(permission)
  const hasLightPermission = allPermissions || permissions.includes('controlLuces')
  const hasSecurityPermission = allPermissions || permissions.includes('activarBloqueo')
  const hasGarageOrDoorPermission = allPermissions || permissions.includes('garage') || permissions.includes('puertaPrincipal')
  const shouldLoadSecurity = hasSecurityPermission || hasGarageOrDoorPermission
  const controlsEnabled = sensorStatus === 'online'

  useEffect(() => {
    if (!accessToken || !hasLightPermission) return undefined

    let active = true
    api.get('/api/acciones/estadoLuces', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(({ data }) => {
        if (active) setLights(data.data ?? {})
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.error || 'No se pudieron cargar los estados de las luces.')
      })
      .finally(() => {
        if (active) setLightsLoading(false)
      })

    const socket = connectSocket()
    const onLightUpdated = ({ luz, estado }) => {
      const room = luz === 'sala-comedor' ? 'sala' : luz
      if (rooms.includes(room)) setLights((current) => ({ ...current, [room]: estado === 'ENCENDIDO' }))
    }
    socket.on('luzActualizada', onLightUpdated)

    return () => {
      active = false
      socket.off('luzActualizada', onLightUpdated)
    }
  }, [accessToken, hasLightPermission])

  useEffect(() => {
    if (!accessToken || !shouldLoadSecurity) return undefined

    let active = true
    api.get('/api/acciones/estadoModoSeguro', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(({ data }) => {
        if (active) setSecurity(data.activo === true)
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.error || 'No se pudo cargar el estado del modo seguro.')
      })
      .finally(() => {
        if (active) setSecurityLoading(false)
      })

    const socket = connectSocket()
    const onSecurityUpdated = ({ estado }) => {
      setSecurity(estado === 'BLOQUEADO')
      setSecurityLoading(false)
    }
    socket.on('modoSeguroActualizado', onSecurityUpdated)

    return () => {
      active = false
      socket.off('modoSeguroActualizado', onSecurityUpdated)
    }
  }, [accessToken, shouldLoadSecurity])

  const request = async (key, callback, successMessage) => {
    if (!controlsEnabled) {
      setError(sensorStatus === 'checking' ? 'Espera a que se verifique el estado del sistema.' : 'Los controles están deshabilitados porque el sistema está offline.')
      return
    }

    if ((key === 'garage' || key === 'door') && security === true) {
      setError('El modo seguro está activado. Desactívalo para abrir el garaje o la puerta principal.')
      return
    }

    setBusy(key)
    setError('')
    setNotice('')
    try {
      await callback()
      setNotice(successMessage)
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.response?.data?.mensaje || 'No se pudo ejecutar la acción.')
    } finally {
      setBusy('')
    }
  }

  const changeLight = (room, state) => request(`light-${room}`, () => api.put('/api/acciones/cambiarLuz', { habitacion: room, estado: state }, { headers: { Authorization: `Bearer ${accessToken}` } }), `Luz de ${room} ${state ? 'encendida' : 'apagada'}.`).then(() => setLights((current) => ({ ...current, [room]: state })))
  const actionsBlockedBySecurity = security === true || securityLoading

  return (
    <section className="controls-panel">
      <div className="controls-heading"><div><p className="form-kicker">CONTROL DEL HOGAR</p><h2>Controles</h2><p className="dashboard-subtitle">Activa dispositivos y modos disponibles según tus permisos.</p></div></div>
      <div className={`controls-availability ${controlsEnabled ? 'is-online' : 'is-offline'}`} role="status"><span /> {controlsEnabled ? 'Controles disponibles: sistema online.' : sensorStatus === 'checking' ? 'Verificando sensores antes de habilitar controles...' : 'Controles bloqueados: sistema offline.'}</div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="admin-notice" role="status">{notice}</p>}

      {can('controlLuces') && <article className="control-card control-lights"><div className="control-card-heading"><div><Lightbulb size={19} /><h3>Luces</h3></div><span>{lightsLoading ? 'Consultando estado real...' : '5 habitaciones'}</span></div><div className="light-controls">{rooms.map((room) => <div className="light-row" key={room}><span>{room}</span><div><button className={lights[room] === true ? 'is-selected' : ''} type="button" disabled={!controlsEnabled || lightsLoading || busy === `light-${room}`} onClick={() => changeLight(room, true)}>Encender</button><button className={lights[room] === false ? 'is-selected is-off' : ''} type="button" disabled={!controlsEnabled || lightsLoading || busy === `light-${room}`} onClick={() => changeLight(room, false)}>Apagar</button></div></div>)}</div></article>}

      {can('garage') && <article className="control-card"><div className="control-card-heading"><div><CarFront size={19} /><h3>Garaje</h3></div><span>{securityLoading ? 'Consultando seguridad...' : security ? 'Bloqueado por modo seguro' : 'Acceso automático'}</span></div><p>Envía la orden de apertura al garaje.</p><button className="control-action-button" type="button" disabled={!controlsEnabled || actionsBlockedBySecurity || busy === 'garage'} onClick={() => request('garage', () => api.put('/api/acciones/abrirGarage', {}, { headers: { Authorization: `Bearer ${accessToken}` } }), 'Orden de apertura enviada al garaje.')}><CarFront size={17} /> {busy === 'garage' ? 'Esperando respuesta...' : 'Abrir garaje'}</button></article>}

      {can('puertaPrincipal') && <article className="control-card"><div className="control-card-heading"><div><DoorOpen size={19} /><h3>Puerta principal</h3></div><span>{securityLoading ? 'Consultando seguridad...' : security ? 'Bloqueada por modo seguro' : 'Acceso principal'}</span></div><p>Envía la orden de apertura a la puerta principal.</p><button className="control-action-button" type="button" disabled={!controlsEnabled || actionsBlockedBySecurity || busy === 'door'} onClick={() => request('door', () => api.put('/api/acciones/abrirPuerta', { accion: 'ABRIR' }, { headers: { Authorization: `Bearer ${accessToken}` } }), 'Orden de apertura enviada a la puerta.')}><DoorOpen size={17} /> {busy === 'door' ? 'Esperando respuesta...' : 'Abrir puerta'}</button></article>}

      {can('activarBloqueo') && <article className="control-card security-control"><div className="control-card-heading"><div>{security ? <LockKeyhole size={19} /> : <UnlockKeyhole size={19} />}<h3>Modo seguro</h3></div><span>{securityLoading ? 'Consultando estado real...' : security ? 'Activado' : 'Desactivado'}</span></div><p>Bloquea o desbloquea el sistema de seguridad.</p><div className="security-buttons"><button className={security === true ? 'is-selected' : ''} type="button" disabled={!controlsEnabled || securityLoading || busy === 'security'} onClick={() => request('security', () => api.post('/api/acciones/modoSeguro', { accion: 'ON' }, { headers: { Authorization: `Bearer ${accessToken}` } }), 'Modo seguro activado.').then(() => setSecurity(true))}><LockKeyhole size={16} /> Activar</button><button className={security === false ? 'is-off' : ''} type="button" disabled={!controlsEnabled || securityLoading || busy === 'security'} onClick={() => request('security', () => api.post('/api/acciones/modoSeguro', { accion: 'OFF' }, { headers: { Authorization: `Bearer ${accessToken}` } }), 'Modo seguro desactivado.').then(() => setSecurity(false))}><UnlockKeyhole size={16} /> Desactivar</button></div></article>}

      {!['controlLuces', 'garage', 'puertaPrincipal', 'activarBloqueo'].some(can) && <div className="admin-empty-state">No tienes permisos de control asignados.</div>}
    </section>
  )
}

export default ControlsPanel