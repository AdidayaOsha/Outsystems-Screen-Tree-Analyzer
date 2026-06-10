/**
 * OS Screen Explorer — local OML conversion server
 *
 * Bridges the browser and oml-utilities so dropping a .oap in the browser
 * triggers full automatic conversion without any manual PowerShell steps.
 *
 * Usage:
 *   node scripts/server.mjs --oml "C:\path\to\oml.dll"
 *   node scripts/server.mjs --oml "C:\path\to\OmlUtilities.exe"
 *   node scripts/server.mjs   # tries "oml" or "OmlUtilities" on PATH
 *
 * Build oml-utilities from source if not installed:
 *   git clone https://github.com/silviogarbes/oml-utilities.git
 *   cd oml-utilities
 *   dotnet build OmlUtilities.sln -c Release
 *   node scripts/server.mjs --oml "oml-utilities\OmlUtilities\bin\Release\net8.0\oml.dll"
 */

import { createServer } from 'http'
import { writeFile, readFile, unlink } from 'fs/promises'
import { spawn, execFileSync } from 'child_process'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

const PORT = 7891

// ── Resolve oml-utilities command ─────────────────────────────────────────────

function arg(flag) {
  const i = process.argv.indexOf(flag)
  return i !== -1 ? process.argv[i + 1] : null
}

function onPath(cmd) {
  try { execFileSync(cmd, ['--version'], { stdio: 'pipe' }); return true } catch { return false }
}

let OML_EXE = arg('--oml') || arg('-oml') || null
if (!OML_EXE) {
  if (onPath('OmlUtilities')) OML_EXE = 'OmlUtilities'
  else if (onPath('oml')) OML_EXE = 'oml'
}

if (!OML_EXE) {
  console.error('\nERROR: oml-utilities not found.')
  console.error('Build it from source, then pass the path:')
  console.error('  node scripts/server.mjs --oml "path\\to\\oml.dll"\n')
  console.error('To build:')
  console.error('  git clone https://github.com/silviogarbes/oml-utilities.git')
  console.error('  cd oml-utilities')
  console.error('  dotnet build OmlUtilities.sln -c Release')
  console.error('  node scripts/server.mjs --oml "oml-utilities\\OmlUtilities\\bin\\Release\\net8.0\\oml.dll"\n')
  process.exit(1)
}

// ── Spawn helper ───────────────────────────────────────────────────────────────

function runOml(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const isDll = OML_EXE.toLowerCase().endsWith('.dll')
    const cmd = isDll ? 'dotnet' : OML_EXE
    const args = isDll
      ? [OML_EXE, 'manipulate', inputPath, outputPath]
      : ['manipulate', inputPath, outputPath]

    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', d => { stderr += d.toString() })
    proc.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim() || `oml-utilities exited with code ${code}`))
    })
    proc.on('error', err => reject(new Error(`Failed to launch oml-utilities: ${err.message}`)))
  })
}

// ── HTTP server ────────────────────────────────────────────────────────────────

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Module-Name')
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

createServer(async (req, res) => {
  cors(res)
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  // GET /health — browser polls this to detect the server
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, oml: OML_EXE }))
    return
  }

  // POST /convert?name=ModuleName — body: raw OML bytes, returns XML text
  if (req.method === 'POST' && req.url.startsWith('/convert')) {
    const moduleName = new URL(req.url, 'http://localhost').searchParams.get('name') || 'module'
    const id = randomBytes(8).toString('hex')
    const tmpIn = join(tmpdir(), `oml_${id}.oml`)
    const tmpOut = join(tmpdir(), `oml_${id}.xml`)

    try {
      const body = await readBody(req)
      if (body.length === 0) throw new Error('Empty request body')

      await writeFile(tmpIn, body)
      await runOml(tmpIn, tmpOut)

      const xml = await readFile(tmpOut, 'utf8')
      res.writeHead(200, {
        'Content-Type': 'application/xml; charset=utf-8',
        'X-Module-Name': encodeURIComponent(moduleName),
      })
      res.end(xml)
    } catch (err) {
      console.error(`  ✗ ${moduleName}: ${err.message}`)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err.message, module: moduleName }))
    } finally {
      await unlink(tmpIn).catch(() => {})
      await unlink(tmpOut).catch(() => {})
    }
    return
  }

  res.writeHead(404)
  res.end()

}).listen(PORT, '127.0.0.1', () => {
  console.log(`\nOS Screen Explorer — conversion server ready`)
  console.log(`  http://localhost:${PORT}`)
  console.log(`  oml-utilities: ${OML_EXE}`)
  console.log(`\nOpen the browser tool and drop your .oap files — conversion is now automatic.\n`)
})
