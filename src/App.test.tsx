import { render, screen } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('renders the app title', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Pixelair' })).toBeInTheDocument()
  })

  it('shows the current version', () => {
    render(<App />)
    expect(screen.getByText(`v${__APP_VERSION__}`)).toBeInTheDocument()
  })
})
