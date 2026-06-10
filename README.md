# OS Screen Explorer

An offline developer tool for mapping the **screen → block composition tree** of OutSystems O11 Reactive Web applications across multiple modules.

OutSystems Discovery and the Dependency Viewer only show module-level dependencies. This tool goes one level deeper: **screen → block → nested block**, colour-coded by source module, with cross-module boundaries clearly highlighted.

---

## Why this exists

When you're debugging a slow screen or trying to understand why a UI change broke something unexpected, you need to know the full block composition tree — not just that `SCMS_Web` depends on `PatientUI_Lib`, but that `PatientDashboard` uses `PatientHeaderBlock` which uses `NRICDisplayBlock` which uses `EncryptedTextField`. That chain is invisible in native OutSystems tooling.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Run the dev server / build |
| .NET | 6+ | Run oml-utilities conversion script |
| [oml-utilities](https://github.com/silviogarbes/oml-utilities) | latest | Convert `.oml` → `.xml` |

Install oml-utilities:
```
dotnet tool install --global OmlUtilities
```

---

## Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Convert your OAP

OutSystems `.oap` files contain `.oml` modules in a proprietary binary format. The browser tool cannot read `.oml` directly — you must convert them to XML first.

### Windows (PowerShell)

```powershell
# Single OAP file
.\scripts\convert.ps1 -OapPath "C:\exports\SCMS.oap" -OutDir ".\xml-output"

# Entire folder of OAPs
.\scripts\convert.ps1 -OapDir "C:\exports" -OutDir ".\xml-output"
```

### Mac / Linux (bash)

```bash
chmod +x scripts/convert.sh

# Single OAP file
./scripts/convert.sh -f /path/to/SCMS.oap -o ./xml-output

# Entire folder of OAPs
./scripts/convert.sh -d /path/to/oap-dir -o ./xml-output
```

The script outputs one `.xml` file per module and a `modules_index.json` summary.

---

## Load XMLs into the tool

1. Open the app (`npm run dev`)
2. Go to the **Drop XML / JSON** tab
3. Drag all `.xml` files from `xml-output/` onto the drop zone
4. The module tree appears immediately — no server, no upload

---

## What the colours mean

Each module gets a deterministic colour based on its name — `SecurityUtils_Lib` always maps to the same colour regardless of load order. The legend at the bottom of the screen lists all modules present across all loaded data.

| Colour | Used for |
|--------|---------|
| Dot in module tab | Module identity |
| Left border on BlockNode | Source module of that block |
| Background pill | Cross-module block reference |

A block with a **coloured background** means it comes from a different module than the screen that contains it. An **amber ⚠ badge** on a ScreenCard header counts total cross-module references in that screen's tree.

---

## Known limitations

**OML version lock** — oml-utilities supports specific OutSystems platform versions. If a module was saved with a newer platform version, conversion may fail with a version mismatch error. Check the [oml-utilities supported versions](https://github.com/silviogarbes/oml-utilities) table.

**Traditional Web partial support** — `<WebScreen>` / `<WebBlock>` parsing is implemented, but the widget tree structure differs from Reactive Web. Some nested block references in Traditional Web modules may not be detected.

**oml-utilities on Linux/macOS** — the tool is .NET-based and should work cross-platform, but it was primarily developed and tested on Windows. Report issues at the oml-utilities repository.

**Large modules** — modules with 50+ screens may render slowly. Collapse all screens first and expand selectively.

---

## Session persistence

Loaded modules are stored in `localStorage` under the key `os-screen-explorer:modules`. On next open, you'll be offered the option to restore the previous session.

---

## Build for distribution

```bash
npm run build
# Output in dist/ — serve as static files from any web server
```
