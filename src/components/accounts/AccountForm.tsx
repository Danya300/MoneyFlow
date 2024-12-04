import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Account } from '../../types'
import { useAuth } from '../../contexts/AuthContext'

interface AccountFormProps {
  onClose: () => void
  onSuccess: () => void
  account?: Account
}

export default function AccountForm({ onClose, onSuccess, account }: AccountFormProps) {
  const { user } = useAuth()
  const [name, setName] = useState(account?.name || '')
  const [type, setType] = useState<'regular' | 'debt' | 'savings'>(account?.type || 'regular')
  const [balance, setBalance] = useState(account?.balance?.toString() || '0')
  const [goal, setGoal] = useState(account?.goal?.toString() || '')
  const [description, setDescription] = useState(account?.description || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState(false)

  // Check if debt is being closed
  useEffect(() => {
    if (account?.type === 'debt' && account.balance > 0 && Number(balance) <= 0) {
      setShowSuccessMessage(true)
    }
  }, [balance])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setError('')
    setLoading(true)

    try {
      const accountData = {
        user_id: user.id,
        name,
        type,
        balance: Math.round(Number(balance)), // Round to avoid decimal places
        goal: goal ? Math.round(Number(goal)) : null, // Round to avoid decimal places
        description: description || null,
      }

      let error
      if (account) {
        ({ error } = await supabase
          .from('accounts')
          .update(accountData)
          .eq('id', account.id))
      } else {
        ({ error } = await supabase
          .from('accounts')
          .insert([accountData]))
      }

      if (error) throw error

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error saving account:', err)
      setError('Ошибка при сохранении счёта')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !account) return

    setError('')
    setLoading(true)

    try {
      // First delete all transactions associated with this account
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('account_id', account.id)
        .eq('user_id', user.id)

      if (transactionsError) throw transactionsError

      // Then delete the account
      const { error: accountError } = await supabase
        .from('accounts')
        .delete()
        .eq('id', account.id)
        .eq('user_id', user.id)

      if (accountError) throw accountError

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error deleting account:', err)
      setError('Ошибка при удалении счёта')
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = () => {
    if (!goal) return 0
    const targetAmount = Number(goal)
    const currentAmount = Number(balance)
    
    if (type === 'debt') {
      // For debt, calculate the paid off percentage
      // When balance = goal (initial debt), progress = 0%
      // When balance = 0 (fully paid), progress = 100%
      return Math.max(0, Math.min(100, ((targetAmount - currentAmount) / targetAmount) * 100))
    } else {
      // For savings, calculate progress towards goal
      return Math.max(0, Math.min(100, (currentAmount / targetAmount) * 100))
    }
  }

  // Format number for display, removing decimal places
  const formatNumber = (value: string | number) => {
    const num = typeof value === 'string' ? Number(value) : value
    return Math.round(num).toLocaleString('ru-RU')
  }

  if (deleteConfirmation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Подтверждение удаления
          </h2>
          <p className="text-gray-600 mb-6">
            Вы уверены, что хотите удалить счёт "{account?.name}"? Все транзакции, связанные с этим счётом, также будут удалены. Это действие нельзя отменить.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeleteConfirmation(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Отмена
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Удаление...' : 'Удалить'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {account ? 'Редактировать' : 'Новый'} счёт
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {showSuccessMessage && (
          <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-md">
            Поздравляем! Вы полностью погасили долг!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название счёта
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Например: Наличные, Кредит..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тип счёта
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'regular' | 'debt' | 'savings')}
              required
              className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="regular">Обычный счёт</option>
              <option value="debt">Долговой счёт</option>
              <option value="savings">Накопительный счёт</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Текущий баланс
            </label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          </div>

          {type !== 'regular' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {type === 'debt' ? 'Сумма долга' : 'Цель накопления'}
              </label>
              <input
                type="number"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder={type === 'debt' ? 'Сумма к погашению' : 'Целевая сумма'}
              />
              
              {goal && Number(goal) > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      {type === 'debt' ? 'Прогресс погашения' : 'Прогресс накопления'}
                    </span>
                    <span className="font-medium">{Math.round(calculateProgress())}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        calculateProgress() >= 100 ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${calculateProgress()}%` }}
                    />
                  </div>
                  {type === 'debt' && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Остаток: {formatNumber(Number(balance))} ₽</span>
                      <span>Всего: {formatNumber(Number(goal))} ₽</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder={
                type === 'debt'
                  ? 'Например: Ипотека в Сбербанке'
                  : type === 'savings'
                  ? 'Например: На покупку автомобиля'
                  : 'Дополнительная информация о счёте'
              }
            />
          </div>

          <div className="flex justify-between pt-4">
            {account && (
              <button
                type="button"
                onClick={() => setDeleteConfirmation(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить счёт
              </button>
            )}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}