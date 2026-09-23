import { useEffect, useState } from 'react'
import { CalendarDays, RefreshCw } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

function formatValue(value) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function HistoryPanel({ title, description, endpoint }) {
  const { accessToken } = useAuth()
  const [rows, setRows] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadHistory = async (from = dateFrom, to = dateTo) => {
    setLoading(true)
    setError('')
    const params = {}
    if (from) params.fechaInicio = from
    if (to) params.fechaFin = to

    try {
      const { data } = await api.get(endpoint, { params, headers: { Authorization: `Bearer ${accessToken}` } })
      setRows(Array.isArray(data?.resultado) ? data.resultado : [])
    } catch (requestError) {
      setRows([])
      setError(requestError.response?.data?.mensaje || 'No se pudo cargar este historial.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const fetchHistory = async () => {
      try {
        const { data } = await api.get(endpoint, { headers: { Authorization: `Bearer ${accessToken}` } })
        if (active) setRows(Array.isArray(data?.resultado) ? data.resultado : [])
      } catch (requestError) {
        if (active) {
          setRows([])
          setError(requestError.response?.data?.mensaje || 'No se pudo cargar este historial.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchHistory()
    return () => {
      active = false
    }
  }, [endpoint, accessToken])

  const columns = rows.length > 0 ? Object.keys(rows[0]) : []

  return (
    <section className="history-panel">
      <div className="history-heading">
        <div>
          <p className="form-kicker">REGISTRO DEL SISTEMA</p>
          <h2>{title}</h2>
          <p className="dashboard-subtitle">{description}</p>
        </div>
        <button className="history-refresh" type="button" onClick={() => loadHistory()} disabled={loading} title="Actualizar historial" aria-label="Actualizar historial"><RefreshCw size={17} className={loading ? 'is-spinning' : ''} /></button>
      </div>

      <form className="history-filters" onSubmit={(event) => { event.preventDefault(); loadHistory() }}>
        <label htmlFor={`${endpoint}-from`}><CalendarDays size={15} /> Desde<input id={`${endpoint}-from`} type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
        <label htmlFor={`${endpoint}-to`}><CalendarDays size={15} /> Hasta<input id={`${endpoint}-to`} type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
        <button className="history-filter-button" type="submit">Filtrar</button>
        {(dateFrom || dateTo) && <button className="history-clear-button" type="button" onClick={() => { setDateFrom(''); setDateTo(''); loadHistory('', '') }}>Limpiar</button>}
      </form>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="history-table-wrap">
        {loading ? <div className="admin-empty-state">Cargando historial...</div> : rows.length === 0 ? <div className="admin-empty-state">No hay registros para mostrar.</div> : (
          <div className="history-table-scroll">
            <table className="history-table">
              <thead><tr>{columns.map((column) => <th key={column}>{column.replaceAll('_', ' ')}</th>)}</tr></thead>
              <tbody>{rows.map((row, index) => <tr key={row.id || `${row.fecha_hora || row.created_at || 'row'}-${index}`}>{columns.map((column) => <td key={column}>{formatValue(row[column])}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default HistoryPanel