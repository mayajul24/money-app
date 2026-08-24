import { useMemo } from 'react'
import { useAllTransactions } from './useTransactions'
import { useProfile } from './useProfile'
import { useRecurringExpenses } from './useRecurringExpenses'
import { computeForecast, type MonthForecast } from '../lib/forecast'
import { buildInsights, type Insight } from '../lib/insights'

export function useForecast(): { forecast: MonthForecast; insights: Insight[]; loaded: boolean } {
  const transactions = useAllTransactions()
  const profile = useProfile()
  const recurringExpenses = useRecurringExpenses()

  const forecast = useMemo(
    () =>
      computeForecast({
        transactions,
        recurringExpenses,
        monthlySalary: profile.monthlySalary,
        currentBalance: profile.currentBalance,
        balanceAsOf: profile.balanceAsOf,
      }),
    [transactions, recurringExpenses, profile],
  )

  const insights = useMemo(() => buildInsights(transactions, forecast), [transactions, forecast])

  return { forecast, insights, loaded: profile.balanceAsOf !== '' }
}
