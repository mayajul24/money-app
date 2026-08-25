import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Transaction, type TransactionType } from '../lib/db'
import type { CategoryId } from '../lib/categories'

export function useAllTransactions(): Transaction[] {
  return useLiveQuery(async () => {
    const all = await db.transactions.toArray()
    return all.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  }, []) ?? []
}

export function useMonthTransactions(monthKey: string): Transaction[] {
  return (
    useLiveQuery(async () => {
      const all = await db.transactions.where('date').startsWith(monthKey).toArray()
      return all.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    }, [monthKey]) ?? []
  )
}

export interface TransactionInput {
  type: TransactionType
  amount: number
  category: CategoryId
  note: string
  date: string
}

export async function addTransaction(input: TransactionInput) {
  await db.transactions.add({ ...input, createdAt: Date.now() } as Transaction)
}

export async function updateTransaction(id: number, input: TransactionInput) {
  await db.transactions.update(id, input)
}

export async function deleteTransaction(id: number) {
  await db.transactions.delete(id)
}

/**
 * Skips rows that already exist (same date/amount/type/note) so re-importing
 * an overlapping statement doesn't create duplicates.
 */
export async function importTransactions(
  candidates: { type: TransactionType; amount: number; category: CategoryId; note: string; date: string }[],
): Promise<{ added: number; skipped: number }> {
  const existing = await db.transactions.toArray()
  const key = (t: { date: string; amount: number; type: TransactionType; note: string }) =>
    `${t.date}|${t.amount}|${t.type}|${t.note}`
  const existingKeys = new Set(existing.map(key))

  let added = 0
  let skipped = 0
  const toInsert: Transaction[] = []

  for (const candidate of candidates) {
    const k = key(candidate)
    if (existingKeys.has(k)) {
      skipped++
      continue
    }
    existingKeys.add(k)
    toInsert.push({ ...candidate, createdAt: Date.now() } as Transaction)
    added++
  }

  await db.transactions.bulkAdd(toInsert)
  return { added, skipped }
}
