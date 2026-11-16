import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initData } from './app/store'
import { rebaseInbox } from './mock/inbox-seed'
import type { Dataset } from './domain/types'

// The 2 MB mock dataset is its own chunk: the shell's code loads first, then the data, then the first render.
const seed = (await import('./mock/data/dataset.json')).default as unknown as Dataset
initData(rebaseInbox(seed))
const { App } = await import('./App')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
