import { CircleExclamation, Xmark } from '@gravity-ui/icons'
import { Button, Spinner } from '@heroui/react'
import { formatBytes } from '@/lib/size'
import { type ImageItem, useImages } from '@/store/images'
import { SavingsChip } from './SavingsChip'

function ImageRow({ item, selected }: { item: ImageItem; selected: boolean }) {
  const select = useImages((s) => s.select)
  const remove = useImages((s) => s.remove)

  return (
    <li
      data-testid="image-row"
      data-status={item.status}
      className={`group relative flex items-center gap-3 rounded-xl p-2 transition-colors ${
        selected ? 'bg-accent-soft' : 'hover:bg-surface'
      }`}
    >
      <button
        type="button"
        aria-current={selected || undefined}
        aria-label={`Show ${item.name}`}
        onClick={() => select(item.id)}
        className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-accent"
      />
      <img
        src={item.result?.url ?? item.originalUrl}
        alt=""
        className="checkerboard size-12 shrink-0 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={item.name}>
          {item.name}
        </p>
        <p className="text-muted flex items-center gap-1.5 text-xs whitespace-nowrap">
          <span>{formatBytes(item.originalSize)}</span>
          {item.status === 'done' && item.result && (
            <>
              <span aria-hidden="true">→</span>
              <span className="text-foreground" data-testid="optimized-size">
                {formatBytes(item.result.size)}
              </span>
            </>
          )}
          {item.status === 'processing' && <span>Optimizing…</span>}
          {item.status === 'error' && <span className="text-danger">Failed</span>}
        </p>
      </div>
      <div className="relative flex shrink-0 items-center gap-1">
        {item.status === 'processing' && <Spinner size="sm" aria-label="Optimizing" />}
        {item.status === 'error' && (
          <CircleExclamation className="text-danger size-4" aria-label={item.error ?? 'Failed'} />
        )}
        {item.status === 'done' && item.result && (
          <SavingsChip original={item.originalSize} optimized={item.result.size} />
        )}
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={`Remove ${item.name}`}
          onPress={() => remove(item.id)}
        >
          <Xmark aria-hidden="true" />
        </Button>
      </div>
    </li>
  )
}

export function ImageList() {
  const items = useImages((s) => s.items)
  const selectedId = useImages((s) => s.selectedId)

  return (
    <ul aria-label="Images" className="flex flex-col gap-1">
      {items.map((item) => (
        <ImageRow key={item.id} item={item} selected={item.id === selectedId} />
      ))}
    </ul>
  )
}
