import Dexie, { type EntityTable } from 'dexie'
import type { CategoryId } from './categories'

export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: number
  type: TransactionType
  amount: number
  category: CategoryId
  note: string
  date: string // ISO yyyy-mm-dd
  createdAt: number
}

export interface RecurringExpense {
  id: number
  label: string
  category: CategoryId
  amount: number
  dueDay: number // 1-31
  active: boolean
}

export interface Profile {
  id: 'main'
  monthlySalary: number
  currentBalance: number
  balanceAsOf: string // ISO date the balance figure is accurate as of
}

export const PROFILE_ID = 'main' as const

export const db = new Dexie('money_app') as Dexie & {
  transactions: EntityTable<Transaction, 'id'>
  recurringExpenses: EntityTable<RecurringExpense, 'id'>
  profile: EntityTable<Profile, 'id'>
}

db.version(1).stores({
  transactions: '++id, category, date',
  budgets: '&category',
})

db.version(2)
  .stores({
    transactions: '++id, type, category, date',
    recurringExpenses: '++id, category, dueDay',
    profile: '&id',
    budgets: null,
  })
  .upgrade((tx) =>
    tx
      .table('transactions')
      .toCollection()
      .modify((t: Transaction) => {
        t.type = t.category === 'income' ? 'income' : 'expense'
      }),
  )
