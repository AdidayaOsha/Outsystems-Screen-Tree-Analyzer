export function inferType(moduleName) {
  if (!moduleName) return 'End User'
  if (/_Web$/i.test(moduleName) || /Web/i.test(moduleName)) return 'End User'
  if (/_Lib$/i.test(moduleName)) return 'Foundation'
  if (/(_BL|_CS|_IS|_API)$/i.test(moduleName)) return 'Core'
  return 'End User'
}

// ── Path parsing helpers ───────────────────────────────────────────────────────

// "NRNodes.WebBlock:/NRWebFlows.ABC/NodesShownInESpaceTree.XYZ"
//   → { type: 'local', flowKey: 'ABC', nodeKey: 'XYZ' }
// "NewRuntime.ReferenceWebBlock:/References.ABC/ReferenceNRWebFlows.DEF/ReferenceWebBlocks.XYZ"
//   → { type: 'ref', refKey: 'ABC', rbKey: 'XYZ' }
function parseSourceWebBlock(src) {
  if (!src) return null
  const refMatch = src.match(/NewRuntime\.ReferenceWebBlock:\/References\.([^/]+)\/ReferenceNRWebFlows\.[^/]+\/ReferenceWebBlocks\.(.+)$/)
  if (refMatch) return { type: 'ref', refKey: refMatch[1], rbKey: refMatch[2] }
  const localMatch = src.match(/NRNodes\.WebBlock:\/NRWebFlows\.([^/]+)\/NodesShownInESpaceTree\.(.+)$/)
  if (localMatch) return { type: 'local', flowKey: localMatch[1], nodeKey: localMatch[2] }
  return null
}

// ── Fragment extraction ────────────────────────────────────────────────────────

function getFragments(doc) {
  const frags = {}
  const all = doc.querySelectorAll('eSpaceFragment')
  for (const f of all) {
    const name = f.getAttribute('FragmentName')
    if (name) frags[name] = f
  }
  return frags
}

// ── Map builders ──────────────────────────────────────────────────────────────

function buildFlowMap(frags) {
  // flowKey → flowName
  const map = {}
  const frag = frags['NRWebFlows']
  if (!frag) return map
  for (const el of frag.children) {
    const key = el.getAttribute('Key')
    const name = el.getAttribute('Name')
    if (key && name) map[key] = name
  }
  return map
}

function buildLocalNodeMap(frags) {
  // nodeKey → { name, type: 'Screen'|'Block', flowKey }
  const map = {}
  for (const [fragName, frag] of Object.entries(frags)) {
    if (!fragName.startsWith('NodesShownInESpaceTree#')) continue
    const flowKey = fragName.slice('NodesShownInESpaceTree#'.length)
    for (const el of frag.children) {
      const tag = el.tagName
      if (tag !== 'NRNodes.WebScreen' && tag !== 'NRNodes.WebBlock') continue
      const key = el.getAttribute('Key')
      const name = el.getAttribute('Name')
      if (key && name) map[key] = { name, type: tag === 'NRNodes.WebScreen' ? 'Screen' : 'Block', flowKey }
    }
  }
  return map
}

function buildRefModuleMap(frags) {
  // refKey → moduleName
  const map = {}
  const refFrag = frags['References']
  if (!refFrag) return map
  for (const ref of refFrag.children) {
    const key = ref.getAttribute('Key')
    const name = ref.getAttribute('Name')
    if (key && name) map[key] = name
  }
  return map
}

function buildRefBlockMap(frags) {
  // rbKey → blockName  (elements are NewRuntime.ReferenceWebBlock)
  const map = {}
  const refFrag = frags['References']
  if (!refFrag) return map
  for (const rwb of refFrag.getElementsByTagName('NewRuntime.ReferenceWebBlock')) {
    const key = rwb.getAttribute('Key')
    const name = rwb.getAttribute('Name') || rwb.getAttribute('OriginalName')
    if (key && name) map[key] = name
  }
  return map
}

// ── Block extraction ──────────────────────────────────────────────────────────

function extractBlockInstances(nodeKey, frags, localNodeMap, refModuleMap, refBlockMap, moduleName, visited = new Set()) {
  if (visited.has(nodeKey)) return []
  const widgetFrag = frags[`Widgets#${nodeKey}`]
  if (!widgetFrag) return []

  const results = []
  const instances = widgetFrag.getElementsByTagName('NRWebWidgets.WebBlockInstance')

  for (const inst of instances) {
    const src = inst.getAttribute('SourceWebBlock')
    const parsed = parseSourceWebBlock(src)
    if (!parsed) continue

    let blockName = null
    let sourceModule = null

    if (parsed.type === 'local') {
      const node = localNodeMap[parsed.nodeKey]
      blockName = node ? node.name : `[block:${parsed.nodeKey.slice(0, 8)}]`
      sourceModule = moduleName
    } else {
      sourceModule = refModuleMap[parsed.refKey] || `[module:${parsed.refKey.slice(0, 8)}]`
      blockName = refBlockMap[parsed.rbKey] || null
      // If block name unknown, skip system UI components silently or show module-scoped fallback
      if (!blockName) continue
    }

    // For local blocks, recurse into the block's own Widgets# fragment using its definition key.
    // For cross-module blocks, the definition lives in another module's XML — no recursion possible.
    const recurseKey = parsed.type === 'local' ? parsed.nodeKey : null
    const childVisited = new Set(visited)
    childVisited.add(nodeKey)
    const nestedBlocks = recurseKey
      ? extractBlockInstances(recurseKey, frags, localNodeMap, refModuleMap, refBlockMap, sourceModule, childVisited)
      : []

    results.push({ name: blockName, sourceModule, blocks: nestedBlocks })
  }

  return results
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseOmlXml(xmlString, fileName) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')

  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new Error('XML parse error: ' + parseError.textContent.slice(0, 200))

  // Detect format: legacy eSpace-rooted vs oml-utilities fragment format
  const eSpaceRoot = doc.querySelector('eSpace')
  const omlRoot = doc.querySelector('OML')

  if (!eSpaceRoot && !omlRoot) {
    throw new Error('Unrecognised XML format — expected <OML> (oml-utilities output) or <eSpace> root.')
  }

  // Legacy format (original CLAUDE.md assumption)
  if (eSpaceRoot && !omlRoot) {
    return parseLegacyFormat(doc, eSpaceRoot)
  }

  // oml-utilities fragment format
  const moduleName = fileName ? fileName.replace(/\.[^.]+$/, '') : 'UnknownModule'
  return parseFragmentFormat(doc, moduleName)
}

// ── Legacy format (eSpace root) ───────────────────────────────────────────────

function parseLegacyFormat(doc, eSpace) {
  const moduleName = eSpace.getAttribute('name') || 'UnknownModule'
  const refMap = {}
  for (const ref of doc.querySelectorAll('Reference')) {
    const kind = ref.querySelector('ReferenceKind')?.textContent?.trim()
    if (kind === 'Block' || kind === 'WebBlock') {
      const name = ref.querySelector('OriginalName')?.textContent?.trim()
      const mod = ref.querySelector('OriginalModuleName')?.textContent?.trim()
      if (name && mod) refMap[name] = mod
    }
  }
  const screenEls = doc.querySelectorAll('Screen, WebScreen')
  const screens = []
  for (const screenEl of screenEls) {
    const name = screenEl.getAttribute('name')
    if (!name) continue
    let flow = 'MainFlow'
    let parent = screenEl.parentElement
    while (parent && parent !== eSpace) {
      if (parent.tagName === 'UIFlow') { flow = parent.getAttribute('name') || 'MainFlow'; break }
      parent = parent.parentElement
    }
    screens.push({ name, flow, blocks: extractLegacyBlocks(screenEl, moduleName, refMap) })
  }
  return { name: moduleName, type: inferType(moduleName), screens }
}

function extractLegacyBlocks(el, ownerModule, refMap, visited = new Set()) {
  const results = []
  for (const child of el.children) {
    if (isLegacyBlockWidget(child)) {
      let blockName = null, sourceModule = null
      if (child.tagName === 'BlockWidget') {
        blockName = child.getAttribute('BlockName')
        sourceModule = child.getAttribute('ModuleName')
      } else {
        const props = child.querySelector('WebBlockWidgetProperties')
        if (props) { blockName = props.querySelector('BlockName')?.textContent?.trim(); sourceModule = props.querySelector('SourceModule')?.textContent?.trim() }
        else { blockName = child.querySelector('BlockName')?.textContent?.trim() || child.getAttribute('Name'); sourceModule = child.querySelector('ModuleName')?.textContent?.trim() }
      }
      if (!blockName) continue
      sourceModule = sourceModule || refMap[blockName] || ownerModule
      const key = `${blockName}@${sourceModule}`
      if (visited.has(key)) continue
      const nv = new Set(visited); nv.add(key)
      results.push({ name: blockName, sourceModule, blocks: extractLegacyBlocks(child, sourceModule, refMap, nv) })
    } else {
      results.push(...extractLegacyBlocks(child, ownerModule, refMap, visited))
    }
  }
  return results
}

function isLegacyBlockWidget(el) {
  const tag = el.tagName
  if (tag === 'BlockWidget') return true
  if (tag === 'Widget') {
    const kind = el.getAttribute('kind')
    const xsiType = el.getAttribute('xsi:type') || el.getAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'type')
    if (kind === 'Block' || kind === 'WebBlock') return true
    if (xsiType && (xsiType.includes('BlockWidget') || xsiType.includes('WebBlockWidget'))) return true
    if (el.querySelector('WebBlockWidgetProperties')) return true
  }
  return false
}

// ── Fragment format (oml-utilities output) ────────────────────────────────────

function parseFragmentFormat(doc, moduleName) {
  const frags = getFragments(doc)
  const flowMap = buildFlowMap(frags)
  const localNodeMap = buildLocalNodeMap(frags)
  const refModuleMap = buildRefModuleMap(frags)
  const refBlockMap = buildRefBlockMap(frags)

  const screens = []
  const PREFIX = 'NodesShownInESpaceTree#'

  // Iterate ALL NodesShownInESpaceTree fragments — not just those whose key is
  // in NRWebFlows, because some flows (e.g. system/auth flows) are missing there.
  for (const [fragName, nodesFrag] of Object.entries(frags)) {
    if (!fragName.startsWith(PREFIX)) continue
    const flowKey = fragName.slice(PREFIX.length)
    const flowName = flowMap[flowKey] || 'MainFlow'

    for (const el of nodesFrag.children) {
      if (el.tagName !== 'NRNodes.WebScreen') continue
      const screenKey = el.getAttribute('Key')
      const screenName = el.getAttribute('Name')
      if (!screenKey || !screenName) continue

      const blocks = extractBlockInstances(screenKey, frags, localNodeMap, refModuleMap, refBlockMap, moduleName)
      screens.push({ name: screenName, flow: flowName, blocks })
    }
  }

  // Build blockDefs: map of blockName → its direct block children.
  // Used by the app to resolve cross-module nesting when multiple modules are loaded.
  const blockDefs = {}
  for (const [nodeKey, info] of Object.entries(localNodeMap)) {
    if (info.type !== 'Block') continue
    blockDefs[info.name] = extractBlockInstances(nodeKey, frags, localNodeMap, refModuleMap, refBlockMap, moduleName)
  }

  return { name: moduleName, type: inferType(moduleName), screens, blockDefs }
}
