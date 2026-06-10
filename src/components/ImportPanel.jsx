import { useState, useRef } from 'react'
import { parseOapZip } from '../lib/parseOapZip'
import { parseOmlXml } from '../lib/parseOmlXml'
import { demoModules } from '../data/demoModules'

const CONVERT_PS1 = `# convert.ps1 — OS Screen Explorer OAP converter
# Usage: .\\convert.ps1 -OapPath "C:\\exports\\SCMS.oap" -OutDir ".\\xml-output"
#        .\\convert.ps1 -OapDir "C:\\exports" -OutDir ".\\xml-output"
param(
    [string]$OapPath,
    [string]$OapDir,
    [string]$OutDir = ".\\xml-output"
)

# Check oml-utilities is installed
if (-not (Get-Command "oml" -ErrorAction SilentlyContinue)) {
    Write-Host "oml-utilities not found. Installing..." -ForegroundColor Yellow
    dotnet tool install --global OmlUtilities
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install OmlUtilities. Ensure .NET 6+ is installed."
        exit 1
    }
}

New-Item -ItemType Directory -Force $OutDir | Out-Null
$TempDir = Join-Path $env:TEMP ("oap_convert_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $TempDir | Out-Null

$oaps = @()
if ($OapPath) { $oaps = @($OapPath) }
elseif ($OapDir) { $oaps = Get-ChildItem $OapDir -Filter "*.oap" | Select-Object -ExpandProperty FullName }
else { Write-Error "Provide -OapPath or -OapDir"; exit 1 }

$converted = 0
$indexModules = @()

foreach ($oap in $oaps) {
    $appName = [System.IO.Path]::GetFileNameWithoutExtension($oap)
    $zipPath = Join-Path $TempDir ($appName + ".zip")
    $extractDir = Join-Path $TempDir $appName

    Copy-Item $oap $zipPath
    Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

    $appXmlSrc = Join-Path $extractDir "application.xml"
    if (Test-Path $appXmlSrc) {
        Copy-Item $appXmlSrc (Join-Path $OutDir ($appName + "_application.xml"))
    }

    Get-ChildItem $extractDir -Filter "*.oml" | ForEach-Object {
        $modName = $_.BaseName
        $outXml = Join-Path $OutDir ($modName + ".xml")
        Write-Host "Converting $modName..." -ForegroundColor Cyan
        oml manipulate $_.FullName $outXml
        if ($LASTEXITCODE -eq 0) {
            $type = if ($modName -match "_Web$") { "End User" } elseif ($modName -match "_Lib$") { "Foundation" } else { "Core" }
            $indexModules += [pscustomobject]@{ name=$modName; xml_file=($modName+".xml"); type=$type }
            $converted++
        } else {
            Write-Warning "Failed to convert $modName (oml-utilities version mismatch?)"
        }
    }
}

$index = [pscustomobject]@{
    application = ($oaps | Select-Object -First 1 | ForEach-Object { [System.IO.Path]::GetFileNameWithoutExtension($_) })
    exported_at = (Get-Date -Format "o")
    modules = $indexModules
}
$index | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $OutDir "modules_index.json") -Encoding UTF8

Remove-Item $TempDir -Recurse -Force
Write-Host "Done. $converted module(s) converted to $OutDir" -ForegroundColor Green
`

const s = {
  panel: {
    background: '#111111',
    border: '1px solid #1e1e1e',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #1e1e1e',
  },
  tab: {
    padding: '10px 18px',
    fontSize: '12px',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    cursor: 'pointer',
    color: '#555',
    borderBottom: '2px solid transparent',
    background: 'none',
    border: 'none',
    outline: 'none',
    transition: 'color 0.1s',
  },
  tabActive: {
    color: '#4ecfa0',
    borderBottom: '2px solid #4ecfa0',
  },
  body: {
    padding: '20px',
  },
  dropZone: {
    border: '1px dashed #2a2a2a',
    borderRadius: '4px',
    padding: '32px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    background: '#0d0d0d',
  },
  dropZoneOver: {
    borderColor: '#4ecfa0',
    background: '#0d2820',
  },
  dropLabel: {
    fontSize: '13px',
    color: '#555',
    marginBottom: '6px',
  },
  dropSub: {
    fontSize: '11px',
    color: '#333',
  },
  codeBlock: {
    background: '#0a0a0a',
    border: '1px solid #1e1e1e',
    borderRadius: '4px',
    padding: '12px',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '11px',
    color: '#4ecfa0',
    overflowX: 'auto',
    marginTop: '12px',
    whiteSpace: 'pre',
  },
  omlList: {
    marginTop: '12px',
    fontSize: '12px',
    color: '#666',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  omlItem: {
    padding: '4px 0',
    borderBottom: '1px solid #1a1a1a',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dlBtn: {
    marginTop: '16px',
    padding: '7px 14px',
    background: '#141414',
    border: '1px solid #2a2a2a',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  errorMsg: {
    marginTop: '8px',
    padding: '8px 12px',
    background: '#1a0a0a',
    border: '1px solid #5a1a1a',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#e87070',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  demoBtn: {
    width: '100%',
    padding: '14px',
    background: '#0d2820',
    border: '1px solid #0F6E56',
    borderRadius: '4px',
    color: '#4ecfa0',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontWeight: 600,
    letterSpacing: '0.02em',
    transition: 'background 0.1s',
  },
  demoDesc: {
    marginTop: '10px',
    fontSize: '12px',
    color: '#444',
    lineHeight: 1.6,
  },
}

function DropZone({ accept, onFiles, label, sublabel }) {
  const [over, setOver] = useState(false)
  const inputRef = useRef()

  const handleDrop = e => {
    e.preventDefault()
    setOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f =>
      accept.some(ext => f.name.endsWith(ext))
    )
    if (files.length) onFiles(files)
  }

  return (
    <div
      style={{ ...s.dropZone, ...(over ? s.dropZoneOver : {}) }}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
    >
      <div style={s.dropLabel}>{label}</div>
      <div style={s.dropSub}>{sublabel}</div>
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        multiple
        style={{ display: 'none' }}
        onChange={e => { onFiles(Array.from(e.target.files)); e.target.value = '' }}
      />
    </div>
  )
}

export default function ImportPanel({ onModulesLoaded }) {
  const [activeTab, setActiveTab] = useState(0)
  const [oapResult, setOapResult] = useState(null)
  const [errors, setErrors] = useState([])

  const handleOapDrop = async files => {
    setErrors([])
    try {
      const buf = await files[0].arrayBuffer()
      const result = await parseOapZip(buf)
      setOapResult({ appName: files[0].name, ...result })
    } catch (e) {
      setErrors([e.message])
    }
  }

  const handleXmlDrop = async files => {
    setErrors([])
    const xmlFiles = files.filter(f => f.name.endsWith('.xml'))
    const jsonFiles = files.filter(f => f.name.endsWith('.json'))
    const modules = []
    const errs = []

    for (const f of xmlFiles) {
      try {
        const text = await f.text()
        const mod = parseOmlXml(text)
        modules.push(mod)
      } catch (e) {
        errs.push(`${f.name}: ${e.message}`)
      }
    }

    for (const f of jsonFiles) {
      try {
        const text = await f.text()
        const json = JSON.parse(text)
        if (Array.isArray(json)) {
          modules.push(...json)
        } else if (json.modules) {
          // modules_index.json — just metadata, actual data in XML files
          errs.push(`${f.name}: modules_index.json loaded — also drop the accompanying .xml files`)
        }
      } catch (e) {
        errs.push(`${f.name}: ${e.message}`)
      }
    }

    setErrors(errs)
    if (modules.length > 0) onModulesLoaded(modules)
  }

  const handleDemoLoad = () => {
    onModulesLoaded(demoModules)
  }

  const downloadConvertScript = () => {
    const blob = new Blob([CONVERT_PS1], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'convert.ps1'
    a.click()
    URL.revokeObjectURL(url)
  }

  const tabs = ['Drop OAP', 'Drop XML / JSON', 'Load Demo']

  return (
    <div style={s.panel}>
      <div style={s.tabs}>
        {tabs.map((t, i) => (
          <button
            key={t}
            style={{ ...s.tab, ...(activeTab === i ? s.tabActive : {}) }}
            onClick={() => setActiveTab(i)}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={s.body}>
        {activeTab === 0 && (
          <div>
            <DropZone
              accept={['.oap']}
              onFiles={handleOapDrop}
              label="Drop .oap file here"
              sublabel="OutSystems Application Package"
            />
            {oapResult && (
              <div>
                <div style={s.omlList}>
                  <div style={{ marginBottom: '6px', color: '#888' }}>
                    Found {oapResult.omlFiles.length} .oml file{oapResult.omlFiles.length !== 1 ? 's' : ''} in{' '}
                    <span style={{ color: '#4ecfa0' }}>{oapResult.appName}</span>:
                  </div>
                  {oapResult.omlFiles.map(f => (
                    <div key={f.name} style={s.omlItem}>
                      <span style={{ color: '#333' }}>▸</span>
                      <span>{f.name}</span>
                    </div>
                  ))}
                </div>
                <div style={s.codeBlock}>
                  {`# Run this in PowerShell after downloading convert.ps1\n.\\convert.ps1 -OapPath "${oapResult.appName}" -OutDir ".\\xml-output"\n\n# Then drag the .xml files from xml-output/ into the "Drop XML / JSON" tab`}
                </div>
                <button style={s.dlBtn} onClick={downloadConvertScript}>
                  ↓ Download convert.ps1
                </button>
              </div>
            )}
            {errors.map((e, i) => <div key={i} style={s.errorMsg}>{e}</div>)}
          </div>
        )}

        {activeTab === 1 && (
          <div>
            <DropZone
              accept={['.xml', '.json']}
              onFiles={handleXmlDrop}
              label="Drop .xml or .json files here"
              sublabel="oml-utilities XML output, or modules_index.json"
            />
            {errors.map((e, i) => <div key={i} style={s.errorMsg}>{e}</div>)}
          </div>
        )}

        {activeTab === 2 && (
          <div>
            <button style={s.demoBtn} onClick={handleDemoLoad}>
              Load WerkDone / SCMS Demo Data
            </button>
            <div style={s.demoDesc}>
              Loads two demo modules (SCMS_Web and VMS_Web) with realistic block trees.<br />
              Cross-module references to PatientUI_Lib, SecurityUtils_Lib, CoreWidgets_Lib, and FormComponents_Lib<br />
              are included to demonstrate the tree explorer.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
