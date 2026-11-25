import { Chip } from '@heroui/react'
import { savingsPercent } from '@/lib/size'

export function SavingsChip({ original, optimized }: { original: number; optimized: number }) {
  const percent = savingsPercent(original, optimized)
  const label = percent >= 0 ? `−${percent}%` : `+${Math.abs(percent)}%`
  return (
    <Chip size="sm" color={percent > 0 ? 'success' : percent < 0 ? 'danger' : 'default'}>
      {label}
    </Chip>
  )
}
