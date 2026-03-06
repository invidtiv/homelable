import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react'
import type { EdgeData, EdgeType } from '@/types'

const VLAN_COLORS = ['#00d4ff', '#a855f7', '#39d353', '#ff6e00', '#e3b341', '#f85149']

function getVlanColor(vlanId?: number): string {
  if (!vlanId) return '#00d4ff'
  return VLAN_COLORS[vlanId % VLAN_COLORS.length]
}

const EDGE_STYLES: Record<EdgeType, React.CSSProperties> = {
  ethernet: { stroke: '#30363d', strokeWidth: 2 },
  wifi: { stroke: '#00d4ff', strokeWidth: 1.5, strokeDasharray: '6 3' },
  iot: { stroke: '#e3b341', strokeWidth: 1.5, strokeDasharray: '2 4' },
  vlan: { strokeWidth: 2.5 },
  virtual: { stroke: '#8b949e', strokeWidth: 1, strokeDasharray: '4 4' },
}

export function HomelableEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps<Edge<EdgeData>>) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  const edgeType: EdgeType = data?.type ?? 'ethernet'
  const style: React.CSSProperties = {
    ...EDGE_STYLES[edgeType],
    ...(edgeType === 'vlan' ? { stroke: getVlanColor(data?.vlan_id as number | undefined) } : {}),
    ...(selected ? { stroke: '#00d4ff', filter: 'drop-shadow(0 0 4px #00d4ff88)' } : {}),
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-none font-mono text-[10px] px-1 rounded"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: '#161b22',
              color: '#8b949e',
              border: '1px solid #30363d',
            }}
          >
            {data.label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
