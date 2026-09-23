import { useEffect, useState } from 'react'
import { Save, UserRound } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const emptyProfile = { nombre: '', apellido: '', email: '' }
const emptyForm = { ...emptyProfile, password: '' }

function ProfilePanel() {
  const { accessToken, perfil } = useAuth()
  const [profile, setProfile] = useState(emptyProfile)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!accessToken) return undefined

    let active = true
    api.get('/api/clientes/perfil', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(({ data }) => {
        if (!active) return
        const userProfile = {
          nombre: data.data?.nombre || '',
          apellido: data.data?.apellido || '',
          email: data.data?.email || '',
        }
        setProfile(userProfile)
        setForm({ ...userProfile, password: '' })
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.error || 'No se pudo cargar tu perfil.')
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
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    const changes = Object.fromEntries(
      ['nombre', 'apellido', 'email']
        .filter((field) => form[field] !== profile[field])
        .map((field) => [field, form[field]])
    )
    if (form.password) changes.password = form.password

    if (Object.keys(changes).length === 0) {
      setNotice('No hay cambios para guardar.')
      setSaving(false)
      return
    }

    try {
      await api.put('/api/actualizar', changes, { headers: { Authorization: `Bearer ${accessToken}` } })
      setProfile({
        nombre: changes.nombre ?? profile.nombre,
        apellido: changes.apellido ?? profile.apellido,
        email: changes.email ?? profile.email,
      })
      setForm((current) => ({ ...current, password: '' }))
      setNotice('Perfil actualizado correctamente.')
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo actualizar tu perfil.')
    } finally {
      setSaving(false)
    }
  }

  const displayedProfile = profile.email ? profile : { ...profile, email: perfil?.email || '' }

  return (
    <section className="profile-panel">
      <div className="profile-heading"><div><p className="form-kicker">MI CUENTA</p><h2>Mi perfil</h2><p className="dashboard-subtitle">Consulta y actualiza tu información personal.</p></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {loading ? <div className="admin-empty-state">Cargando perfil...</div> : (
        <div className="profile-layout">
          <div className="profile-summary"><span className="profile-avatar"><UserRound size={25} /></span><strong>{displayedProfile.nombre || 'Usuario'} {displayedProfile.apellido}</strong><span>{displayedProfile.email || 'Sin correo'}</span><small>Rol: {perfil?.rol || 'Usuario'}</small></div>
          <form className="profile-form" onSubmit={handleSubmit}>
            <label htmlFor="profile-name">Nombre</label><input id="profile-name" name="nombre" value={form.nombre} onChange={updateField} required />
            <label htmlFor="profile-lastname">Apellido</label><input id="profile-lastname" name="apellido" value={form.apellido} onChange={updateField} required />
            <label htmlFor="profile-email">Correo electrónico</label><input id="profile-email" name="email" type="email" value={form.email} onChange={updateField} required />
            <label htmlFor="profile-password">Nueva contraseña (opcional)</label><input id="profile-password" name="password" type="password" minLength="6" value={form.password} onChange={updateField} placeholder="Mínimo 6 caracteres" />
            <button className="submit-button" type="submit" disabled={saving}>{saving ? 'Guardando...' : <><Save size={16} /> Guardar cambios</>}</button>
          </form>
        </div>
      )}
    </section>
  )
}

export default ProfilePanel
