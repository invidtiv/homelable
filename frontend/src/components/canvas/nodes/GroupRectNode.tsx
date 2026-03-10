import { NodeResizer, type NodeProps, type Node } from '@xyflow/react'
import { useCanvasStore } from '@/stores/canvasStore'
import type { NodeData, TextPosition } from '@/types'

const FONT_FAMILIES: Record<string, string> = {
  inter: 'Inter, sans-serif',
  mono: '"JetBrains Mono", monospace',
  serif: 'Georgia, serif',
}

interface AlignStyle {
  alignItems: string
  justifyContent: string
  textAlign: React.CSSProperties['textAlign']
}

const POSITION_STYLES: Record<TextPosition, AlignStyle> = {
  'top-left':      { alignItems: 'flex-start', justifyContent: 'flex-start', textAlign: 'left' },
  'top-center':    { alignItems: 'flex-start', justifyContent: 'center',     textAlign: 'center' },
  'top-right':     { alignItems: 'flex-start', justifyContent: 'flex-end',   textAlign: 'right' },
  'middle-left':   { alignItems: 'center',     justifyContent: 'flex-start', textAlign: 'left' },
  'center':        { alignItems: 'center',     justifyContent: 'center',     textAlign: 'center' },
  'middle-right':  { alignItems: 'center',     justifyContent: 'flex-end',   textAlign: 'right' },
  'bottom-left':   { alignItems: 'flex-end',   justifyContent: 'flex-start', textAlign: 'left' },
  'bottom-center': { alignItems: 'flex-end',   justifyContent: 'center',     textAlign: 'center' },
  'bottom-right':  { alignItems: 'flex-end',   justifyContent: 'flex-end',   textAlign: 'right' },
}

export function GroupRectNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
  const setEditingGroupRectId = useCanvasStore((s) => s.setEditingGroupRectId)

  const rc = data.custom_colors ?? {}
  const borderColor = rc.border ?? '#00d4ff'
  const backgroundColor = rc.background ?? 'rgba(0,212,255,0.05)'
  const textColor = rc.text_color ?? '#e6edf3'
  const fontFamily = FONT_FAMILIES[rc.font ?? 'inter'] ?? FONT_FAMILIES.inter
  const textPos = (rc.text_position ?? 'top-left') as TextPosition
  const posStyle = POSITION_STYLES[textPos]

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={80}
        minHeight={60}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: '#00d4ff',
          border: '1px solid #0d1117',
        }}
        lineStyle={{ borderColor: '#00d4ff55', borderWidth: 1 }}
      />
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: posStyle.alignItems,
          justifyContent: posStyle.justifyContent,
          padding: 12,
          background: backgroundColor,
          border: `${selected ? 2 : 1}px solid ${selected ? '#00d4ff' : borderColor}`,
          borderRadius: 10,
          fontFamily,
          color: textColor,
          fontSize: 12,
          fontWeight: 500,
          boxSizing: 'border-box',
          cursor: 'default',
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          setEditingGroupRectId(id)
        }}
      >
        {data.label && (
          <span style={{ textAlign: posStyle.textAlign, userSelect: 'none', whiteSpace: 'pre-wrap' }}>
            {data.label}
          </span>
        )}
      </div>
    </>
  )
}
