import { Button, type ButtonProps } from '@heroui/react'
import { type ReactNode, useRef } from 'react'
import { useAddFiles } from '@/hooks/useAddFiles'
import { ACCEPT_ATTRIBUTE } from '@/lib/formats'

interface FilePickerButtonProps extends Omit<ButtonProps, 'onPress' | 'children'> {
  children: ReactNode
}

/** Button that opens the system file picker (multiple images). */
export function FilePickerButton({ children, ...props }: FilePickerButtonProps) {
  const input = useRef<HTMLInputElement>(null)
  const addFiles = useAddFiles()

  return (
    <>
      <Button {...props} onPress={() => input.current?.click()}>
        {children}
      </Button>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        className="hidden"
        data-testid="file-input"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? [])
          event.currentTarget.value = ''
          if (files.length > 0) addFiles(files)
        }}
      />
    </>
  )
}
