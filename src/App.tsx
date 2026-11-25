import { Toast } from '@heroui/react'
import { CompareView } from './components/CompareView'
import { DropOverlay, DropZone } from './components/DropZone'
import { ImageList } from './components/ImageList'
import { SettingsPanel } from './components/SettingsPanel'
import { Toolbar } from './components/Toolbar'
import { useAddFiles } from './hooks/useAddFiles'
import { useExport } from './hooks/useExport'
import { useFileDrop } from './hooks/useFileDrop'
import { selectSelectedItem, useImages } from './store/images'

function EmptyState() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-8 p-8">
      <header className="flex flex-col items-center gap-2 text-center">
        <img src="/pixelair.svg" alt="" className="size-16" />
        <h1 className="text-4xl font-bold tracking-tight">Pixelair</h1>
        <p className="text-muted">Smaller images, same quality, no metadata.</p>
        <p className="text-muted text-xs">v{__APP_VERSION__}</p>
      </header>
      <DropZone />
    </main>
  )
}

function Workspace() {
  const selected = useImages(selectSelectedItem)
  const runExport = useExport()

  return (
    <div className="flex h-full flex-col">
      <Toolbar onExportAll={() => void runExport()} />
      <div className="flex min-h-0 flex-1">
        <aside
          aria-label="Image queue"
          className="w-80 shrink-0 overflow-y-auto border-r border-border p-2"
        >
          <ImageList />
        </aside>
        <main className="min-w-0 flex-1">
          {selected && <CompareView key={selected.id} item={selected} />}
        </main>
        {selected && (
          <aside
            aria-label="Settings"
            className="w-96 shrink-0 overflow-y-auto border-l border-border p-4"
          >
            <SettingsPanel
              key={selected.id}
              item={selected}
              onExport={() => void runExport([selected.id])}
            />
          </aside>
        )}
      </div>
    </div>
  )
}

export function App() {
  const hasItems = useImages((s) => s.items.length > 0)
  const addFiles = useAddFiles()
  const isDragging = useFileDrop(addFiles)

  return (
    <>
      {hasItems ? <Workspace /> : <EmptyState />}
      {isDragging && <DropOverlay />}
      <Toast.Provider placement="bottom end" />
    </>
  )
}
