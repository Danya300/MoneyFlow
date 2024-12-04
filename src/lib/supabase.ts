import { createClient } from '@supabase/supabase-js'
import { Account, Category, Transaction } from '../types'

// Load environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Database connection info (for reference)
const dbConfig = {
  url: import.meta.env.VITE_SUPABASE_DB_URL,
  user: import.meta.env.VITE_SUPABASE_DB_USER,
  password: import.meta.env.VITE_SUPABASE_DB_PASSWORD,
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Default categories that will be created for new users
const DEFAULT_CATEGORIES = [
  // Income categories
  { name: 'Зарплата', type: 'income' },
  { name: 'Фриланс', type: 'income' },
  { name: 'Инвестиции', type: 'income' },
  { name: 'Подарки', type: 'income' },
  // Expense categories
  { name: 'Продукты', type: 'expense' },
  { name: 'Транспорт', type: 'expense' },
  { name: 'Жильё', type: 'expense' },
  { name: 'Развлечения', type: 'expense' },
  { name: 'Здоровье', type: 'expense' },
  { name: 'Одежда', type: 'expense' },
  { name: 'Образование', type: 'expense' },
]

// Initialize database tables and set up RLS policies
export async function initializeDatabase() {
  try {
    // Create extensions if they don't exist
    await supabase.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `)

    // Create categories table
    const { error: categoriesError } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        UNIQUE(user_id, name, type)
      );

      -- RLS for categories
      ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Users can view their own categories"
        ON categories FOR SELECT
        USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert their own categories"
        ON categories FOR INSERT
        WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update their own categories"
        ON categories FOR UPDATE
        USING (auth.uid() = user_id);

      CREATE POLICY "Users can delete their own categories"
        ON categories FOR DELETE
        USING (auth.uid() = user_id);
    `)

    if (categoriesError) throw categoriesError

    // Create accounts table
    const { error: accountsError } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('regular', 'debt', 'savings')),
        balance DECIMAL(12,2) DEFAULT 0 NOT NULL,
        goal DECIMAL(12,2),
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        UNIQUE(user_id, name)
      );

      -- RLS for accounts
      ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Users can view their own accounts"
        ON accounts FOR SELECT
        USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert their own accounts"
        ON accounts FOR INSERT
        WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update their own accounts"
        ON accounts FOR UPDATE
        USING (auth.uid() = user_id);

      CREATE POLICY "Users can delete their own accounts"
        ON accounts FOR DELETE
        USING (auth.uid() = user_id);
    `)

    if (accountsError) throw accountsError

    // Create transactions table
    const { error: transactionsError } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
        amount DECIMAL(12,2) NOT NULL,
        category_id UUID REFERENCES categories(id),
        account_id UUID REFERENCES accounts(id),
        description TEXT,
        date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      -- RLS for transactions
      ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Users can view their own transactions"
        ON transactions FOR SELECT
        USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert their own transactions"
        ON transactions FOR INSERT
        WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update their own transactions"
        ON transactions FOR UPDATE
        USING (auth.uid() = user_id);

      CREATE POLICY "Users can delete their own transactions"
        ON transactions FOR DELETE
        USING (auth.uid() = user_id);

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
        ON transactions(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_transactions_category 
        ON transactions(category_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_account 
        ON transactions(account_id);
    `)

    if (transactionsError) throw transactionsError

    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}

// Create default categories for a new user
export async function createDefaultCategories(userId: string) {
  try {
    const categories = DEFAULT_CATEGORIES.map(category => ({
      user_id: userId,
      ...category
    }))

    const { error } = await supabase
      .from('categories')
      .insert(categories)

    if (error) throw error
    console.log('Default categories created successfully')
  } catch (error) {
    console.error('Error creating default categories:', error)
    throw error
  }
}

// Database utility functions

export async function getAccountBalance(accountId: string): Promise<number> {
  const { data, error } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .single()

  if (error) throw error
  return data?.balance || 0
}

export async function updateAccountBalance(accountId: string, newBalance: number) {
  const { error } = await supabase
    .from('accounts')
    .update({ 
      balance: newBalance,
      updated_at: new Date().toISOString()
    })
    .eq('id', accountId)

  if (error) throw error
}

export async function createTransaction(
  transaction: Omit<Transaction, 'id' | 'created_at'>,
  updateBalance = true
) {
  try {
    // Start a transaction block
    const { error: blockError } = await supabase.query('BEGIN')
    if (blockError) throw blockError

    try {
      // Insert the transaction
      const { error: insertError } = await supabase
        .from('transactions')
        .insert([transaction])

      if (insertError) throw insertError

      // Update account balance if needed
      if (updateBalance && transaction.account_id) {
        const currentBalance = await getAccountBalance(transaction.account_id)
        const balanceChange = transaction.type === 'income' 
          ? transaction.amount 
          : -transaction.amount
        
        await updateAccountBalance(
          transaction.account_id,
          currentBalance + balanceChange
        )
      }

      // Commit the transaction
      const { error: commitError } = await supabase.query('COMMIT')
      if (commitError) throw commitError

    } catch (error) {
      // Rollback on any error
      await supabase.query('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Error creating transaction:', error)
    throw error
  }
}

export async function deleteTransaction(
  transactionId: string, 
  accountId: string | null, 
  amount: number,
  type: 'income' | 'expense'
) {
  try {
    // Start a transaction block
    const { error: blockError } = await supabase.query('BEGIN')
    if (blockError) throw blockError

    try {
      // Delete the transaction
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)

      if (deleteError) throw deleteError

      // Update account balance if needed
      if (accountId) {
        const currentBalance = await getAccountBalance(accountId)
        const balanceChange = type === 'income' ? -amount : amount
        
        await updateAccountBalance(
          accountId,
          currentBalance + balanceChange
        )
      }

      // Commit the transaction
      const { error: commitError } = await supabase.query('COMMIT')
      if (commitError) throw commitError

    } catch (error) {
      // Rollback on any error
      await supabase.query('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Error deleting transaction:', error)
    throw error
  }
}