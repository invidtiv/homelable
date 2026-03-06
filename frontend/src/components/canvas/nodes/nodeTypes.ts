import { IspNode, RouterNode, SwitchNode, ServerNode, VmNode, LxcNode, NasNode, IotNode, ApNode, GenericNode } from './index'
import { ProxmoxGroupNode } from './ProxmoxGroupNode'

export const nodeTypes = {
  isp: IspNode,
  router: RouterNode,
  switch: SwitchNode,
  server: ServerNode,
  proxmox: ProxmoxGroupNode,
  vm: VmNode,
  lxc: LxcNode,
  nas: NasNode,
  iot: IotNode,
  ap: ApNode,
  generic: GenericNode,
}
