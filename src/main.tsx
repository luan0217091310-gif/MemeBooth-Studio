import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/be-vietnam-pro/latin-400.css'
import '@fontsource/be-vietnam-pro/vietnamese-400.css'
import '@fontsource/be-vietnam-pro/latin-700.css'
import '@fontsource/be-vietnam-pro/vietnamese-700.css'
import '@fontsource/be-vietnam-pro/latin-900.css'
import '@fontsource/be-vietnam-pro/vietnamese-900.css'
import './app/theme.css'
import { App } from './app/App'
import { Recovery } from './components/common/Recovery'
import { prepareOffline } from './app/offline'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Recovery>
      <App />
    </Recovery>
  </StrictMode>,
)
void prepareOffline()
