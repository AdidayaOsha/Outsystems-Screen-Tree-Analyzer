import { useState } from 'react'
import BlockNode from './BlockNode'

function ScreenIcon({ color = '#555' }) {
  return (
    <svg width="13" height="12" viewBox="0 0 13 12" fill="none" style={{ flexShrink: 0 }}>
      <rect x="0.6" y="0.6" width="11.8" height="8.2" rx="1.4" stroke={color} strokeWidth="1.2" />
      <line x1="0.6" y1="3.2" x2="12.4" y2="3.2" stroke={color} strokeWidth="1" />
      <rect x="4.5" y="9.7" width="4" height="1.5" rx="0.5" fill={color} />
      <line x1="6.5" y1="8.8" x2="6.5" y2="9.7" stroke={color} strokeWidth="1" />
    </svg>
  )
}

function shouldFilter(blockResolver) {
  return Object.values(blockResolver).some(defs => Object.keys(defs).length > 0)
}

function countCrossModule(blocks, ownerModule, blockResolver) {
  const filter = shouldFilter(blockResolver)
  const loadedModules = Object.keys(blockResolver)
  const visible = (!filter)
    ? blocks
    : blocks.filter(b => b.sourceModule === ownerModule || loadedModules.includes(b.sourceModule))
  let count = 0
  for (const b of visible) {
    const children = (blockResolver[b.sourceModule]?.[b.name]) ?? b.blocks
    if (b.sourceModule !== ownerModule) count++
    count += countCrossModule(children, b.sourceModule, blockResolver)
  }
  return count
}

const s = {
  card: {
    background: '#111111',
    border: '1px solid #1e1e1e',
    borderRadius: '4px',
    marginBottom: '8px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: '1px solid transparent',
  },
  headerExpanded: {
    borderBottomColor: '#1e1e1e',
  },
  toggle: {
    color: '#444',
    fontSize: '11px',
    width: '14px',
    flexShrink: 0,
  },
  screenName: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '13px',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  flowName: {
    fontSize: '11px',
    color: '#444',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  meta: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  blockCount: {
    fontSize: '11px',
    color: '#555',
  },
  crossBadge: {
    fontSize: '11px',
    color: '#BA7517',
    background: '#1e1508',
    border: '1px solid #854F0B',
    padding: '1px 6px',
    borderRadius: '3px',
  },
  body: {
    padding: '10px 14px',
  },
  empty: {
    fontSize: '12px',
    color: '#444',
    fontStyle: 'italic',
    padding: '4px 0',
  },
}

export default function ScreenCard({ screen, moduleName, blockResolver = {} }) {
  const [expanded, setExpanded] = useState(false)
  const crossCount = countCrossModule(screen.blocks, moduleName, blockResolver)

  return (
    <div style={s.card}>
      <div
        style={{ ...s.header, ...(expanded ? s.headerExpanded : {}) }}
        onClick={() => setExpanded(e => !e)}
      >
        <span style={s.toggle}>{expanded ? '▾' : '▸'}</span>
        <ScreenIcon color="#555" />
        <span style={s.screenName}>{screen.name}</span>
        <span style={s.flowName}>{screen.flow}</span>
        <div style={s.meta}>
          {screen.blocks.length > 0 && (
            <span style={s.blockCount}>{screen.blocks.length} block{screen.blocks.length !== 1 ? 's' : ''}</span>
          )}
          {crossCount > 0 && (
            <span style={s.crossBadge}>⚠ {crossCount} cross-module</span>
          )}
        </div>
      </div>

      {expanded && (
        <div style={s.body}>
          {screen.blocks.length === 0 ? (
            <div style={s.empty}>no blocks — raw content screen</div>
          ) : (
            screen.blocks.map((block, i) => (
              <BlockNode
                key={`${block.name}-${i}`}
                block={block}
                ownerModule={moduleName}
                depth={0}
                blockResolver={blockResolver}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
