import { useEffect, useState } from 'react'
import { RefreshCw, Plus, Wallet, CreditCard, PiggyBank, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Account } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import AccountForm from './AccountForm'

export default function Accounts() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>()
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchAccounts()
    }
  }, [user])

  const fetchAccounts = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

      if (error) throw error

      if (data) {
        setAccounts(data)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async (account: Account) => {
    if (!user || !confirm('Вы уверены, что хотите удалить этот счёт? Это действие нельзя отменить.')) return

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', account.id)
        .eq('user_id', user.id)

      if (error) throw error

      await fetchAccounts()
      setShowSuccessMessage(`Счёт "${account.name}" успешно удалён`)
      setTimeout(() => setShowSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Error deleting account:', error)
    }
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'debt':
        return <CreditCard className="w-8 h-8" />
      case 'savings':
        return <PiggyBank className="w-8 h-8" />
      default:
        return <Wallet className="w-8 h-8" />
    }
  }

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'debt':
        return 'Долг'
      case 'savings':
        return 'Сбережения'
      default:
        return 'Обычный счёт'
    }
  }

  const calculateProgress = (account: Account) => {
    if (!account.goal) return 0
    
    if (account.type === 'debt') {
      // For debt accounts: 
      // - When balance equals goal (initial debt), progress is 0%
      // - When balance is 0 (fully paid), progress is 100%
      return Math.max(0, Math.min(100, ((account.goal - account.balance) / account.goal) * 100))
    } else {
      // For savings accounts:
      // - Progress increases as balance approaches goal
      return Math.max(0, Math.min(100, (account.balance / account.goal) * 100))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Счета</h1>
        <button 
          onClick={() => {
            setSelectedAccount(undefined)
            setShowAccountForm(true)
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Новый счёт</span>
        </button>
      </div>

      {showSuccessMessage && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50">
          {showSuccessMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-xl shadow-sm">
            <Wallet className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет счетов</h3>
            <p className="mt-1 text-sm text-gray-500">
              Начните с создания нового счёта
            </p>
          </div>
        ) : (
          accounts.map((account) => {
            const progress = calculateProgress(account)
            const isCompleted = account.type === 'debt' 
              ? account.balance <= 0 
              : account.goal ? account.balance >= account.goal : false

            return (
              <div
                key={account.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow relative"
              >
                {/* Success Badge for completed debt */}
                {account.type === 'debt' && isCompleted && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    Долг погашен
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {account.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {getAccountTypeLabel(account.type)}
                    </p>
                    {account.description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {account.description}
                      </p>
                    )}
                    <p className={`mt-4 text-2xl font-semibold ${
                      account.balance >= 0 ? 'text-gray-900' : 'text-red-600'
                    }`}>
                      {account.balance.toLocaleString('ru-RU')} ₽
                    </p>

                    {account.goal && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">
                            {account.type === 'debt' ? 'Прогресс погашения' : 'Прогресс накопления'}
                          </span>
                          <span className="font-medium">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-500">
                          {account.type === 'debt' 
                            ? `Остаток: ${account.balance.toLocaleString('ru-RU')} ₽ из ${account.goal.toLocaleString('ru-RU')} ₽`
                            : `Цель: ${account.goal.toLocaleString('ru-RU')} ₽`}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="text-gray-400">
                    {getAccountIcon(account.type)}
                  </div>
                </div>

                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setSelectedAccount(account)
                      setShowAccountForm(true)
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(account)}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center space-x-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Удалить</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {showAccountForm && (
        <AccountForm
          onClose={() => {
            setShowAccountForm(false)
            setSelectedAccount(undefined)
          }}
          onSuccess={() => {
            fetchAccounts()
            if (selectedAccount?.type === 'debt' && selectedAccount.balance <= 0) {
              setShowSuccessMessage(`Поздравляем! Вы полностью погасили долг по счёту "${selectedAccount.name}"`)
              setTimeout(() => setShowSuccessMessage(null), 5000)
            }
          }}
          account={selectedAccount}
        />
      )}
    </div>
  )
}