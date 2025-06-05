import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Login } from './pages/Login'
import { Dashboard } from './components/Dashboard'
import { auth } from './api/eventstore'

const queryClient = new QueryClient()

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(auth.isAuthenticated())

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    auth.logout()
    setIsAuthenticated(false)
  }

  return (
    <QueryClientProvider client={queryClient}>
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </QueryClientProvider>
  )
}

export default App
