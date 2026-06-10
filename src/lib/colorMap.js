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

function hashName(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(31, h) + name.charCodeAt(i) | 0
  }
  return Math.abs(h)
}

export function getModuleColor(moduleName) {
  const idx = hashName(moduleName) % PALETTE.length
  return PALETTE[idx]
}

export function buildColorMap(moduleNames) {
  const map = new Map()
  for (const name of moduleNames) {
    map.set(name, getModuleColor(name))
  }
  return map
}
