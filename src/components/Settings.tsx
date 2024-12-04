import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Download, 
  Upload, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  User,
  FileText,
  Shield
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import DeleteAccount from './auth/DeleteAccount'

export default function Settings() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [loading, setLoading] = useState({
    export: false,
    import: false
  })
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  const exportData = async () => {
    if (!user) return

    try {
      setLoading(prev => ({ ...prev, export: true }))

      // Fetch all user data
      const [
        { data: transactions }, 
        { data: categories },
        { data: accounts }
      ] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('categories')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id)
      ])

      const exportData = {
        transactions,
        categories,
        accounts,
        exportDate: new Date().toISOString()
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `moneyflow-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showNotification('success', 'Данные успешно экспортированы')
    } catch (error) {
      console.error('Error exporting data:', error)
      showNotification('error', 'Ошибка при экспорте данных')
    } finally {
      setLoading(prev => ({ ...prev, export: false }))
    }
  }

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files?.length) return

    try {
      setLoading(prev => ({ ...prev, import: true }))
      const file = event.target.files[0]
      const fileContent = await file.text()
      const importData = JSON.parse(fileContent)

      // Validate import data structure
      if (!importData.transactions || !importData.categories || !importData.accounts) {
        throw new Error('Invalid import file structure')
      }

      // Start a transaction
      const { error: blockError } = await supabase.query('BEGIN')
      if (blockError) throw blockError

      try {
        // Delete existing data
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

        // Import new data
        await Promise.all([
          supabase
            .from('categories')
            .insert(importData.categories.map((category: any) => ({
              ...category,
              user_id: user.id
            }))),
          supabase
            .from('accounts')
            .insert(importData.accounts.map((account: any) => ({
              ...account,
              user_id: user.id
            }))),
          supabase
            .from('transactions')
            .insert(importData.transactions.map((transaction: any) => ({
              ...transaction,
              user_id: user.id
            })))
        ])

        // Commit transaction
        const { error: commitError } = await supabase.query('COMMIT')
        if (commitError) throw commitError

        showNotification('success', 'Данные успешно импортированы')
      } catch (error) {
        // Rollback on error
        await supabase.query('ROLLBACK')
        throw error
      }
    } catch (error) {
      console.error('Error importing data:', error)
      showNotification('error', 'Ошибка при импорте данных. Проверьте формат файла.')
    } finally {
      setLoading(prev => ({ ...prev, import: false }))
      // Reset file input
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>

      {notification && (
        <div
          className={`fixed top-4 right-4 flex items-center p-4 rounded-lg shadow-lg ${
            notification.type === 'success' 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 mr-2" />
          ) : (
            <AlertTriangle className="w-5 h-5 mr-2" />
          )}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4 text-gray-900">
          <User className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Профиль</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4 text-gray-900">
          <FileText className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Управление данными</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                Экспорт данных
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Скачайте все ваши данные в формате JSON для резервного копирования
              </p>
              <button
                onClick={exportData}
                disabled={loading.export}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{loading.export ? 'Экспорт...' : 'Экспортировать'}</span>
              </button>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                Импорт данных
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Восстановите данные из ранее созданной резервной копии
              </p>
              <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{loading.import ? 'Импорт...' : 'Импортировать'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  disabled={loading.import}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4 text-gray-900">
          <Shield className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Безопасность</h2>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-red-600 mb-2">
              Опасная зона
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Удаление аккаунта приведет к безвозвратному удалению всех ваших данных
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              <span>Удалить аккаунт</span>
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <DeleteAccount 
          onClose={() => setShowDeleteConfirm(false)}
          onSuccess={() => {
            signOut()
            navigate('/auth')
          }}
        />
      )}
    </div>
  )
}