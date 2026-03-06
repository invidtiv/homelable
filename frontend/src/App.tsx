import { useEffect, useCallback, useRef, useState } from 'react'
import { ReactFlowProvider, type Connection } from '@xyflow/react'
import { type Node } from '@xyflow/react'
import { applyDagreLayout } from '@/utils/layout'
import { exportToPng } from '@/utils/export'
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
import { ScanConfigModal } from '@/components/modals/ScanConfigModal'
import { useCanvasStore } from '@/stores/canvasStore'
import { useAuthStore } from '@/stores/authStore'
import { canvasApi } from '@/api/client'
import { demoNodes, demoEdges } from '@/utils/demoData'
import { useStatusPolling } from '@/hooks/useStatusPolling'
import type { NodeData, EdgeData } from '@/types'

export default function App() {
  const { loadCanvas, markSaved, selectedNodeId, addNode, updateNode, onConnect, nodes, edges } = useCanvasStore()
  const canvasRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated } = useAuthStore()

  useStatusPolling()

  const [addNodeOpen, setAddNodeOpen] = useState(false)
  const [editNodeId, setEditNodeId] = useState<string | null>(null)
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null)
  const [scanConfigOpen, setScanConfigOpen] = useState(false)

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
          const rfNodes = apiNodes.map((n: NodeData & { id: string; pos_x: number; pos_y: number; parent_id?: string }) => ({
            id: n.id,
            type: n.type,
            position: { x: n.pos_x, y: n.pos_y },
            data: n,
            ...(n.parent_id ? { parentId: n.parent_id, extent: 'parent' as const } : {}),
            ...(n.type === 'proxmox' ? { width: 300, height: 200 } : {}),
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
    const isProxmox = data.type === 'proxmox'
    const parentNode = data.parent_id ? nodes.find((n) => n.id === data.parent_id) : null
    // Children position is relative to parent; place near top-left with padding
    const position = parentNode
      ? { x: 20, y: 50 }
      : { x: 300, y: 300 }

    const newNode: Node<NodeData> = {
      id,
      type: data.type ?? 'generic',
      position,
      data: { status: 'unknown', services: [], ...data } as NodeData,
      ...(data.parent_id ? { parentId: data.parent_id, extent: 'parent' as const } : {}),
      ...(isProxmox ? { width: 300, height: 200 } : {}),
    }
    addNode(newNode)
    toast.success(`Added "${data.label}"`)
  }, [addNode, nodes])

  const handleEditNode = useCallback((id: string) => {
    setEditNodeId(id)
  }, [])

  const handleUpdateNode = useCallback((data: Partial<NodeData>) => {
    if (!editNodeId) return
    updateNode(editNodeId, data)
    setEditNodeId(null)
  }, [editNodeId, updateNode])

  const handleAutoLayout = useCallback(() => {
    const laid = applyDagreLayout(nodes, edges)
    loadCanvas(laid, edges)
    toast.success('Canvas auto-arranged')
  }, [nodes, edges, loadCanvas])

  const handleExport = useCallback(async () => {
    const el = canvasRef.current?.querySelector<HTMLElement>('.react-flow')
    if (!el) { toast.error('Canvas not ready'); return }
    try {
      await exportToPng(el)
      toast.success('Exported as PNG')
    } catch {
      toast.error('Export failed')
    }
  }, [])

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
            onScan={() => setScanConfigOpen(true)}
            onSave={handleSave}
          />
          <div className="flex flex-col flex-1 min-w-0">
            <Toolbar
              onSave={handleSave}
              onAutoLayout={handleAutoLayout}
              onExport={handleExport}
            />
            <div className="flex flex-1 min-h-0">
              <div ref={canvasRef} className="flex-1 min-w-0 h-full">
                <CanvasContainer onConnect={handleEdgeConnect} />
              </div>
              {selectedNodeId && <DetailPanel onEdit={handleEditNode} />}
            </div>
          </div>
        </div>

        <NodeModal
          open={addNodeOpen}
          onClose={() => setAddNodeOpen(false)}
          onSubmit={handleAddNode}
          title="Add Node"
          proxmoxNodes={nodes.filter((n) => n.type === 'proxmox').map((n) => ({ id: n.id, label: n.data.label }))}
        />

        {/* key forces re-mount when editing a different node, resetting form state */}
        <NodeModal
          key={editNodeId ?? 'edit'}
          open={!!editNodeId}
          onClose={() => setEditNodeId(null)}
          onSubmit={handleUpdateNode}
          initial={editNode?.data}
          title="Edit Node"
          proxmoxNodes={nodes.filter((n) => n.type === 'proxmox').map((n) => ({ id: n.id, label: n.data.label }))}
        />

        <EdgeModal
          open={!!pendingConnection}
          onClose={() => setPendingConnection(null)}
          onSubmit={handleEdgeConfirm}
        />

        <ScanConfigModal
          open={scanConfigOpen}
          onClose={() => setScanConfigOpen(false)}
          onScanNow={() => toast.success('Scan triggered')}
        />

        <Toaster theme="dark" position="bottom-right" />
      </ReactFlowProvider>
    </TooltipProvider>
  )
}
