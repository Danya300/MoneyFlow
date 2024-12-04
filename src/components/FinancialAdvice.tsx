import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Transaction, Category, Account } from '../types'
import { Lightbulb, TrendingDown, PiggyBank, Target, RefreshCw } from 'lucide-react'

interface SpendingByCategory {
  categoryId: string
  categoryName: string
  amount: number
  transactionCount: number
}

interface MonthlySpending {
  month: string
  total: number
}

export default function FinancialAdvice() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [topSpendingCategories, setTopSpendingCategories] = useState<SpendingByCategory[]>([])
  const [monthlySpending, setMonthlySpending] = useState<MonthlySpending[]>([])
  const [recommendations, setRecommendations] = useState<string[]>([])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)
      // Fetch last 3 months of transactions
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      
      const [transactionsResponse, categoriesResponse, accountsResponse] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user!.id)
          .gte('date', threeMonthsAgo.toISOString().split('T')[0])
          .order('date', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .eq('user_id', user!.id),
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user!.id)
      ])

      if (transactionsResponse.error) throw transactionsResponse.error
      if (categoriesResponse.error) throw categoriesResponse.error
      if (accountsResponse.error) throw accountsResponse.error

      setTransactions(transactionsResponse.data || [])
      setCategories(categoriesResponse.data || [])
      setAccounts(accountsResponse.data || [])

      analyzeData(
        transactionsResponse.data || [], 
        categoriesResponse.data || [],
        accountsResponse.data || []
      )
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const analyzeData = (
    transactions: Transaction[], 
    categories: Category[],
    accounts: Account[]
  ) => {
    // Analyze spending by category
    const spendingByCategory = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc: { [key: string]: SpendingByCategory }, transaction) => {
        const category = categories.find(c => c.id === transaction.category_id)
        if (!category) return acc

        if (!acc[category.id]) {
          acc[category.id] = {
            categoryId: category.id,
            categoryName: category.name,
            amount: 0,
            transactionCount: 0
          }
        }
        acc[category.id].amount += Math.round(transaction.amount)
        acc[category.id].transactionCount += 1
        return acc
      }, {})

    const topCategories = Object.values(spendingByCategory)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)

    setTopSpendingCategories(topCategories)

    // Analyze monthly spending trends
    const monthlyData = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc: { [key: string]: number }, transaction) => {
        const month = transaction.date.substring(0, 7) // YYYY-MM format
        acc[month] = (acc[month] || 0) + Math.round(transaction.amount)
        return acc
      }, {})

    const monthlyTrends = Object.entries(monthlyData)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => b.month.localeCompare(a.month))

    setMonthlySpending(monthlyTrends)

    // Generate recommendations
    const newRecommendations: string[] = []

    // High spending categories recommendations
    topCategories.forEach(category => {
      const monthlyAverage = Math.round(category.amount / 3) // 3 months of data
      if (monthlyAverage > 10000) {
        newRecommendations.push(
          `В категории "${category.categoryName}" вы тратите в среднем ${monthlyAverage.toLocaleString('ru-RU')} ₽ в месяц. ` +
          `Попробуйте найти способы оптимизации этих расходов.`
        )
      }
    })

    // Monthly trend recommendations
    if (monthlyTrends.length >= 2) {
      const lastMonth = monthlyTrends[0]
      const previousMonth = monthlyTrends[1]
      if (lastMonth.total > previousMonth.total * 1.2) {
        newRecommendations.push(
          `Ваши расходы выросли на ${Math.round(((lastMonth.total - previousMonth.total) / previousMonth.total) * 100)}% ` +
          `по сравнению с прошлым месяцем. Рекомендуем проанализировать причины роста.`
        )
      }
    }

    // Debt recommendations
    const debtAccounts = accounts.filter(a => a.type === 'debt' && a.balance > 0)
    if (debtAccounts.length > 0) {
      newRecommendations.push(
        `У вас есть непогашенные долги на общую сумму ${Math.round(
          debtAccounts.reduce((sum, acc) => sum + acc.balance, 0)
        ).toLocaleString('ru-RU')} ₽. ` +
        `Рекомендуем приоритизировать их погашение для экономии на процентах.`
      )
    }

    // Savings recommendations
    const savingsAccounts = accounts.filter(a => a.type === 'savings')
    if (savingsAccounts.length === 0) {
      newRecommendations.push(
        'Рекомендуем создать накопительный счёт и откладывать хотя бы 10% от доходов.'
      )
    }

    // General recommendations
    newRecommendations.push(
      'Составьте список регулярных подписок и проверьте, все ли из них вам действительно нужны.',
      'Рассмотрите возможность использования кешбэк-карт для повседневных покупок.',
      'Планируйте крупные покупки заранее и следите за скидками и акциями.'
    )

    setRecommendations(newRecommendations)
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
        <h1 className="text-2xl font-bold text-gray-900">Советы по экономии</h1>
        <button
          onClick={fetchData}
          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Обновить анализ</span>
        </button>
      </div>

      {/* Top Spending Categories */}
      {topSpendingCategories.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Основные статьи расходов
            </h2>
          </div>
          <div className="space-y-4">
            {topSpendingCategories.map((category) => (
              <div key={category.categoryId} className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{category.categoryName}</p>
                  <p className="text-sm text-gray-500">
                    {category.transactionCount} {
                      category.transactionCount === 1 ? 'транзакция' :
                      category.transactionCount < 5 ? 'транзакции' : 'транзакций'
                    }
                  </p>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {Math.round(category.amount / 3).toLocaleString('ru-RU')} ₽/мес
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Spending Trends */}
      {monthlySpending.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Динамика расходов
            </h2>
          </div>
          <div className="space-y-4">
            {monthlySpending.map((month) => (
              <div key={month.month} className="flex justify-between items-center">
                <p className="font-medium text-gray-900">
                  {new Date(month.month + '-01').toLocaleDateString('ru-RU', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {Math.round(month.total).toLocaleString('ru-RU')} ₽
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            Рекомендации
          </h2>
        </div>
        <div className="space-y-4">
          {recommendations.map((recommendation, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg"
            >
              <div className="flex-shrink-0">
                <Lightbulb className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-gray-900">{recommendation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Savings Goals */}
      {accounts.some(a => a.type === 'savings' && a.goal) && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <PiggyBank className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Цели по накоплениям
            </h2>
          </div>
          <div className="space-y-4">
            {accounts
              .filter(a => a.type === 'savings' && a.goal)
              .map((account) => {
                const progress = (account.balance / (account.goal || 1)) * 100
                return (
                  <div key={account.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-gray-900">{account.name}</p>
                      <p className="text-sm text-gray-500">
                        {Math.round(account.balance).toLocaleString('ru-RU')} ₽ из {Math.round(account.goal || 0).toLocaleString('ru-RU')} ₽
                      </p>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}