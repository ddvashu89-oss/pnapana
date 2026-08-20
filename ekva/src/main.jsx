import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import EkvaApp from './EkvaApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EkvaApp />
  </StrictMode>,
)
