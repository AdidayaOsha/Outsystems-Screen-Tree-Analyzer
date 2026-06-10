import { useMemo, useState, useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getModuleColor } from '../lib/colorMap'

// ── Node dimensions (used for centering + handle routing) ─────────────────────
const NW = 190, NH = 82
const GW = 150, GH = 52

// ── Custom nodes ──────────────────────────────────────────────────────────────

function ModuleNode({ data, selected }) {
  const color = getModuleColor(data.name)
  return (
    <div
      style={{
        background: color.bg,
        border: `1.5px solid ${selected ? color.text : color.border}`,
        borderRadius: '10px',
        padding: '10px 14px',
        width: NW,
        boxShadow: selected ? `0 0 0 3px ${color.border}55, 0 8px 32px #00000060` : '0 4px 16px #00000040',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
    >
      {['top','bottom','left','right'].map(side => (
        <Handle
          key={side}
          id={side}
          type="source"
          position={Position[side.charAt(0).toUpperCase() + side.slice(1)]}
          style={{ opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
        />
      ))}
      {['top','bottom','left','right'].map(side => (
        <Handle
          key={`t-${side}`}
          id={`t-${side}`}
          type="target"
          position={Position[side.charAt(0).toUpperCase() + side.slice(1)]}
          style={{ opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
        />
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color.dot, flexShrink: 0 }} />
        <span style={{ color: color.text, fontFamily: 'JetBrains Mono, Fira Code, monospace', fontSize: '12px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {data.name}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '8px', paddingLeft: '15px' }}>
        <span style={{ color: '#555', fontSize: '10px', fontFamily: 'monospace' }}>{data.moduleType}</span>
        <span style={{ color: '#444', fontSize: '10px', fontFamily: 'monospace' }}>
          {data.screenCount} screen{data.screenCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}

function GhostNode({ data, selected }) {
  return (
    <div
      style={{
        background: '#0a0a0a',
        border: `1px dashed ${selected ? '#555' : '#252525'}`,
        borderRadius: '8px',
        padding: '8px 12px',
        width: GW,
        opacity: 0.65,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {['top','bottom','left','right'].map(side => (
        <Handle
          key={side}
          id={side}
          type="source"
          position={Position[side.charAt(0).toUpperCase() + side.slice(1)]}
          style={{ opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
        />
      ))}
      {['top','bottom','left','right'].map(side => (
        <Handle
          key={`t-${side}`}
          id={`t-${side}`}
          type="target"
          position={Position[side.charAt(0).toUpperCase() + side.slice(1)]}
          style={{ opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
        />
      ))}
      <div style={{ color: '#555', fontFamily: 'JetBrains Mono, Fira Code, monospace', fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {data.name}
      </div>
      <div style={{ color: '#333', fontSize: '10px', marginTop: '2px' }}>not loaded</div>
    </div>
  )
}

const nodeTypes = { moduleNode: ModuleNode, ghostNode: GhostNode }

// ── Build graph data ───────────────────────────────────────────────────────────

function pickHandles(sx, sy, tx, ty) {
  const dx = tx - sx, dy = ty - sy
  let src, tgt
  if (Math.abs(dx) >= Math.abs(dy)) {
    src = dx >= 0 ? 'right' : 'left'
    tgt = dx >= 0 ? 'left' : 'right'
  } else {
    src = dy >= 0 ? 'bottom' : 'top'
    tgt = dy >= 0 ? 'top' : 'bottom'
  }
  return { sourceHandle: src, targetHandle: `t-${tgt}` }
}

function buildGraph(modules, blockResolver, showGhosts) {
  const loaded = new Set(modules.map(m => m.name))

  // Count edge weights: consumer → provider
  const edgeMap = {} // `A→B` → { count }
  function walk(blocks, owner) {
    for (const b of blocks) {
      if (b.sourceModule !== owner) {
        const k = `${owner}→${b.sourceModule}`
        edgeMap[k] = (edgeMap[k] || 0) + 1
      }
      const kids = blockResolver[b.sourceModule]?.[b.name] ?? b.blocks
      walk(kids, b.sourceModule)
    }
  }
  for (const mod of modules) {
    for (const scr of mod.screens) walk(scr.blocks, mod.name)
  }

  // Separate loaded vs ghost
  const allNames = new Set([...loaded, ...Object.keys(edgeMap).flatMap(k => k.split('→'))])
  const loadedList = [...loaded]
  const ghostList = [...allNames].filter(n => !loaded.has(n))

  const CX = 600, CY = 440
  const LR = Math.max(240, loadedList.length * 45)
  const GR = LR + 200

  // Compute center positions for handle routing
  const centerOf = {}

  const nodes = [
    ...loadedList.map((name, i) => {
      const a = (i / loadedList.length) * 2 * Math.PI - Math.PI / 2
      const x = CX + LR * Math.cos(a) - NW / 2
      const y = CY + LR * Math.sin(a) - NH / 2
      centerOf[name] = { x: x + NW / 2, y: y + NH / 2 }
      const mod = modules.find(m => m.name === name)
      return {
        id: name,
        type: 'moduleNode',
        position: { x, y },
        data: {
          name,
          moduleType: mod?.type ?? 'Unknown',
          screenCount: mod?.screens.length ?? 0,
        },
      }
    }),
    ...(showGhosts ? ghostList : []).map((name, i) => {
      const a = (i / ghostList.length) * 2 * Math.PI - Math.PI / 2
      const x = CX + GR * Math.cos(a) - GW / 2
      const y = CY + GR * Math.sin(a) - GH / 2
      centerOf[name] = { x: x + GW / 2, y: y + GH / 2 }
      return {
        id: name,
        type: 'ghostNode',
        position: { x, y },
        data: { name },
      }
    }),
  ]

  const maxCount = Math.max(...Object.values(edgeMap), 1)
  const edges = Object.entries(edgeMap)
    .filter(([k]) => {
      const [src, tgt] = k.split('→')
      return loaded.has(src) && (showGhosts || loaded.has(tgt))
    })
    .map(([k, count]) => {
      const [source, target] = k.split('→')
      const sc = centerOf[source], tc = centerOf[target]
      const { sourceHandle, targetHandle } = sc && tc
        ? pickHandles(sc.x, sc.y, tc.x, tc.y)
        : { sourceHandle: 'right', targetHandle: 't-left' }
      const col = getModuleColor(source)
      const w = 1 + (count / maxCount) * 2.5
      return {
        id: k,
        source,
        target,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        animated: true,
        label: count,
        labelStyle: { fill: '#555', fontSize: 10, fontFamily: 'monospace', background: 'transparent' },
        labelBgStyle: { fill: '#111', fillOpacity: 0.8 },
        style: { stroke: col.border, strokeWidth: w, opacity: 0.7 },
        markerEnd: { type: MarkerType.ArrowClosed, color: col.border, width: 12, height: 12 },
        data: { count },
      }
    })

  return { nodes, edges, edgeMap }
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ nodeId, modules, edgeMap, onClose }) {
  const loaded = new Set(modules.map(m => m.name))
  const mod = modules.find(m => m.name === nodeId)
  const color = loaded.has(nodeId) ? getModuleColor(nodeId) : null

  const consumes = Object.entries(edgeMap)
    .filter(([k]) => k.startsWith(nodeId + '→'))
    .map(([k, count]) => ({ name: k.split('→')[1], count }))
    .sort((a, b) => b.count - a.count)

  const consumedBy = Object.entries(edgeMap)
    .filter(([k]) => k.endsWith('→' + nodeId))
    .map(([k, count]) => ({ name: k.split('→')[0], count }))
    .sort((a, b) => b.count - a.count)

  return (
    <div style={{
      background: '#111',
      border: `1px solid ${color ? color.border : '#2a2a2a'}`,
      borderRadius: '8px',
      padding: '16px',
      width: '230px',
      fontSize: '12px',
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div>
          {color && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color.dot, marginRight: 6, verticalAlign: 'middle' }} />}
          <span style={{ color: color ? color.text : '#555', fontWeight: 700, fontSize: '12px' }}>{nodeId}</span>
          {mod && <div style={{ color: '#444', fontSize: '10px', marginTop: '3px', marginLeft: color ? 14 : 0 }}>{mod.type} · {mod.screens.length} screens</div>}
          {!mod && <div style={{ color: '#333', fontSize: '10px', marginTop: '3px' }}>not loaded</div>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '14px', padding: '0 0 0 8px', lineHeight: 1 }}>×</button>
      </div>

      {consumes.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ color: '#333', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>consumes from</div>
          {consumes.map(({ name, count }) => {
            const c = getModuleColor(name)
            return (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0', borderBottom: '1px solid #1a1a1a' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                <span style={{ color: '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px' }}>{name}</span>
                <span style={{ color: '#555', fontSize: '10px', flexShrink: 0 }}>{count}</span>
              </div>
            )
          })}
        </div>
      )}

      {consumedBy.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ color: '#333', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>consumed by</div>
          {consumedBy.map(({ name, count }) => {
            const c = getModuleColor(name)
            return (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0', borderBottom: '1px solid #1a1a1a' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                <span style={{ color: '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px' }}>{name}</span>
                <span style={{ color: '#555', fontSize: '10px', flexShrink: 0 }}>{count}</span>
              </div>
            )
          })}
        </div>
      )}

      {consumes.length === 0 && consumedBy.length === 0 && (
        <div style={{ color: '#333', fontSize: '11px', marginTop: '6px' }}>no cross-module connections</div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function GraphView({ modules, blockResolver }) {
  const [showGhosts, setShowGhosts] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [edgeMap, setEdgeMap] = useState({})

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Rebuild layout when data or ghost toggle changes (resets positions)
  useEffect(() => {
    const { nodes: n, edges: e, edgeMap: em } = buildGraph(modules, blockResolver, showGhosts)
    setNodes(n)
    setEdges(e)
    setEdgeMap(em)
    setSelectedId(null)
  }, [modules, blockResolver, showGhosts])

  const onNodeClick = useCallback((_, node) => {
    setSelectedId(id => id === node.id ? null : node.id)
  }, [])

  const onPaneClick = useCallback(() => setSelectedId(null), [])

  // Apply selection styling on top of draggable positions
  const displayNodes = useMemo(() => nodes.map(n => ({
    ...n,
    selected: n.id === selectedId,
    style: { opacity: selectedId && n.id !== selectedId ? 0.35 : 1 },
  })), [nodes, selectedId])

  const displayEdges = useMemo(() => edges.map(e => ({
    ...e,
    style: {
      ...e.style,
      opacity: selectedId
        ? (e.source === selectedId || e.target === selectedId ? 1 : 0.06)
        : 0.7,
      strokeWidth: selectedId && (e.source === selectedId || e.target === selectedId)
        ? e.style.strokeWidth * 2
        : e.style.strokeWidth,
    },
    animated: selectedId
      ? (e.source === selectedId || e.target === selectedId)
      : true,
  })), [edges, selectedId])

  return (
    <div style={{ flex: 1, position: 'relative', background: '#0a0a0a' }}>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        colorMode="dark"
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: '#0a0a0a' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1a1a1a" />
        <Controls
          style={{
            background: '#111',
            border: '1px solid #1e1e1e',
            borderRadius: '6px',
          }}
        />
        <MiniMap
          nodeColor={n => n.type === 'moduleNode' ? getModuleColor(n.data.name).dot : '#222'}
          style={{
            background: '#0d0d0d',
            border: '1px solid #1e1e1e',
            borderRadius: '6px',
          }}
          maskColor="#0a0a0a99"
        />

        {/* Toolbar */}
        <Panel position="top-left">
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => setShowGhosts(v => !v)}
              style={{
                padding: '5px 10px',
                background: showGhosts ? '#0d2820' : '#141414',
                border: `1px solid ${showGhosts ? '#0F6E56' : '#2a2a2a'}`,
                borderRadius: '4px',
                color: showGhosts ? '#4ecfa0' : '#555',
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {showGhosts ? '◉' : '○'} external modules
            </button>
            <span style={{ color: '#333', fontSize: '11px', fontFamily: 'monospace' }}>
              {modules.length} loaded · {Object.keys(edgeMap).length} connections
            </span>
          </div>
        </Panel>

        {/* Detail panel */}
        {selectedId && (
          <Panel position="top-right">
            <DetailPanel
              nodeId={selectedId}
              modules={modules}
              edgeMap={edgeMap}
              onClose={() => setSelectedId(null)}
            />
          </Panel>
        )}
      </ReactFlow>
    </div>
  )
}
