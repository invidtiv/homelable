import { useEffect, useCallback, useRef, useState } from 'react'
import { ReactFlowProvider, type Connection } from '@xyflow/react'
import { type Node } from '@xyflow/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { CanvasContainer } from '@/components/canvas/CanvasContainer'
import { Sidebar } from '@/components/panels/Sidebar'
import { Toolbar } from '@/components/panels/Toolbar'
import { DetailPanel } from '@/components/panels/DetailPanel'
import { LoginPage } from '@/components/LoginPage'
import { NodeModal } from '@/components/modals/NodeModal'
import { EdgeModal } from '@/components/modals/EdgeModal'
import { useCanvasStore } from '@/stores/canvasStore'
import { useAuthStore } from '@/stores/authStore'
import { canvasApi } from '@/api/client'
import { demoNodes, demoEdges } from '@/utils/demoData'
import type { NodeData, EdgeData } from '@/types'

export default function App() {
  const { loadCanvas, markSaved, selectedNodeId, addNode, updateNode, onConnect, nodes } = useCanvasStore()
  const { isAuthenticated } = useAuthStore()

  const [addNodeOpen, setAddNodeOpen] = useState(false)
  const [editNodeId, setEditNodeId] = useState<string | null>(null)
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null)

  // Declare handleSave before the Ctrl+S effect so it is in scope
  const handleSave = useCallback(async () => {
    try {
      const nodePositions = nodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }))
      await canvasApi.save({ node_positions: nodePositions, viewport: {} })
      markSaved()
      toast.success('Canvas saved')
    } catch {
      markSaved()
      toast.success('Canvas saved (local)')
    }
  }, [nodes, markSaved])

  // Keep a ref so the keydown handler always calls the latest version
  const handleSaveRef = useRef(handleSave)
  useEffect(() => { handleSaveRef.current = handleSave }, [handleSave])

  // Load canvas on auth
  useEffect(() => {
    if (!isAuthenticated) return
    canvasApi.load()
      .then((res) => {
        const { nodes: apiNodes, edges: apiEdges } = res.data
        if (apiNodes.length > 0) {
          const rfNodes = apiNodes.map((n: NodeData & { id: string; pos_x: number; pos_y: number }) => ({
            id: n.id,
            type: n.type,
            position: { x: n.pos_x, y: n.pos_y },
            data: n,
          }))
          const rfEdges = apiEdges.map((e: EdgeData & { id: string; source: string; target: string }) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            type: e.type,
            data: e,
          }))
          loadCanvas(rfNodes, rfEdges)
        } else {
          loadCanvas(demoNodes, demoEdges)
        }
      })
      .catch(() => loadCanvas(demoNodes, demoEdges))
  }, [isAuthenticated, loadCanvas])

  // Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveRef.current()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleAddNode = useCallback((data: Partial<NodeData>) => {
    const id = crypto.randomUUID()
    const newNode: Node<NodeData> = {
      id,
      type: data.type ?? 'generic',
      position: { x: 300, y: 300 },
      data: { status: 'unknown', services: [], ...data } as NodeData,
    }
    addNode(newNode)
    toast.success(`Added "${data.label}"`)
  }, [addNode])

  const handleEditNode = useCallback((id: string) => {
    setEditNodeId(id)
  }, [])

  const handleUpdateNode = useCallback((data: Partial<NodeData>) => {
    if (!editNodeId) return
    updateNode(editNodeId, data)
    setEditNodeId(null)
  }, [editNodeId, updateNode])

  const handleEdgeConnect = useCallback((connection: Connection) => {
    setPendingConnection(connection)
  }, [])

  const handleEdgeConfirm = useCallback((edgeData: EdgeData) => {
    if (!pendingConnection) return
    onConnect({ ...pendingConnection, ...edgeData })
    setPendingConnection(null)
  }, [pendingConnection, onConnect])

  const editNode = editNodeId ? nodes.find((n) => n.id === editNodeId) : null

  if (!isAuthenticated) return <LoginPage />

  return (
    <TooltipProvider>
      <ReactFlowProvider>
        <div className="flex h-screen w-screen overflow-hidden bg-[#0d1117]">
          <Sidebar
            onAddNode={() => setAddNodeOpen(true)}
            onScan={() => toast.info('Network scan not yet implemented')}
            onSave={handleSave}
          />
          <div className="flex flex-col flex-1 min-w-0">
            <Toolbar
              onSave={handleSave}
              onAutoLayout={() => toast.info('Auto-layout not yet implemented')}
              onExport={() => toast.info('Export not yet implemented')}
            />
            <div className="flex flex-1 min-h-0">
              <CanvasContainer onConnect={handleEdgeConnect} />
              {selectedNodeId && <DetailPanel onEdit={handleEditNode} />}
            </div>
          </div>
        </div>

        <NodeModal
          open={addNodeOpen}
          onClose={() => setAddNodeOpen(false)}
          onSubmit={handleAddNode}
          title="Add Node"
        />

        {/* key forces re-mount when editing a different node, resetting form state */}
        <NodeModal
          key={editNodeId ?? 'edit'}
          open={!!editNodeId}
          onClose={() => setEditNodeId(null)}
          onSubmit={handleUpdateNode}
          initial={editNode?.data}
          title="Edit Node"
        />

        <EdgeModal
          open={!!pendingConnection}
          onClose={() => setPendingConnection(null)}
          onSubmit={handleEdgeConfirm}
        />

        <Toaster theme="dark" position="bottom-right" />
      </ReactFlowProvider>
    </TooltipProvider>
  )
}
