import JSZip from 'jszip'

export async function parseOapZip(arrayBuffer) {
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
      omlFiles.push({
        name: fileName,
        path,
        // We don't attempt to decode OML — it's a proprietary binary format
        // The user must run convert scripts to get XML
      })
    }
  }

  return { omlFiles, appXml }
}
