import type { Transaction } from './db'
import { getCategory, type CategoryId } from './categories'
import type { MonthForecast } from './forecast'
import { monthKeyOf, shiftMonthKey } from './month'

export interface Insight {
  id: string
  text: string
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}

function categorySpend(transactions: Transaction[], monthKey: string, category: CategoryId): number {
  return sum(
    transactions
      .filter((t) => t.type === 'expense' && t.category === category && monthKeyOf(t.date) === monthKey)
      .map((t) => t.amount),
  )
}

export function buildInsights(transactions: Transaction[], forecast: MonthForecast, today?: string): Insight[] {
  const insights: Insight[] = []
  const todayIso = today ?? new Date().toISOString().slice(0, 10)
  const monthKey = forecast.monthKey
  const prevMonthKey = shiftMonthKey(monthKey, -1)
  const elapsedShare = forecast.dayOfMonth / forecast.daysInMonth

  const expenseCategories: CategoryId[] = [
    'food',
    'transport',
    'housing',
    'fun',
    'health',
    'shopping',
    'bills',
    'other',
  ]

  let biggestOverspend: { category: CategoryId; pct: number } | null = null
  for (const category of expenseCategories) {
    const prevTotal = categorySpend(transactions, prevMonthKey, category)
    if (prevTotal <= 0) continue
    const expectedByNow = prevTotal * elapsedShare
    if (expectedByNow <= 0) continue
    const current = categorySpend(transactions, monthKey, category)
    const pct = ((current - expectedByNow) / expectedByNow) * 100
    if (pct > 20 && (!biggestOverspend || pct > biggestOverspend.pct)) {
      biggestOverspend = { category, pct }
    }
  }
  if (biggestOverspend) {
    const label = getCategory(biggestOverspend.category).label
    insights.push({
      id: 'category-overspend',
      text: `הוצאת החודש ${Math.round(biggestOverspend.pct)}% יותר מהרגיל על ${label}`,
    })
  }

  const weekAgo = new Date(todayIso)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoIso = weekAgo.toISOString().slice(0, 10)
  const last7DaysSpend = sum(
    transactions.filter((t) => t.type === 'expense' && t.date > weekAgoIso && t.date <= todayIso).map((t) => t.amount),
  )
  const expectedWeeklySpend = forecast.historicalAvgMonthlyExpense / (forecast.daysInMonth / 7)
  if (expectedWeeklySpend > 0) {
    const diffPct = ((last7DaysSpend - expectedWeeklySpend) / expectedWeeklySpend) * 100
    if (diffPct > 20) {
      insights.push({ id: 'weekly-pace-high', text: 'בשבוע האחרון קצב ההוצאות שלך גבוה מהממוצע' })
    } else if (diffPct < -20) {
      insights.push({ id: 'weekly-pace-low', text: 'בשבוע האחרון קצב ההוצאות שלך נמוך מהממוצע — כל הכבוד' })
    }
  }

  insights.push({
    id: 'projection',
    text: `אם תמשיכי בקצב הנוכחי, צפויה להישאר לך יתרה של כ-₪${Math.round(
      forecast.expectedEndBalanceTypical,
    ).toLocaleString()} בסוף החודש`,
  })

  return insights.slice(0, 3)
}
