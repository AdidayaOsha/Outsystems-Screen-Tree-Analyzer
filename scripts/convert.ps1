# convert.ps1 — OS Screen Explorer OAP converter
# Converts OutSystems .oap exports to XML files readable by the browser tool.
#
# Prerequisites:
#   - .NET 6+ installed  (https://dotnet.microsoft.com/download)
#   - OmlUtilities tool: dotnet tool install --global OmlUtilities
#
# Usage:
#   .\convert.ps1 -OapPath "C:\exports\SCMS.oap" -OutDir ".\xml-output"
#   .\convert.ps1 -OapDir  "C:\exports"           -OutDir ".\xml-output"

param(
    [string]$OapPath,
    [string]$OapDir,
    [string]$OutDir = ".\xml-output"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Check oml-utilities ────────────────────────────────────────────────────────
if (-not (Get-Command "oml" -ErrorAction SilentlyContinue)) {
    Write-Host "oml-utilities not found. Attempting to install via dotnet tool..." -ForegroundColor Yellow
    dotnet tool install --global OmlUtilities
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Error @"
Failed to install OmlUtilities.
  1. Ensure .NET 6 or later is installed: https://dotnet.microsoft.com/download
  2. Then run: dotnet tool install --global OmlUtilities
  3. Re-run this script.

OmlUtilities version support: https://github.com/silviogarbes/oml-utilities
"@
        exit 1
    }
    Write-Host "OmlUtilities installed successfully." -ForegroundColor Green
}

# ── Resolve .oap files ─────────────────────────────────────────────────────────
$oaps = @()
if ($OapPath) {
    if (-not (Test-Path $OapPath)) { Write-Error "File not found: $OapPath"; exit 1 }
    $oaps = @($OapPath)
} elseif ($OapDir) {
    if (-not (Test-Path $OapDir)) { Write-Error "Directory not found: $OapDir"; exit 1 }
    $oaps = @(Get-ChildItem $OapDir -Filter "*.oap" | Select-Object -ExpandProperty FullName)
    if ($oaps.Count -eq 0) { Write-Error "No .oap files found in $OapDir"; exit 1 }
} else {
    Write-Error "Provide -OapPath <file.oap> or -OapDir <folder>"
    exit 1
}

New-Item -ItemType Directory -Force $OutDir | Out-Null
$TempDir = Join-Path $env:TEMP ("oap_convert_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $TempDir | Out-Null

$converted = 0
$failed = 0
$indexModules = [System.Collections.Generic.List[object]]::new()

foreach ($oap in $oaps) {
    $appName = [System.IO.Path]::GetFileNameWithoutExtension($oap)
    Write-Host "`nProcessing $appName.oap..." -ForegroundColor Cyan

    $zipPath    = Join-Path $TempDir ($appName + "_" + [guid]::NewGuid().ToString("N") + ".zip")
    $extractDir = Join-Path $TempDir ($appName + "_extracted")

    Copy-Item $oap $zipPath
    Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

    # Copy application.xml if present
    $appXmlSrc = Join-Path $extractDir "application.xml"
    if (Test-Path $appXmlSrc) {
        $dest = Join-Path $OutDir ($appName + "_application.xml")
        Copy-Item $appXmlSrc $dest
        Write-Host "  Copied application.xml → $($appName)_application.xml" -ForegroundColor DarkGray
    }

    # Convert each .oml file
    $omlFiles = Get-ChildItem $extractDir -Filter "*.oml"
    foreach ($omlFile in $omlFiles) {
        $modName = $omlFile.BaseName
        $outXml  = Join-Path $OutDir ($modName + ".xml")
        Write-Host "  Converting $modName..." -NoNewline

        try {
            oml manipulate $omlFile.FullName $outXml 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                $type = if ($modName -match "_Web$") { "End User" }
                        elseif ($modName -match "_Lib$") { "Foundation" }
                        elseif ($modName -match "_BL$|_CS$|_IS$|_API$") { "Core" }
                        else { "End User" }
                $indexModules.Add([pscustomobject]@{
                    name     = $modName
                    xml_file = "$modName.xml"
                    type     = $type
                })
                Write-Host " OK" -ForegroundColor Green
                $converted++
            } else {
                Write-Host " FAILED (exit $LASTEXITCODE)" -ForegroundColor Red
                Write-Host "    Possible cause: OML version mismatch." -ForegroundColor DarkYellow
                Write-Host "    Check supported versions: https://github.com/silviogarbes/oml-utilities" -ForegroundColor DarkYellow
                $failed++
            }
        } catch {
            Write-Host " ERROR: $_" -ForegroundColor Red
            $failed++
        }
    }
}

# ── Write modules_index.json ──────────────────────────────────────────────────
$firstAppName = [System.IO.Path]::GetFileNameWithoutExtension($oaps[0])
$index = [pscustomobject]@{
    application = $firstAppName
    exported_at = (Get-Date -Format "o")
    modules     = $indexModules
}
$indexPath = Join-Path $OutDir "modules_index.json"
$index | ConvertTo-Json -Depth 5 | Set-Content $indexPath -Encoding UTF8
Write-Host "`nWrote modules_index.json" -ForegroundColor DarkGray

# ── Cleanup & summary ─────────────────────────────────────────────────────────
Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "Converted : $converted module(s)" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "Failed    : $failed module(s)" -ForegroundColor Red
}
Write-Host "Output    : $(Resolve-Path $OutDir)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Open OS Screen Explorer in your browser"
Write-Host "  2. Go to 'Drop XML / JSON' tab"
Write-Host "  3. Drag the .xml files from: $(Resolve-Path $OutDir)"
