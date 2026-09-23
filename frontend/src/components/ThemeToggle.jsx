import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function ThemeToggle() {
  const { theme, alternarTema } = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={alternarTema}
      aria-label={isLight ? 'Activar modo oscuro' : 'Activar modo claro'}
      title={isLight ? 'Activar modo oscuro' : 'Activar modo claro'}
      aria-pressed={isLight}
    >
      <Sun size={15} aria-hidden="true" />
      <span className="theme-toggle-track"><span className="theme-toggle-thumb" /></span>
      <Moon size={15} aria-hidden="true" />
    </button>
  )
}

export default ThemeToggle