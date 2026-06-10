import JSZip from 'jszip'

// readOmlBytes: if true, includes raw ArrayBuffer for each .oml (needed for server-side conversion)
export async function parseOapZip(arrayBuffer, readOmlBytes = false) {
  const zip = await JSZip.loadAsync(arrayBuffer)
  const omlFiles = []
  const appXml = { name: null, content: null }

  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir) continue
    const fileName = path.split('/').pop()

    if (fileName === 'application.xml') {
      appXml.content = await file.async('string')
      appXml.name = fileName
    } else if (fileName.endsWith('.oml')) {
      const entry = { name: fileName, path }
      if (readOmlBytes) entry.bytes = await file.async('arraybuffer')
      omlFiles.push(entry)
    }
  }

  return { omlFiles, appXml }
}
