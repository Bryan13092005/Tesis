import { useEffect, useState } from 'react'
import { Activity, Droplets, Gauge, Leaf, Radio, Thermometer } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { connectSocket } from '../services/socket'

const initialSensors = {
  temperatura: null,
  humedad: null,
  humedadPlanta: null,
  gas: null,
  gasEstado: null,
}

function SensorsPanel() {
  const { accessToken } = useAuth()
  const [sensors, setSensors] = useState(initialSensors)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!accessToken) return undefined

    let active = true
    const loadSensors = async () => {
      try {
        const { data } = await api.get('/api/acciones/datosSensores', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (active) {
          setSensors({
            temperatura: data.temAmbiente ?? null,
            humedad: data.humAmbiente ?? null,
            humedadPlanta: data.humPlanta ?? null,
            gas: data.gas ?? null,
            gasEstado: data.gasEstado ?? null,
          })
          setError('')
        }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.error || 'No se pudieron cargar los sensores.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSensors()
    return () => {
      active = false
    }
  }, [accessToken])

  useEffect(() => {
    const socket = connectSocket()
    const updateSensor = ({ sensor, valor }) => {
      setSensors((current) => {
        if (sensor === 'temperatura') return { ...current, temperatura: valor }
        if (sensor === 'humedad_ambiente') return { ...current, humedad: valor }
        if (sensor === 'humedad_suelo') return { ...current, humedadPlanta: valor }
        if (sensor === 'gas') return { ...current, gas: valor }
        if (sensor === 'estado_gas') return { ...current, gasEstado: valor }
        return current
      })
      setError('')
    }

    socket.on('sensorActualizado', updateSensor)
    return () => socket.off('sensorActualizado', updateSensor)
  }, [])

  const value = (sensorValue, suffix = '') => sensorValue === null || sensorValue === undefined ? '--' : `${sensorValue}${suffix}`

  return (
    <section className="sensors-panel">
      <div className="sensors-heading">
        <div>
          <p className="form-kicker">MONITOREO EN TIEMPO REAL</p>
          <h2>Sensores</h2>
          <p className="dashboard-subtitle">Valores recibidos directamente desde los dispositivos.</p>
        </div>
        <div className="sensors-live-indicator"><span /> Socket.IO activo</div>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="sensors-loading">Cargando última lectura...</p>}

      <div className="sensor-grid">
        <article className="sensor-card"><div className="sensor-card-heading"><span><Thermometer size={18} /> Temperatura</span><Activity size={17} /></div><strong>{value(sensors.temperatura, ' °C')}</strong><small>Ambiente</small></article>
        <article className="sensor-card"><div className="sensor-card-heading"><span><Droplets size={18} /> Humedad ambiente</span><Activity size={17} /></div><strong>{value(sensors.humedad, ' %')}</strong><small>Humedad relativa</small></article>
        <article className="sensor-card"><div className="sensor-card-heading"><span><Leaf size={18} /> Humedad del suelo</span><Activity size={17} /></div><strong>{value(sensors.humedadPlanta, ' %')}</strong><small>Humedad de planta</small></article>
        <article className="sensor-card gas-card"><div className="sensor-card-heading"><span><Gauge size={18} /> Gas</span><Radio size={17} /></div><strong>{value(sensors.gas)}</strong><div className={`gas-state ${sensors.gasEstado === 'ALERTA' ? 'is-alert' : sensors.gasEstado === 'NORMAL' ? 'is-normal' : 'is-unknown'}`}><span /> {sensors.gasEstado || 'Sin estado'}</div></article>
      </div>
    </section>
  )
}

export default SensorsPanel
