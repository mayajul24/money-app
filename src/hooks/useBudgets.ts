import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Budget } from '../lib/db'
import type { CategoryId } from '../lib/categories'

export function useBudgets(): Record<string, number> {
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? []
  return Object.fromEntries(budgets.map((b) => [b.category, b.monthlyLimit]))
}

export async function setBudget(category: CategoryId, monthlyLimit: number) {
  const budget: Budget = { category, monthlyLimit }
  await db.budgets.put(budget)
}
