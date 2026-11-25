import { invoke, isTauri } from '@tauri-apps/api/core'

export interface ExportFile {
  name: string
  data: Blob
}

export interface ExportTarget {
  /** Absolute folder path in the desktop app, `null` when the browser downloads files. */
  directory: string | null
}

/**
 * Asks where to save the optimized images.
 * Desktop: native folder picker. Browser (dev/E2E): files are downloaded.
 * Resolves `null` when the user cancels.
 */
export async function chooseExportTarget(): Promise<ExportTarget | null> {
  if (!isTauri()) return { directory: null }
  const { open } = await import('@tauri-apps/plugin-dialog')
  const directory = await open({
    directory: true,
    multiple: false,
    title: 'Choose where to save the optimized images',
  })
  return typeof directory === 'string' ? { directory } : null
}

/** Saves one file and resolves with the final path (desktop) or file name (browser). */
export async function saveFile(target: ExportTarget, file: ExportFile): Promise<string> {
  if (target.directory === null) {
    downloadInBrowser(file)
    return file.name
  }
  const bytes = new Uint8Array(await file.data.arrayBuffer())
  return invoke<string>('save_output', bytes, {
    headers: {
      'x-output-dir': encodeURIComponent(target.directory),
      'x-file-name': encodeURIComponent(file.name),
    },
  })
}

export async function revealInFileManager(path: string): Promise<void> {
  if (!isTauri()) return
  const { revealItemInDir } = await import('@tauri-apps/plugin-opener')
  await revealItemInDir(path)
}

function downloadInBrowser(file: ExportFile): void {
  const url = URL.createObjectURL(file.data)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
