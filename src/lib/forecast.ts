import type { Transaction, RecurringExpense } from './db'
import { currentMonthKey, monthKeyOf, shiftMonthKey } from './month'

export interface ForecastInput {
  transactions: Transaction[]
  recurringExpenses: RecurringExpense[]
  monthlySalary: number
  currentBalance: number
  balanceAsOf: string
  today?: string
  historyMonths?: number
}

export interface SaveRecommendation {
  safe: number
  probable: number
  riskThreshold: number
}

export type Confidence = 'low' | 'medium' | 'high'

export interface MonthForecast {
  monthKey: string
  daysInMonth: number
  dayOfMonth: number
  remainingDays: number
  incomeSoFar: number
  expenseSoFar: number
  liveBalanceToday: number
  expectedIncomeTotal: number
  recurringRemaining: number
  variableRemainingTypical: number
  variableRemainingConservative: number
  expectedExpenseTotalTypical: number
  expectedEndBalanceTypical: number
  expectedEndBalanceConservative: number
  safetyMargin: number
  saveRecommendation: SaveRecommendation
  confidence: Confidence
  monthsOfHistory: number
  historicalAvgMonthlyExpense: number
}

function daysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

function dayOfMonth(dateIso: string): number {
  return Number(dateIso.slice(8, 10))
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)))
}

/**
 * Rolls the user's last confirmed balance forward to "today" using the actual
 * ledger, so the forecast stays accurate even if they haven't touched the
 * balance field in a while.
 */
function computeLiveBalance(
  transactions: Transaction[],
  currentBalance: number,
  balanceAsOf: string,
  today: string,
): number {
  const delta = sum(
    transactions
      .filter((t) => t.date > balanceAsOf && t.date <= today)
      .map((t) => (t.type === 'income' ? t.amount : -t.amount)),
  )
  return currentBalance + delta
}

function monthlyExpenseTotal(transactions: Transaction[], monthKey: string): number {
  return sum(
    transactions.filter((t) => t.type === 'expense' && monthKeyOf(t.date) === monthKey).map((t) => t.amount),
  )
}

export function computeForecast(input: ForecastInput): MonthForecast {
  const today = input.today ?? new Date().toISOString().slice(0, 10)
  const monthKey = monthKeyOf(today)
  const monthLength = daysInMonth(monthKey)
  const day = dayOfMonth(today)
  const remainingDays = monthLength - day
  const historyMonths = input.historyMonths ?? 6

  const monthTransactions = input.transactions.filter((t) => monthKeyOf(t.date) === monthKey)
  const incomeSoFar = sum(monthTransactions.filter((t) => t.type === 'income').map((t) => t.amount))
  const expenseSoFar = sum(monthTransactions.filter((t) => t.type === 'expense').map((t) => t.amount))

  const liveBalanceToday = computeLiveBalance(
    input.transactions,
    input.currentBalance,
    input.balanceAsOf,
    today,
  )

  // Past complete months that actually have data, most recent first.
  const pastMonthKeys: string[] = []
  for (let i = 1; i <= historyMonths; i++) {
    pastMonthKeys.push(shiftMonthKey(monthKey, -i))
  }
  const pastMonthlyTotals = pastMonthKeys
    .map((mk) => monthlyExpenseTotal(input.transactions, mk))
    .filter((total) => total > 0)

  const monthsOfHistory = pastMonthlyTotals.length
  const confidence: Confidence = monthsOfHistory >= 3 ? 'high' : monthsOfHistory >= 1 ? 'medium' : 'low'

  // Fall back to extrapolating this month's pace when there's no history yet.
  const historicalAvgMonthlyExpense =
    monthsOfHistory > 0 ? mean(pastMonthlyTotals) : day > 0 ? (expenseSoFar / day) * monthLength : 0
  const historicalStdDevMonthlyExpense = monthsOfHistory > 1 ? stdDev(pastMonthlyTotals) : historicalAvgMonthlyExpense * 0.2

  const activeRecurring = input.recurringExpenses.filter((r) => r.active)
  const recurringTotalMonthly = sum(activeRecurring.map((r) => r.amount))
  const recurringRemaining = sum(activeRecurring.filter((r) => r.dueDay >= day).map((r) => r.amount))

  // Fixed costs are close to constant, so most of the month-to-month variance
  // in total spend comes from the variable portion — approximate accordingly.
  const historicalAvgVariableMonthly = Math.max(0, historicalAvgMonthlyExpense - recurringTotalMonthly)
  const dailyVariableAvg = monthLength > 0 ? historicalAvgVariableMonthly / monthLength : 0
  const dailyVariableStdDev =
    monthLength > 0 ? (historicalStdDevMonthlyExpense / Math.sqrt(monthLength)) : 0

  const variableRemainingTypical = dailyVariableAvg * remainingDays
  const variableRemainingConservative =
    variableRemainingTypical + dailyVariableStdDev * Math.sqrt(remainingDays)

  const expectedExpenseRemainingTypical = recurringRemaining + variableRemainingTypical
  const expectedExpenseRemainingConservative = recurringRemaining + variableRemainingConservative
  const expectedExpenseTotalTypical = expenseSoFar + expectedExpenseRemainingTypical

  const expectedIncomeRemaining = Math.max(0, input.monthlySalary - incomeSoFar)
  const expectedIncomeTotal = incomeSoFar + expectedIncomeRemaining

  const expectedEndBalanceTypical = liveBalanceToday + expectedIncomeRemaining - expectedExpenseRemainingTypical
  const expectedEndBalanceConservative =
    liveBalanceToday + expectedIncomeRemaining - expectedExpenseRemainingConservative

  const safetyMargin = Math.max(300, historicalAvgMonthlyExpense * 0.15)

  const riskThreshold = expectedEndBalanceTypical
  const probable = Math.max(0, expectedEndBalanceTypical - safetyMargin)
  const safe = Math.max(0, Math.min(probable, expectedEndBalanceConservative - safetyMargin))

  return {
    monthKey,
    daysInMonth: monthLength,
    dayOfMonth: day,
    remainingDays,
    incomeSoFar,
    expenseSoFar,
    liveBalanceToday,
    expectedIncomeTotal,
    recurringRemaining,
    variableRemainingTypical,
    variableRemainingConservative,
    expectedExpenseTotalTypical,
    expectedEndBalanceTypical,
    expectedEndBalanceConservative,
    safetyMargin,
    saveRecommendation: { safe, probable, riskThreshold },
    confidence,
    monthsOfHistory,
    historicalAvgMonthlyExpense,
  }
}

export function monthlyExpenseByCategory(transactions: Transaction[], monthKey: string): Record<string, number> {
  const result: Record<string, number> = {}
  for (const t of transactions) {
    if (t.type !== 'expense' || monthKeyOf(t.date) !== monthKey) continue
    result[t.category] = (result[t.category] ?? 0) + t.amount
  }
  return result
}

export interface MonthTotals {
  monthKey: string
  income: number
  expense: number
  saved: number
}

export function monthlyHistory(transactions: Transaction[], monthsBack: number, today?: string): MonthTotals[] {
  const base = monthKeyOf(today ?? new Date().toISOString().slice(0, 10))
  const months: MonthTotals[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const mk = shiftMonthKey(base, -i)
    const monthTx = transactions.filter((t) => monthKeyOf(t.date) === mk)
    const income = sum(monthTx.filter((t) => t.type === 'income').map((t) => t.amount))
    const expense = sum(monthTx.filter((t) => t.type === 'expense').map((t) => t.amount))
    months.push({ monthKey: mk, income, expense, saved: income - expense })
  }
  return months
}

export { currentMonthKey }
