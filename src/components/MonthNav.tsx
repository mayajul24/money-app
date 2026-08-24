import { formatMonthLabel, shiftMonthKey } from '../lib/month'

export function MonthNav({
  monthKey,
  onChange,
}: {
  monthKey: string
  onChange: (next: string) => void
}) {
  return (
    <div className="month-nav">
      <button onClick={() => onChange(shiftMonthKey(monthKey, -1))} aria-label="חודש קודם">
        ‹
      </button>
      <span className="month-label">{formatMonthLabel(monthKey)}</span>
      <button onClick={() => onChange(shiftMonthKey(monthKey, 1))} aria-label="חודש הבא">
        ›
      </button>
    </div>
  )
}
