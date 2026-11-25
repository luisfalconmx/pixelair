import { CloudArrowUpIn, FolderOpen } from '@gravity-ui/icons'
import { FilePickerButton } from './FilePickerButton'

export const SUPPORTED_FORMATS = ['JPG', 'JPEG', 'PNG', 'WebP', 'AVIF', 'GIF', 'BMP'] as const

/** Empty state: invites the user to drop or pick images. */
export function DropZone() {
  return (
    <section
      aria-label="Add images"
      className="flex w-full max-w-2xl flex-col items-center gap-5 rounded-3xl border-2 border-dashed border-border bg-surface/40 px-10 py-14 text-center"
    >
      <CloudArrowUpIn aria-hidden="true" className="size-14 text-accent" />
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Drop images here</h2>
        <p className="text-muted text-sm">
          Optimize as many as you want at once. Supported: {SUPPORTED_FORMATS.join(', ')}
        </p>
      </div>
      <FilePickerButton size="lg">
        <FolderOpen aria-hidden="true" />
        Select images
      </FilePickerButton>
      <p className="text-muted text-xs">
        Everything runs locally — your images never leave this device.
      </p>
    </section>
  )
}

/** Full-window overlay shown while dragging files over the app. */
export function DropOverlay() {
  return (
    <div
      role="presentation"
      data-testid="drop-overlay"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-accent px-16 py-12">
        <CloudArrowUpIn aria-hidden="true" className="size-12 text-accent" />
        <p className="text-lg font-semibold">Drop to optimize</p>
      </div>
    </div>
  )
}
