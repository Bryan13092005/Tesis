import { useEffect, useState } from 'react'
import { KeyRound, Plus, RefreshCw, Trash2, Unlock, UserPlus } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const emptyForm = { tipo: 'pin', valor: '', usosPermitidos: '', nombreUsuario: '' }

const fetchAccesses = (accessToken) => api.get('/api/admin/accesos/obtenerAccesos', {
  headers: { Authorization: `Bearer ${accessToken}` },
})

function AdminAccesses() {
  const { accessToken } = useAuth()
  const [accesses, setAccesses] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [attempts, setAttempts] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const config = { headers: { Authorization: `Bearer ${accessToken}` } }

  const loadAccesses = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await fetchAccesses(accessToken)
      setAccesses(data.data ?? [])
    } catch (requestError) {
      if (requestError.response?.status === 404) setAccesses([])
      else setError(requestError.response?.data?.error || 'No se pudieron cargar los accesos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!accessToken) return undefined

    let active = true
    fetchAccesses(accessToken)
      .then(({ data }) => {
        if (active) setAccesses(data.data ?? [])
      })
      .catch((requestError) => {
        if (active) {
          if (requestError.response?.status === 404) setAccesses([])
          else setError(requestError.response?.data?.error || 'No se pudieron cargar los accesos.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken])

  const updateForm = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.post('/api/admin/accesos/agregarAcceso', {
        ...form,
        usosPermitidos: form.usosPermitidos === '' ? null : Number(form.usosPermitidos),
      }, config)
      setForm(emptyForm)
      setNotice('Acceso creado correctamente.')
      await loadAccesses()
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo crear el acceso.')
    } finally {
      setSaving(false)
    }
  }

  const toggleAccess = async (access) => {
    setError('')
    setNotice('')
    try {
      await api.put(`/api/admin/accesos/cambiarEstadoAcceso/${access.id}`, { tipo: access.tipo, activo: !access.activo }, config)
      setNotice(`Acceso ${access.activo ? 'desactivado' : 'activado'} correctamente.`)
      await loadAccesses()
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo cambiar el estado del acceso.')
    }
  }

  const updateAttempts = async (access) => {
    const value = attempts[access.id]
    if (value === undefined || (value !== '' && Number(value) <= 0)) {
      setError('Los intentos deben ser mayores que cero o quedar ilimitados.')
      return
    }

    try {
      await api.put(`/api/admin/accesos/actualizarIntentos/${access.id}`, { numero: value === '' ? null : Number(value) }, config)
      setNotice('Intentos actualizados correctamente.')
      setAttempts((current) => ({ ...current, [access.id]: undefined }))
      await loadAccesses()
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudieron actualizar los intentos.')
    }
  }

  const deleteAccess = async (access) => {
    if (!window.confirm(`¿Eliminar el acceso de ${access.nombreUsuario || 'este usuario'}?`)) return
    try {
      await api.delete(`/api/admin/accesos/eliminarAcceso/${access.id}`, config)
      setNotice('Acceso eliminado correctamente.')
      await loadAccesses()
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo eliminar el acceso.')
    }
  }

  return (
    <section className="admin-users-panel">
      <div className="admin-users-heading">
        <div><p className="form-kicker">ADMINISTRACIÓN</p><h2>Gestión de accesos</h2><p className="dashboard-subtitle">Administra credenciales PIN y RFID conectadas a tu hogar.</p></div>
        <button className="history-refresh" type="button" onClick={loadAccesses} disabled={loading} title="Actualizar accesos" aria-label="Actualizar accesos"><RefreshCw size={17} /></button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="admin-notice" role="status">{notice}</p>}

      <div className="admin-users-layout">
        <form className="admin-user-form" onSubmit={handleCreate}>
          <div className="admin-form-title"><UserPlus size={18} /><h3>Agregar acceso</h3></div>
          <label htmlFor="access-type">Tipo</label>
          <select id="access-type" name="tipo" value={form.tipo} onChange={updateForm}><option value="pin">PIN</option><option value="rfid">RFID</option></select>
          <label htmlFor="access-value">{form.tipo === 'pin' ? 'PIN' : 'Identificador RFID'}</label>
          <input id="access-value" name="valor" value={form.valor} onChange={updateForm} placeholder={form.tipo === 'pin' ? 'Mínimo 4 dígitos' : '8 caracteres hexadecimales'} required />
          <label htmlFor="access-user">Nombre de usuario</label>
          <input id="access-user" name="nombreUsuario" value={form.nombreUsuario} onChange={updateForm} required />
          <label htmlFor="access-attempts">Usos permitidos</label>
          <input id="access-attempts" name="usosPermitidos" type="number" min="1" value={form.usosPermitidos} onChange={updateForm} placeholder="Vacío = ilimitado" />
          <button className="submit-button" type="submit" disabled={saving}>{saving ? 'Guardando...' : <><Plus size={16} /> Crear acceso</>}</button>
        </form>

        <div className="admin-users-table-wrap">
          {loading ? <div className="admin-empty-state">Cargando accesos...</div> : accesses.length === 0 ? <div className="admin-empty-state">No hay accesos registrados.</div> : (
            <div className="admin-users-table-scroll"><table className="admin-users-table access-table"><thead><tr><th>Usuario</th><th>Tipo</th><th>Identificador</th><th>Estado</th><th>Usos</th><th>Acciones</th></tr></thead><tbody>
              {accesses.map((access) => <tr key={access.id}><td><strong>{access.nombreUsuario || 'Sin nombre'}</strong></td><td><span className="user-role-label">{access.tipo}</span></td><td><code>{access.identificador}</code></td><td><button className={`status-chip ${access.activo ? 'is-active' : 'is-blocked'}`} type="button" onClick={() => toggleAccess(access)}>{access.activo ? 'Activo' : 'Inactivo'}</button></td><td><div className="attempts-editor"><span>{access.usosPermitidos ?? 'Ilimitados'}</span><input type="number" min="1" value={attempts[access.id] ?? ''} onChange={(event) => setAttempts((current) => ({ ...current, [access.id]: event.target.value }))} placeholder="Cambiar" aria-label="Nuevos usos permitidos" /><button className="table-action" type="button" onClick={() => updateAttempts(access)} title="Actualizar usos" aria-label="Actualizar usos"><Unlock size={15} /></button></div></td><td><div className="user-actions"><button className="table-action danger" type="button" onClick={() => deleteAccess(access)} title="Eliminar acceso" aria-label="Eliminar acceso"><Trash2 size={16} /></button><KeyRound size={16} className="access-type-icon" /></div></td></tr>)}
            </tbody></table></div>
          )}
        </div>
      </div>
    </section>
  )
}

export default AdminAccesses