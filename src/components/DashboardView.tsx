import { useForecast } from '../hooks/useForecast'
import { StatCard } from './StatCard'
import { SaveRecommendation } from './SaveRecommendation'
import { formatMonthLabel } from '../lib/month'

function ils(n: number): string {
  return `₪${Math.round(n).toLocaleString()}`
}

export function DashboardView() {
  const { forecast, insights } = useForecast()

  return (
    <div className="dashboard-view">
      <p className="dashboard-month">{formatMonthLabel(forecast.monthKey)} · מצב החודש</p>

      <div className="stat-grid">
        <StatCard label="הכנסה צפויה" value={ils(forecast.expectedIncomeTotal)} tone="income" />
        <StatCard label="הוצאות צפויות" value={ils(forecast.expectedExpenseTotalTypical)} tone="expense" />
        <StatCard label="יתרה צפויה בסוף החודש" value={ils(forecast.expectedEndBalanceTypical)} />
      </div>

      <SaveRecommendation forecast={forecast} />

      {insights.length > 0 && (
        <div className="insights-card">
          {insights.map((insight) => (
            <p key={insight.id} className="insight-row">
              {insight.text}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
