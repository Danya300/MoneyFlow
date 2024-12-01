import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LayoutDashboard, WalletCards, PieChart, LogOut } from 'lucide-react'

export default function Navbar() {
  const { signOut } = useAuth()
  const location = useLocation()

  const navigation = [
    { name: 'Обзор', href: '/', icon: LayoutDashboard },
    { name: 'Транзакции', href: '/transactions', icon: WalletCards },
    { name: 'Статистика', href: '/statistics', icon: PieChart },
  ]

  return (
    <nav className="bg-white shadow">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-gray-900">
              Финансы
            </Link>
            <div className="flex space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === item.href
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            <span>Выйти</span>
          </button>
        </div>
      </div>
    </nav>
  )
}