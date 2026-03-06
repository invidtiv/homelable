import { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCanvasStore } from '@/stores/canvasStore'
import { nodeTypes } from './nodes/nodeTypes'
import { edgeTypes } from './edges/edgeTypes'
import type { NodeData, EdgeData } from '@/types'

interface CanvasContainerProps {
  onConnect?: (connection: Connection) => void
}

export function CanvasContainer({ onConnect: onConnectProp }: CanvasContainerProps) {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange,
    setSelectedNode,
  } = useCanvasStore()

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedNode(node.id)
  }, [setSelectedNode])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [setSelectedNode])

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges as Edge<EdgeData>[]}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnectProp}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        snapToGrid
        snapGrid={[16, 16]}
        fitView
        colorMode="dark"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#30363d"
        />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as NodeData
            const colorMap: Record<string, string> = {
              online: '#39d353',
              offline: '#f85149',
              pending: '#e3b341',
              unknown: '#8b949e',
            }
            return colorMap[data?.status ?? 'unknown']
          }}
          maskColor="rgba(13, 17, 23, 0.7)"
        />
      </ReactFlow>
    </div>
  )
}
