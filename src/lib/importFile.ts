import Papa from 'papaparse'
import { readSheet } from 'read-excel-file/browser'

export interface ParsedCsv {
  headers: string[]
  rows: string[][]
}

/**
 * Israeli bank/credit-card CSV exports are frequently Windows-1255
 * (Hebrew) rather than UTF-8. Real UTF-8 Hebrew text is virtually never
 * valid when misread as Windows-1255's neighbor and vice versa, so a
 * strict UTF-8 decode failing is a reliable signal to fall back.
 */
async function readFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('windows-1255').decode(buffer)
  }
}

export async function parseCsvFile(file: File): Promise<ParsedCsv> {
  const text = await readFileText(file)
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true })
  const [headerRow, ...rows] = result.data
  return { headers: headerRow ?? [], rows }
}

function cellToString(cell: string | number | boolean | Date | null): string {
  if (cell === null) return ''
  if (cell instanceof Date) return cell.toISOString().slice(0, 10)
  return String(cell)
}

export async function parseXlsxFile(file: File): Promise<ParsedCsv> {
  const sheet = await readSheet(file)
  const [headerRow, ...rows] = sheet as (string | number | boolean | Date | null)[][]
  return {
    headers: (headerRow ?? []).map(cellToString),
    rows: rows.map((row) => row.map(cellToString)),
  }
}

export function parseSpreadsheetFile(file: File): Promise<ParsedCsv> {
  return /\.(xlsx|xls)$/i.test(file.name) ? parseXlsxFile(file) : parseCsvFile(file)
}

export interface ColumnMapping {
  date: number
  description: number | null
  amountMode: 'single' | 'debitCredit'
  amount: number | null
  debit: number | null
  credit: number | null
}

const DATE_KEYWORDS = ['תאריך', 'date']
const AMOUNT_KEYWORDS = ['סכום', 'amount', 'total']
const DEBIT_KEYWORDS = ['חובה', 'חיוב', 'debit']
const CREDIT_KEYWORDS = ['זכות', 'זיכוי', 'credit']
const DESCRIPTION_KEYWORDS = ['תיאור', 'פירוט', 'עסק', 'description', 'details', 'memo']

function findColumn(headers: string[], keywords: string[]): number | null {
  const lower = headers.map((h) => h.trim().toLowerCase())
  for (const keyword of keywords) {
    const idx = lower.findIndex((h) => h.includes(keyword.toLowerCase()))
    if (idx !== -1) return idx
  }
  return null
}

export function guessColumnMapping(headers: string[]): ColumnMapping {
  const debit = findColumn(headers, DEBIT_KEYWORDS)
  const credit = findColumn(headers, CREDIT_KEYWORDS)
  const hasDebitCredit = debit !== null && credit !== null

  return {
    date: findColumn(headers, DATE_KEYWORDS) ?? 0,
    description: findColumn(headers, DESCRIPTION_KEYWORDS),
    amountMode: hasDebitCredit ? 'debitCredit' : 'single',
    amount: hasDebitCredit ? null : findColumn(headers, AMOUNT_KEYWORDS),
    debit,
    credit,
  }
}

export function parseDateFlexible(raw: string): string | null {
  const trimmed = raw.trim()

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) {
    const [, y, m, d] = iso
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // Israeli convention: day/month/year, with '/', '.', or '-' separators.
  const dmy = trimmed.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/)
  if (dmy) {
    const [, d, m, yRaw] = dmy
    const year = yRaw.length === 2 ? `20${yRaw}` : yRaw
    const day = Number(d)
    const month = Number(m)
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return null
}

export function parseAmountFlexible(raw: string): number | null {
  let cleaned = raw.trim().replace(/[₪$,\s]/g, '')
  if (cleaned === '') return null

  let negative = false
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    negative = true
    cleaned = cleaned.slice(1, -1)
  }
  if (cleaned.startsWith('-')) {
    negative = true
    cleaned = cleaned.slice(1)
  }

  const value = Number(cleaned)
  if (Number.isNaN(value)) return null
  return negative ? -value : value
}

export interface ImportedRow {
  date: string
  amount: number
  type: 'income' | 'expense'
  note: string
}

export interface ImportResult {
  imported: ImportedRow[]
  invalidCount: number
}

export function extractRows(rows: string[][], mapping: ColumnMapping): ImportResult {
  const imported: ImportedRow[] = []
  let invalidCount = 0

  for (const row of rows) {
    const date = parseDateFlexible(row[mapping.date] ?? '')
    const note = mapping.description !== null ? (row[mapping.description] ?? '').trim() : ''

    let amount: number | null = null
    let type: 'income' | 'expense' = 'expense'

    if (mapping.amountMode === 'single') {
      const value = mapping.amount !== null ? parseAmountFlexible(row[mapping.amount] ?? '') : null
      if (value !== null && value !== 0) {
        amount = Math.abs(value)
        type = value < 0 ? 'expense' : 'income'
      }
    } else {
      const debitValue = mapping.debit !== null ? parseAmountFlexible(row[mapping.debit] ?? '') : null
      const creditValue = mapping.credit !== null ? parseAmountFlexible(row[mapping.credit] ?? '') : null
      if (debitValue) {
        amount = Math.abs(debitValue)
        type = 'expense'
      } else if (creditValue) {
        amount = Math.abs(creditValue)
        type = 'income'
      }
    }

    if (!date || amount === null) {
      invalidCount++
      continue
    }

    imported.push({ date, amount, type, note })
  }

  return { imported, invalidCount }
}
