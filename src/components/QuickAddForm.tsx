import { useState } from 'react'
import { CATEGORIES, type CategoryId } from '../lib/categories'
import { addTransaction } from '../hooks/useTransactions'
import { todayIso } from '../lib/month'

export function QuickAddForm() {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<CategoryId>('food')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayIso())
  const [saved, setSaved] = useState(false)

  const numericAmount = Number(amount)
  const canSubmit = amount.trim() !== '' && numericAmount > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    await addTransaction({ amount: numericAmount, category, note: note.trim(), date })
    setAmount('')
    setNote('')
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  return (
    <form className="quick-add" onSubmit={handleSubmit}>
      <input
        className="amount-input"
        type="number"
        inputMode="decimal"
        placeholder="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        autoFocus
      />
      <span className="currency-suffix">₪</span>

      <div className="category-grid">
        {CATEGORIES.map((c) => (
          <button
            type="button"
            key={c.id}
            className={`category-chip ${category === c.id ? 'selected' : ''}`}
            style={{ '--chip-color': c.color } as React.CSSProperties}
            onClick={() => setCategory(c.id)}
          >
            <span className="chip-icon">{c.icon}</span>
            <span className="chip-label">{c.label}</span>
          </button>
        ))}
      </div>

      <input
        className="note-input"
        type="text"
        placeholder="הערה (אופציונלי)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <input
        className="date-input"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <button type="submit" className="submit-btn" disabled={!canSubmit}>
        {saved ? 'נשמר ✓' : 'הוסף'}
      </button>
    </form>
  )
}
