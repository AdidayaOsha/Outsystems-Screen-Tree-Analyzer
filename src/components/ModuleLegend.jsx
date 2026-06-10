import { getModuleColor } from '../lib/colorMap'

const s = {
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '10px 16px',
    borderTop: '1px solid #1e1e1e',
    background: '#0d0d0d',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  name: {
    color: '#888',
  },
  type: {
    color: '#444',
    fontSize: '10px',
  },
}

export default function ModuleLegend({ modules }) {
  const unique = new Map()
  for (const mod of modules) {
    if (!unique.has(mod.name)) {
      unique.set(mod.name, mod.type)
    }
    // Also collect cross-module references
    collectModulesFromBlocks(mod.screens, unique)
  }

  if (unique.size === 0) return null

  return (
    <div style={s.legend}>
      {Array.from(unique.entries()).map(([name, type]) => {
        const color = getModuleColor(name)
        return (
          <div key={name} style={s.item}>
            <span style={{ ...s.dot, background: color.dot }} />
            <span style={s.name}>{name}</span>
            <span style={s.type}>{type}</span>
          </div>
        )
      })}
    </div>
  )
}

function collectModulesFromBlocks(screens, map) {
  for (const screen of screens) {
    walkBlocks(screen.blocks, map)
  }
}

function walkBlocks(blocks, map) {
  for (const block of blocks) {
    if (!map.has(block.sourceModule)) {
      map.set(block.sourceModule, null)
    }
    if (block.blocks) walkBlocks(block.blocks, map)
  }
}
