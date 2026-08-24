import { useState } from 'react'
import { EXPENSE_CATEGORIES } from '../lib/categories'
import { useBudgets, setBudget } from '../hooks/useBudgets'
import { useMonthTransactions } from '../hooks/useTransactions'
import { MonthNav } from './MonthNav'
import { currentMonthKey } from '../lib/month'

export function BudgetView() {
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const budgets = useBudgets()
  const transactions = useMonthTransactions(monthKey)

  return (
    <div className="budget-view">
      <MonthNav monthKey={monthKey} onChange={setMonthKey} />
      <p className="budget-hint">תקציב חודשי לפי קטגוריה (משותף לכל החודשים)</p>

      <div className="budget-list">
        {EXPENSE_CATEGORIES.map((c) => {
          const limit = budgets[c.id] ?? 0
          const spent = transactions.filter((t) => t.category === c.id).reduce((s, t) => s + t.amount, 0)
          const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0
          const over = limit > 0 && spent > limit

          return (
            <div key={c.id} className="budget-row">
              <div className="budget-row-header">
                <span className="budget-cat">
                  {c.icon} {c.label}
                </span>
                <input
                  type="number"
                  className="budget-input"
                  placeholder="ללא הגבלה"
                  defaultValue={limit || ''}
                  onBlur={(e) => setBudget(c.id, Number(e.target.value) || 0)}
                />
              </div>
              {limit > 0 && (
                <>
                  <div className="budget-bar">
                    <div
                      className={`budget-bar-fill ${over ? 'over' : ''}`}
                      style={{ width: `${pct}%`, background: over ? '#ef4444' : c.color }}
                    />
                  </div>
                  <span className={`budget-status ${over ? 'over' : ''}`}>
                    ₪{spent.toLocaleString()} מתוך ₪{limit.toLocaleString()}
                    {over && ' — חריגה!'}
                  </span>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
