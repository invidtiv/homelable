import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DesignModal } from '../DesignModal'
import { DEFAULT_DESIGN_ICON } from '@/utils/designIcons'

function renderModal(props: Partial<Parameters<typeof DesignModal>[0]> = {}) {
  const onClose = vi.fn()
  const onSubmit = vi.fn()
  render(<DesignModal open onClose={onClose} onSubmit={onSubmit} {...props} />)
  return { onClose, onSubmit }
}

describe('DesignModal', () => {
  it('creates with the typed name and default icon', () => {
    const { onSubmit } = renderModal()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Home Network' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Home Network', icon: DEFAULT_DESIGN_ICON })
  })

  it('submits the selected icon', () => {
    const { onSubmit } = renderModal()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Rack Power' } })
    fireEvent.click(screen.getByRole('button', { name: 'Electrical' })) // zap icon's aria-label
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Rack Power', icon: 'zap' })
  })

  it('trims whitespace and blocks empty names', () => {
    const { onSubmit } = renderModal()
    // Empty → submit disabled, no call.
    const submit = screen.getByRole('button', { name: 'Create' })
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  Spaced  ' } })
    fireEvent.click(submit)
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Spaced', icon: DEFAULT_DESIGN_ICON })
  })

  it('prefills name and icon in edit mode', () => {
    const { onSubmit } = renderModal({
      initial: { name: 'Existing', icon: 'server' },
      title: 'Edit Canvas',
      submitLabel: 'Save',
    })
    expect(screen.getByLabelText('Name')).toHaveValue('Existing')
    // The server icon button is pre-selected.
    expect(screen.getByRole('button', { name: 'Server' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Existing', icon: 'server' })
  })

  it('submits on Enter from the name field', () => {
    const { onSubmit } = renderModal()
    const input = screen.getByLabelText('Name')
    fireEvent.change(input, { target: { value: 'Quick' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Quick', icon: DEFAULT_DESIGN_ICON })
  })

  it('calls onClose from Cancel', () => {
    const { onClose, onSubmit } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  describe('floor plan section', () => {
    const fm = {
      imageData: 'data:image/png;base64,abc',
      posX: 40, posY: 60, width: 800, height: 600,
      opacity: 0.8, locked: false, enabled: true,
    }

    it('is hidden by default and submit omits floorMap', () => {
      const { onSubmit } = renderModal()
      expect(screen.queryByText('Floor Plan')).toBeNull()
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'X' } })
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))
      expect(onSubmit).toHaveBeenCalledWith({ name: 'X', icon: DEFAULT_DESIGN_ICON })
      expect('floorMap' in onSubmit.mock.calls[0][0]).toBe(false)
    })

    it('shows the section and preserves position while updating config', () => {
      const { onSubmit } = renderModal({
        showFloorMap: true,
        initialFloorMap: fm,
        initial: { name: 'Home', icon: DEFAULT_DESIGN_ICON },
        submitLabel: 'Save',
      })
      expect(screen.getByText('Floor Plan')).toBeDefined()
      expect(screen.getByAltText('Floor plan preview')).toBeDefined()

      // Toggle "Show on canvas" off.
      const enabledBox = screen.getByLabelText('Show on canvas') as HTMLInputElement
      fireEvent.click(enabledBox)

      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Home',
        icon: DEFAULT_DESIGN_ICON,
        floorMap: { ...fm, enabled: false },
      })
    })

    it('submits floorMap: null when the image is removed', () => {
      const { onSubmit } = renderModal({
        showFloorMap: true,
        initialFloorMap: fm,
        initial: { name: 'Home', icon: DEFAULT_DESIGN_ICON },
        submitLabel: 'Save',
      })
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
      expect(screen.queryByAltText('Floor plan preview')).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Home',
        icon: DEFAULT_DESIGN_ICON,
        floorMap: null,
      })
    })

    it('uploads a chosen file and stores the returned server URL', async () => {
      const onUploadImage = vi.fn().mockResolvedValue('/api/v1/media/deadbeef.png')
      const { onSubmit } = renderModal({
        showFloorMap: true,
        initialFloorMap: null,
        initial: { name: 'Home', icon: DEFAULT_DESIGN_ICON },
        submitLabel: 'Save',
        onUploadImage,
      })
      const file = new File(['x'], 'plan.png', { type: 'image/png' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(input, { target: { files: [file] } })

      await screen.findByAltText('Floor plan preview')
      expect(onUploadImage).toHaveBeenCalledWith(file)

      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      const submitted = onSubmit.mock.calls[0][0]
      expect(submitted.floorMap.imageData).toBe('/api/v1/media/deadbeef.png')
    })

    it('leaves state untouched when upload fails', async () => {
      const onUploadImage = vi.fn().mockRejectedValue(new Error('boom'))
      renderModal({
        showFloorMap: true,
        initialFloorMap: null,
        initial: { name: 'Home', icon: DEFAULT_DESIGN_ICON },
        submitLabel: 'Save',
        onUploadImage,
      })
      const file = new File(['x'], 'plan.png', { type: 'image/png' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(input, { target: { files: [file] } })
      await vi.waitFor(() => expect(onUploadImage).toHaveBeenCalled())
      expect(screen.queryByAltText('Floor plan preview')).toBeNull()
    })

    // Regression: reopening the edit modal after a canvas-side resize must not
    // save stale dimensions. Sidebar bumps the modal `key` on every open so it
    // remounts and re-seeds from the current floor plan.
    it('re-seeds width/height when remounted with a new key (reopen after resize)', () => {
      const onSubmit = vi.fn()
      const initial = { name: 'Home', icon: DEFAULT_DESIGN_ICON }
      const { rerender } = render(
        <DesignModal key="k1" open onClose={vi.fn()} onSubmit={onSubmit}
          showFloorMap initialFloorMap={fm} initial={initial} submitLabel="Save" />,
      )
      // Canvas-side resize happened; reopen with a fresh key + larger dims.
      const resized = { ...fm, width: 1200, height: 900 }
      rerender(
        <DesignModal key="k2" open onClose={vi.fn()} onSubmit={onSubmit}
          showFloorMap initialFloorMap={resized} initial={initial} submitLabel="Save" />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(onSubmit.mock.calls[0][0].floorMap).toMatchObject({ width: 1200, height: 900 })
    })

    it('keeps stale dimensions when reopened without remount (why the key bump matters)', () => {
      const onSubmit = vi.fn()
      const initial = { name: 'Home', icon: DEFAULT_DESIGN_ICON }
      const { rerender } = render(
        <DesignModal key="same" open onClose={vi.fn()} onSubmit={onSubmit}
          showFloorMap initialFloorMap={fm} initial={initial} submitLabel="Save" />,
      )
      const resized = { ...fm, width: 1200, height: 900 }
      rerender(
        <DesignModal key="same" open onClose={vi.fn()} onSubmit={onSubmit}
          showFloorMap initialFloorMap={resized} initial={initial} submitLabel="Save" />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      // Same key → no remount → local state still the original 800×600.
      expect(onSubmit.mock.calls[0][0].floorMap).toMatchObject({ width: 800, height: 600 })
    })

    it('submits floorMap: null when shown but no image was chosen', () => {
      const { onSubmit } = renderModal({
        showFloorMap: true,
        initialFloorMap: null,
        submitLabel: 'Save',
      })
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Empty' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Empty', icon: DEFAULT_DESIGN_ICON, floorMap: null })
    })
  })
})
