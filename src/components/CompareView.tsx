import { Spinner, ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { type KeyboardEvent, type PointerEvent, useRef, useState } from 'react'
import { OUTPUT_FORMATS } from '@/lib/formats'
import { formatBytes } from '@/lib/size'
import type { ImageItem } from '@/store/images'
import { SavingsChip } from './SavingsChip'

type Zoom = 'fit' | '1' | '2'

/** Squoosh-style before/after comparison with a draggable divider. */
export function CompareView({ item }: { item: ImageItem }) {
  const [position, setPosition] = useState(50)
  const [zoom, setZoom] = useState<Zoom>('fit')
  const stage = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const moveTo = (clientX: number) => {
    const rect = stage.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)))
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    moveTo(event.clientX)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) moveTo(event.clientX)
  }
  const onPointerUp = () => {
    dragging.current = false
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2
    if (event.key === 'ArrowLeft') setPosition((p) => Math.max(0, p - step))
    else if (event.key === 'ArrowRight') setPosition((p) => Math.min(100, p + step))
    else if (event.key === 'Home') setPosition(0)
    else if (event.key === 'End') setPosition(100)
    else return
    event.preventDefault()
  }

  const width = item.width ?? undefined
  const height = item.height ?? undefined
  const zoomFactor = zoom === 'fit' ? null : Number(zoom)
  const imageSize =
    zoomFactor && width && height
      ? { width: width * zoomFactor, height: height * zoomFactor }
      : undefined
  const format = OUTPUT_FORMATS[item.settings.format]

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        className={`checkerboard relative min-h-0 flex-1 ${zoomFactor ? 'overflow-auto' : 'overflow-hidden'}`}
      >
        <div
          ref={stage}
          data-testid="compare-stage"
          className={`relative touch-none select-none ${zoomFactor ? 'm-auto' : 'size-full'}`}
          style={imageSize}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img
            src={item.originalUrl}
            alt={`${item.name} (original)`}
            draggable={false}
            className="pointer-events-none absolute inset-0 size-full object-contain"
            style={{ imageRendering: zoomFactor && zoomFactor > 1 ? 'pixelated' : undefined }}
          />
          {item.result && (
            <img
              src={item.result.url}
              alt={`${item.name} (optimized)`}
              draggable={false}
              className="pointer-events-none absolute inset-0 size-full object-contain"
              style={{
                clipPath: `inset(0 0 0 ${position}%)`,
                imageRendering: zoomFactor && zoomFactor > 1 ? 'pixelated' : undefined,
              }}
            />
          )}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Comparison divider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(position)}
            aria-valuetext={`${Math.round(position)}% original`}
            onKeyDown={onKeyDown}
            className="absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 cursor-ew-resize bg-white shadow-[0_0_6px_rgba(0,0,0,.6)] focus-visible:outline-2 focus-visible:outline-accent"
            style={{ left: `${position}%` }}
          >
            <span className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xs font-bold text-black shadow-lg">
              ⇔
            </span>
          </div>
        </div>
        <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-background/80 px-3 py-1 text-xs backdrop-blur">
          Original
        </span>
        <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-background/80 px-3 py-1 text-xs backdrop-blur">
          {format.label}
        </span>
        {item.status === 'processing' && (
          <div className="absolute top-12 right-3 flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-xs backdrop-blur">
            <Spinner size="sm" aria-hidden="true" /> Optimizing…
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-2 text-sm">
        <div>
          <span className="text-muted">Original</span>{' '}
          <span className="font-medium">{formatBytes(item.originalSize)}</span>
          {width && height && (
            <span className="text-muted">
              {' '}
              · {width}×{height}
            </span>
          )}
        </div>
        <ToggleButtonGroup
          aria-label="Zoom"
          size="sm"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[zoom]}
          onSelectionChange={(keys) => setZoom((Array.from(keys)[0] as Zoom) ?? 'fit')}
        >
          <ToggleButton id="fit">Fit</ToggleButton>
          <ToggleButton id="1">100%</ToggleButton>
          <ToggleButton id="2">200%</ToggleButton>
        </ToggleButtonGroup>
        <div className="flex items-center gap-2" data-testid="compare-result">
          <span className="text-muted">{format.label}</span>
          {item.status === 'error' ? (
            <span className="text-danger">{item.error}</span>
          ) : item.result ? (
            <>
              <span className="font-medium">{formatBytes(item.result.size)}</span>
              <SavingsChip original={item.originalSize} optimized={item.result.size} />
            </>
          ) : (
            <span className="text-muted">—</span>
          )}
        </div>
      </div>
    </div>
  )
}
