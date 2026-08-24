import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useMonthTransactions } from '../hooks/useTransactions'
import { deleteTransaction } from '../hooks/useTransactions'
import { getCategory, EXPENSE_CATEGORIES } from '../lib/categories'
import { MonthNav } from './MonthNav'
import { currentMonthKey } from '../lib/month'

export function SummaryView() {
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const transactions = useMonthTransactions(monthKey)

  const income = transactions.filter((t) => t.category === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter((t) => t.category !== 'income').reduce((s, t) => s + t.amount, 0)
  const balance = income - expense

  const byCategory = EXPENSE_CATEGORIES.map((c) => ({
    ...c,
    total: transactions.filter((t) => t.category === c.id).reduce((s, t) => s + t.amount, 0),
  })).filter((c) => c.total > 0)

  return (
    <div className="summary-view">
      <MonthNav monthKey={monthKey} onChange={setMonthKey} />

      <div className="totals-row">
        <div className="total-card income">
          <span className="total-label">הכנסות</span>
          <span className="total-value">₪{income.toLocaleString()}</span>
        </div>
        <div className="total-card expense">
          <span className="total-label">הוצאות</span>
          <span className="total-value">₪{expense.toLocaleString()}</span>
        </div>
        <div className={`total-card balance ${balance < 0 ? 'negative' : ''}`}>
          <span className="total-label">יתרה</span>
          <span className="total-value">₪{balance.toLocaleString()}</span>
        </div>
      </div>

      {byCategory.length > 0 && (
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byCategory} dataKey="total" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {byCategory.map((c) => (
                  <Cell key={c.id} fill={c.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `₪${Number(value).toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            {byCategory.map((c) => (
              <span key={c.id} className="legend-item">
                <span className="legend-dot" style={{ background: c.color }} />
                {c.icon} {c.label} — ₪{c.total.toLocaleString()}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="transaction-list">
        {transactions.length === 0 && <p className="empty-state">אין תנועות בחודש הזה</p>}
        {transactions.map((t) => {
          const cat = getCategory(t.category)
          return (
            <div key={t.id} className="transaction-row">
              <span className="tx-icon" style={{ background: cat.color }}>
                {cat.icon}
              </span>
              <div className="tx-details">
                <span className="tx-category">{cat.label}</span>
                {t.note && <span className="tx-note">{t.note}</span>}
              </div>
              <span className={`tx-amount ${t.category === 'income' ? 'positive' : ''}`}>
                {t.category === 'income' ? '+' : '-'}₪{t.amount.toLocaleString()}
              </span>
              <button className="tx-delete" onClick={() => deleteTransaction(t.id)} aria-label="מחק">
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
