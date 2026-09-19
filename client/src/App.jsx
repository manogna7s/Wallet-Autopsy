import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { OverviewPage } from './pages/Overview'
import { InvestigatePage } from './pages/Investigate'
import { InvestigationPage } from './pages/Investigation'
import { HistoryPage } from './pages/History'
import { WatchlistPage } from './pages/Watchlist'
import { NotFoundPage } from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/investigate" element={<InvestigatePage />} />
        <Route path="/investigate/:address" element={<InvestigationPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<InvestigationPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
