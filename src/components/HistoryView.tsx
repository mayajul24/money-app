import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { useAllTransactions } from '../hooks/useTransactions'
import { monthlyHistory } from '../lib/forecast'
import { formatMonthLabel } from '../lib/month'

function shortMonthLabel(monthKey: string): string {
  return formatMonthLabel(monthKey).split(' ')[0].slice(0, 3)
}

export function HistoryView() {
  const transactions = useAllTransactions()
  const history = monthlyHistory(transactions, 6)

  const chartData = history.map((h) => ({
    month: shortMonthLabel(h.monthKey),
    הכנסות: h.income,
    הוצאות: h.expense,
    saved: h.saved,
  }))

  return (
    <div className="history-view">
      <h2 className="section-title">הכנסות מול הוצאות</h2>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} width={40} />
            <Tooltip formatter={(value) => `₪${Number(value).toLocaleString()}`} />
            <Bar dataKey="הכנסות" fill="var(--income)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="הוצאות" fill="var(--expense)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h2 className="section-title">כמה הצלחת לשים בצד</h2>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} width={40} />
            <Tooltip formatter={(value) => `₪${Number(value).toLocaleString()}`} />
            <Bar dataKey="saved" name="נחסך" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.saved >= 0 ? 'var(--accent)' : 'var(--expense)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
