/**
 * Decides what to render when a design's canvas loads.
 *
 * Three cases must stay distinct (issue: clearing a canvas re-showed the demo):
 *  - `real`  → the canvas has saved nodes; render them.
 *  - `empty` → the canvas is initialized (ever saved / explicitly created) but
 *              has no nodes; the user intentionally cleared it — keep it empty.
 *  - `demo`  → brand-new, never-initialized canvas; seed the demo so first-time
 *              users see an example (and, later, the Getting Started walkthrough).
 *
 * Backend errors are handled by the caller, NOT here — a failed load must show an
 * error and must never fall back to `demo` (that would hide the real failure).
 */
export type CanvasLoadMode = 'real' | 'empty' | 'demo'

export function decideCanvasLoad(hasNodes: boolean, initialized: boolean): CanvasLoadMode {
  if (hasNodes) return 'real'
  if (initialized) return 'empty'
  return 'demo'
}

/** A new user is one who lands on the demo canvas — the Getting Started hook. */
export function isNewUserCanvas(mode: CanvasLoadMode): boolean {
  return mode === 'demo'
}
