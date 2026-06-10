import { getModuleColor } from '../lib/colorMap'

const s = {
  container: {
    padding: '12px 16px',
    borderBottom: '1px solid #1e1e1e',
    background: '#0d0d0d',
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    width: '100%',
    background: '#141414',
    border: '1px solid #2a2a2a',
    borderRadius: '4px',
    padding: '8px 12px 8px 34px',
    color: '#e0e0e0',
    fontSize: '13px',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#444',
    fontSize: '14px',
    pointerEvents: 'none',
  },
  results: {
    marginTop: '8px',
    maxHeight: '300px',
    overflowY: 'auto',
    border: '1px solid #1e1e1e',
    borderRadius: '4px',
    background: '#111111',
  },
  result: {
    padding: '8px 12px',
    borderBottom: '1px solid #1a1a1a',
    cursor: 'default',
  },
  path: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '11px',
    color: '#555',
    marginBottom: '2px',
  },
  pathSep: {
    color: '#333',
    margin: '0 4px',
  },
  blockNameHL: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '12px',
    fontWeight: 600,
  },
  modBadge: {
    display: 'inline-block',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '10px',
    padding: '1px 5px',
    borderRadius: '3px',
    border: '1px solid',
    marginLeft: '8px',
    verticalAlign: 'middle',
  },
  noResults: {
    padding: '12px',
    color: '#444',
    fontSize: '12px',
    textAlign: 'center',
    fontStyle: 'italic',
  },
}

function searchBlocks(blocks, moduleName, screenName, pathParts, query, results) {
  for (const block of blocks) {
    const lq = query.toLowerCase()
    const matchBlock = block.name.toLowerCase().includes(lq)
    const matchModule = block.sourceModule.toLowerCase().includes(lq)

    if (matchBlock || matchModule) {
      results.push({
        blockName: block.name,
        sourceModule: block.sourceModule,
        path: [...pathParts, block.name],
        moduleName,
        screenName,
      })
    }

    if (block.blocks) {
      searchBlocks(block.blocks, moduleName, screenName, [...pathParts, block.name], query, results)
    }
  }
}

export default function SearchPanel({ modules, query, onQueryChange }) {
  const results = []

  if (query.trim().length >= 2) {
    for (const mod of modules) {
      for (const screen of mod.screens) {
        searchBlocks(screen.blocks, mod.name, screen.name, [mod.name, screen.name], query, results)
      }
    }
  }

  return (
    <div style={s.container}>
      <div style={s.inputWrap}>
        <span style={s.searchIcon}>⌕</span>
        <input
          style={s.input}
          type="text"
          placeholder="Search blocks or modules…"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onFocus={e => (e.target.style.borderColor = '#3a3a3a')}
          onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
        />
      </div>

      {query.trim().length >= 2 && (
        <div style={s.results}>
          {results.length === 0 ? (
            <div style={s.noResults}>No matches</div>
          ) : (
            results.map((r, i) => {
              const color = getModuleColor(r.sourceModule)
              return (
                <div key={i} style={s.result}>
                  <div style={s.path}>
                    {r.path.slice(0, -1).map((p, j) => (
                      <span key={j}>
                        {p}
                        <span style={s.pathSep}>→</span>
                      </span>
                    ))}
                  </div>
                  <span style={{ ...s.blockNameHL, color: color.text }}>
                    {r.blockName}
                  </span>
                  <span
                    style={{
                      ...s.modBadge,
                      color: color.text,
                      borderColor: color.border,
                      background: color.bg,
                    }}
                  >
                    {r.sourceModule}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
