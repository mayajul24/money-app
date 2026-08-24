import type { MonthForecast } from '../lib/forecast'

function formatIls(n: number): string {
  return `₪${Math.round(n).toLocaleString()}`
}

export function SaveRecommendation({ forecast }: { forecast: MonthForecast }) {
  const { safe, probable, riskThreshold } = forecast.saveRecommendation

  return (
    <div className="save-card">
      <h2 className="save-title">כמה אפשר לשים בצד</h2>

      <div className="save-row safe">
        <span className="save-dot" />
        <span className="save-label">בטוח לחסוך</span>
        <span className="save-amount">{formatIls(safe)}</span>
      </div>
      <div className="save-row probable">
        <span className="save-dot" />
        <span className="save-label">כנראה אפשר</span>
        <span className="save-amount">{formatIls(probable)}</span>
      </div>
      <div className="save-row risk">
        <span className="save-dot" />
        <span className="save-label">מעל {formatIls(riskThreshold)} יש סיכון להיכנס למינוס</span>
      </div>

      {forecast.confidence === 'low' && (
        <p className="save-confidence-note">
          התחזית עדיין מבוססת על מעט נתונים — היא תשתפר ככל שיצטברו עוד חודשים
        </p>
      )}
    </div>
  )
}
