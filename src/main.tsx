import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CheckInPage } from './pages/CheckInPage.tsx'

const isCheckIn = window.location.pathname === '/checkin';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isCheckIn ? <CheckInPage /> : <App />}
  </StrictMode>,
)
