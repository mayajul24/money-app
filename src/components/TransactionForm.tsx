import { useState } from 'react'
import { CATEGORIES, EXPENSE_CATEGORIES, type CategoryId } from '../lib/categories'
import { addTransaction, updateTransaction, type TransactionInput } from '../hooks/useTransactions'
import { todayIso } from '../lib/month'
import type { Transaction, TransactionType } from '../lib/db'

export function TransactionForm({
  existing,
  onClose,
}: {
  existing?: Transaction
  onClose: () => void
}) {
  const [type, setType] = useState<TransactionType>(existing?.type ?? 'expense')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [category, setCategory] = useState<CategoryId>(existing?.category ?? 'food')
  const [note, setNote] = useState(existing?.note ?? '')
  const [date, setDate] = useState(existing?.date ?? todayIso())

  const categories = type === 'income' ? CATEGORIES.filter((c) => c.kind === 'income') : EXPENSE_CATEGORIES
  const numericAmount = Number(amount)
  const canSubmit = amount.trim() !== '' && numericAmount > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const input: TransactionInput = {
      type,
      amount: numericAmount,
      category: type === 'income' ? 'income' : category,
      note: note.trim(),
      date,
    }
    if (existing) {
      await updateTransaction(existing.id, input)
    } else {
      await addTransaction(input)
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <form className="transaction-form" onSubmit={handleSubmit}>
          <div className="type-toggle">
            <button
              type="button"
              className={type === 'expense' ? 'active' : ''}
              onClick={() => setType('expense')}
            >
              הוצאה
            </button>
            <button type="button" className={type === 'income' ? 'active' : ''} onClick={() => setType('income')}>
              הכנסה
            </button>
          </div>

          <input
            className="amount-input"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />

          {type === 'expense' && (
            <div className="category-select-grid">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`category-pill ${category === c.id ? 'selected' : ''}`}
                  style={{ '--pill-color': c.color } as React.CSSProperties}
                  onClick={() => setCategory(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          <input
            className="note-input"
            type="text"
            placeholder="הערה (אופציונלי)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <input className="date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              ביטול
            </button>
            <button type="submit" className="submit-btn" disabled={!canSubmit}>
              {existing ? 'עדכן' : 'הוסף'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
