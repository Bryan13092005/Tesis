import { useState } from 'react'
import { KeyRound, Save, Settings, Trash2, X } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

function AdminProfileMenu({ onLogout }) {
  const { accessToken, user, perfil, cerrarSesion } = useAuth()
  const [open, setOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({
    nombre: perfil?.nombre || '',
    apellido: perfil?.apellido || '',
    email: user?.email || '',
    password: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const updateProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const changes = {
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email,
      }
      if (form.password) changes.password = form.password

      await api.put(`/api/admin/users/actualizarPerfilUsuario/${user.id}`, changes, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      setForm((current) => ({ ...current, password: '' }))
      setNotice('Perfil actualizado correctamente.')
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo actualizar el perfil.')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    if (!form.password || form.password.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.put('/api/admin/users/cambiarMiClave', { nuevaPassword: form.password }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      setForm((current) => ({ ...current, password: '' }))
      setNotice('Contraseña actualizada correctamente.')
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo cambiar la contraseña.')
    } finally {
      setSaving(false)
    }
  }

  const deleteAccount = async () => {
    if (!window.confirm('¿Eliminar tu cuenta de administrador? Debe existir otro administrador y esta acción no se puede deshacer.')) return

    setSaving(true)
    setError('')
    try {
      await api.delete('/api/admin/users/eliminarMiUsuario', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      await cerrarSesion()
      onLogout()
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo eliminar la cuenta.')
      setSaving(false)
    }
  }

  return (
    <div className="admin-profile-menu" onMouseLeave={() => setOpen(false)}>
      <button className="avatar" type="button" onClick={() => setOpen((current) => !current)} onMouseEnter={() => setOpen(true)} aria-haspopup="true" aria-expanded={open} title="Perfil de administrador">
        {(perfil?.nombre || user?.email || 'U').charAt(0).toUpperCase()}
      </button>
      {open && <div className="admin-profile-dropdown">
        <strong>{perfil?.nombre || 'Administrador'}</strong>
        <span>{user?.email}</span>
        <button type="button" onClick={() => { setFormOpen(true); setOpen(false); setError(''); setNotice('') }}><Settings size={15} /> Editar perfil</button>
      </div>}
      {formOpen && <div className="admin-profile-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false) }}>
        <section className="admin-profile-modal" role="dialog" aria-modal="true" aria-labelledby="admin-profile-title">
          <div className="admin-profile-modal-heading"><div><p className="form-kicker">CUENTA ADMINISTRATIVA</p><h2 id="admin-profile-title">Mi perfil</h2></div><button className="table-action" type="button" onClick={() => setFormOpen(false)} aria-label="Cerrar perfil"><X size={17} /></button></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="admin-notice" role="status">{notice}</p>}
          <form className="admin-profile-form" onSubmit={updateProfile}>
            <label htmlFor="admin-profile-name">Nombre</label><input id="admin-profile-name" name="nombre" value={form.nombre} onChange={updateField} required />
            <label htmlFor="admin-profile-lastname">Apellido</label><input id="admin-profile-lastname" name="apellido" value={form.apellido} onChange={updateField} required />
            <label htmlFor="admin-profile-email">Correo electrónico</label><input id="admin-profile-email" name="email" type="email" value={form.email} onChange={updateField} required />
            <label htmlFor="admin-profile-password">Nueva contraseña</label><input id="admin-profile-password" name="password" type="password" minLength="6" value={form.password} onChange={updateField} placeholder="Vacío = no cambiar" />
            <div className="admin-profile-actions"><button className="submit-button" type="submit" disabled={saving}><Save size={16} /> Guardar perfil</button><button className="profile-password-button" type="button" onClick={changePassword} disabled={saving}><KeyRound size={16} /> Cambiar clave</button></div>
          </form>
          <button className="delete-account-button" type="button" onClick={deleteAccount} disabled={saving}><Trash2 size={16} /> Eliminar mi cuenta</button>
        </section>
      </div>}
    </div>
  )
}

export default AdminProfileMenu
