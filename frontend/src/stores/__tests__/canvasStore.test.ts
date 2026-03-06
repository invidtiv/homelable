import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore } from '@/stores/canvasStore'
import type { Node, Edge } from '@xyflow/react'
import type { NodeData, EdgeData } from '@/types'

const makeNode = (id: string, overrides: Partial<NodeData> = {}): Node<NodeData> => ({
  id,
  type: 'server',
  position: { x: 0, y: 0 },
  data: { label: id, type: 'server', status: 'unknown', services: [], ...overrides },
})

const makeEdge = (id: string, source: string, target: string): Edge<EdgeData> => ({
  id,
  source,
  target,
  type: 'ethernet',
  data: { type: 'ethernet' },
})

describe('canvasStore', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      nodes: [],
      edges: [],
      hasUnsavedChanges: false,
      selectedNodeId: null,
    })
  })

  it('starts empty', () => {
    const { nodes, edges, hasUnsavedChanges } = useCanvasStore.getState()
    expect(nodes).toHaveLength(0)
    expect(edges).toHaveLength(0)
    expect(hasUnsavedChanges).toBe(false)
  })

  it('addNode adds a node and marks unsaved', () => {
    const { addNode } = useCanvasStore.getState()
    addNode(makeNode('n1'))
    const { nodes, hasUnsavedChanges } = useCanvasStore.getState()
    expect(nodes).toHaveLength(1)
    expect(nodes[0].id).toBe('n1')
    expect(hasUnsavedChanges).toBe(true)
  })

  it('updateNode updates data fields', () => {
    useCanvasStore.getState().addNode(makeNode('n1', { label: 'old' }))
    useCanvasStore.getState().updateNode('n1', { label: 'new', ip: '10.0.0.1' })
    const node = useCanvasStore.getState().nodes.find((n) => n.id === 'n1')
    expect(node?.data.label).toBe('new')
    expect(node?.data.ip).toBe('10.0.0.1')
  })

  it('deleteNode removes node and its connected edges', () => {
    const store = useCanvasStore.getState()
    store.addNode(makeNode('n1'))
    store.addNode(makeNode('n2'))
    useCanvasStore.setState((s) => ({ edges: [...s.edges, makeEdge('e1', 'n1', 'n2')] }))
    useCanvasStore.getState().deleteNode('n1')
    const { nodes, edges } = useCanvasStore.getState()
    expect(nodes.find((n) => n.id === 'n1')).toBeUndefined()
    expect(edges.find((e) => e.id === 'e1')).toBeUndefined()
  })

  it('deleteNode clears selectedNodeId if it was the deleted node', () => {
    useCanvasStore.getState().addNode(makeNode('n1'))
    useCanvasStore.getState().setSelectedNode('n1')
    expect(useCanvasStore.getState().selectedNodeId).toBe('n1')
    useCanvasStore.getState().deleteNode('n1')
    expect(useCanvasStore.getState().selectedNodeId).toBeNull()
  })

  it('markSaved clears hasUnsavedChanges', () => {
    useCanvasStore.getState().addNode(makeNode('n1'))
    expect(useCanvasStore.getState().hasUnsavedChanges).toBe(true)
    useCanvasStore.getState().markSaved()
    expect(useCanvasStore.getState().hasUnsavedChanges).toBe(false)
  })

  it('loadCanvas replaces state', () => {
    useCanvasStore.getState().addNode(makeNode('old'))
    useCanvasStore.getState().loadCanvas([makeNode('n1'), makeNode('n2')], [makeEdge('e1', 'n1', 'n2')])
    const { nodes, edges, hasUnsavedChanges } = useCanvasStore.getState()
    expect(nodes).toHaveLength(2)
    expect(edges).toHaveLength(1)
    expect(hasUnsavedChanges).toBe(false)
  })

  it('setSelectedNode sets and clears selection', () => {
    useCanvasStore.getState().setSelectedNode('n1')
    expect(useCanvasStore.getState().selectedNodeId).toBe('n1')
    useCanvasStore.getState().setSelectedNode(null)
    expect(useCanvasStore.getState().selectedNodeId).toBeNull()
  })
})
