import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import express from 'express'
import { createApi } from './app.mjs'
import { createDeepSeekResponder } from './ai.mjs'
import { loadConfig } from './config.mjs'
import { createStore } from './store.mjs'

const config = loadConfig()
const port = Number(process.env.PORT || 8787)
const dataFile = resolve(process.env.HEARTNEST_DATA_FILE || './data/heartnest.json')
const app = createApi({ store: createStore(dataFile), responder: createDeepSeekResponder() })
const staticRoot = resolve(process.env.HEARTNEST_STATIC_ROOT || './dist/build/h5')

if (existsSync(staticRoot)) {
  app.use(express.static(staticRoot, { index: 'index.html', maxAge: '1h' }))
  app.get('*', (_req, res) => res.sendFile(resolve(staticRoot, 'index.html')))
}

app.listen(port, '0.0.0.0', () => {
  console.log(`HeartNest API listening on http://0.0.0.0:${port} (${config.nodeEnv})`)
})
