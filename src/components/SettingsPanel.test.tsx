import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setCodecRunner, useImages } from '@/store/images'
import { SettingsPanel } from './SettingsPanel'

function Panel() {
  const item = useImages((s) => s.items[0])
  return item ? <SettingsPanel item={item} onExport={() => {}} /> : null
}

beforeEach(() => {
  setCodecRunner(() => new Promise(() => {}))
  useImages.getState().clear()
  act(() => {
    useImages.getState().addFiles([new File(['x'], 'hero.png', { type: 'image/png' })])
  })
})

describe('SettingsPanel', () => {
  it('previews the output file names for the selected densities', async () => {
    render(<Panel />)
    const sizes = screen.getByRole('toolbar', { name: 'Export sizes' })
    await userEvent.click(within(sizes).getByRole('button', { name: '2x' }))
    await userEvent.click(within(sizes).getByRole('button', { name: '0.5x' }))

    const names = within(screen.getByRole('list', { name: 'Output files' })).getAllByRole(
      'listitem',
    )
    expect(names.map((n) => n.textContent)).toEqual(['hero@0.5x.png', 'hero.png', 'hero@2x.png'])
    expect(useImages.getState().items[0].settings.scales).toEqual([0.5, 1, 2])
  })

  it('shows PNG effort instead of quality for PNG output', () => {
    render(<Panel />)
    expect(screen.getByRole('slider', { name: 'Effort' })).toBeInTheDocument()
    expect(screen.queryByRole('slider', { name: 'Quality' })).not.toBeInTheDocument()
  })
})
