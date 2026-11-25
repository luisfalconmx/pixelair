import { toast } from '@heroui/react'
import { useCallback } from 'react'
import { revealInFileManager } from '@/platform/export'
import { useImages } from '@/store/images'

/** Runs an export and reports the outcome with a toast. */
export function useExport() {
  const exportImages = useImages((s) => s.exportImages)

  return useCallback(
    async (ids?: string[]) => {
      try {
        const summary = await exportImages(ids)
        if (!summary) return
        const { saved, failed, directory } = summary
        if (saved.length > 0) {
          const id = toast.success(
            `Saved ${saved.length} ${saved.length === 1 ? 'file' : 'files'}`,
            {
              description: directory ?? 'Check your downloads folder',
              actionProps: directory
                ? {
                    children: 'Show in folder',
                    variant: 'tertiary',
                    onPress: () => {
                      void revealInFileManager(saved[0])
                      toast.close(id)
                    },
                  }
                : undefined,
            },
          )
        }
        if (failed.length > 0) {
          toast.danger(`${failed.length} ${failed.length === 1 ? 'file' : 'files'} failed`, {
            description: failed
              .slice(0, 3)
              .map((f) => `${f.name}: ${f.error}`)
              .join('\n'),
          })
        }
      } catch (error) {
        toast.danger('Export failed', {
          description: error instanceof Error ? error.message : String(error),
        })
      }
    },
    [exportImages],
  )
}
