import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setCodecRunner, useImages } from '@/store/images'
import { DropZone, SUPPORTED_FORMATS } from './DropZone'

beforeEach(() => {
  setCodecRunner(() => new Promise(() => {}))
  useImages.getState().clear()
})

describe('DropZone', () => {
  it('invites the user to drop images', () => {
    render(<DropZone />)
    expect(screen.getByRole('heading', { name: /drop images here/i })).toBeInTheDocument()
  })

  it('lists every supported format', () => {
    render(<DropZone />)
    for (const format of SUPPORTED_FORMATS) {
      expect(screen.getByText(new RegExp(format))).toBeInTheDocument()
    }
  })

  it('adds the selected files to the queue', async () => {
    render(<DropZone />)
    const files = [
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'b.webp', { type: 'image/webp' }),
    ]
    await userEvent.upload(screen.getByTestId('file-input'), files)
    expect(useImages.getState().items.map((i) => i.name)).toEqual(['a.jpg', 'b.webp'])
  })
})
