import { useEffect, useState } from 'react'
import { useProfile, saveProfile } from '../hooks/useProfile'
import {
  useRecurringExpenses,
  addRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
} from '../hooks/useRecurringExpenses'
import { EXPENSE_CATEGORIES, getCategory, type CategoryId } from '../lib/categories'
import type { RecurringExpense } from '../lib/db'

function RecurringExpenseForm({
  existing,
  onDone,
}: {
  existing?: RecurringExpense
  onDone: () => void
}) {
  const [label, setLabel] = useState(existing?.label ?? '')
  const [category, setCategory] = useState<CategoryId>(existing?.category ?? 'bills')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [dueDay, setDueDay] = useState(existing ? String(existing.dueDay) : '1')

  async function handleSave() {
    const numericAmount = Number(amount)
    const numericDay = Math.min(31, Math.max(1, Number(dueDay) || 1))
    if (!label.trim() || numericAmount <= 0) return
    const input = { label: label.trim(), category, amount: numericAmount, dueDay: numericDay, active: true }
    if (existing) {
      await updateRecurringExpense(existing.id, input)
    } else {
      await addRecurringExpense(input)
    }
    onDone()
  }

  return (
    <div className="recurring-form">
      <input className="note-input" placeholder="שם ההוצאה" value={label} onChange={(e) => setLabel(e.target.value)} />
      <div className="recurring-form-row">
        <input
          className="amount-input small"
          type="number"
          placeholder="סכום"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          className="amount-input small"
          type="number"
          min={1}
          max={31}
          placeholder="יום בחודש"
          value={dueDay}
          onChange={(e) => setDueDay(e.target.value)}
        />
      </div>
      <select className="note-input" value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
        {EXPENSE_CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <div className="modal-actions">
        <button type="button" className="secondary-btn" onClick={onDone}>
          ביטול
        </button>
        <button type="button" className="submit-btn" onClick={handleSave}>
          שמור
        </button>
      </div>
    </div>
  )
}

export function SettingsView({ onClose }: { onClose: () => void }) {
  const profile = useProfile()
  const recurring = useRecurringExpenses()

  const [salary, setSalary] = useState('')
  const [balance, setBalance] = useState('')
  const [recurringFormState, setRecurringFormState] = useState<{ open: boolean; editing?: RecurringExpense }>({
    open: false,
  })
  // useProfile() resolves asynchronously (Dexie live query), so the loaded
  // values arrive after the initial render — sync them in once they land.
  useEffect(() => {
    if (profile.balanceAsOf === '') return
    setSalary(String(profile.monthlySalary || ''))
    setBalance(String(profile.currentBalance || ''))
  }, [profile.balanceAsOf, profile.monthlySalary, profile.currentBalance])

  async function handleSaveProfile() {
    await saveProfile({ monthlySalary: Number(salary) || 0, currentBalance: Number(balance) || 0 })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet settings-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>הגדרות</h2>
          <button className="secondary-btn" onClick={onClose}>
            סגור
          </button>
        </div>

        <section className="settings-section">
          <h3>נתונים בסיסיים</h3>
          <label className="settings-label">
            משכורת חודשית
            <input
              className="note-input"
              type="number"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              onBlur={handleSaveProfile}
            />
          </label>
          <label className="settings-label">
            יתרה נוכחית בחשבון
            <input
              className="note-input"
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              onBlur={handleSaveProfile}
            />
          </label>
          <p className="settings-hint">היתרה מתעדכנת אוטומטית לפי תנועות שנרשמות מרגע זה</p>
        </section>

        <section className="settings-section">
          <h3>הוצאות קבועות</h3>
          {recurring.map((r) => (
            <button
              key={r.id}
              className="recurring-row as-button"
              onClick={() => setRecurringFormState({ open: true, editing: r })}
            >
              <span className="tx-dot" style={{ background: getCategory(r.category).color }} />
              <div className="tx-details">
                <span className="tx-category">{r.label}</span>
                <span className="tx-note">כל {r.dueDay} לחודש</span>
              </div>
              <span className="tx-amount">₪{r.amount.toLocaleString()}</span>
              <span
                className="tx-delete"
                role="button"
                aria-label="מחק"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteRecurringExpense(r.id)
                }}
              >
                ✕
              </span>
            </button>
          ))}

          {recurringFormState.open ? (
            <RecurringExpenseForm
              existing={recurringFormState.editing}
              onDone={() => setRecurringFormState({ open: false })}
            />
          ) : (
            <button className="add-transaction-btn" onClick={() => setRecurringFormState({ open: true })}>
              + הוסף הוצאה קבועה
            </button>
          )}
        </section>
      </div>
    </div>
  )
}
