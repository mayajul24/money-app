import { useState } from 'react'
import { MonthNav } from './MonthNav'
import { useAllTransactions } from '../hooks/useTransactions'
import { EXPENSE_CATEGORIES } from '../lib/categories'
import { monthlyExpenseByCategory } from '../lib/forecast'
import { currentMonthKey, shiftMonthKey } from '../lib/month'

export function CategoriesView() {
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const transactions = useAllTransactions()

  const current = monthlyExpenseByCategory(transactions, monthKey)
  const previous = monthlyExpenseByCategory(transactions, shiftMonthKey(monthKey, -1))

  const rows = EXPENSE_CATEGORIES.map((c) => ({
    ...c,
    total: current[c.id] ?? 0,
    prevTotal: previous[c.id] ?? 0,
  }))
    .filter((r) => r.total > 0 || r.prevTotal > 0)
    .sort((a, b) => b.total - a.total)

  const grandTotal = rows.reduce((s, r) => s + r.total, 0)

  return (
    <div className="categories-view">
      <MonthNav monthKey={monthKey} onChange={setMonthKey} />

      {rows.length === 0 && <p className="empty-state">אין הוצאות בחודש הזה</p>}

      <div className="category-breakdown">
        {rows.map((r) => {
          const share = grandTotal > 0 ? (r.total / grandTotal) * 100 : 0
          const diffPct = r.prevTotal > 0 ? ((r.total - r.prevTotal) / r.prevTotal) * 100 : null
          return (
            <div key={r.id} className="category-breakdown-row">
              <div className="category-breakdown-header">
                <span className="category-breakdown-label">{r.label}</span>
                <span className="category-breakdown-amount">₪{r.total.toLocaleString()}</span>
              </div>
              <div className="category-breakdown-bar">
                <div className="category-breakdown-bar-fill" style={{ width: `${share}%`, background: r.color }} />
              </div>
              <div className="category-breakdown-meta">
                <span>{Math.round(share)}% מסך ההוצאות</span>
                {diffPct !== null && (
                  <span className={diffPct > 0 ? 'trend-up' : 'trend-down'}>
                    {diffPct > 0 ? '+' : ''}
                    {Math.round(diffPct)}% מהחודש הקודם
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
