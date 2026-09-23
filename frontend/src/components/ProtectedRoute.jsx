import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoadingScreen.css';

function ProtectedRoute({ children }) {
  const { user, loading, authError } = useAuth();

  if (loading) {
    return (
      <div className="neon-loader-wrapper">
        {/* Luces de fondo ambientales */}
        <div className="ambient-glow glow-1"></div>
        <div className="ambient-glow glow-2"></div>

        {/* Partículas flotantes de fondo */}
        <div className="particles-container">
          {[...Array(12)].map((_, i) => (
            <span key={i} className={`particle particle-${i + 1}`}></span>
          ))}
        </div>

        {/* Contenido principal de carga */}
        <div className="loader-content">
          {/* Anillos de Neón Giratorios */}
          <div className="rings-container">
            <div className="ring ring-outer"></div>
            <div className="ring ring-middle"></div>
            <div className="ring ring-inner"></div>
            <div className="center-core"></div>
          </div>

          {/* Textos y mensaje */}
          <div className="text-container">
            <h1 className="neon-title">CARGANDO</h1>
            <p className="neon-subtitle">POR FAVOR ESPERE...</p>
          </div>

          {/* Barra de progreso pulsante */}
          <div className="progress-bar-container">
            <div className="progress-bar-fill"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ message: authError }} />;
  }

  return children;
}

export default ProtectedRoute;