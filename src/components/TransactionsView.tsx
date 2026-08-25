import { useState } from 'react'
import { MonthNav } from './MonthNav'
import { TransactionForm } from './TransactionForm'
import { ImportTransactionsModal } from './ImportTransactionsModal'
import { useMonthTransactions, deleteTransaction } from '../hooks/useTransactions'
import { getCategory } from '../lib/categories'
import { currentMonthKey } from '../lib/month'
import type { Transaction } from '../lib/db'

export function TransactionsView() {
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const transactions = useMonthTransactions(monthKey)
  const [formState, setFormState] = useState<{ open: boolean; editing?: Transaction }>({ open: false })
  const [showImport, setShowImport] = useState(false)

  return (
    <div className="transactions-view">
      <MonthNav monthKey={monthKey} onChange={setMonthKey} />

      <div className="transactions-header-row">
        <button className="add-transaction-btn" onClick={() => setFormState({ open: true })}>
          + הוסף תנועה
        </button>
        <button className="add-transaction-btn" onClick={() => setShowImport(true)}>
          ייבוא מקובץ
        </button>
      </div>

      <div className="transaction-list">
        {transactions.length === 0 && <p className="empty-state">אין תנועות בחודש הזה</p>}
        {transactions.map((t) => {
          const cat = getCategory(t.category)
          return (
            <button
              key={t.id}
              className="transaction-row as-button"
              onClick={() => setFormState({ open: true, editing: t })}
            >
              <span className="tx-dot" style={{ background: cat.color }} />
              <div className="tx-details">
                <span className="tx-category">{t.type === 'income' ? 'הכנסה' : cat.label}</span>
                {t.note && <span className="tx-note">{t.note}</span>}
              </div>
              <span className={`tx-amount ${t.type === 'income' ? 'positive' : ''}`}>
                {t.type === 'income' ? '+' : '-'}₪{t.amount.toLocaleString()}
              </span>
              <span
                className="tx-delete"
                role="button"
                aria-label="מחק"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteTransaction(t.id)
                }}
              >
                ✕
              </span>
            </button>
          )
        })}
      </div>

      {formState.open && (
        <TransactionForm existing={formState.editing} onClose={() => setFormState({ open: false })} />
      )}
      {showImport && <ImportTransactionsModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
