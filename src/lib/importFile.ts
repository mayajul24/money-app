import Papa from 'papaparse'
import { readSheet } from 'read-excel-file/browser'
import type { CategoryId } from './categories'

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

export async function parseCsvRows(file: File): Promise<string[][]> {
  const text = await readFileText(file)
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true })
  return result.data
}

function cellToString(cell: string | number | boolean | Date | null): string {
  if (cell === null) return ''
  if (cell instanceof Date) return cell.toISOString().slice(0, 10)
  return String(cell)
}

export async function parseXlsxRows(file: File): Promise<string[][]> {
  const sheet = await readSheet(file)
  return (sheet as (string | number | boolean | Date | null)[][]).map((row) => row.map(cellToString))
}

export function parseSpreadsheetRows(file: File): Promise<string[][]> {
  return /\.(xlsx|xls)$/i.test(file.name) ? parseXlsxRows(file) : parseCsvRows(file)
}

export type SingleColumnMode = 'signed' | 'allExpense' | 'allIncome'

export interface ColumnMapping {
  date: number
  description: number | null
  category: number | null
  amountMode: 'single' | 'debitCredit'
  amount: number | null
  singleColumnMode: SingleColumnMode
  debit: number | null
  credit: number | null
}

const DATE_KEYWORDS = ['תאריך', 'date']
const AMOUNT_KEYWORDS = ['סכום', 'amount', 'total']
const DEBIT_KEYWORDS = ['חובה', 'חיוב', 'debit']
const CREDIT_KEYWORDS = ['זכות', 'זיכוי', 'credit']
const DESCRIPTION_KEYWORDS = ['תיאור', 'פירוט', 'עסק', 'description', 'details', 'memo']
const CATEGORY_KEYWORDS = ['קטגוריה', 'category']
const ALL_KEYWORDS = [
  ...DATE_KEYWORDS,
  ...AMOUNT_KEYWORDS,
  ...DEBIT_KEYWORDS,
  ...CREDIT_KEYWORDS,
  ...DESCRIPTION_KEYWORDS,
  ...CATEGORY_KEYWORDS,
]

/**
 * Real exports often have a title/metadata row or two above the actual
 * table (account name, statement period, etc.), so the first row isn't
 * reliably the header row. Score the first few rows by how many cells
 * look like column headers we recognize, and pick the best one.
 */
export function guessHeaderRowIndex(allRows: string[][]): number {
  const searchLimit = Math.min(allRows.length, 15)
  let bestIndex = 0
  let bestScore = 0

  for (let i = 0; i < searchLimit; i++) {
    const row = allRows[i].map((cell) => cell.trim().toLowerCase())
    const score = row.filter((cell) => cell !== '' && ALL_KEYWORDS.some((k) => cell.includes(k.toLowerCase()))).length
    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  }

  return bestIndex
}

function findColumn(headers: string[], keywords: string[], exclude: Set<number>): number | null {
  const lower = headers.map((h) => h.trim().toLowerCase())
  for (const keyword of keywords) {
    const idx = lower.findIndex((h, i) => !exclude.has(i) && h.includes(keyword.toLowerCase()))
    if (idx !== -1) return idx
  }
  return null
}

/**
 * Assigns columns in order and excludes whatever's already claimed, so a
 * short keyword like "עסק" (business) can't steal a column that's really
 * the date ("תאריך עסקה" — transaction date — contains "עסק" as a substring).
 *
 * Amount is checked before debit/credit: a column literally named "סכום"
 * (amount) is a strong, specific signal for a single-column format, and
 * needs priority over the debit keyword "חיוב", which — confusingly —
 * also appears inside the extremely common credit-card header "סכום חיוב"
 * (amount charged). Without this order, that single amount column gets
 * misread as a "debit" column in a two-column debit/credit layout.
 */
export function guessColumnMapping(headers: string[], dataRows: string[][] = []): ColumnMapping {
  const used = new Set<number>()

  const date = findColumn(headers, DATE_KEYWORDS, used) ?? 0
  used.add(date)

  const singleAmount = findColumn(headers, AMOUNT_KEYWORDS, used)

  let debit: number | null = null
  let credit: number | null = null
  if (singleAmount === null) {
    debit = findColumn(headers, DEBIT_KEYWORDS, used)
    if (debit !== null) used.add(debit)
    credit = findColumn(headers, CREDIT_KEYWORDS, used)
    if (credit !== null) used.add(credit)
  }
  const hasDebitCredit = debit !== null && credit !== null

  const amount = hasDebitCredit ? null : singleAmount
  if (amount !== null) used.add(amount)

  const description = findColumn(headers, DESCRIPTION_KEYWORDS, used)
  if (description !== null) used.add(description)
  const category = findColumn(headers, CATEGORY_KEYWORDS, used)

  return {
    date,
    description,
    category,
    amountMode: hasDebitCredit ? 'debitCredit' : 'single',
    amount,
    singleColumnMode: amount !== null ? guessSingleColumnMode(dataRows, amount) : 'signed',
    debit,
    credit,
  }
}

/**
 * Credit-card statements list every charge as a plain positive number —
 * there's no sign to read "expense" from, unlike a bank account's signed
 * running balance. But an occasional refund or cancelled transaction can
 * still show up as negative on an otherwise all-positive statement, so a
 * single stray negative value shouldn't flip the whole file over to
 * "signed" (which would then misread every real charge as income). Only
 * treat it as a genuinely signed ledger when negatives are a substantial
 * share of the values, not just a rare exception.
 */
function guessSingleColumnMode(dataRows: string[][], amountColumnIndex: number): SingleColumnMode {
  const sample = dataRows.slice(0, 50)
  const values = sample
    .map((row) => parseAmountFlexible(row[amountColumnIndex] ?? ''))
    .filter((v): v is number => v !== null && v !== 0)
  if (values.length === 0) return 'allExpense'

  const negativeRatio = values.filter((v) => v < 0).length / values.length
  return negativeRatio >= 0.25 ? 'signed' : 'allExpense'
}

const HEBREW_MONTH_NAMES: Record<string, number> = {
  'ינו': 1, 'ינואר': 1,
  'פבר': 2, 'פברואר': 2,
  'מרץ': 3,
  'אפר': 4, 'אפריל': 4,
  'מאי': 5,
  'יונ': 6, 'יוני': 6,
  'יול': 7, 'יולי': 7,
  'אוג': 8, 'אוגוסט': 8,
  'ספט': 9, 'ספטמבר': 9,
  'אוק': 10, 'אוקטובר': 10,
  'נוב': 11, 'נובמבר': 11,
  'דצמ': 12, 'דצמבר': 12,
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

  // "01 באוג 2026" / "1 אוגוסט 26" style Hebrew month names.
  const hebrewMonth = trimmed.match(/^(\d{1,2})\s+(?:ב)?([א-ת]+)['\s]+(\d{2,4})$/)
  if (hebrewMonth) {
    const [, d, monthName, yRaw] = hebrewMonth
    const month = HEBREW_MONTH_NAMES[monthName]
    if (!month) return null
    const year = yRaw.length === 2 ? `20${yRaw}` : yRaw
    return `${year}-${String(month).padStart(2, '0')}-${String(Number(d)).padStart(2, '0')}`
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

const CATEGORY_LABEL_MAP: { category: CategoryId; keywords: string[] }[] = [
  { category: 'food', keywords: ['מסעדות', 'קפה', 'מזון', 'צריכה', 'סופר', 'food', 'restaurant', 'grocery'] },
  { category: 'transport', keywords: ['תחבורה', 'רכב', 'דלק', 'חניה', 'transport', 'fuel', 'parking'] },
  { category: 'housing', keywords: ['דיור', 'שכירות', 'housing', 'rent'] },
  { category: 'fun', keywords: ['פנאי', 'בידור', 'ספורט', 'טיסות', 'תיירות', 'fun', 'entertainment', 'travel'] },
  { category: 'health', keywords: ['רפואה', 'מרקחת', 'בריאות', 'health', 'pharmacy', 'medical'] },
  { category: 'shopping', keywords: ['אופנה', 'ספרים', 'קניות', 'shopping', 'fashion', 'books'] },
  { category: 'bills', keywords: ['חשבונות', 'ביטוח', 'סלולר', 'אינטרנט', 'bills', 'insurance', 'utilities'] },
]

export function mapCategoryLabel(raw: string): CategoryId {
  const lower = raw.trim().toLowerCase()
  if (lower === '') return 'other'
  const match = CATEGORY_LABEL_MAP.find(({ keywords }) => keywords.some((k) => lower.includes(k.toLowerCase())))
  return match?.category ?? 'other'
}

export interface ImportedRow {
  date: string
  amount: number
  type: 'income' | 'expense'
  category: CategoryId
  note: string
}

export interface ImportResult {
  imported: ImportedRow[]
  invalidDateCount: number
  invalidAmountCount: number
}

export function extractRows(rows: string[][], mapping: ColumnMapping): ImportResult {
  const imported: ImportedRow[] = []
  let invalidDateCount = 0
  let invalidAmountCount = 0

  for (const row of rows) {
    const date = parseDateFlexible(row[mapping.date] ?? '')
    const note = mapping.description !== null ? (row[mapping.description] ?? '').trim() : ''

    let amount: number | null = null
    let type: 'income' | 'expense' = 'expense'

    if (mapping.amountMode === 'single') {
      const value = mapping.amount !== null ? parseAmountFlexible(row[mapping.amount] ?? '') : null
      if (value !== null && value !== 0) {
        amount = Math.abs(value)
        if (mapping.singleColumnMode === 'allExpense') type = 'expense'
        else if (mapping.singleColumnMode === 'allIncome') type = 'income'
        else type = value < 0 ? 'expense' : 'income'
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

    if (!date) {
      invalidDateCount++
      continue
    }
    if (amount === null) {
      invalidAmountCount++
      continue
    }

    const category: CategoryId =
      type === 'income' ? 'income' : mapping.category !== null ? mapCategoryLabel(row[mapping.category] ?? '') : 'other'

    imported.push({ date, amount, type, category, note })
  }

  return { imported, invalidDateCount, invalidAmountCount }
}
