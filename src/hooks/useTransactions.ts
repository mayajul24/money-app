import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Transaction } from '../lib/db'
import type { CategoryId } from '../lib/categories'

export function useMonthTransactions(monthKey: string): Transaction[] {
  return (
    useLiveQuery(async () => {
      const all = await db.transactions.where('date').startsWith(monthKey).toArray()
      return all.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    }, [monthKey]) ?? []
  )
}

export async function addTransaction(input: {
  amount: number
  category: CategoryId
  note: string
  date: string
}) {
  await db.transactions.add({ ...input, createdAt: Date.now() } as Transaction)
}

export async function deleteTransaction(id: number) {
  await db.transactions.delete(id)
}
