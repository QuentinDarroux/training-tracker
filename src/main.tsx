import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'

// registerType: 'autoUpdate' in vite.config.ts only takes effect if we
// actually call registerSW() — otherwise vite-plugin-pwa falls back to a
// bare `navigator.serviceWorker.register()` with no update checking at
// all, so returning visitors keep running whatever JS bundle was cached
// on their first visit, forever. `immediate: true` activates a new
// service worker (and reloads) as soon as one is found, instead of
// leaving it stuck in the "waiting" state until every tab is closed.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
