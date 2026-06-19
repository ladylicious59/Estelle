import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DollProvider } from './contexts/DollContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DollProvider>
      <App />
    </DollProvider>
  </StrictMode>,
)
