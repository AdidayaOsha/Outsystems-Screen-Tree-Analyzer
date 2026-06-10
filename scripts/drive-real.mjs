import { chromium } from 'playwright'
import { spawn } from 'child_process'

const root = process.cwd()
const OML_EXE = 'C:\\Projects\\oml-utilities\\OmlUtilities\\bin\\Release\\net8.0\\oml.dll'
const OAP_PATH = 'C:\\Users\\USER\\Downloads\\Sparkle Care.oap'
const VITE_PORT = 5221

const srv = spawn('node', ['scripts/server.mjs', '--oml', OML_EXE], { cwd: root, stdio: 'pipe' })
const vite = spawn('node', ['node_modules/vite/bin/vite.js', '--port', String(VITE_PORT)], { cwd: root, stdio: 'pipe' })

await new Promise(r => setTimeout(r, 4000))

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.on('console', m => m.type() === 'error' && console.error('browser:', m.text()))

try {
  await page.goto(`http://localhost:${VITE_PORT}`, { waitUntil: 'networkidle' })

  // Drop the OAP
  const input = page.locator('input[type="file"]').first()
  await input.setInputFiles(OAP_PATH)
  console.log('OAP dropped, converting 10 modules...')

  // Wait for module tabs to appear (import panel closes on success)
  await page.waitForSelector('text=SparkleCare_Admin', { timeout: 120000 })
  console.log('modules loaded')
  await page.screenshot({ path: 'scripts/screenshots/real-01-loaded.png' })
  console.log('screenshot → real-01-loaded.png')

  // Expand Screen1_Ops
  await page.locator('text=Screen1_Ops').click()
  await new Promise(r => setTimeout(r, 500))
  await page.screenshot({ path: 'scripts/screenshots/real-02-screen1ops.png' })
  console.log('screenshot → real-02-screen1ops.png')

  // Also expand Screen3_Assesstment
  await page.locator('text=Screen3_Assesstment').click()
  await new Promise(r => setTimeout(r, 500))
  await page.screenshot({ path: 'scripts/screenshots/real-03-screen3.png' })
  console.log('screenshot → real-03-screen3.png')

  // Switch to SparkleCare_Finance (49 screens)
  await page.locator('text=SparkleCare_Finance').first().click()
  await new Promise(r => setTimeout(r, 400))
  await page.screenshot({ path: 'scripts/screenshots/real-04-finance.png' })
  console.log('screenshot → real-04-finance.png')

} finally {
  await browser.close()
  srv.kill()
  vite.kill()
}
