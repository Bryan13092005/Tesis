import { useEffect, useState } from 'react'
import { Edit3, KeyRound, Save, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const permissionOptions = [
  ['controlLuces', 'Control de luces'],
  ['garage', 'Garaje'],
  ['sensores', 'Sensores'],
  ['puertaPrincipal', 'Puerta principal'],
  ['ingresosH', 'Historial de ingresos'],
  ['lucesH', 'Historial de luces'],
  ['sensoresH', 'Historial de sensores'],
  ['seguroH', 'Historial de acciones'],
  ['activarBloqueo', 'Modo seguro'],
]

const permissionLabels = Object.fromEntries(permissionOptions)
const allPermissions = permissionOptions.map(([permission]) => permission)

const emptyForm = {
  nombre: '',
  apellido: '',
  email: '',
  password: '',
  rol: 'usuario',
  permisos: [],
}

function normalizePermissions(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return value === 'ALL' ? ['ALL'] : value.split(',').map((permission) => permission.trim()).filter(Boolean)
  }
}

function getPermissionLabels(value) {
  const permissions = normalizePermissions(value)
  if (permissions.includes('ALL')) return ['Acceso total']
  return permissions.map((permission) => permissionLabels[permission] || permission)
}

function isAdministratorRole(role) {
  return ['admin', 'administrador'].includes(String(role).toLowerCase())
}

const fetchUsers = (accessToken) => api.get('/api/admin/users/verUsuarios', {
  headers: { Authorization: `Bearer ${accessToken}` },
})

function AdminUsers() {
  const { accessToken, user } = useAuth()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingUser, setEditingUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const requestConfig = { headers: { Authorization: `Bearer ${accessToken}` } }

  const loadUsers = async () => {
    setLoading(true)
    setError('')

    try {
      const { data } = await fetchUsers(accessToken)
      setUsers(data.data ?? [])
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudieron cargar los usuarios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!accessToken) return undefined

    let active = true
    fetchUsers(accessToken)
      .then(({ data }) => {
        if (active) setUsers(data.data ?? [])
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.error || 'No se pudieron cargar los usuarios.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken])

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'rol' && isAdministratorRole(value) ? { permisos: 'ALL' } : {}),
      ...(name === 'rol' && !isAdministratorRole(value) && current.permisos === 'ALL' ? { permisos: [] } : {}),
    }))
  }

  const togglePermission = (permission) => {
    setForm((current) => ({
      ...current,
      permisos: current.permisos.includes(permission)
        ? current.permisos.filter((item) => item !== permission)
        : [...current.permisos, permission],
    }))
  }

  const startEdit = (selectedUser) => {
    setEditingUser(selectedUser)
    setForm({
      nombre: selectedUser.nombre ?? '',
      apellido: selectedUser.apellido ?? '',
      email: selectedUser.email ?? '',
      password: '',
      rol: selectedUser.rol?.toLowerCase() ?? 'usuario',
      permisos: isAdministratorRole(selectedUser.rol)
        ? 'ALL'
        : normalizePermissions(selectedUser.permisosAcceso || selectedUser.user_metadata?.permisos),
    })
    setError('')
    setNotice('')
  }

  const cancelEdit = () => {
    setEditingUser(null)
    setForm(emptyForm)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      if (editingUser) {
        const profileChanges = {
          nombre: form.nombre,
          apellido: form.apellido,
          email: form.email,
          rol: form.rol,
        }
        if (form.password) profileChanges.password = form.password

        await api.put(`/api/admin/users/actualizarPerfilUsuario/${editingUser.id}`, profileChanges, requestConfig)
        await api.put(`/api/admin/users/cambiarPermisosUsuario/${editingUser.id}`, {
          nuevosPermisos: isAdministratorRole(form.rol) ? 'ALL' : form.permisos.includes('ALL') ? allPermissions : form.permisos,
        }, requestConfig)
        setNotice('Usuario actualizado correctamente.')
      } else {
        await api.post('/api/admin/users/crearUsuario', {
          ...form,
          permisos: isAdministratorRole(form.rol) ? 'ALL' : form.permisos.includes('ALL') ? allPermissions : form.permisos,
        }, requestConfig)
        setNotice('Usuario creado correctamente.')
      }

      cancelEdit()
      await loadUsers()
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo guardar el usuario.')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (selectedUser) => {
    setError('')
    setNotice('')

    try {
      await api.put(`/api/admin/users/cambiarEstadoUsuario/${selectedUser.id}`, { nuevoEstado: !selectedUser.estado }, requestConfig)
      setNotice(`Usuario ${selectedUser.estado ? 'bloqueado' : 'activado'} correctamente.`)
      await loadUsers()
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo cambiar el estado del usuario.')
    }
  }

  const deleteUser = async (selectedUser) => {
    if (selectedUser.id === user?.id) {
      setError('Para eliminar tu propia cuenta usa la opción de seguridad de tu perfil.')
      return
    }

    if (!window.confirm(`¿Eliminar a ${selectedUser.nombre || selectedUser.email}? Esta acción no se puede deshacer.`)) return

    setError('')
    setNotice('')

    try {
      await api.delete(`/api/admin/users/eliminarUsuarios/${selectedUser.id}`, requestConfig)
      setNotice('Usuario eliminado correctamente.')
      await loadUsers()
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo eliminar el usuario.')
    }
  }

  return (
    <section className="admin-users-panel">
      <div className="admin-users-heading">
        <div>
          <p className="form-kicker">ADMINISTRACIÓN</p>
          <h2>Gestión de usuarios</h2>
          <p className="dashboard-subtitle">Administra perfiles, accesos y credenciales desde un solo lugar.</p>
        </div>
        {editingUser && <button className="admin-secondary-button" type="button" onClick={cancelEdit}><X size={16} /> Cancelar edición</button>}
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="admin-notice" role="status">{notice}</p>}

      <div className="admin-users-layout">
        <form className="admin-user-form" onSubmit={handleSubmit}>
          <div className="admin-form-title"><UserPlus size={18} /><h3>{editingUser ? 'Editar usuario' : 'Crear usuario'}</h3></div>
          <label htmlFor="user-name">Nombre</label>
          <input id="user-name" name="nombre" value={form.nombre} onChange={updateField} required />
          <label htmlFor="user-lastname">Apellido</label>
          <input id="user-lastname" name="apellido" value={form.apellido} onChange={updateField} required />
          <label htmlFor="user-email">Correo electrónico</label>
          <input id="user-email" name="email" type="email" value={form.email} onChange={updateField} required />
          <label htmlFor="user-password">{editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label>
          <input id="user-password" name="password" type="password" minLength="6" value={form.password} onChange={updateField} required={!editingUser} />
          <label htmlFor="user-role">Rol</label>
          <select id="user-role" name="rol" value={form.rol} onChange={updateField}>
            <option value="usuario">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
          {!isAdministratorRole(form.rol) && <fieldset className="permissions-fieldset">
            <legend>Permisos de acceso</legend>
            <label className="permission-all"><input type="checkbox" checked={form.permisos.includes('ALL')} onChange={() => setForm((current) => ({ ...current, permisos: current.permisos.includes('ALL') ? [] : ['ALL'] }))} /> Acceso total</label>
            {permissionOptions.map(([permission, label]) => (
              <label key={permission} className="permission-option"><input type="checkbox" checked={form.permisos.includes(permission) || form.permisos.includes('ALL')} disabled={form.permisos.includes('ALL')} onChange={() => togglePermission(permission)} /> {label}</label>
            ))}
          </fieldset>}
          <button className="submit-button" type="submit" disabled={saving}>{saving ? 'Guardando...' : <><Save size={16} /> {editingUser ? 'Guardar cambios' : 'Crear usuario'}</>}</button>
        </form>

        <div className="admin-users-table-wrap">
          {loading ? <div className="admin-empty-state">Cargando usuarios...</div> : users.length === 0 ? <div className="admin-empty-state">No hay usuarios registrados.</div> : (
            <div className="admin-users-table-scroll">
              <table className="admin-users-table">
                <thead><tr><th>Usuario</th><th>Rol y estado</th><th>Permisos</th><th>Acciones</th></tr></thead>
                <tbody>
                  {users.map((selectedUser) => (
                    <tr key={selectedUser.id}>
                      <td><strong>{selectedUser.nombre} {selectedUser.apellido}</strong><span>{selectedUser.email || 'Sin correo'}</span></td>
                      <td><span className="user-role-label">{selectedUser.rol || 'Sin rol'}</span><button className={`status-chip ${selectedUser.estado ? 'is-active' : 'is-blocked'}`} type="button" onClick={() => toggleStatus(selectedUser)}>{selectedUser.estado ? 'Activo' : 'Bloqueado'}</button></td>
                      <td><div className="permission-list">{getPermissionLabels(selectedUser.permisosAcceso || selectedUser.user_metadata?.permisos).map((permission) => <span key={permission}>{permission}</span>)}</div></td>
                      <td><div className="user-actions"><button className="table-action" type="button" onClick={() => startEdit(selectedUser)} title="Editar usuario" aria-label="Editar usuario"><Edit3 size={16} /></button><button className="table-action" type="button" onClick={() => startEdit({ ...selectedUser, password: '' })} title="Cambiar contraseña" aria-label="Cambiar contraseña"><KeyRound size={16} /></button><button className="table-action danger" type="button" onClick={() => deleteUser(selectedUser)} title="Eliminar usuario" aria-label="Eliminar usuario"><Trash2 size={16} /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <p className="admin-metadata-note"><ShieldCheck size={15} /> El UUID y los metadatos se guardan en Supabase Auth y se sincronizan con el perfil administrativo.</p>
    </section>
  )
}

export default AdminUsers