import type { NodeData, NodeType } from '@/types'

export interface NodeColors {
  border: string
  background: string
  icon: string
}

export const NODE_DEFAULT_COLORS: Record<NodeType, NodeColors> = {
  isp:     { border: '#00d4ff', background: '#21262d', icon: '#00d4ff' },
  router:  { border: '#00d4ff', background: '#21262d', icon: '#00d4ff' },
  switch:  { border: '#39d353', background: '#21262d', icon: '#39d353' },
  server:  { border: '#a855f7', background: '#21262d', icon: '#a855f7' },
  proxmox: { border: '#ff6e00', background: '#21262d', icon: '#ff6e00' },
  vm:      { border: '#a855f7', background: '#21262d', icon: '#a855f7' },
  lxc:     { border: '#00d4ff', background: '#21262d', icon: '#00d4ff' },
  nas:     { border: '#39d353', background: '#21262d', icon: '#39d353' },
  iot:      { border: '#e3b341', background: '#21262d', icon: '#e3b341' },
  ap:       { border: '#00d4ff', background: '#21262d', icon: '#00d4ff' },
  camera:   { border: '#8b949e', background: '#21262d', icon: '#8b949e' },
  printer:  { border: '#8b949e', background: '#21262d', icon: '#8b949e' },
  computer: { border: '#a855f7', background: '#21262d', icon: '#a855f7' },
  cpl:      { border: '#e3b341', background: '#21262d', icon: '#e3b341' },
  generic:  { border: '#8b949e', background: '#21262d', icon: '#8b949e' },
  groupRect: { border: '#00d4ff', background: 'transparent', icon: '#00d4ff' },
}

export function resolveNodeColors(data: Pick<NodeData, 'type' | 'custom_colors'>): NodeColors {
  const defaults = NODE_DEFAULT_COLORS[data.type] ?? NODE_DEFAULT_COLORS.generic
  const custom = data.custom_colors
  return {
    border:     custom?.border     ?? defaults.border,
    background: custom?.background ?? defaults.background,
    icon:       custom?.icon       ?? defaults.icon,
  }
}
