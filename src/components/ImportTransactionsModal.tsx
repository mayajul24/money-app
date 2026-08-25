import { useState } from 'react'
import {
  parseCsvFile,
  guessColumnMapping,
  extractRows,
  type ColumnMapping,
  type ParsedCsv,
} from '../lib/importFile'
import { importTransactions } from '../hooks/useTransactions'

type Step =
  | { kind: 'select' }
  | { kind: 'map'; csv: ParsedCsv; mapping: ColumnMapping }
  | { kind: 'result'; added: number; skipped: number; invalid: number }

export function ImportTransactionsModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>({ kind: 'select' })
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setError('')
    try {
      const csv = await parseCsvFile(file)
      if (csv.headers.length === 0) {
        setError('לא הצלחתי לקרוא את הקובץ. ודאי שזה קובץ CSV')
        return
      }
      setStep({ kind: 'map', csv, mapping: guessColumnMapping(csv.headers) })
    } catch {
      setError('לא הצלחתי לקרוא את הקובץ. ודאי שזה קובץ CSV')
    }
  }

  async function handleImport() {
    if (step.kind !== 'map') return
    const { imported, invalidCount } = extractRows(step.csv.rows, step.mapping)
    const candidates = imported.map((row) => ({
      type: row.type,
      amount: row.amount,
      category: row.type === 'income' ? ('income' as const) : ('other' as const),
      note: row.note,
      date: row.date,
    }))
    const { added, skipped } = await importTransactions(candidates)
    setStep({ kind: 'result', added, skipped, invalid: invalidCount })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {step.kind === 'select' && (
          <div className="import-step">
            <h2 className="import-title">ייבוא מקובץ</h2>
            <p className="settings-hint">
              ייצאי קובץ CSV של תנועות מאתר הבנק או האשראי (אם קיבלת Excel, שמרי אותו כ-CSV קודם) ותעלי אותו כאן.
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
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
            csv={step.csv}
            mapping={step.mapping}
            onChange={(mapping) => setStep({ kind: 'map', csv: step.csv, mapping })}
            onCancel={onClose}
            onImport={handleImport}
          />
        )}

        {step.kind === 'result' && (
          <div className="import-step">
            <h2 className="import-title">הייבוא הושלם</h2>
            <p>יובאו {step.added} תנועות חדשות.</p>
            {step.skipped > 0 && <p className="settings-hint">{step.skipped} כפילויות דולגו.</p>}
            {step.invalid > 0 && <p className="settings-hint">{step.invalid} שורות לא זוהו ולא יובאו.</p>}
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
  csv,
  mapping,
  onChange,
  onCancel,
  onImport,
}: {
  csv: ParsedCsv
  mapping: ColumnMapping
  onChange: (mapping: ColumnMapping) => void
  onCancel: () => void
  onImport: () => void
}) {
  const preview = csv.rows.slice(0, 4)
  const canImport =
    mapping.date !== null &&
    (mapping.amountMode === 'single' ? mapping.amount !== null : mapping.debit !== null && mapping.credit !== null)

  return (
    <div className="import-step">
      <h2 className="import-title">התאמת עמודות</h2>
      <p className="settings-hint">נחשנו מה כל עמודה — אפשר לתקן לפני הייבוא</p>

      <label className="settings-label">
        עמודת תאריך
        <select
          className="note-input"
          value={mapping.date}
          onChange={(e) => onChange({ ...mapping, date: Number(e.target.value) })}
        >
          {csv.headers.map((h, i) => (
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
          onChange={(e) => onChange({ ...mapping, description: e.target.value === '' ? null : Number(e.target.value) })}
        >
          <option value="">ללא</option>
          {csv.headers.map((h, i) => (
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
          onClick={() => onChange({ ...mapping, amountMode: 'single' })}
        >
          עמודת סכום אחת
        </button>
        <button
          type="button"
          className={mapping.amountMode === 'debitCredit' ? 'active' : ''}
          onClick={() => onChange({ ...mapping, amountMode: 'debitCredit' })}
        >
          חובה / זכות נפרדות
        </button>
      </div>

      {mapping.amountMode === 'single' ? (
        <label className="settings-label">
          עמודת סכום (שלילי = הוצאה)
          <select
            className="note-input"
            value={mapping.amount ?? ''}
            onChange={(e) => onChange({ ...mapping, amount: e.target.value === '' ? null : Number(e.target.value) })}
          >
            <option value="">בחרי עמודה</option>
            {csv.headers.map((h, i) => (
              <option key={i} value={i}>
                {h || `עמודה ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="recurring-form-row">
          <label className="settings-label">
            עמודת חובה (הוצאה)
            <select
              className="note-input"
              value={mapping.debit ?? ''}
              onChange={(e) => onChange({ ...mapping, debit: e.target.value === '' ? null : Number(e.target.value) })}
            >
              <option value="">בחרי עמודה</option>
              {csv.headers.map((h, i) => (
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
              onChange={(e) => onChange({ ...mapping, credit: e.target.value === '' ? null : Number(e.target.value) })}
            >
              <option value="">בחרי עמודה</option>
              {csv.headers.map((h, i) => (
                <option key={i} value={i}>
                  {h || `עמודה ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {preview.length > 0 && (
        <div className="import-preview">
          {preview.map((row, i) => (
            <p key={i} className="import-preview-row">
              {row[mapping.date] ?? ''} · {mapping.amountMode === 'single'
                ? row[mapping.amount ?? -1] ?? ''
                : `${row[mapping.debit ?? -1] ?? '-'} / ${row[mapping.credit ?? -1] ?? '-'}`}{' '}
              · {mapping.description !== null ? row[mapping.description] ?? '' : ''}
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
