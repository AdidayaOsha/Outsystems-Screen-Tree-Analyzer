import { useState } from 'react'
import { getModuleColor } from '../lib/colorMap'

const s = {
  node: {
    position: 'relative',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 6px 3px 0',
    borderRadius: '3px',
    cursor: 'default',
    userSelect: 'none',
    minHeight: '26px',
  },
  toggle: {
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    cursor: 'pointer',
    color: '#444',
    fontSize: '10px',
    borderRadius: '2px',
    border: '1px solid #2a2a2a',
    background: '#141414',
    lineHeight: 1,
  },
  togglePlaceholder: {
    width: '16px',
    flexShrink: 0,
  },
  leftBar: {
    width: '2px',
    alignSelf: 'stretch',
    flexShrink: 0,
    borderRadius: '1px',
  },
  blockName: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '12px',
    fontWeight: 500,
  },
  moduleBadge: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '10px',
    padding: '1px 6px',
    borderRadius: '3px',
    border: '1px solid',
    flexShrink: 0,
  },
  childCount: {
    marginLeft: 'auto',
    fontSize: '11px',
    color: '#444',
    flexShrink: 0,
  },
  children: {
    marginLeft: '28px',
    borderLeft: '1px dashed',
    paddingLeft: '8px',
  },
}

export default function BlockNode({ block, ownerModule, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = block.blocks && block.blocks.length > 0
  const isCrossModule = block.sourceModule !== ownerModule
  const color = getModuleColor(block.sourceModule)

  return (
    <div style={s.node}>
      <div
        style={{
          ...s.row,
          background: isCrossModule ? color.bg + '80' : 'transparent',
          borderLeft: `2px solid ${isCrossModule ? color.border : '#2a2a2a'}`,
          paddingLeft: '6px',
        }}
      >
        {hasChildren ? (
          <button
            style={s.toggle}
            onClick={() => setExpanded(e => !e)}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span style={s.togglePlaceholder} />
        )}

        <span style={{ ...s.blockName, color: isCrossModule ? color.text : '#c0c0c0' }}>
          {block.name}
        </span>

        {isCrossModule && (
          <span
            style={{
              ...s.moduleBadge,
              color: color.text,
              borderColor: color.border,
              background: color.bg,
            }}
          >
            {block.sourceModule}
          </span>
        )}

        {hasChildren && !expanded && (
          <span style={s.childCount}>{block.blocks.length} child{block.blocks.length !== 1 ? 'ren' : ''}</span>
        )}
      </div>

      {hasChildren && expanded && (
        <div style={{ ...s.children, borderColor: color.border + '50' }}>
          {block.blocks.map((child, i) => (
            <BlockNode
              key={`${child.name}-${i}`}
              block={child}
              ownerModule={block.sourceModule}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
