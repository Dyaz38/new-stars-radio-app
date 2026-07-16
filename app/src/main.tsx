import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import PrivacyPage from './pages/PrivacyPage.tsx'

const pathname = window.location.pathname.replace(/\/$/, '') || '/'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {pathname === '/privacy' ? <PrivacyPage /> : <App />}
  </StrictMode>,
)
