import { useEffect, useState } from 'react'
import { RefreshCw, Filter, BarChart as BarChartIcon, PieChart as PieChartIcon, LineChart as LineChartIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Transaction, Category } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

type ChartType = 'bar' | 'line' | 'pie'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300']

export default function Statistics() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trendChartType, setTrendChartType] = useState<ChartType>('bar')
  const [categoryChartType, setCategoryChartType] = useState<ChartType>('pie')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'all' as 'all' | 'income' | 'expense'
  })

  useEffect(() => {
    if (user) {
      Promise.all([fetchTransactions(), fetchCategories()])
        .catch(err => {
          console.error('Error fetching data:', err)
          setError('Ошибка при загрузке данных')
        })
        .finally(() => setLoading(false))
    }
  }, [user])

  const fetchTransactions = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(*)')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (error) throw error
      if (data) setTransactions(data)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      throw error
    }
  }

  const fetchCategories = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

      if (error) throw error
      if (data) setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
      throw error
    }
  }

  const getFilteredTransactions = () => {
    return transactions.filter(transaction => {
      const date = new Date(transaction.date)
      const startDate = filters.startDate ? new Date(filters.startDate) : null
      const endDate = filters.endDate ? new Date(filters.endDate) : null

      const matchesDateRange = 
        (!startDate || date >= startDate) &&
        (!endDate || date <= endDate)

      const matchesType =
        filters.type === 'all' || transaction.type === filters.type

      const matchesCategories = 
        selectedCategories.length === 0 || 
        selectedCategories.includes(transaction.category_id)

      return matchesDateRange && matchesType && matchesCategories
    })
  }

  const prepareMonthlyData = (transactions: Transaction[]) => {
    const monthlyData = transactions.reduce((acc: { [key: string]: { income: number; expense: number } }, transaction) => {
      const monthKey = transaction.date.substring(0, 7) // YYYY-MM format
      if (!acc[monthKey]) {
        acc[monthKey] = { income: 0, expense: 0 }
      }
      
      if (transaction.type === 'income') {
        acc[monthKey].income += transaction.amount
      } else {
        acc[monthKey].expense += transaction.amount
      }
      
      return acc
    }, {})

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
        income: data.income,
        expense: data.expense
      }))
  }

  const prepareCategoryData = (transactions: Transaction[]) => {
    const expensesByCategory = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc: { [key: string]: number }, transaction) => {
        const categoryName = (transaction.categories as Category)?.name || 'Без категории'
        acc[categoryName] = (acc[categoryName] || 0) + transaction.amount
        return acc
      }, {})

    return Object.entries(expensesByCategory)
      .sort((a, b) => b[1] - a[1]) // Sort by amount descending
      .map(([name, value]) => ({
        name,
        value
      }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-500">{error}</div>
        <button
          onClick={() => {
            setError(null)
            setLoading(true)
            Promise.all([fetchTransactions(), fetchCategories()])
              .catch(err => {
                console.error('Error refetching data:', err)
                setError('Ошибка при загрузке данных')
              })
              .finally(() => setLoading(false))
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Попробовать снова
        </button>
      </div>
    )
  }

  const filteredTransactions = getFilteredTransactions()
  const monthlyData = prepareMonthlyData(filteredTransactions)
  const categoryData = prepareCategoryData(filteredTransactions)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Статистика</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Filter className="w-5 h-5" />
            <span className="font-medium">Фильтры</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Начало периода
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Конец периода
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Категории расходов
              </label>
              <select
                multiple
                value={selectedCategories}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions, option => option.value)
                  setSelectedCategories(options)
                }}
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                size={4}
              >
                {categories
                  .filter(category => category.type === 'expense')
                  .map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Зажмите Ctrl/Cmd для выбора нескольких категорий
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as 'all' | 'income' | 'expense' }))}
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Все типы</option>
                <option value="income">Доходы</option>
                <option value="expense">Расходы</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Income/Expense Trends */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Доходы и расходы
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setTrendChartType('bar')}
              className={`p-2 rounded-md ${
                trendChartType === 'bar' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <BarChartIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTrendChartType('line')}
              className={`p-2 rounded-md ${
                trendChartType === 'line' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <LineChartIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="h-80">
          {monthlyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              Нет данных для отображения
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {trendChartType === 'bar' ? (
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" name="Доходы" fill="#4ade80" />
                  <Bar dataKey="expense" name="Расходы" fill="#f87171" />
                </BarChart>
              ) : (
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="income" name="Доходы" stroke="#4ade80" />
                  <Line type="monotone" dataKey="expense" name="Расходы" stroke="#f87171" />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Expenses by Category */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Расходы по категориям
            {selectedCategories.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                (выбрано {selectedCategories.length})
              </span>
            )}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setCategoryChartType('pie')}
              className={`p-2 rounded-md ${
                categoryChartType === 'pie' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <PieChartIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCategoryChartType('bar')}
              className={`p-2 rounded-md ${
                categoryChartType === 'bar' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <BarChartIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="h-80">
          {categoryData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              Нет данных для отображения
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {categoryChartType === 'pie' ? (
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString('ru-RU')} ₽`} />
                  <Legend />
                </PieChart>
              ) : (
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={150} />
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString('ru-RU')} ₽`} />
                  <Bar dataKey="value" name="Сумма" fill="#8884d8">
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}