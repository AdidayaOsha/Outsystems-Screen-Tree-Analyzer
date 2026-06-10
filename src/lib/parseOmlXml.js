export function inferType(moduleName) {
  if (!moduleName) return 'End User'
  if (/_Web$/i.test(moduleName) || /Web/i.test(moduleName)) return 'End User'
  if (/_Lib$/i.test(moduleName)) return 'Foundation'
  if (/(_BL|_CS|_IS|_API)$/i.test(moduleName)) return 'Core'
  return 'End User'
}

function getTextContent(parent, tagName) {
  const el = parent.querySelector(tagName)
  return el ? el.textContent.trim() : null
}

function buildRefMap(doc) {
  const refMap = {}
  const refs = doc.querySelectorAll('Reference')
  for (const ref of refs) {
    const kind = getTextContent(ref, 'ReferenceKind')
    if (kind === 'Block' || kind === 'WebBlock') {
      const name = getTextContent(ref, 'OriginalName')
      const mod = getTextContent(ref, 'OriginalModuleName')
      if (name && mod) refMap[name] = mod
    }
  }
  return refMap
}

function isBlockWidget(el) {
  const tag = el.tagName
  if (tag === 'BlockWidget') return true
  if (tag === 'Widget') {
    const kind = el.getAttribute('kind')
    const xsiType = el.getAttribute('xsi:type') || el.getAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'type')
    if (kind === 'Block' || kind === 'WebBlock') return true
    if (xsiType && (xsiType.includes('BlockWidget') || xsiType.includes('WebBlockWidget'))) return true
    // Pattern 4: Widget with WebBlockWidgetProperties child
    if (el.querySelector('WebBlockWidgetProperties')) return true
  }
  return false
}

function extractBlocksFromElement(el, ownerModule, refMap, visited = new Set()) {
  const results = []
  const children = Array.from(el.children)

  for (const child of children) {
    if (isBlockWidget(child)) {
      let blockName = null
      let sourceModule = null

      if (child.tagName === 'BlockWidget') {
        blockName = child.getAttribute('BlockName')
        sourceModule = child.getAttribute('ModuleName')
      } else {
        // Widget element — try all patterns
        const props = child.querySelector('WebBlockWidgetProperties')
        if (props) {
          blockName = getTextContent(props, 'BlockName')
          sourceModule = getTextContent(props, 'SourceModule')
        } else {
          blockName = getTextContent(child, 'BlockName') || child.getAttribute('Name')
          sourceModule = getTextContent(child, 'ModuleName')
        }
      }

      if (!blockName) continue

      sourceModule = sourceModule || refMap[blockName] || ownerModule

      // Guard against infinite recursion (shouldn't happen in OutSystems)
      const nodeKey = `${blockName}@${sourceModule}`
      if (visited.has(nodeKey)) continue
      const nextVisited = new Set(visited)
      nextVisited.add(nodeKey)

      const nestedBlocks = extractBlocksFromElement(child, sourceModule, refMap, nextVisited)
      results.push({ name: blockName, sourceModule, blocks: nestedBlocks })
    } else {
      // Recurse into non-block container children
      const nested = extractBlocksFromElement(child, ownerModule, refMap, visited)
      results.push(...nested)
    }
  }

  return results
}

export function parseOmlXml(xmlString) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error('XML parse error: ' + parseError.textContent.slice(0, 200))
  }

  const eSpace = doc.querySelector('eSpace')
  if (!eSpace) {
    throw new Error('No <eSpace> root element found — is this an oml-utilities XML output?')
  }

  const moduleName = eSpace.getAttribute('name') || 'UnknownModule'
  const refMap = buildRefMap(doc)

  // Find all screens — both Reactive (Screen) and Traditional Web (WebScreen)
  const screenEls = Array.from(doc.querySelectorAll('Screen, WebScreen'))
  const screens = []

  for (const screenEl of screenEls) {
    const name = screenEl.getAttribute('name')
    if (!name) continue

    // Walk up to find UIFlow name
    let flow = 'MainFlow'
    let parent = screenEl.parentElement
    while (parent && parent !== eSpace) {
      if (parent.tagName === 'UIFlow') {
        flow = parent.getAttribute('name') || 'MainFlow'
        break
      }
      parent = parent.parentElement
    }

    const blocks = extractBlocksFromElement(screenEl, moduleName, refMap)
    screens.push({ name, flow, blocks })
  }

  return {
    name: moduleName,
    type: inferType(moduleName),
    screens,
  }
}
