import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest'
import { render, cleanup, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { Toaster } from '../sonner'

beforeAll(() => {
  // sonner reads matchMedia for theme detection; jsdom doesn't provide it.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

afterEach(() => cleanup())

describe('Toaster', () => {
  it('renders error toasts on a red surface so failures are visible', async () => {
    render(<Toaster />)
    toast.error('Save failed')
    // The style (with the CSS vars) lands on the toast list, mounted on first toast.
    const list = await waitFor(() => {
      const el = document.querySelector('[data-sonner-toaster]') as HTMLElement | null
      expect(el).not.toBeNull()
      return el!
    })
    const style = list.getAttribute('style') ?? ''
    expect(style).toContain('--error-bg: #f85149')
    expect(style).toContain('--error-text: #ffffff')
  })
})
