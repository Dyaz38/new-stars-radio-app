import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import PrivacyPage from './pages/PrivacyPage.tsx'
import AboutPage from './pages/AboutPage.tsx'
import ListenPage from './pages/ListenPage.tsx'
import FaqPage from './pages/FaqPage.tsx'
import AdvertisePage from './pages/AdvertisePage.tsx'

const pathname = window.location.pathname.replace(/\/$/, '') || '/'

function Root() {
  if (pathname === '/privacy') return <PrivacyPage />
  if (pathname === '/about') return <AboutPage />
  if (pathname === '/listen') return <ListenPage />
  if (pathname === '/faq') return <FaqPage />
  if (pathname === '/advertise') return <AdvertisePage />
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
