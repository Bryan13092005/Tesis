import { useAuth } from '../context/AuthContext'

function Dashboard() {
  const { user, loading } = useAuth()

  if (loading) {
    return <p>Cargando...</p>
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">
        Dashboard
      </h1>

      <p className="mt-4">
        Usuario: {user ? user.email : 'No autenticado'}
      </p>
    </div>
  )
}

export default Dashboard