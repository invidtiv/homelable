import { IspNode, RouterNode, SwitchNode, ServerNode, ProxmoxNode, VmNode, LxcNode, NasNode, IotNode, ApNode, GenericNode } from './index'

export const nodeTypes = {
  isp: IspNode,
  router: RouterNode,
  switch: SwitchNode,
  server: ServerNode,
  proxmox: ProxmoxNode,
  vm: VmNode,
  lxc: LxcNode,
  nas: NasNode,
  iot: IotNode,
  ap: ApNode,
  generic: GenericNode,
}
