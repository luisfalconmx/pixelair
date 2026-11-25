import { ArrowDownToLine, Plus, TrashBin } from '@gravity-ui/icons'
import { Button, ProgressBar } from '@heroui/react'
import { useShallow } from 'zustand/react/shallow'
import { formatBytes } from '@/lib/size'
import { selectTotals, useImages } from '@/store/images'
import { FilePickerButton } from './FilePickerButton'
import { SavingsChip } from './SavingsChip'

export function Toolbar({ onExportAll }: { onExportAll: () => void }) {
  const totals = useImages(useShallow(selectTotals))
  const exporting = useImages((s) => s.exporting)
  const clear = useImages((s) => s.clear)

  return (
    <header className="flex items-center gap-4 border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <img src="/pixelair.svg" alt="" className="size-7" />
        <h1 className="text-lg font-bold tracking-tight">Pixelair</h1>
      </div>

      <div
        className="text-muted flex min-w-0 flex-1 items-center gap-2 text-sm"
        data-testid="totals"
      >
        <span>
          {totals.done}/{totals.count} optimized
        </span>
        {totals.done > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span>
              {formatBytes(totals.original)} → {formatBytes(totals.optimized)}
            </span>
            <SavingsChip original={totals.original} optimized={totals.optimized} />
          </>
        )}
      </div>

      {exporting && (
        <ProgressBar
          aria-label="Exporting"
          className="w-40"
          size="sm"
          value={exporting.done}
          maxValue={exporting.total}
        >
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      )}

      <FilePickerButton variant="secondary" size="sm">
        <Plus aria-hidden="true" />
        Add images
      </FilePickerButton>
      <Button variant="ghost" size="sm" onPress={clear} isDisabled={!!exporting}>
        <TrashBin aria-hidden="true" />
        Clear
      </Button>
      <Button size="sm" onPress={onExportAll} isPending={!!exporting} isDisabled={!!exporting}>
        <ArrowDownToLine aria-hidden="true" />
        Export all
      </Button>
    </header>
  )
}
