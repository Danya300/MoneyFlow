import { useEffect, useState } from 'react'
import { RefreshCw, Plus, Filter, Edit2, Trash2, Tag, ArrowRightLeft, Check, CheckSquare, Square, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Transaction, Category } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import TransactionForm from './TransactionForm'
import CategoryForm from './CategoryForm'

export default function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>()
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>()
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [deleteLoading, setDeleteLoading] = useState(false)
  
  // Filters state
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    categoryId: 'all',
    type: 'all' as 'all' | 'income' | 'expense',
    search: '' // New search filter
  })

  useEffect(() => {
    if (user) {
      Promise.all([fetchTransactions(), fetchCategories()])
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
    }
  }

  const fetchCategories = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      if (data) setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Вы уверены, что хотите удалить эту транзакцию?')) return

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      await fetchTransactions()
    } catch (error) {
      console.error('Error deleting transaction:', error)
    }
  }

  const handleBulkDelete = async () => {
    if (!user || selectedTransactions.size === 0) return
    
    if (!confirm(`Вы уверены, что хотите удалить ${selectedTransactions.size} выбранных транзакций?`)) {
      return
    }

    setDeleteLoading(true)
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', Array.from(selectedTransactions))
        .eq('user_id', user.id)

      if (error) throw error
      
      await fetchTransactions()
      setSelectedTransactions(new Set())
    } catch (error) {
      console.error('Error deleting transactions:', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setShowTransactionForm(true)
  }

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category)
    setShowCategoryForm(true)
  }

  const toggleTransactionSelection = (id: string) => {
    const newSelected = new Set(selectedTransactions)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedTransactions(newSelected)
  }

  const toggleAllTransactions = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set())
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)))
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

      const matchesCategory =
        filters.categoryId === 'all' || transaction.category_id === filters.categoryId

      const matchesType =
        filters.type === 'all' || transaction.type === filters.type

      const matchesSearch = !filters.search || 
        transaction.description?.toLowerCase().includes(filters.search.toLowerCase())

      return matchesDateRange && matchesCategory && matchesType && matchesSearch
    })
  }

  const calculateTotals = (transactions: Transaction[]) => {
    return transactions.reduce(
      (acc, transaction) => {
        if (transaction.type === 'income') {
          acc.income += transaction.amount
        } else {
          acc.expenses += transaction.amount
        }
        return acc
      },
      { income: 0, expenses: 0 }
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    )
  }

  const filteredTransactions = getFilteredTransactions()
  const { income, expenses } = calculateTotals(filteredTransactions)
  const balance = income - expenses

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Транзакции</h1>
        <div className="flex space-x-3">
          {selectedTransactions.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deleteLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {deleteLoading 
                  ? 'Удаление...' 
                  : `Удалить выбранные (${selectedTransactions.size})`}
              </span>
            </button>
          )}
          <button
            onClick={() => {
              setSelectedCategory(undefined)
              setShowCategoryForm(true)
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Tag className="w-4 h-4" />
            <span>Категории</span>
          </button>
          <button
            onClick={() => {
              setSelectedTransaction(undefined)
              setShowTransactionForm(true)
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Новая транзакция</span>
          </button>
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Категории</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-500">
                    {category.type === 'income' ? 'Доход' : 'Расход'}
                  </p>
                </div>
                <button
                  onClick={() => handleEditCategory(category)}
                  className="text-gray-400 hover:text-blue-600"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500 mb-1">Доходы</div>
          <div className="text-xl font-semibold text-green-600">
            +{income.toLocaleString('ru-RU')} ₽
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500 mb-1">Расходы</div>
          <div className="text-xl font-semibold text-red-600">
            -{expenses.toLocaleString('ru-RU')} ₽
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500 mb-1">Баланс</div>
          <div className={`text-xl font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {balance.toLocaleString('ru-RU')} ₽
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Filter className="w-5 h-5" />
            <span className="font-medium">Фильтры</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Поиск по описанию
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Введите текст для поиска..."
                  className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

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
                Категория
              </label>
              <select
                value={filters.categoryId}
                onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Все категории</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
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

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  <button
                    onClick={toggleAllTransactions}
                    className="hover:text-gray-700"
                  >
                    {selectedTransactions.size === filteredTransactions.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Описание
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Категория
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Сумма
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Нет транзакций для выбранных фильтров
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr 
                    key={transaction.id} 
                    className={`hover:bg-gray-50 ${
                      selectedTransactions.has(transaction.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleTransactionSelection(transaction.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {selectedTransactions.has(transaction.id) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description || 'Без описания'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(transaction.categories as Category)?.name || 'Без категории'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.type === 'income'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {transaction.type === 'income' ? 'Доход' : 'Расход'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <span
                        className={
                          transaction.type === 'income'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {transaction.type === 'income' ? '+' : '-'}
                        {transaction.amount.toLocaleString('ru-RU')} ₽
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-3">
                      <button
                        onClick={() => handleEdit(transaction)}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showTransactionForm && (
        <TransactionForm
          onClose={() => {
            setShowTransactionForm(false)
            setSelectedTransaction(undefined)
          }}
          onSuccess={fetchTransactions}
          transaction={selectedTransaction}
        />
      )}

      {showCategoryForm && (
        <CategoryForm
          onClose={() => {
            setShowCategoryForm(false)
            setSelectedCategory(undefined)
          }}
          onSuccess={() => {
            fetchCategories()
            fetchTransactions() // Refresh transactions in case any were deleted due to category deletion
          }}
          category={selectedCategory}
        />
      )}
    </div>
  )
}