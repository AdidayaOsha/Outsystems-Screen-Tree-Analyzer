import { chromium } from 'playwright'
import { spawn } from 'child_process'

const root = process.cwd()
const OML_EXE = 'C:\\Projects\\oml-utilities\\OmlUtilities\\bin\\Release\\net8.0\\oml.dll'
const OAP_PATH = 'C:\\Users\\USER\\Downloads\\Sparkle Care.oap'
const VITE_PORT = 5230

const srv = spawn('node', ['scripts/server.mjs', '--oml', OML_EXE], { cwd: root, stdio: 'pipe' })
const vite = spawn('node', ['node_modules/vite/bin/vite.js', '--port', String(VITE_PORT)], { cwd: root, stdio: 'pipe' })
await new Promise(r => setTimeout(r, 4000))

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

try {
  await page.goto(`http://localhost:${VITE_PORT}`, { waitUntil: 'networkidle' })

  // Load OAP
  await page.locator('input[type="file"]').first().setInputFiles(OAP_PATH)
  await page.waitForSelector('text=SparkleCare_Admin', { timeout: 120000 })
  console.log('modules loaded')

  // Switch to graph view
  await page.locator('button', { hasText: '◎ graph' }).click()
  await new Promise(r => setTimeout(r, 1500)) // let React Flow settle + animate

  await page.screenshot({ path: 'scripts/screenshots/graph-01-overview.png' })
  console.log('screenshot → graph-01-overview.png')

  // Toggle off external modules
  await page.locator('button', { hasText: 'external modules' }).click()
  await new Promise(r => setTimeout(r, 800))
  await page.screenshot({ path: 'scripts/screenshots/graph-02-loaded-only.png' })
  console.log('screenshot → graph-02-loaded-only.png')

  // Toggle back on, then click a node
  await page.locator('button', { hasText: 'external modules' }).click()
  await new Promise(r => setTimeout(r, 600))

  // Click the SparkleCare_Admin graph node (not the module tab at the top)
  await page.locator('.react-flow__node').filter({ hasText: 'SparkleCare_Admin' }).first().click()
  await new Promise(r => setTimeout(r, 600))
  await page.screenshot({ path: 'scripts/screenshots/graph-03-node-selected.png' })
  console.log('screenshot → graph-03-node-selected.png')

} finally {
  await browser.close()
  srv.kill()
  vite.kill()
}
