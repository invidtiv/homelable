import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GroupRectModal, type GroupRectFormData } from '../GroupRectModal'

describe('GroupRectModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <GroupRectModal open={false} onClose={vi.fn()} onSubmit={vi.fn()} />
    )
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('renders form fields when open', () => {
    render(<GroupRectModal open onClose={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByPlaceholderText('Zone name…')).toBeDefined()
    expect(screen.getByText('Add Rectangle')).toBeDefined()
    expect(screen.getByText('Text Position')).toBeDefined()
    expect(screen.getByText('Z-Order (1 = furthest back)')).toBeDefined()
  })

  it('renders Edit Rectangle title when provided', () => {
    render(<GroupRectModal open onClose={vi.fn()} onSubmit={vi.fn()} title="Edit Rectangle" />)
    expect(screen.getByText('Edit Rectangle')).toBeDefined()
  })

  it('calls onSubmit with form data on submit', () => {
    const onSubmit = vi.fn()
    render(<GroupRectModal open onClose={vi.fn()} onSubmit={onSubmit} />)
    const input = screen.getByPlaceholderText('Zone name…')
    fireEvent.change(input, { target: { value: 'DMZ' } })
    fireEvent.click(screen.getByText('Add'))
    expect(onSubmit).toHaveBeenCalledOnce()
    const submitted = onSubmit.mock.calls[0][0] as GroupRectFormData
    expect(submitted.label).toBe('DMZ')
    expect(submitted.font).toBe('inter')
    expect(submitted.z_order).toBe(1)
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<GroupRectModal open onClose={onClose} onSubmit={vi.fn()} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows Delete button when onDelete is provided', () => {
    const onDelete = vi.fn()
    render(<GroupRectModal open onClose={vi.fn()} onSubmit={vi.fn()} onDelete={onDelete} />)
    expect(screen.getByText('Delete')).toBeDefined()
  })

  it('calls onDelete and onClose when Delete is clicked', () => {
    const onDelete = vi.fn()
    const onClose = vi.fn()
    render(<GroupRectModal open onClose={onClose} onSubmit={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getByText('Delete'))
    expect(onDelete).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('pre-fills form from initial prop', () => {
    render(
      <GroupRectModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        initial={{ label: 'Pre-filled', z_order: 5, font: 'mono' }}
      />
    )
    const input = screen.getByPlaceholderText('Zone name…') as HTMLInputElement
    expect(input.value).toBe('Pre-filled')
  })

  it('selects text position button', () => {
    const onSubmit = vi.fn()
    render(<GroupRectModal open onClose={vi.fn()} onSubmit={onSubmit} />)
    // Click bottom-right (↘)
    fireEvent.click(screen.getByTitle('bottom-right'))
    fireEvent.click(screen.getByText('Add'))
    const submitted = onSubmit.mock.calls[0][0] as GroupRectFormData
    expect(submitted.text_position).toBe('bottom-right')
  })
})
