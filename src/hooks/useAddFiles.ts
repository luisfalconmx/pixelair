import { toast } from '@heroui/react'
import { useCallback } from 'react'
import { useImages } from '@/store/images'

/** Adds files to the queue and reports the ones that aren't supported. */
export function useAddFiles() {
  const addFiles = useImages((s) => s.addFiles)
  return useCallback(
    (files: Iterable<File>) => {
      const { rejected } = addFiles(files)
      if (rejected.length > 0) {
        toast.danger(
          rejected.length === 1 ? 'Unsupported file' : `${rejected.length} unsupported files`,
          { description: rejected.slice(0, 3).join(', ') + (rejected.length > 3 ? '…' : '') },
        )
      }
    },
    [addFiles],
  )
}
