import { useState, useEffect, useMemo } from 'react'
import { getModuleColor } from './lib/colorMap'
import ImportPanel from './components/ImportPanel'
import ScreenCard from './components/ScreenCard'
import ModuleLegend from './components/ModuleLegend'
import SearchPanel from './components/SearchPanel'

const LS_KEY = 'os-screen-explorer:modules'

const s = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 20px',
    height: '48px',
    borderBottom: '1px solid #1e1e1e',
    background: '#0d0d0d',
    flexShrink: 0,
  },
  headerDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#4ecfa0',
    flexShrink: 0,
  },
  headerTitle: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '13px',
    fontWeight: 600,
    color: '#e0e0e0',
    letterSpacing: '0.02em',
  },
  headerSub: {
    fontSize: '11px',
    color: '#333',
    marginLeft: 'auto',
  },
  restoreBanner: {
    background: '#0d2820',
    border: '1px solid #0F6E56',
    borderRadius: '4px',
    margin: '12px 20px 0',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '12px',
    color: '#4ecfa0',
    flexShrink: 0,
  },
  restoreBtn: {
    padding: '4px 12px',
    background: '#1D9E75',
    border: 'none',
    borderRadius: '3px',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  dismissBtn: {
    padding: '4px 10px',
    background: 'none',
    border: '1px solid #2a4a3a',
    borderRadius: '3px',
    color: '#4ecfa0',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  moduleTabs: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    gap: '4px',
    borderBottom: '1px solid #1e1e1e',
    background: '#0d0d0d',
    overflowX: 'auto',
    flexShrink: 0,
    minHeight: '44px',
  },
  moduleTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    borderRadius: '4px 4px 0 0',
    cursor: 'pointer',
    border: '1px solid transparent',
    borderBottom: '1px solid #1e1e1e',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '11px',
    color: '#555',
    background: 'none',
    outline: 'none',
    whiteSpace: 'nowrap',
    marginBottom: '-1px',
    transition: 'color 0.1s',
  },
  moduleTabDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  moduleTabRemove: {
    background: 'none',
    border: 'none',
    color: '#333',
    cursor: 'pointer',
    padding: '0 0 0 4px',
    fontSize: '12px',
    lineHeight: 1,
    transition: 'color 0.1s',
  },
  screenList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '16px',
    padding: '40px',
  },
  emptyTitle: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '14px',
    color: '#333',
    textAlign: 'center',
  },
  emptyPanelWrap: {
    width: '100%',
    maxWidth: '480px',
  },
  flowGroup: {
    marginBottom: '20px',
  },
  flowLabel: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '10px',
    color: '#333',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '8px',
    paddingBottom: '6px',
    borderBottom: '1px solid #1a1a1a',
  },
  importToggle: {
    padding: '5px 12px',
    background: '#141414',
    border: '1px solid #2a2a2a',
    borderRadius: '4px',
    color: '#666',
    fontSize: '11px',
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    marginLeft: 'auto',
  },
  importOverlay: {
    padding: '16px 20px',
    borderBottom: '1px solid #1e1e1e',
    background: '#0a0a0a',
    flexShrink: 0,
  },
}

export default function App() {
  const [modules, setModules] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(true)
  const [storedModules, setStoredModules] = useState(null)

  // Check localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && parsed.length > 0) {
          setStoredModules(parsed)
        }
      }
    } catch {
      // ignore corrupt storage
    }
  }, [])

  const persistModules = mods => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(mods))
    } catch {
      // quota exceeded or private browsing
    }
  }

  const addModules = newMods => {
    setModules(prev => {
      const combined = [...prev]
      for (const m of newMods) {
        const exists = combined.findIndex(x => x.name === m.name)
        if (exists >= 0) {
          combined[exists] = m
        } else {
          combined.push(m)
        }
      }
      persistModules(combined)
      return combined
    })
    setShowImport(false)
    setActiveIdx(0)
    setStoredModules(null)
  }

  const removeModule = (e, idx) => {
    e.stopPropagation()
    setModules(prev => {
      const next = prev.filter((_, i) => i !== idx)
      persistModules(next)
      return next
    })
    setActiveIdx(i => Math.min(i, Math.max(0, modules.length - 2)))
  }

  const restoreSession = () => {
    setModules(storedModules)
    setStoredModules(null)
    setShowImport(false)
  }

  // Build a resolver: moduleName → { blockName → blocks[] }
  // Only modules with blockDefs (from real XML) contribute to resolution.
  // Modules without blockDefs (demo data) still appear as keys so cross-module
  // blocks from them pass the visibility filter.
  const blockResolver = useMemo(() => {
    const res = {}
    for (const mod of modules) {
      res[mod.name] = mod.blockDefs || {}
    }
    return res
  }, [modules])

  const activeModule = modules[activeIdx]

  const groupedScreens = activeModule
    ? activeModule.screens.reduce((acc, screen) => {
        if (!acc[screen.flow]) acc[screen.flow] = []
        acc[screen.flow].push(screen)
        return acc
      }, {})
    : {}

  return (
    <div style={s.app}>
      <header style={s.header}>
        <div style={s.headerDot} />
        <span style={s.headerTitle}>OS Screen Explorer</span>
        {modules.length > 0 && (
          <button style={s.importToggle} onClick={() => setShowImport(v => !v)}>
            {showImport ? '× close import' : '+ import'}
          </button>
        )}
        <span style={s.headerSub}>O11 · Reactive Web · Block Tree Analyzer</span>
      </header>

      {storedModules && (
        <div style={s.restoreBanner}>
          <span>Restore {storedModules.length} module{storedModules.length !== 1 ? 's' : ''} from last session?</span>
          <button style={s.restoreBtn} onClick={restoreSession}>Restore</button>
          <button style={s.dismissBtn} onClick={() => setStoredModules(null)}>Dismiss</button>
        </div>
      )}

      <div style={s.body}>
        <div style={s.main}>
          {modules.length === 0 || showImport ? (
            <div style={s.importOverlay}>
              <ImportPanel onModulesLoaded={addModules} />
            </div>
          ) : null}

          {modules.length > 0 && (
            <>
              {!showImport && (
                <SearchPanel
                  modules={modules}
                  query={search}
                  onQueryChange={setSearch}
                />
              )}

              <div style={s.moduleTabs}>
                {modules.map((mod, i) => {
                  const color = getModuleColor(mod.name)
                  const isActive = i === activeIdx
                  return (
                    <button
                      key={mod.name}
                      style={{
                        ...s.moduleTab,
                        color: isActive ? color.text : '#555',
                        borderColor: isActive ? color.border : 'transparent',
                        borderBottomColor: isActive ? '#0d0d0d' : '#1e1e1e',
                        background: isActive ? '#111111' : 'none',
                      }}
                      onClick={() => setActiveIdx(i)}
                    >
                      <span style={{ ...s.moduleTabDot, background: color.dot }} />
                      {mod.name}
                      <span style={{ marginLeft: '4px', color: '#333', fontSize: '10px' }}>
                        {mod.screens.length}
                      </span>
                      <span
                        style={s.moduleTabRemove}
                        onClick={e => removeModule(e, i)}
                        title="Remove module"
                        onMouseEnter={e => (e.target.style.color = '#e87070')}
                        onMouseLeave={e => (e.target.style.color = '#333')}
                      >
                        ×
                      </span>
                    </button>
                  )
                })}
              </div>

              <div style={s.screenList}>
                {activeModule && Object.entries(groupedScreens).map(([flow, screens]) => (
                  <div key={flow} style={s.flowGroup}>
                    <div style={s.flowLabel}>{flow}</div>
                    {screens.map((screen, i) => (
                      <ScreenCard
                        key={`${screen.name}-${i}`}
                        screen={screen}
                        moduleName={activeModule.name}
                        blockResolver={blockResolver}
                      />
                    ))}
                  </div>
                ))}
              </div>

              <ModuleLegend modules={modules} />
            </>
          )}

          {modules.length === 0 && !showImport && (
            <div style={s.emptyState}>
              <div style={s.emptyTitle}>No modules loaded</div>
              <div style={s.emptyPanelWrap}>
                <ImportPanel onModulesLoaded={addModules} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
