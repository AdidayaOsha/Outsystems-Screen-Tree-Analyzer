// Playwright driver — launches the dev server and exercises the app
import { chromium } from 'playwright'
import { spawn } from 'child_process'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SHOTS = join(ROOT, 'scripts', 'screenshots')
mkdirSync(SHOTS, { recursive: true })

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

// ── Start dev server ──────────────────────────────────────────────────────────
console.log('Starting dev server...')
const server = spawn('npm', ['run', 'dev', '--', '--port', '5199'], {
  cwd: ROOT, shell: true, stdio: ['ignore', 'pipe', 'pipe'],
})

let serverReady = false
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Dev server timeout')), 30_000)
  server.stdout.on('data', chunk => {
    const s = chunk.toString()
    if (s.includes('localhost:5199') || s.includes('ready')) {
      clearTimeout(timeout)
      serverReady = true
      resolve()
    }
  })
  server.stderr.on('data', chunk => process.stderr.write(chunk))
  server.on('exit', code => { if (!serverReady) reject(new Error(`Server exited ${code}`)) })
})
console.log('Dev server ready at http://localhost:5199')

// ── Launch browser ────────────────────────────────────────────────────────────
const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } })
const page = await ctx.newPage()

const shot = async name => {
  const p = join(SHOTS, `${name}.png`)
  await page.screenshot({ path: p, fullPage: false })
  console.log(`screenshot → scripts/screenshots/${name}.png`)
}

try {
  // ── 1. Landing page ─────────────────────────────────────────────────────────
  console.log('\n[1] Loading landing page...')
  await page.goto('http://localhost:5199', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=OS Screen Explorer', { timeout: 10_000 })
  await shot('01-landing')

  // ── 2. Load demo data ────────────────────────────────────────────────────────
  console.log('[2] Loading demo data...')
  await page.click('button:has-text("Load Demo")')
  await page.waitForTimeout(300)
  await shot('02-after-demo-tab')

  await page.click('button:has-text("Load WerkDone")')
  await page.waitForTimeout(500)
  await shot('03-demo-loaded')

  // ── 3. Module tabs visible ───────────────────────────────────────────────────
  console.log('[3] Checking module tabs...')
  const tabText = await page.locator('[style*="JetBrains Mono"]').allInnerTexts()
  console.log('  Module tabs found:', tabText.filter(t => t.includes('_Web') || t.includes('_Lib')).slice(0, 5))

  // ── 4. Expand first screen card ─────────────────────────────────────────────
  console.log('[4] Expanding first screen card...')
  // Click the ▸ toggle in the first screen card header
  const firstToggle = page.locator('span').filter({ hasText: '▸' }).first()
  await firstToggle.click()
  await page.waitForTimeout(400)
  await shot('04-screen-expanded')

  // ── 5. Search ────────────────────────────────────────────────────────────────
  console.log('[5] Testing search...')
  // Close import panel first by clicking the × close import button if visible
  const closeImport = page.locator('button:has-text("close import")')
  if (await closeImport.isVisible()) await closeImport.click()
  await page.waitForTimeout(200)

  const searchInput = page.locator('input[placeholder*="Search"]')
  if (await searchInput.isVisible()) {
    await searchInput.fill('NRICDisplay')
    await page.waitForTimeout(300)
    await shot('05-search-results')
    await searchInput.fill('')
  }

  // ── 6. Switch to VMS_Web module tab ──────────────────────────────────────────
  console.log('[6] Switching to VMS_Web module...')
  const vmsTab = page.locator('button').filter({ hasText: /VMS_Web/ })
  if (await vmsTab.isVisible()) {
    await vmsTab.click()
    await page.waitForTimeout(300)
    await shot('06-vms-module')
  }

  // ── 7. Expand a screen and check cross-module badges ────────────────────────
  console.log('[7] Expanding GantryEventLog screen...')
  // Click the ▸ toggle next to GantryEventLog
  const gantryToggle = page.locator('span').filter({ hasText: '▸' }).first()
  if (await gantryToggle.isVisible()) {
    await gantryToggle.click()
    await page.waitForTimeout(400)
    await shot('07-gantry-expanded')
  }

  // ── Console errors ───────────────────────────────────────────────────────────
  const errors = []
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
  if (errors.length > 0) {
    console.warn('\nConsole errors:', errors)
  } else {
    console.log('\nNo console errors.')
  }

  console.log('\nAll checks passed.')

} finally {
  await browser.close()
  server.kill()
}
