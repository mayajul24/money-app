import { useState } from 'react'
import {
  parseSpreadsheetRows,
  guessHeaderRowIndex,
  guessColumnMapping,
  extractRows,
  type ColumnMapping,
} from '../lib/importFile'
import { importTransactions } from '../hooks/useTransactions'
import { getCategory } from '../lib/categories'

type Step =
  | { kind: 'select' }
  | { kind: 'map'; allRows: string[][]; headerRowIndex: number; mapping: ColumnMapping }
  | { kind: 'result'; added: number; skipped: number; invalidDate: number; invalidAmount: number }

export function ImportTransactionsModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>({ kind: 'select' })
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setError('')
    try {
      const allRows = await parseSpreadsheetRows(file)
      if (allRows.length === 0) {
        setError('לא הצלחתי לקרוא את הקובץ. ודאי שזה קובץ CSV או Excel')
        return
      }
      const headerRowIndex = guessHeaderRowIndex(allRows)
      const mapping = guessColumnMapping(allRows[headerRowIndex], allRows.slice(headerRowIndex + 1))
      setStep({ kind: 'map', allRows, headerRowIndex, mapping })
    } catch {
      setError('לא הצלחתי לקרוא את הקובץ. ודאי שזה קובץ CSV או Excel')
    }
  }

  async function handleImport() {
    if (step.kind !== 'map') return
    const dataRows = step.allRows.slice(step.headerRowIndex + 1)
    const { imported, invalidDateCount, invalidAmountCount } = extractRows(dataRows, step.mapping)
    const candidates = imported.map((row) => ({
      type: row.type,
      amount: row.amount,
      category: row.category,
      note: row.note,
      date: row.date,
    }))
    const { added, skipped } = await importTransactions(candidates)
    setStep({ kind: 'result', added, skipped, invalidDate: invalidDateCount, invalidAmount: invalidAmountCount })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {step.kind === 'select' && (
          <div className="import-step">
            <h2 className="import-title">ייבוא מקובץ</h2>
            <p className="settings-hint">ייצאי קובץ תנועות (CSV או Excel) מאתר הבנק או האשראי ותעלי אותו כאן.</p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
            {error && <p className="import-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={onClose}>
                ביטול
              </button>
            </div>
          </div>
        )}

        {step.kind === 'map' && (
          <ColumnMappingStep
            allRows={step.allRows}
            headerRowIndex={step.headerRowIndex}
            mapping={step.mapping}
            onHeaderRowChange={(headerRowIndex) =>
              setStep({
                kind: 'map',
                allRows: step.allRows,
                headerRowIndex,
                mapping: guessColumnMapping(step.allRows[headerRowIndex] ?? [], step.allRows.slice(headerRowIndex + 1)),
              })
            }
            onMappingChange={(mapping) => setStep({ kind: 'map', allRows: step.allRows, headerRowIndex: step.headerRowIndex, mapping })}
            onCancel={onClose}
            onImport={handleImport}
          />
        )}

        {step.kind === 'result' && (
          <div className="import-step">
            <h2 className="import-title">הייבוא הושלם</h2>
            <p>יובאו {step.added} תנועות חדשות.</p>
            {step.skipped > 0 && <p className="settings-hint">{step.skipped} כפילויות דולגו.</p>}
            {step.invalidDate > 0 && (
              <p className="settings-hint">{step.invalidDate} שורות דולגו — לא זוהה בהן תאריך תקין בעמודה שבחרת.</p>
            )}
            {step.invalidAmount > 0 && (
              <p className="settings-hint">{step.invalidAmount} שורות דולגו — לא זוהה בהן סכום תקין בעמודה שבחרת.</p>
            )}
            {step.added === 0 && (step.invalidDate > 0 || step.invalidAmount > 0) && (
              <p className="import-error">
                אם הכול דולג, כנראה שעמודות התאריך/הסכום או שורת הכותרות לא נבחרו נכון — אפשר לנסות שוב ולתקן אותן ידנית.
              </p>
            )}
            <div className="modal-actions">
              <button type="button" className="submit-btn" onClick={onClose}>
                סגור
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ColumnMappingStep({
  allRows,
  headerRowIndex,
  mapping,
  onHeaderRowChange,
  onMappingChange,
  onCancel,
  onImport,
}: {
  allRows: string[][]
  headerRowIndex: number
  mapping: ColumnMapping
  onHeaderRowChange: (index: number) => void
  onMappingChange: (mapping: ColumnMapping) => void
  onCancel: () => void
  onImport: () => void
}) {
  const headers = allRows[headerRowIndex] ?? []
  const previewRowCount = Math.min(allRows.length, 10)
  const dataPreview = allRows.slice(headerRowIndex + 1, headerRowIndex + 4)

  const canImport =
    mapping.date !== null &&
    (mapping.amountMode === 'single' ? mapping.amount !== null : mapping.debit !== null && mapping.credit !== null)

  return (
    <div className="import-step">
      <h2 className="import-title">התאמת עמודות</h2>

      <label className="settings-label">
        איזו שורה היא שורת הכותרות?
        <select className="note-input" value={headerRowIndex} onChange={(e) => onHeaderRowChange(Number(e.target.value))}>
          {Array.from({ length: previewRowCount }).map((_, i) => (
            <option key={i} value={i}>
              שורה {i + 1}: {allRows[i].slice(0, 4).join(' | ') || '(ריקה)'}
            </option>
          ))}
        </select>
      </label>

      <p className="settings-hint">נחשנו מה כל עמודה — אפשר לתקן לפני הייבוא</p>

      <label className="settings-label">
        עמודת תאריך
        <select
          className="note-input"
          value={mapping.date}
          onChange={(e) => onMappingChange({ ...mapping, date: Number(e.target.value) })}
        >
          {headers.map((h, i) => (
            <option key={i} value={i}>
              {h || `עמודה ${i + 1}`}
            </option>
          ))}
        </select>
      </label>

      <label className="settings-label">
        עמודת תיאור (אופציונלי)
        <select
          className="note-input"
          value={mapping.description ?? ''}
          onChange={(e) => onMappingChange({ ...mapping, description: e.target.value === '' ? null : Number(e.target.value) })}
        >
          <option value="">ללא</option>
          {headers.map((h, i) => (
            <option key={i} value={i}>
              {h || `עמודה ${i + 1}`}
            </option>
          ))}
        </select>
      </label>

      <label className="settings-label">
        עמודת קטגוריה (אופציונלי — ננסה להתאים לקטגוריות של האפליקציה)
        <select
          className="note-input"
          value={mapping.category ?? ''}
          onChange={(e) => onMappingChange({ ...mapping, category: e.target.value === '' ? null : Number(e.target.value) })}
        >
          <option value="">ללא</option>
          {headers.map((h, i) => (
            <option key={i} value={i}>
              {h || `עמודה ${i + 1}`}
            </option>
          ))}
        </select>
      </label>

      <div className="type-toggle">
        <button
          type="button"
          className={mapping.amountMode === 'single' ? 'active' : ''}
          onClick={() => onMappingChange({ ...mapping, amountMode: 'single' })}
        >
          עמודת סכום אחת
        </button>
        <button
          type="button"
          className={mapping.amountMode === 'debitCredit' ? 'active' : ''}
          onClick={() => onMappingChange({ ...mapping, amountMode: 'debitCredit' })}
        >
          חובה / זכות נפרדות
        </button>
      </div>

      {mapping.amountMode === 'single' ? (
        <>
          <label className="settings-label">
            עמודת סכום
            <select
              className="note-input"
              value={mapping.amount ?? ''}
              onChange={(e) => onMappingChange({ ...mapping, amount: e.target.value === '' ? null : Number(e.target.value) })}
            >
              <option value="">בחרי עמודה</option>
              {headers.map((h, i) => (
                <option key={i} value={i}>
                  {h || `עמודה ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
          <label className="settings-label">
            איך לפרש את העמודה הזו?
            <select
              className="note-input"
              value={mapping.singleColumnMode}
              onChange={(e) => onMappingChange({ ...mapping, singleColumnMode: e.target.value as ColumnMapping['singleColumnMode'] })}
            >
              <option value="allExpense">כל השורות הן הוצאה (למשל דוח כרטיס אשראי)</option>
              <option value="signed">לפי סימן — שלילי = הוצאה, חיובי = הכנסה</option>
              <option value="allIncome">כל השורות הן הכנסה</option>
            </select>
          </label>
        </>
      ) : (
        <div className="recurring-form-row">
          <label className="settings-label">
            עמודת חובה (הוצאה)
            <select
              className="note-input"
              value={mapping.debit ?? ''}
              onChange={(e) => onMappingChange({ ...mapping, debit: e.target.value === '' ? null : Number(e.target.value) })}
            >
              <option value="">בחרי עמודה</option>
              {headers.map((h, i) => (
                <option key={i} value={i}>
                  {h || `עמודה ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
          <label className="settings-label">
            עמודת זכות (הכנסה)
            <select
              className="note-input"
              value={mapping.credit ?? ''}
              onChange={(e) => onMappingChange({ ...mapping, credit: e.target.value === '' ? null : Number(e.target.value) })}
            >
              <option value="">בחרי עמודה</option>
              {headers.map((h, i) => (
                <option key={i} value={i}>
                  {h || `עמודה ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {dataPreview.length > 0 && (
        <div className="import-preview">
          <p className="import-preview-caption">כך זה ייראה אחרי הייבוא:</p>
          {extractRows(dataPreview, mapping).imported.map((row, i) => (
            <p key={i} className="import-preview-row">
              <span className={row.type === 'expense' ? 'trend-up' : 'trend-down'}>
                {row.type === 'expense' ? '-' : '+'}₪{row.amount.toLocaleString()}
              </span>{' '}
              · {getCategory(row.category).label} · {row.date} · {row.note}
            </p>
          ))}
        </div>
      )}

      <div className="modal-actions">
        <button type="button" className="secondary-btn" onClick={onCancel}>
          ביטול
        </button>
        <button type="button" className="submit-btn" disabled={!canImport} onClick={onImport}>
          ייבוא
        </button>
      </div>
    </div>
  )
}
