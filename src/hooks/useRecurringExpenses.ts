import { useLiveQuery } from 'dexie-react-hooks'
import { db, type RecurringExpense } from '../lib/db'
import type { CategoryId } from '../lib/categories'

export function useRecurringExpenses(): RecurringExpense[] {
  return (
    useLiveQuery(async () => {
      const all = await db.recurringExpenses.toArray()
      return all.sort((a, b) => a.dueDay - b.dueDay)
    }, []) ?? []
  )
}

export interface RecurringExpenseInput {
  label: string
  category: CategoryId
  amount: number
  dueDay: number
  active: boolean
}

export async function addRecurringExpense(input: RecurringExpenseInput) {
  await db.recurringExpenses.add(input as RecurringExpense)
}

export async function updateRecurringExpense(id: number, input: RecurringExpenseInput) {
  await db.recurringExpenses.update(id, input)
}

export async function deleteRecurringExpense(id: number) {
  await db.recurringExpenses.delete(id)
}
