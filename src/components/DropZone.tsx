import { Card } from '@heroui/react'

export const SUPPORTED_FORMATS = ['JPG', 'JPEG', 'PNG', 'WebP', 'AVIF', 'GIF'] as const

/**
 * Placeholder drop area. Real file handling (Tauri drag & drop + dialog)
 * will be implemented with the business logic.
 */
export function DropZone() {
  return (
    <Card className="w-full max-w-xl border-2 border-dashed border-default">
      <Card.Header className="items-center text-center">
        <Card.Title>Drop images here</Card.Title>
        <Card.Description>Supported: {SUPPORTED_FORMATS.join(', ')}</Card.Description>
      </Card.Header>
    </Card>
  )
}
