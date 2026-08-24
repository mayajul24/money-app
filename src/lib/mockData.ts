import { db, type Transaction, type RecurringExpense } from './db'
import type { CategoryId } from './categories'
import { currentMonthKey, shiftMonthKey } from './month'

// Deterministic PRNG so the demo data looks the same on every fresh install.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(42)

const VARIABLE_CATEGORIES: { id: CategoryId; weight: number; min: number; max: number }[] = [
  { id: 'food', weight: 3, min: 40, max: 220 },
  { id: 'transport', weight: 2, min: 20, max: 150 },
  { id: 'fun', weight: 1.5, min: 60, max: 350 },
  { id: 'shopping', weight: 1.5, min: 50, max: 400 },
  { id: 'health', weight: 0.6, min: 40, max: 300 },
]

const RECURRING: Omit<RecurringExpense, 'id'>[] = [
  { label: 'שכר דירה', category: 'housing', amount: 4500, dueDay: 1, active: true },
  { label: 'אינטרנט וסלולר', category: 'bills', amount: 250, dueDay: 5, active: true },
  { label: 'ביטוח', category: 'bills', amount: 350, dueDay: 10, active: true },
]

const MONTHLY_SALARY = 15000

function pickCategory(): CategoryId {
  const totalWeight = VARIABLE_CATEGORIES.reduce((s, c) => s + c.weight, 0)
  let r = rand() * totalWeight
  for (const c of VARIABLE_CATEGORIES) {
    if (r < c.weight) return c.id
    r -= c.weight
  }
  return VARIABLE_CATEGORIES[0].id
}

function daysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

export async function ensureSeedData(): Promise<void> {
  // Guard against React StrictMode's double effect invocation (and any other
  // concurrent caller) racing on the "is there data yet" check: Dexie queues
  // transactions on the same stores, so the second caller's read is
  // guaranteed to see the first caller's write.
  const alreadySeeded = await db.transaction('rw', db.profile, async () => {
    const existing = await db.profile.get('main')
    if (existing) return true
    await db.profile.put({ id: 'main', monthlySalary: MONTHLY_SALARY, currentBalance: 0, balanceAsOf: '' })
    return false
  })
  if (alreadySeeded) return

  for (const r of RECURRING) {
    await db.recurringExpenses.add(r as RecurringExpense)
  }

  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const currentKey = currentMonthKey()

  const transactions: Omit<Transaction, 'id'>[] = []

  for (let monthsAgo = 4; monthsAgo >= 0; monthsAgo--) {
    const monthKey = shiftMonthKey(currentKey, -monthsAgo)
    const isCurrentMonth = monthKey === currentKey
    const lastDay = isCurrentMonth ? today.getDate() : daysInMonth(monthKey)

    transactions.push({
      type: 'income',
      amount: MONTHLY_SALARY,
      category: 'income',
      note: 'משכורת',
      date: `${monthKey}-01`,
      createdAt: Date.now(),
    })

    for (const r of RECURRING) {
      if (r.dueDay <= lastDay) {
        transactions.push({
          type: 'expense',
          amount: r.amount,
          category: r.category,
          note: r.label,
          date: `${monthKey}-${String(r.dueDay).padStart(2, '0')}`,
          createdAt: Date.now(),
        })
      }
    }

    const variableTxCount = 18 + Math.floor(rand() * 8)
    for (let i = 0; i < variableTxCount; i++) {
      const day = 1 + Math.floor(rand() * lastDay)
      const category = pickCategory()
      const spec = VARIABLE_CATEGORIES.find((c) => c.id === category)!
      const amount = Math.round(spec.min + rand() * (spec.max - spec.min))
      transactions.push({
        type: 'expense',
        amount,
        category,
        note: '',
        date: `${monthKey}-${String(day).padStart(2, '0')}`,
        createdAt: Date.now(),
      })
    }
  }

  await db.transactions.bulkAdd(transactions as Transaction[])

  const currentMonthNet = transactions
    .filter((t) => t.date.startsWith(currentKey))
    .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)
  const startingBalance = 6000
  await db.profile.put({
    id: 'main',
    monthlySalary: MONTHLY_SALARY,
    currentBalance: startingBalance + currentMonthNet,
    balanceAsOf: todayIso,
  })
}
