import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type { NodeData, EdgeData } from '@/types'

const NODE_WIDTH = 180
const NODE_HEIGHT = 52

/**
 * Apply Dagre hierarchical (top-to-bottom) layout to nodes and edges.
 * Child nodes (parentId set) keep their relative position inside the parent — only
 * top-level nodes are repositioned by Dagre.
 */
export function applyDagreLayout(
  nodes: Node<NodeData>[],
  edges: Edge<EdgeData>[],
): Node<NodeData>[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 })

  const topLevel = nodes.filter((n) => !n.parentId)

  for (const node of topLevel) {
    const w = node.type === 'proxmox' ? (node.width ?? 300) : NODE_WIDTH
    const h = node.type === 'proxmox' ? (node.height ?? 200) : NODE_HEIGHT
    g.setNode(node.id, { width: w, height: h })
  }
  for (const edge of edges) {
    // Only add edges between top-level nodes
    const srcTop = topLevel.some((n) => n.id === edge.source)
    const tgtTop = topLevel.some((n) => n.id === edge.target)
    if (srcTop && tgtTop) g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return nodes.map((node) => {
    if (node.parentId) return node // keep children in place
    const pos = g.node(node.id)
    const w = node.type === 'proxmox' ? (node.width ?? 300) : NODE_WIDTH
    const h = node.type === 'proxmox' ? (node.height ?? 200) : NODE_HEIGHT
    return {
      ...node,
      position: {
        x: pos.x - w / 2,
        y: pos.y - h / 2,
      },
    }
  })
}
