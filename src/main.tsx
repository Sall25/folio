import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../@/styles/_variables.scss'
import '../@/styles/_keyframe-animations.scss'

// import './styles/main.scss'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
