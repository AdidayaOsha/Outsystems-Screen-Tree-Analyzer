# OS Screen Explorer — Claude Code Spec

## What this is

An **offline** developer tool that maps the screen/block composition tree of OutSystems O11 Reactive Web applications across multiple modules. It answers the question: *"Starting from Screen X, which Blocks does it use, and where do those Blocks come from — all the way down the nesting chain?"*

This is a gap in OutSystems native tooling. Discovery and the Dependency Viewer only show module-level dependencies. This tool goes to screen → block → nested block granularity, colour-coded by source module, with cross-module boundaries clearly highlighted.

**Zero network dependency at runtime.** No Claude API, no telemetry, no external calls once built.

---

## Repository structure to create

```
os-screen-explorer/
├── CLAUDE.md                  ← this file
├── README.md
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/
│   │   ├── ScreenCard.jsx
│   │   ├── BlockNode.jsx
│   │   ├── ModuleLegend.jsx
│   │   ├── SearchPanel.jsx
│   │   └── ImportPanel.jsx
│   ├── lib/
│   │   ├── parseOmlXml.js      ← core XML parser
│   │   ├── parseOapZip.js      ← .oap unzip via JSZip
│   │   └── colorMap.js         ← module → colour assignment
│   └── data/
│       └── demoModules.js      ← demo data (WerkDone SCMS/VMS style)
├── scripts/
│   ├── convert.ps1             ← Windows PowerShell wrapper for oml-utilities
│   └── convert.sh              ← Mac/Linux shell wrapper
└── dist/                       ← vite build output (gitignored)
```

---

## Tech stack

- **React 18** + **Vite** — fast dev server, clean build
- **JSZip** — unzip `.oap` files in the browser (no server needed)
- **No other runtime dependencies** — pure JS XML parsing via browser's native `DOMParser`
- Dev dependency: `vite`, `@vitejs/plugin-react`

```json
{
  "name": "os-screen-explorer",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "jszip": "^3.10.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0"
  }
}
```

---

## The OML/OAP format — what Claude Code needs to know

### `.oap` format
Standard ZIP file (magic bytes `PK\x03\x04`). Contains:
- One `.oml` file per module in the application
- `application.xml` — app-level metadata (name, modules list, icon)
- Possibly `application_template.xml` and resource folders

JSZip can unzip it directly in the browser from an `ArrayBuffer`.

### `.oml` format
**Proprietary binary container** — NOT a standard ZIP. It is a compressed file composed of named XML fragments (e.g. `WebScreens.xml`, `WebBlocks.xml`, `References.xml`, `UserActions.xml`). The compression is handled by the [oml-utilities](https://github.com/silviogarbes/oml-utilities) .NET CLI tool — there is no known JS equivalent.

**This is why the convert scripts exist.** The browser tool never reads `.oml` directly. It reads the XML output produced by oml-utilities.

### Supported input modes in the browser tool
1. **Drop `.oap` file(s)** — unzipped via JSZip, each `.oml` inside is passed to the user with instructions to run the convert script
2. **Drop converted `.xml` file(s)** — output of oml-utilities, parsed directly
3. **Drop pre-converted `.json` file** — output of the convert scripts, parsed directly (fastest)
4. **Manual / demo mode** — pre-loaded demo data, no file needed

---

## Core XML parsing logic — `src/lib/parseOmlXml.js`

The oml-utilities tool outputs a single XML file per module. The root element is `<eSpace name="ModuleName">`. Inside are the decompressed fragments concatenated or wrapped.

Key elements to locate and parse:

### Module name
```xml
<eSpace name="SCMS_Web" ...>
```

### Screens (Reactive Web)
```xml
<Screen name="PatientDashboard" ...>
  <!-- inside a UIFlow -->
</Screen>
```

### Screens (Traditional Web — also handle these)
```xml
<WebScreen name="PatientDashboard" ...>
```

### UI Flows (group screens)
```xml
<UIFlow name="MainFlow">
  <Screen name="PatientDashboard" ... />
</UIFlow>
```

### Blocks defined in this module
```xml
<Block name="PatientHeaderBlock" Public="true" ...>
```
```xml
<WebBlock name="PatientHeaderBlock" Public="true" ...>
```

### Block widget instances placed on a Screen or Block (this is the key relationship)
OutSystems uses several patterns depending on version. Handle all of them:

**Pattern 1 — Widget with kind attribute:**
```xml
<Widget kind="Block" Name="PatientHeaderBlock_instance">
  <BlockName>PatientHeaderBlock</BlockName>
  <ModuleName>PatientUI_Lib</ModuleName>
</Widget>
```

**Pattern 2 — Widget with xsi:type:**
```xml
<Widget xsi:type="ReferenceWebBlockWidget">
  <BlockName>NRICDisplayBlock</BlockName>
  <ModuleName>SecurityUtils_Lib</ModuleName>
</Widget>
```

**Pattern 3 — Direct BlockWidget element:**
```xml
<BlockWidget BlockName="AlertBannerBlock" ModuleName="CoreWidgets_Lib" />
```

**Pattern 4 — Reference with key (less common, older modules):**
```xml
<WidgetList>
  <Widget kind="WebBlock">
    <WebBlockWidgetProperties>
      <BlockName>SomeBlock</BlockName>
      <SourceModule>SomeLib</SourceModule>
    </WebBlockWidgetProperties>
  </Widget>
</WidgetList>
```

### Module references (to map block → source module)
```xml
<Reference>
  <ReferenceKind>Block</ReferenceKind>
  <OriginalName>NRICDisplayBlock</OriginalName>
  <OriginalModuleName>SecurityUtils_Lib</OriginalModuleName>
</Reference>
```

Use the `<Reference>` list to build a lookup table: `blockName → sourceModule`. This lookup resolves cases where the Widget element only has a `BlockName` but no `ModuleName`.

### Parsing algorithm

```
function parseOmlXml(xmlString):
  doc = DOMParser.parseFromString(xmlString)
  moduleName = doc.querySelector('eSpace')?.name

  // Step 1: Build reference lookup
  refMap = {}  // blockName → sourceModule
  for each <Reference> where ReferenceKind == "Block" or "WebBlock":
    refMap[OriginalName] = OriginalModuleName

  // Step 2: Find all screens
  screens = []
  for each <Screen> or <WebScreen>:
    flow = closest UIFlow name (default "MainFlow")
    blocks = extractBlocks(screenElement, moduleName, refMap)
    screens.push({ name, flow, blocks })

  return { name: moduleName, type: inferType(moduleName), screens }

function extractBlocks(element, ownerModule, refMap):
  results = []
  for each Widget child that is a block instance:
    blockName = Widget.BlockName or Widget.Name
    sourceModule = Widget.ModuleName || refMap[blockName] || ownerModule
    nestedBlocks = extractBlocks(Widget, sourceModule, refMap)
    results.push({ name: blockName, sourceModule, blocks: nestedBlocks })
  return results
```

`inferType(moduleName)` heuristic:
- ends with `_Web` or contains `Web` → `"End User"`
- ends with `_Lib` → `"Foundation"`
- ends with `_BL`, `_CS`, `_IS`, `_API` → `"Core"`
- default → `"End User"`

---

## Convert scripts — `scripts/`

### `convert.ps1` (Windows)

Wraps oml-utilities. Prerequisites: .NET 6+ installed, oml-utilities installed via `dotnet tool install --global OmlUtilities`.

```powershell
# convert.ps1
# Usage: .\convert.ps1 -OapPath "C:\exports\SCMS.oap" -OutDir ".\xml-output"
# Or drop all .oap in a folder: .\convert.ps1 -OapDir "C:\exports" -OutDir ".\xml-output"

param(
    [string]$OapPath,
    [string]$OapDir,
    [string]$OutDir = ".\xml-output"
)

# [full script implementation — see notes below]
```

Script logic:
1. Accept one `.oap` path or a directory of `.oap` files
2. Create `$OutDir` if it doesn't exist
3. For each `.oap`:
   a. Copy to temp location, rename to `.zip`
   b. Expand-Archive to a temp folder
   c. For each `.oml` file found:
      - Run `oml manipulate "$omlPath" "$OutDir\$moduleName.xml"`
   d. Also copy `application.xml` to `$OutDir\$appName_application.xml`
4. Print summary: modules converted, output location

Also output a combined `modules_index.json`:
```json
{
  "application": "SCMS",
  "exported_at": "2026-06-10T...",
  "modules": [
    { "name": "SCMS_Web", "xml_file": "SCMS_Web.xml", "type": "End User" },
    { "name": "PatientUI_Lib", "xml_file": "PatientUI_Lib.xml", "type": "Foundation" }
  ]
}
```

### `convert.sh` (Mac/Linux)

Same logic using `bash`, `unzip`, and the oml-utilities dotnet tool. Note: oml-utilities may have Windows-only limitations — document clearly if .NET on Linux is required.

---

## App behaviour — `src/App.jsx`

### State shape
```js
{
  modules: [
    {
      name: "SCMS_Web",
      type: "End User",    // "End User" | "Core" | "Foundation"
      screens: [
        {
          name: "PatientDashboard",
          flow: "MainFlow",
          blocks: [
            {
              name: "PatientHeaderBlock",
              sourceModule: "PatientUI_Lib",
              blocks: [
                {
                  name: "NRICDisplayBlock",
                  sourceModule: "SecurityUtils_Lib",
                  blocks: [
                    { name: "EncryptedTextField", sourceModule: "SecurityUtils_Lib", blocks: [] }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  activeModuleIndex: 0,
  search: "",
  colorMap: Map<moduleName, colorConfig>
}
```

### Colour assignment — `src/lib/colorMap.js`

Assign colours by module name, consistently across sessions (same module always gets same colour). Use a deterministic hash of the module name to pick from the palette rather than insertion order — so `SecurityUtils_Lib` always gets the same colour whether it's the 2nd or 5th module encountered.

Palette (8 entries, cycle if more than 8 modules):
```js
const PALETTE = [
  { bg: "#1e1a3a", border: "#534AB7", text: "#a89de8", dot: "#7F77DD" }, // purple
  { bg: "#0d2820", border: "#0F6E56", text: "#4ecfa0", dot: "#1D9E75" }, // teal
  { bg: "#2a1208", border: "#993C1D", text: "#e88060", dot: "#D85A30" }, // coral
  { bg: "#1e1508", border: "#854F0B", text: "#e8a84a", dot: "#BA7517" }, // amber
  { bg: "#0a1e30", border: "#185FA5", text: "#60a8e8", dot: "#378ADD" }, // blue
  { bg: "#1e0a18", border: "#993556", text: "#e070a8", dot: "#D4537E" }, // pink
  { bg: "#0d1e0a", border: "#3B6D11", text: "#80c840", dot: "#639922" }, // green
  { bg: "#1a1010", border: "#A32D2D", text: "#e87070", dot: "#E24B4A" }, // red
]
```

### Import panel — `src/components/ImportPanel.jsx`

Three tabs:

**Tab 1: Drop OAP**
- Drag and drop zone for `.oap` files
- On drop: use JSZip to unzip, list the `.oml` files found inside
- Show a "you need to convert these first" message with the exact CLI command to run
- Provide a "Download convert script" button that generates and downloads `convert.ps1` on the fly
- After conversion, user comes back and uses Tab 2

**Tab 2: Drop XML / JSON**
- Accepts `.xml` files (oml-utilities output, one per module)
- Accepts `modules_index.json` + accompanying XMLs
- On drop: parse each XML via `parseOmlXml()`, add to module list
- Show parse errors clearly per file

**Tab 3: Load demo**
- Loads the WerkDone-style demo data from `src/data/demoModules.js`
- Useful for showing to stakeholders or testing without real files

### Main view

**Module tab bar** — one tab per loaded module, colour-coded by module. Active tab has coloured border. Each tab shows module name + screen count. `×` to remove.

**Screen list** — for the active module, show all screens as collapsible cards.

**ScreenCard** — header shows screen name, UI flow name, direct block count, cross-module block count (amber ⚠ badge if > 0). Body shows the block tree.

**BlockNode** — recursive component:
- Indented by depth × 20px
- Left border line in the source module's colour (dashed, connecting to children)
- If `sourceModule !== ownerModule` (cross-module): coloured background pill + module badge
- If `sourceModule === ownerModule`: neutral, no decoration
- Expand/collapse toggle if has children
- Shows child count on the right when collapsed

**Search** — global search across all loaded modules by block name or module name. Returns a flat list of results with full path: `SCMS_Web → PatientDashboard → PatientHeaderBlock → NRICDisplayBlock`.

**Legend** — shows all unique modules encountered across all loaded modules, with their assigned colour dot.

---

## Demo data — `src/data/demoModules.js`

Use realistic WerkDone/SCMS-style naming:

Modules: `SCMS_Web`, `VMS_Web`, `PatientUI_Lib`, `CoreWidgets_Lib`, `SecurityUtils_Lib`, `FormComponents_Lib`

Screens in `SCMS_Web`: `PatientDashboard`, `CareplanForm`, `VisitList`, `AdmissionForm`

Screens in `VMS_Web`: `VolunteerDashboard`, `GantryEventLog`, `VisitorCheckIn`

Blocks should have 2-3 levels of nesting to demonstrate the value. At least 3 cross-module references per screen.

---

## Visual design direction

Dark, utilitarian developer tool. Feels like something a senior engineer built for themselves.

- Background: `#0a0a0a`
- Surface: `#111111`, `#141414`
- Borders: `#1e1e1e`, `#2a2a2a`
- Primary text: `#e0e0e0`
- Secondary text: `#666666`
- Code/names: JetBrains Mono or Fira Code monospace
- Body: DM Sans or system-ui
- Accent: `#4ecfa0` (teal green) for active states and the header dot

No gradients. No shadows. Flat, high contrast. Dense but not cramped.

---

## README.md content (generate this too)

Should cover:
1. What it is and why it exists (the Discovery gap)
2. Prerequisites: Node 18+, .NET 6+, oml-utilities
3. Install: `npm install`
4. Dev: `npm run dev`
5. Convert your OAP: step by step with the PowerShell script
6. Load XMLs into the tool
7. What the colours mean
8. Known limitations (oml format version-lock, Traditional Web partial support)

---

## Known limitations to document and handle gracefully

- **OML version lock** — oml-utilities supports specific OutSystems platform versions. If a module was saved with a newer platform version, conversion may fail. Show a clear error with the oml-utilities version support table link.
- **Traditional Web partial support** — `<WebScreen>` / `<WebBlock>` parsing is supported but the widget tree structure differs from Reactive. Some nested block references may not be detected.
- **Binary images/resources in OAP** — ignore these during parsing, they're not needed.
- **Circular references** — theoretically impossible in OutSystems (it prevents them at publish time) but guard against infinite recursion in `extractBlocks()` with a visited set anyway.
- **Empty screens** — screens with no block widgets (pure HTML/JS) are valid and should display with a "no blocks — raw content screen" note.
- **Large modules** — modules with 50+ screens may render slowly. Add virtualisation or pagination if needed (lower priority).

---

## What NOT to build (scope boundary)

- No logic flow visualisation (actions, server calls) — blocks and screens only
- No entity/data model diagram — use Discovery for that
- No edit capability — read-only tool
- No cloud sync or save-to-server — local files only, localStorage for persisting loaded modules between sessions
- No authentication

---

## Session persistence

Use `localStorage` to persist the loaded module list between page refreshes. Key: `os-screen-explorer:modules`. Store the parsed module JSON (not the original XML — too large). On load, check localStorage and restore if present. Show a "restore X modules from last session?" prompt.

---

## How to run Claude Code on this

```bash
# 1. Create the project directory
mkdir os-screen-explorer && cd os-screen-explorer

# 2. Copy this CLAUDE.md into it
cp /path/to/CLAUDE.md .

# 3. Run Claude Code
claude

# 4. First prompt:
# "Read CLAUDE.md and build the full project as specified.
#  Start with the file structure and package.json, then implement
#  parseOmlXml.js, then the React components, then the convert scripts.
#  Run npm install and npm run dev to verify it builds before finishing."
```

Claude Code will:
- Read this file first (it always reads CLAUDE.md on startup)
- Implement the full project
- Verify it builds with `npm install && npm run dev`
- Fix any build errors before reporting done

---

## Suggested Claude Code prompts after initial build

Once the initial build is done, use these follow-up prompts:

```
"The OML XML parser needs to handle the case where a block widget
 references a block by key (integer) rather than by name. Add a
 key→name resolution pass using the <NRList> or <References> section."
```

```
"Add an export feature: given the current view, generate a markdown
 table of all screens and their block dependencies, grouped by module.
 Add a 'Copy as Markdown' button to the header."
```

```
"Add a 'cross-module heatmap' view: a matrix where rows are source
 modules and columns are consuming modules, cells show the count of
 blocks referenced between them. Clicking a cell filters the main
 view to show only those references."
```

```
"The convert.ps1 script should also handle the case where oml-utilities
 is not installed and offer to install it via: dotnet tool install
 --global OmlUtilities"
```
