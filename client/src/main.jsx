import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NetworkProvider } from './context/NetworkContext'
import { WatchlistProvider } from './context/WatchlistContext'
import { HistoryProvider } from './context/HistoryContext'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <NetworkProvider>
        <WatchlistProvider>
          <HistoryProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </HistoryProvider>
        </WatchlistProvider>
      </NetworkProvider>
    </ErrorBoundary>
  </StrictMode>,
)
