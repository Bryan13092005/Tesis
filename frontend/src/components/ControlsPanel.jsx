import { useState } from 'react'
import { CarFront, DoorOpen, Lightbulb, LockKeyhole, UnlockKeyhole } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const rooms = ['baño', 'dormitorio', 'sala', 'cocina', 'pasillo']

function ControlsPanel({ sensorStatus }) {
  const { accessToken, perfil } = useAuth()
  const [lights, setLights] = useState({})
  const [security, setSecurity] = useState(null)
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
  const controlsEnabled = sensorStatus === 'online'

  const request = async (key, callback, successMessage) => {
    if (!controlsEnabled) {
      setError(sensorStatus === 'checking' ? 'Espera a que se verifique el estado del sistema.' : 'Los controles están deshabilitados porque el sistema está offline.')
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

  return (
    <section className="controls-panel">
      <div className="controls-heading"><div><p className="form-kicker">CONTROL DEL HOGAR</p><h2>Controles</h2><p className="dashboard-subtitle">Activa dispositivos y modos disponibles según tus permisos.</p></div></div>
      <div className={`controls-availability ${controlsEnabled ? 'is-online' : 'is-offline'}`} role="status"><span /> {controlsEnabled ? 'Controles disponibles: sistema online.' : sensorStatus === 'checking' ? 'Verificando sensores antes de habilitar controles...' : 'Controles bloqueados: sistema offline.'}</div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="admin-notice" role="status">{notice}</p>}

      {can('controlLuces') && <article className="control-card control-lights"><div className="control-card-heading"><div><Lightbulb size={19} /><h3>Luces</h3></div><span>5 habitaciones</span></div><div className="light-controls">{rooms.map((room) => <div className="light-row" key={room}><span>{room}</span><div><button className={lights[room] === true ? 'is-selected' : ''} type="button" disabled={!controlsEnabled || busy === `light-${room}`} onClick={() => changeLight(room, true)}>Encender</button><button className={lights[room] === false ? 'is-selected is-off' : ''} type="button" disabled={!controlsEnabled || busy === `light-${room}`} onClick={() => changeLight(room, false)}>Apagar</button></div></div>)}</div></article>}

      {can('garage') && <article className="control-card"><div className="control-card-heading"><div><CarFront size={19} /><h3>Garaje</h3></div><span>Acceso automático</span></div><p>Envía la orden de apertura al garaje.</p><button className="control-action-button" type="button" disabled={!controlsEnabled || busy === 'garage'} onClick={() => request('garage', () => api.put('/api/acciones/abrirGarage', {}, { headers: { Authorization: `Bearer ${accessToken}` } }), 'Orden de apertura enviada al garaje.')}><CarFront size={17} /> {busy === 'garage' ? 'Esperando respuesta...' : 'Abrir garaje'}</button></article>}

      {can('puertaPrincipal') && <article className="control-card"><div className="control-card-heading"><div><DoorOpen size={19} /><h3>Puerta principal</h3></div><span>Acceso principal</span></div><p>Envía la orden de apertura a la puerta principal.</p><button className="control-action-button" type="button" disabled={!controlsEnabled || busy === 'door'} onClick={() => request('door', () => api.put('/api/acciones/abrirPuerta', { accion: 'ABRIR' }, { headers: { Authorization: `Bearer ${accessToken}` } }), 'Orden de apertura enviada a la puerta.')}><DoorOpen size={17} /> {busy === 'door' ? 'Esperando respuesta...' : 'Abrir puerta'}</button></article>}

      {can('activarBloqueo') && <article className="control-card security-control"><div className="control-card-heading"><div>{security ? <LockKeyhole size={19} /> : <UnlockKeyhole size={19} />}<h3>Modo seguro</h3></div><span>{security ? 'Activado' : 'Desactivado'}</span></div><p>Bloquea o desbloquea el sistema de seguridad.</p><div className="security-buttons"><button className={security === true ? 'is-selected' : ''} type="button" disabled={!controlsEnabled || busy === 'security'} onClick={() => request('security', () => api.post('/api/acciones/modoSeguro', { accion: 'ON' }, { headers: { Authorization: `Bearer ${accessToken}` } }), 'Modo seguro activado.').then(() => setSecurity(true))}><LockKeyhole size={16} /> Activar</button><button className={security === false ? 'is-off' : ''} type="button" disabled={!controlsEnabled || busy === 'security'} onClick={() => request('security', () => api.post('/api/acciones/modoSeguro', { accion: 'OFF' }, { headers: { Authorization: `Bearer ${accessToken}` } }), 'Modo seguro desactivado.').then(() => setSecurity(false))}><UnlockKeyhole size={16} /> Desactivar</button></div></article>}

      {!['controlLuces', 'garage', 'puertaPrincipal', 'activarBloqueo'].some(can) && <div className="admin-empty-state">No tienes permisos de control asignados.</div>}
    </section>
  )
}

export default ControlsPanel