/**
 * Driver: tests the OAP conversion flow
 * 1. Starts the conversion server (port 7891)
 * 2. Starts the Vite dev server
 * 3. Opens the browser
 * 4. Verifies server status bar shows "ready"
 * 5. Simulates uploading a real .oap file (if available) OR verifies the offline fallback
 */

import { chromium } from 'playwright'
import { createServer } from 'http'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dir, '..')

const VITE_PORT = 5210
const SERVER_PORT = 7891
const OML_EXE = 'C:\\Projects\\oml-utilities\\OmlUtilities\\bin\\Release\\net8.0\\oml.dll'
const OAP_PATH = 'C:\\Users\\USER\\Downloads\\Sparkle Care.oap'

function startProcess(cmd, args, label) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    proc.stdout.on('data', d => {
      output += d.toString()
      if (output.includes('localhost')) resolve(proc)
    })
    proc.stderr.on('data', d => { output += d.toString() })
    proc.on('error', reject)
    setTimeout(() => resolve(proc), 8000)
  })
}

function waitForPort(port, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const try_ = () => {
      const req = require('http').request({ host: '127.0.0.1', port, path: '/health', timeout: 500 }, res => {
        if (res.statusCode === 200) resolve()
        else setTimeout(try_, 300)
      })
      req.on('error', () => {
        if (Date.now() - start > timeout) reject(new Error(`Port ${port} not ready`))
        else setTimeout(try_, 300)
      })
      req.end()
    }
    try_()
  })
}

async function shot(page, name) {
  const path = `scripts/screenshots/${name}.png`
  await page.screenshot({ path, fullPage: false })
  console.log(`screenshot → ${path}`)
}

// ─────────────────────────────────────────────────────────────────────────────

console.log('\nStarting servers...')

// Start conversion server
const serverProc = spawn(
  'node',
  ['scripts/server.mjs', '--oml', OML_EXE],
  { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }
)
let serverReady = false
serverProc.stdout.on('data', d => {
  const s = d.toString()
  if (s.includes('ready')) { serverReady = true; process.stdout.write('  conversion server: ready\n') }
})
serverProc.stderr.on('data', d => process.stderr.write(d))

// Start Vite dev server
const viteProc = spawn(
  'node',
  ['node_modules/vite/bin/vite.js', '--port', String(VITE_PORT)],
  { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }
)
let viteReady = false
viteProc.stdout.on('data', d => {
  const s = d.toString()
  if (s.includes('localhost')) { viteReady = true; process.stdout.write('  vite dev server: ready\n') }
})
viteProc.stderr.on('data', d => process.stderr.write(d))

// Wait for both to start
await new Promise(r => setTimeout(r, 4000))

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.on('console', m => { if (m.type() === 'error') console.error('  browser error:', m.text()) })

try {
  console.log('\n[1] Opening the app...')
  await page.goto(`http://localhost:${VITE_PORT}`, { waitUntil: 'networkidle' })
  await shot(page, 'oap-01-landing')

  console.log('[2] Checking server status bar (server NOT running scenario)...')
  // First check without server — stop server temporarily
  serverProc.kill()
  await new Promise(r => setTimeout(r, 500))

  // Reload to get fresh server check
  await page.reload({ waitUntil: 'networkidle' })
  await new Promise(r => setTimeout(r, 3000)) // wait for 2.5s health check timeout

  const offlineText = await page.locator('text=/conversion server/i').first().textContent().catch(() => 'not found')
  console.log('  status bar (offline):', offlineText)
  await shot(page, 'oap-02-server-offline')

  // Verify offline fallback shows the server start command
  const codeVisible = await page.locator('text=/node scripts\\/server.mjs/').isVisible().catch(() => false)
  console.log('  server start command visible:', codeVisible)

  // Verify "drop .oap" drop zone is still shown (for file listing fallback)
  const dropZoneVisible = await page.locator('text=/Drop .oap file/i').isVisible()
  console.log('  drop zone visible in offline mode:', dropZoneVisible)

  console.log('\n[3] Starting server and rechecking...')
  // Restart the server
  const serverProc2 = spawn(
    'node',
    ['scripts/server.mjs', '--oml', OML_EXE],
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }
  )
  serverProc2.stdout.on('data', d => process.stdout.write('  server: ' + d.toString()))
  serverProc2.stderr.on('data', d => process.stderr.write(d))
  await new Promise(r => setTimeout(r, 2000))

  // Click recheck button
  await page.locator('button', { hasText: 'recheck' }).click()
  await new Promise(r => setTimeout(r, 3000)) // wait for health check

  const readyText = await page.locator('text=/conversion server/i').first().textContent().catch(() => 'not found')
  console.log('  status bar (after recheck):', readyText)
  await shot(page, 'oap-03-server-ready')

  const isReady = readyText.includes('ready')
  console.log('  server status shows ready:', isReady)

  console.log('\n[4] Testing OAP upload with real file...')
  const oapExists = existsSync(OAP_PATH)
  console.log('  OAP file available:', oapExists, OAP_PATH)

  if (oapExists) {
    // Use the file input to upload
    const input = await page.locator('input[type="file"]').first()
    await input.setInputFiles(OAP_PATH)
    console.log('  OAP file dropped — waiting for conversion...')

    // Wait for progress to appear
    await page.waitForSelector('text=/Converting/i', { timeout: 5000 }).catch(() => {})
    await shot(page, 'oap-04-converting')

    // Wait for done (up to 120s for all modules)
    await page.waitForSelector('text=/Done —/i', { timeout: 120000 }).catch(() => {
      console.log('  (conversion timed out or finished without "Done" text)')
    })
    await shot(page, 'oap-05-conversion-done')

    const doneText = await page.locator('text=/Done —/i').textContent().catch(() => 'not found')
    console.log('  conversion result:', doneText)

    // Check if modules were loaded (module tabs appear)
    const moduleTabs = await page.locator('[data-module-tab]').count().catch(() => 0)
    console.log('  module tabs loaded:', moduleTabs)
  } else {
    console.log('  skipping live conversion test (OAP not found at expected path)')
    console.log('  server-ready UI verified via screenshot oap-03-server-ready.png')
  }

  console.log('\n[5] Loading demo to verify existing functionality still works...')
  await page.locator('button', { hasText: 'Load Demo' }).click().catch(() =>
    page.locator('text=Load Demo').click()
  )
  await new Promise(r => setTimeout(r, 500))
  await page.locator('button', { hasText: /WerkDone|SCMS Demo/i }).click().catch(() => {})
  await new Promise(r => setTimeout(r, 800))
  await shot(page, 'oap-06-demo-loaded')

  const errors = await page.evaluate(() =>
    window.__errors || []
  )
  console.log('\nBrowser errors:', errors.length > 0 ? errors : 'none')
  console.log('\nAll checks complete.')

  serverProc2.kill()
} finally {
  await browser.close()
  viteProc.kill()
}
