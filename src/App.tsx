import { useEffect, useState } from 'react'
import './App.css'
import { DashboardView } from './components/DashboardView'
import { TransactionsView } from './components/TransactionsView'
import { CategoriesView } from './components/CategoriesView'
import { HistoryView } from './components/HistoryView'
import { SettingsView } from './components/SettingsView'
import { ensureSeedData } from './lib/mockData'

type Tab = 'dashboard' | 'transactions' | 'categories' | 'history'

function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [showSettings, setShowSettings] = useState(false)
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    ensureSeedData().then(() => setSeeded(true))
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>הכסף שלי</h1>
        <button className="settings-btn" aria-label="הגדרות" onClick={() => setShowSettings(true)}>
          ⚙️
        </button>
      </header>

      <main className="app-content">
        {!seeded ? (
          <p className="empty-state">טוען...</p>
        ) : (
          <>
            {tab === 'dashboard' && <DashboardView />}
            {tab === 'transactions' && <TransactionsView />}
            {tab === 'categories' && <CategoriesView />}
            {tab === 'history' && <HistoryView />}
          </>
        )}
      </main>

      <nav className="bottom-nav">
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>
          <span>בית</span>
        </button>
        <button className={tab === 'transactions' ? 'active' : ''} onClick={() => setTab('transactions')}>
          <span>תנועות</span>
        </button>
        <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>
          <span>קטגוריות</span>
        </button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
          <span>היסטוריה</span>
        </button>
      </nav>

      {showSettings && <SettingsView onClose={() => setShowSettings(false)} />}
    </div>
  )
}

export default App
