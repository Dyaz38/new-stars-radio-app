import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import PrivacyPage from './pages/PrivacyPage.tsx'
import AboutPage from './pages/AboutPage.tsx'

const pathname = window.location.pathname.replace(/\/$/, '') || '/'

function Root() {
  if (pathname === '/privacy') return <PrivacyPage />
  if (pathname === '/about') return <AboutPage />
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
