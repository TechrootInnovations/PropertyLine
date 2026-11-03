import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './site-v3.css'
import './site-dark.css'
import './polish.css'
import App from './App.jsx'

// Always open pages at the top (stop the browser restoring an old scroll position on reload).
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
if (!window.location.hash) {
  window.scrollTo(0, 0)
  window.addEventListener('load', () => window.scrollTo(0, 0), { once: true })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
