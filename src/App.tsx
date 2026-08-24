import { useState } from 'react'
import './App.css'
import { QuickAddForm } from './components/QuickAddForm'
import { SummaryView } from './components/SummaryView'
import { BudgetView } from './components/BudgetView'

type Tab = 'add' | 'summary' | 'budget'

function App() {
  const [tab, setTab] = useState<Tab>('add')

  return (
    <div className="app">
      <header className="app-header">
        <h1>💸 הכסף שלי</h1>
      </header>

      <main className="app-content">
        {tab === 'add' && <QuickAddForm />}
        {tab === 'summary' && <SummaryView />}
        {tab === 'budget' && <BudgetView />}
      </main>

      <nav className="bottom-nav">
        <button className={tab === 'add' ? 'active' : ''} onClick={() => setTab('add')}>
          <span className="nav-icon">➕</span>
          <span>הוספה</span>
        </button>
        <button className={tab === 'summary' ? 'active' : ''} onClick={() => setTab('summary')}>
          <span className="nav-icon">📊</span>
          <span>סיכום</span>
        </button>
        <button className={tab === 'budget' ? 'active' : ''} onClick={() => setTab('budget')}>
          <span className="nav-icon">🎯</span>
          <span>תקציב</span>
        </button>
      </nav>
    </div>
  )
}

export default App
