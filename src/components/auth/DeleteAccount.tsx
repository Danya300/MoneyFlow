import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

interface DeleteAccountProps {
  onClose: () => void
  onSuccess: () => void
}

export default function DeleteAccount({ onClose, onSuccess }: DeleteAccountProps) {
  const { user } = useAuth()
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (!user) return
    if (confirmation !== 'DELETE') {
      setError('Пожалуйста, введите DELETE для подтверждения')
      return
    }

    try {
      setError('')
      setLoading(true)

      // Start a transaction
      const { error: blockError } = await supabase.query('BEGIN')
      if (blockError) throw blockError

      try {
        // Delete all user data
        await Promise.all([
          supabase
            .from('transactions')
            .delete()
            .eq('user_id', user.id),
          supabase
            .from('categories')
            .delete()
            .eq('user_id', user.id),
          supabase
            .from('accounts')
            .delete()
            .eq('user_id', user.id)
        ])

        // Delete the user account
        const { error: deleteError } = await supabase.auth.admin.deleteUser(
          user.id
        )
        if (deleteError) throw deleteError

        // Commit transaction
        const { error: commitError } = await supabase.query('COMMIT')
        if (commitError) throw commitError

        onSuccess()
      } catch (error) {
        // Rollback on error
        await supabase.query('ROLLBACK')
        throw error
      }
    } catch (err) {
      console.error('Error deleting account:', err)
      setError('Ошибка при удалении аккаунта')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Удаление аккаунта
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              Это действие нельзя отменить. Все ваши данные будут удалены навсегда.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Для подтверждения введите DELETE
            </label>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-red-500 focus:border-red-500"
              placeholder="DELETE"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Отмена
            </button>
            <button
              onClick={handleDelete}
              disabled={loading || confirmation !== 'DELETE'}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Удаление...' : 'Удалить аккаунт'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}