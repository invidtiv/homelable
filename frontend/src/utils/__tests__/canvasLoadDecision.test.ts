import { describe, it, expect } from 'vitest'
import { decideCanvasLoad, isNewUserCanvas } from '../canvasLoadDecision'

describe('decideCanvasLoad', () => {
  it('renders real nodes when the canvas has any', () => {
    expect(decideCanvasLoad(true, true)).toBe('real')
    // hasNodes wins even if the initialized flag is somehow false
    expect(decideCanvasLoad(true, false)).toBe('real')
  })

  it('keeps an initialized-but-empty canvas empty (user cleared it)', () => {
    expect(decideCanvasLoad(false, true)).toBe('empty')
  })

  it('shows the demo only for a brand-new, uninitialized canvas', () => {
    expect(decideCanvasLoad(false, false)).toBe('demo')
  })
})

describe('isNewUserCanvas', () => {
  it('is true only for the demo mode', () => {
    expect(isNewUserCanvas('demo')).toBe(true)
    expect(isNewUserCanvas('empty')).toBe(false)
    expect(isNewUserCanvas('real')).toBe(false)
  })
})
