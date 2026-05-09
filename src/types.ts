export type RGB = string

export type NodeBox = {
  id: string
  elementId?: string
  elementType?: string
  nodeType?: string
  isJunction: boolean
  label: string
  x: number
  y: number
  w: number
  h: number
  fill: RGB
  stroke: RGB
  textColor: RGB
  fontFamily?: string
  fontSize?: number
}

export type Point = { x: number; y: number }

export type AccessType = 'Access' | 'Read' | 'Write' | 'ReadWrite'

export type Edge = {
  id: string
  sourceId: string
  targetId: string
  relationshipType?: string
  accessType?: AccessType
  isDirected?: boolean
  name?: string
  bendpoints: Point[]
  stroke?: RGB
}

export type ParsedView = {
  viewId: string
  viewName: string
  viewBox: { x: number; y: number; width: number; height: number }
  nodes: NodeBox[]
  connections: Edge[]
}
