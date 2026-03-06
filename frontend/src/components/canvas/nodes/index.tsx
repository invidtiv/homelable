import { type NodeProps, type Node } from '@xyflow/react'
import {
  Globe, Router, Network, Server, Layers, Box, Container,
  HardDrive, Cpu, Wifi, Circle,
} from 'lucide-react'
import { BaseNode } from './BaseNode'
import type { NodeData } from '@/types'

type N = NodeProps<Node<NodeData>>

export const IspNode = (props: N) => <BaseNode {...props} icon={Globe} glowColor="#00d4ff" />
export const RouterNode = (props: N) => <BaseNode {...props} icon={Router} glowColor="#00d4ff" />
export const SwitchNode = (props: N) => <BaseNode {...props} icon={Network} glowColor="#39d353" />
export const ServerNode = (props: N) => <BaseNode {...props} icon={Server} glowColor="#a855f7" />
export const ProxmoxNode = (props: N) => <BaseNode {...props} icon={Layers} glowColor="#ff6e00" />
export const VmNode = (props: N) => <BaseNode {...props} icon={Box} glowColor="#a855f7" />
export const LxcNode = (props: N) => <BaseNode {...props} icon={Container} glowColor="#00d4ff" />
export const NasNode = (props: N) => <BaseNode {...props} icon={HardDrive} glowColor="#39d353" />
export const IotNode = (props: N) => <BaseNode {...props} icon={Cpu} glowColor="#e3b341" />
export const ApNode = (props: N) => <BaseNode {...props} icon={Wifi} glowColor="#00d4ff" />
export const GenericNode = (props: N) => <BaseNode {...props} icon={Circle} glowColor="#8b949e" />

