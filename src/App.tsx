import { Chip } from '@heroui/react'
import { DropZone } from './components/DropZone'

export function App() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 p-8">
      <header className="flex flex-col items-center gap-2 text-center">
        <img src="/pixelair.svg" alt="" className="size-16" />
        <h1 className="text-4xl font-bold tracking-tight">Pixelair</h1>
        <p className="text-muted">
          Optimize your images. Smaller files, same quality, no metadata.
        </p>
        <Chip color="accent">v{__APP_VERSION__}</Chip>
      </header>
      <DropZone />
    </main>
  )
}
