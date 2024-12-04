export interface User {
  id: string
  email: string
}

export interface Transaction {
  id: string
  user_id: string
  type: 'income' | 'expense'
  amount: number
  category_id: string
  account_id: string
  description?: string
  date: string
  created_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  type: 'income' | 'expense'
}

export interface Account {
  id: string
  user_id: string
  name: string
  type: 'regular' | 'debt' | 'savings'
  balance: number
  goal?: number
  description?: string
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}