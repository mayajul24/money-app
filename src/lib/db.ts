import Dexie, { type EntityTable } from 'dexie'
import type { CategoryId } from './categories'

export interface Transaction {
  id: number
  amount: number
  category: CategoryId
  note: string
  date: string // ISO yyyy-mm-dd
  createdAt: number
}

export interface Budget {
  category: CategoryId
  monthlyLimit: number
}

export const db = new Dexie('money_app') as Dexie & {
  transactions: EntityTable<Transaction, 'id'>
  budgets: EntityTable<Budget, 'category'>
}

db.version(1).stores({
  transactions: '++id, category, date',
  budgets: '&category',
})
