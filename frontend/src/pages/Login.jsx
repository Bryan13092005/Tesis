import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Home, LockKeyhole, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ThemeToggle'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { iniciarSesion } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(location.state?.message || '')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    const { data, error } = await iniciarSesion(email, password)

    if (error) {
      setError('Correo o contraseña incorrectos.')
      setLoading(false)
      return
    }

    if (data?.user) {
      navigate('/dashboard')
    }

    setLoading(false)
  }

  return (
    <main className="login-page">
      <section className="login-showcase">
        <div className="brand-mark"><Home size={18} strokeWidth={2.5} /></div>
        <p className="eyebrow">CONTROL INTELIGENTE</p>
        <h1>Tu hogar,<br /><em>en equilibrio.</em></h1>
        <p className="showcase-copy">Una forma más simple de cuidar, controlar y entender cada espacio de tu casa.</p>
        <div className="showcase-line" />
        <span className="showcase-meta">SISTEMA DOMÓTICO · 01</span>
      </section>

      <section className="login-panel">
        <ThemeToggle />
        <div className="login-form-wrap">
          <p className="form-kicker">BIENVENIDO DE NUEVO</p>
          <h2>Inicia sesión</h2>
          <p className="form-intro">Accede a tu panel de control.</p>

          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="email">Correo electrónico</label>
            <div className="input-wrap">
              <Mail size={18} aria-hidden="true" />
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" autoComplete="email" required />
            </div>

            <label htmlFor="password">Contraseña</label>
            <div className="input-wrap">
              <LockKeyhole size={18} aria-hidden="true" />
              <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tu contraseña" autoComplete="current-password" required />
              <button type="button" className="icon-button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Verificando...' : 'Entrar'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
          <p className="security-note">Tu sesión está protegida por Supabase Auth.</p>
        </div>
      </section>
    </main>
  )
}

export default Login