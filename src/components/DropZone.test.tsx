import { render, screen } from '@testing-library/react'
import { DropZone, SUPPORTED_FORMATS } from './DropZone'

describe('DropZone', () => {
  it('invites the user to drop images', () => {
    render(<DropZone />)
    expect(screen.getByText(/drop images here/i)).toBeInTheDocument()
  })

  it('lists every supported format', () => {
    render(<DropZone />)
    for (const format of SUPPORTED_FORMATS) {
      expect(screen.getByText(new RegExp(format))).toBeInTheDocument()
    }
  })
})
