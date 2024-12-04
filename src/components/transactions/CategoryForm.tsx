import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Category } from '../../types'

interface CategoryFormProps {
  onClose: () => void
  onSuccess: () => void
  category?: Category
}

export default function CategoryForm({ onClose, onSuccess, category }: CategoryFormProps) {
  const [name, setName] = useState(category?.name || '')
  const [type, setType] = useState<'income' | 'expense'>(category?.type || 'expense')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const categoryData = {
        user_id: user.id,
        name,
        type,
      }

      if (category) {
        // Update existing category
        const { error: updateError } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', category.id)
          .eq('user_id', user.id)

        if (updateError) throw updateError
      } else {
        // Create new category
        const { error: insertError } = await supabase
          .from('categories')
          .insert([categoryData])

        if (insertError) throw insertError
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error saving category:', err)
      setError('Ошибка при сохранении категории')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!category) return
    
    if (!confirm('Вы уверены, что хотите удалить эту категорию? Все транзакции, связанные с этой категорией, также будут удалены.')) {
      return
    }

    setError('')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      // First delete all transactions with this category
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('category_id', category.id)
        .eq('user_id', user.id)

      if (transactionsError) throw transactionsError

      // Then delete the category
      const { error: categoryError } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)
        .eq('user_id', user.id)

      if (categoryError) throw categoryError

      setSuccessMessage('Категория и связанные транзакции успешно удалены')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err) {
      console.error('Error deleting category:', err)
      setError('Ошибка при удалении категории')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {category ? 'Редактировать' : 'Новая'} категория
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-md">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Название категории"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тип
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'income' | 'expense')}
              required
              className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="income">Доход</option>
              <option value="expense">Расход</option>
            </select>
          </div>

          <div className="flex justify-between pt-4">
            <div>
              {category && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Удалить категорию
                </button>
              )}
            </div>
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