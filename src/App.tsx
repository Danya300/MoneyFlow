import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Auth from './components/auth/Auth'
import Dashboard from './components/Dashboard'
import Transactions from './components/transactions/Transactions'
import Accounts from './components/accounts/Accounts'
import Statistics from './components/Statistics'
import FinancialAdvice from './components/FinancialAdvice'
import Settings from './components/Settings'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/" /> : <Auth />}
      />
      <Route
        path="/"
        element={user ? <Layout /> : <Navigate to="/auth" />}
      >
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="advice" element={<FinancialAdvice />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App