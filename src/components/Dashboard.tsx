import { useEffect, useState } from 'react'
import { Wallet, TrendingUp, TrendingDown, Plus, CreditCard, PiggyBank, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Account, Transaction } from '../types'
import { useAuth } from '../contexts/AuthContext'
import AccountForm from './accounts/AccountForm'

export default function Dashboard() {
  const { user } = useAuth()
  const [totalBalance, setTotalBalance] = useState<number | null>(null)
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [monthlyExpense, setMonthlyExpense] = useState(0)
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>()
  const [loading, setLoading] = useState({
    accounts: true,
    transactions: true,
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchDashboardData()

      // Subscribe to transaction changes
      const transactionSubscription = supabase
        .channel('public:transactions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchDashboardData()
          }
        )
        .subscribe()

      // Subscribe to account changes
      const accountSubscription = supabase
        .channel('public:accounts')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'accounts',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchDashboardData()
          }
        )
        .subscribe()

      // Cleanup subscriptions
      return () => {
        transactionSubscription.unsubscribe()
        accountSubscription.unsubscribe()
      }
    }
  }, [user])

  const fetchDashboardData = async () => {
    if (!user) return

    try {
      setError(null)
      
      // Fetch accounts
      setLoading(prev => ({ ...prev, accounts: true }))
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (accountsError) throw accountsError

      if (accountsData) {
        setAccounts(accountsData)
        const total = accountsData.reduce((sum, account) => {
          const balance = typeof account.balance === 'string' 
            ? parseFloat(account.balance) 
            : account.balance || 0
          return sum + balance
        }, 0)

        setTotalBalance(total)
      }
      setLoading(prev => ({ ...prev, accounts: false }))

      // Fetch transactions for the current month
      setLoading(prev => ({ ...prev, transactions: true }))
      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .split('T')[0]
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0]

      const { data: monthlyTransactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', firstDayOfMonth)
        .lte('date', lastDayOfMonth)

      if (transactionsError) throw transactionsError

      if (monthlyTransactions) {
        const income = monthlyTransactions
          .filter((t: Transaction) => t.type === 'income')
          .reduce((sum: number, t: Transaction) => {
            const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
            return sum + amount
          }, 0)
        
        const expense = monthlyTransactions
          .filter((t: Transaction) => t.type === 'expense')
          .reduce((sum: number, t: Transaction) => {
            const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
            return sum + amount
          }, 0)

        setMonthlyIncome(income)
        setMonthlyExpense(expense)
      }

      // Fetch recent transactions
      const { data: recentTransactionsData, error: recentTransactionsError } = await supabase
        .from('transactions')
        .select('*, categories(*)')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(5)

      if (recentTransactionsError) throw recentTransactionsError

      if (recentTransactionsData) {
        setRecentTransactions(recentTransactionsData)
      }
      setLoading(prev => ({ ...prev, transactions: false }))
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Ошибка при загрузке данных')
      setLoading({ accounts: false, transactions: false })
    }
  }

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account)
    setShowAccountForm(true)
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
        return 'Долговой'
      case 'savings':
        return 'Накопительный'
      default:
        return 'Обычный'
    }
  }

  const isLoading = loading.accounts || loading.transactions

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Обзор финансов</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6">
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-700">
        <p>{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
        >
          Попробовать снова
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Обзор финансов</h1>
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Общий баланс</p>
              <p className="text-2xl font-semibold text-gray-900">
                {totalBalance === null ? '—' : `${totalBalance.toLocaleString('ru-RU')} ₽`}
              </p>
            </div>
            <Wallet className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Доходы за месяц</p>
              <p className="text-2xl font-semibold text-green-600">
                +{monthlyIncome.toLocaleString('ru-RU')} ₽
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Расходы за месяц</p>
              <p className="text-2xl font-semibold text-red-600">
                -{monthlyExpense.toLocaleString('ru-RU')} ₽
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Accounts Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Мои счета</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              У вас пока нет счетов. Создайте новый счёт, чтобы начать учет финансов.
            </div>
          ) : (
            accounts.map((account) => (
              <div
                key={account.id}
                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-900 font-medium">{account.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        {getAccountTypeLabel(account.type)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{account.description}</p>
                    <p className="text-lg font-semibold text-gray-900 mt-2">
                      {account.balance.toLocaleString('ru-RU')} ₽
                    </p>
                    {account.goal && (
                      <p className="text-sm text-gray-600 mt-1">
                        Цель: {account.goal.toLocaleString('ru-RU')} ₽
                      </p>
                    )}
                    <button
                      onClick={() => handleEditAccount(account)}
                      className="mt-2 flex items-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Редактировать
                    </button>
                  </div>
                  <div className="text-gray-400">
                    {getAccountIcon(account.type)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Последние транзакции
        </h2>
        <div className="space-y-4">
          {recentTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Нет недавних транзакций
            </p>
          ) : (
            recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {transaction.description || 'Без описания'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(transaction.date).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <p
                  className={`font-medium ${
                    transaction.type === 'income'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {(typeof transaction.amount === 'string' 
                    ? parseFloat(transaction.amount) 
                    : transaction.amount).toLocaleString('ru-RU')} ₽
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {showAccountForm && (
        <AccountForm
          onClose={() => {
            setShowAccountForm(false)
            setSelectedAccount(undefined)
          }}
          onSuccess={fetchDashboardData}
          account={selectedAccount}
        />
      )}
    </div>
  )
}