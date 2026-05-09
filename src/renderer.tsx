'use client'

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'

import { DEFAULT_STROKE } from './colors'
import { ICONS, iconNameForType } from './icons'
import type { Edge, NodeBox, ParsedView, Point } from './types'

export type ArchimateRendererHandle = {
  zoomIn: () => void
  zoomOut: () => void
  fitView: () => void
  pan: (dirX: number, dirY: number) => void
}

type Props = {
  view: ParsedView
  className?: string
  style?: CSSProperties
}

const MIN_SCALE = 0.05
const MAX_SCALE = 50
const PAN_FRACTION = 0.2
const WHEEL_FACTOR = 1.1

// Line patterns per ArchiMate 3.2 spec § 5 (Relationships) and Archi tool
// rendering. Realization uses a long dash; Flow uses a shorter dash (visually
// distinct from Realization in Archi); Influence uses long dash; Access uses
// dotted. Reference images:
// https://github.com/archimatetool/archi/tree/master/com.archimatetool.editor/img/archimate
const DASH_PATTERN = '6 4'
const FLOW_PATTERN = '4 3'
const DOT_PATTERN = '2 3'

export const ArchimateRenderer = forwardRef<ArchimateRendererHandle, Props>(
  function ArchimateRenderer({ view, className, style }, ref) {
    const svgRef = useRef<SVGSVGElement>(null)
    const gRef = useRef<SVGGElement>(null)
    const stateRef = useRef({ tx: 0, ty: 0, scale: 1 })
    const dragRef = useRef<{
      pointerId: number
      startClientX: number
      startClientY: number
      startTx: number
      startTy: number
    } | null>(null)

    const nodeMap = useMemo(() => {
      const map = new Map<string, NodeBox>()
      for (const n of view.nodes) map.set(n.id, n)
      return map
    }, [view])

    function applyTransform() {
      const { tx, ty, scale } = stateRef.current
      gRef.current?.setAttribute('transform', `translate(${tx} ${ty}) scale(${scale})`)
    }

    function reset() {
      stateRef.current = { tx: 0, ty: 0, scale: 1 }
      applyTransform()
    }

    function zoomAroundViewBox(vbX: number, vbY: number, factor: number) {
      const { tx, ty, scale } = stateRef.current
      const nextScale = scale * factor
      if (nextScale < MIN_SCALE || nextScale > MAX_SCALE) return
      stateRef.current = {
        tx: vbX * (1 - factor) + tx * factor,
        ty: vbY * (1 - factor) + ty * factor,
        scale: nextScale,
      }
      applyTransform()
    }

    function clientToViewBox(clientX: number, clientY: number): Point | null {
      const svg = svgRef.current
      if (!svg) return null
      const pt = svg.createSVGPoint()
      pt.x = clientX
      pt.y = clientY
      const ctm = svg.getScreenCTM()
      if (!ctm) return null
      const local = pt.matrixTransform(ctm.inverse())
      return { x: local.x, y: local.y }
    }

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => {
          const cx = view.viewBox.x + view.viewBox.width / 2
          const cy = view.viewBox.y + view.viewBox.height / 2
          zoomAroundViewBox(cx, cy, 1.25)
        },
        zoomOut: () => {
          const cx = view.viewBox.x + view.viewBox.width / 2
          const cy = view.viewBox.y + view.viewBox.height / 2
          zoomAroundViewBox(cx, cy, 1 / 1.25)
        },
        fitView: reset,
        pan: (dirX: number, dirY: number) => {
          stateRef.current.tx += -dirX * view.viewBox.width * PAN_FRACTION
          stateRef.current.ty += -dirY * view.viewBox.height * PAN_FRACTION
          applyTransform()
        },
      }),
      [view],
    )

    useEffect(() => {
      reset()
    }, [view])

    useEffect(() => {
      const svg = svgRef.current
      if (!svg) return
      const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        const local = clientToViewBox(e.clientX, e.clientY)
        if (!local) return
        const factor = e.deltaY < 0 ? WHEEL_FACTOR : 1 / WHEEL_FACTOR
        zoomAroundViewBox(local.x, local.y, factor)
      }
      svg.addEventListener('wheel', onWheel, { passive: false })
      return () => svg.removeEventListener('wheel', onWheel)
    }, [])

    function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
      if (e.button !== 0) return
      const svg = svgRef.current
      if (!svg) return
      svg.setPointerCapture(e.pointerId)
      dragRef.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startTx: stateRef.current.tx,
        startTy: stateRef.current.ty,
      }
    }

    function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return
      const start = clientToViewBox(drag.startClientX, drag.startClientY)
      const now = clientToViewBox(e.clientX, e.clientY)
      if (!start || !now) return
      stateRef.current.tx = drag.startTx + (now.x - start.x)
      stateRef.current.ty = drag.startTy + (now.y - start.y)
      applyTransform()
    }

    function onPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
      const drag = dragRef.current
      if (!drag) return
      svgRef.current?.releasePointerCapture(e.pointerId)
      dragRef.current = null
    }

    return (
      <svg
        ref={svgRef}
        className={className}
        style={{ touchAction: 'none', cursor: 'grab', ...style }}
        viewBox={`${view.viewBox.x} ${view.viewBox.y} ${view.viewBox.width} ${view.viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <Markers />
        <g ref={gRef}>
          {view.connections.map((c) => (
            <ConnectionPath key={c.id} edge={c} nodeMap={nodeMap} />
          ))}
          {view.nodes.map((n) => (
            <NodeShape key={n.id} node={n} />
          ))}
        </g>
      </svg>
    )
  },
)

// ---------------------------------------------------------------------------
// Markers
// Reference: ArchiMate 3.2 spec, sections 5 & 11 (Relationship notation).
// All markers use `currentColor` so a single set adapts to any line color.
// `orient="auto-start-reverse"` lets us reuse one arrow for markerStart and
// markerEnd without a flipped duplicate.
// ---------------------------------------------------------------------------

function Markers() {
  return (
    <defs>
      <marker
        id="archi-arrow-filled"
        viewBox="0 0 12 10"
        refX="11"
        refY="5"
        markerWidth="11"
        markerHeight="9"
        orient="auto-start-reverse"
        markerUnits="userSpaceOnUse"
      >
        <path d="M 0 0 L 12 5 L 0 10 Z" fill="currentColor" />
      </marker>

      <marker
        id="archi-arrow-open"
        viewBox="0 0 12 10"
        refX="11"
        refY="5"
        markerWidth="13"
        markerHeight="11"
        orient="auto-start-reverse"
        markerUnits="userSpaceOnUse"
      >
        <path d="M 0 0 L 12 5 L 0 10" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </marker>

      <marker
        id="archi-triangle-hollow"
        viewBox="0 0 12 12"
        refX="11"
        refY="6"
        markerWidth="13"
        markerHeight="13"
        orient="auto-start-reverse"
        markerUnits="userSpaceOnUse"
      >
        <path d="M 0 0 L 12 6 L 0 12 Z" fill="white" stroke="currentColor" strokeWidth="1" />
      </marker>

      <marker
        id="archi-diamond-filled"
        viewBox="0 0 14 10"
        refX="0"
        refY="5"
        markerWidth="14"
        markerHeight="10"
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <path d="M 0 5 L 7 0 L 14 5 L 7 10 Z" fill="currentColor" />
      </marker>

      <marker
        id="archi-diamond-hollow"
        viewBox="0 0 14 10"
        refX="0"
        refY="5"
        markerWidth="14"
        markerHeight="10"
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <path d="M 0 5 L 7 0 L 14 5 L 7 10 Z" fill="white" stroke="currentColor" strokeWidth="1" />
      </marker>

      <marker
        id="archi-dot-filled"
        viewBox="0 0 8 8"
        refX="1"
        refY="4"
        markerWidth="8"
        markerHeight="8"
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <circle cx="4" cy="4" r="3" fill="currentColor" />
      </marker>
    </defs>
  )
}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

type EdgeStyle = {
  dashArray?: string
  markerStart?: string
  markerEnd?: string
}

// Per-relationship visual rules. References:
//   - The Open Group ArchiMate 3.2 Specification, § 5 (Relationships)
//     https://pubs.opengroup.org/architecture/archimate3-doc/
//   - Archi tool's relationship icons (cross-checked visually):
//     https://github.com/archimatetool/archi/tree/master/com.archimatetool.editor/img/archimate
function styleForEdge(edge: Edge): EdgeStyle {
  switch (edge.relationshipType) {
    case 'Composition':
      // solid + filled diamond at source (whole)
      return { markerStart: 'archi-diamond-filled' }
    case 'Aggregation':
      // solid + hollow diamond at source (whole)
      return { markerStart: 'archi-diamond-hollow' }
    case 'Assignment':
      // solid + filled dot at source + filled arrow at target
      return { markerStart: 'archi-dot-filled', markerEnd: 'archi-arrow-filled' }
    case 'Realization':
      // dashed (long) + hollow triangle at target
      return { dashArray: DASH_PATTERN, markerEnd: 'archi-triangle-hollow' }
    case 'Serving':
    case 'UsedBy':
      // solid + open arrow at target
      return { markerEnd: 'archi-arrow-open' }
    case 'Triggering':
      // solid + filled arrow at target
      return { markerEnd: 'archi-arrow-filled' }
    case 'Flow':
      // dashed (shorter than realization) + filled arrow at target
      return { dashArray: FLOW_PATTERN, markerEnd: 'archi-arrow-filled' }
    case 'Specialization':
      // solid + hollow triangle at target
      return { markerEnd: 'archi-triangle-hollow' }
    case 'Access': {
      // dotted; arrow direction depends on Read / Write / ReadWrite
      const at = edge.accessType ?? 'Access'
      if (at === 'Read') return { dashArray: DOT_PATTERN, markerStart: 'archi-arrow-open' }
      if (at === 'Write') return { dashArray: DOT_PATTERN, markerEnd: 'archi-arrow-open' }
      if (at === 'ReadWrite')
        return {
          dashArray: DOT_PATTERN,
          markerStart: 'archi-arrow-open',
          markerEnd: 'archi-arrow-open',
        }
      // 'Access' (no specified direction) — line only, no arrows
      return { dashArray: DOT_PATTERN }
    }
    case 'Influence':
      // dashed + open arrow at target (+/- modifier label not yet rendered)
      return { dashArray: DASH_PATTERN, markerEnd: 'archi-arrow-open' }
    case 'Association':
      // solid; open arrow at target only when isDirected="true"
      return edge.isDirected ? { markerEnd: 'archi-arrow-open' } : {}
    default:
      return { markerEnd: 'archi-arrow-filled' }
  }
}

function ConnectionPath({ edge, nodeMap }: { edge: Edge; nodeMap: Map<string, NodeBox> }) {
  const source = nodeMap.get(edge.sourceId)
  const target = nodeMap.get(edge.targetId)
  if (!source || !target) return null

  const { source: sourcePoint, target: targetPoint } = endpointsForConnection(
    source,
    target,
    edge.bendpoints,
  )

  const points = [sourcePoint, ...edge.bendpoints, targetPoint]
    .map((p) => `${p.x},${p.y}`)
    .join(' ')

  const style = styleForEdge(edge)
  const stroke = edge.stroke ?? DEFAULT_STROKE

  return (
    <polyline
      points={points}
      fill="none"
      stroke={stroke}
      strokeWidth={1}
      strokeDasharray={style.dashArray}
      markerStart={style.markerStart ? `url(#${style.markerStart})` : undefined}
      markerEnd={style.markerEnd ? `url(#${style.markerEnd})` : undefined}
      style={{ color: stroke }}
    />
  )
}

// Compute the (source endpoint, target endpoint) pair for a connection.
//
// With bendpoints: each end attaches independently to the adjacent waypoint.
// Without bendpoints: if source and target boxes overlap on one axis, snap
// both endpoints to a shared coordinate inside the overlap so the line is
// perfectly horizontal/vertical (matches Archi's behavior). Diagonal pairs
// fall through to corner-style attachment.
function endpointsForConnection(
  source: NodeBox,
  target: NodeBox,
  bendpoints: Point[],
): { source: Point; target: Point } {
  if (source.isJunction && target.isJunction) {
    return { source: nodeCenter(source), target: nodeCenter(target) }
  }

  if (bendpoints.length > 0) {
    return {
      source: source.isJunction
        ? nodeCenter(source)
        : attachPoint(source, bendpoints[0]),
      target: target.isJunction
        ? nodeCenter(target)
        : attachPoint(target, bendpoints[bendpoints.length - 1]),
    }
  }

  // No bendpoints: pair-aware snapping for orthogonal alignment.
  const sLeft = source.x
  const sRight = source.x + source.w
  const sTop = source.y
  const sBottom = source.y + source.h
  const tLeft = target.x
  const tRight = target.x + target.w
  const tTop = target.y
  const tBottom = target.y + target.h

  const yOverlap = Math.min(sBottom, tBottom) - Math.max(sTop, tTop)
  const xOverlap = Math.min(sRight, tRight) - Math.max(sLeft, tLeft)

  // Horizontal: source and target separated left-to-right with overlapping Y.
  if (xOverlap < 0 && yOverlap > 0) {
    const y = (Math.max(sTop, tTop) + Math.min(sBottom, tBottom)) / 2
    if (sRight <= tLeft) {
      return {
        source: source.isJunction ? nodeCenter(source) : { x: sRight, y },
        target: target.isJunction ? nodeCenter(target) : { x: tLeft, y },
      }
    }
    return {
      source: source.isJunction ? nodeCenter(source) : { x: sLeft, y },
      target: target.isJunction ? nodeCenter(target) : { x: tRight, y },
    }
  }

  // Vertical: source and target separated top-to-bottom with overlapping X.
  if (yOverlap < 0 && xOverlap > 0) {
    const x = (Math.max(sLeft, tLeft) + Math.min(sRight, tRight)) / 2
    if (sBottom <= tTop) {
      return {
        source: source.isJunction ? nodeCenter(source) : { x, y: sBottom },
        target: target.isJunction ? nodeCenter(target) : { x, y: tTop },
      }
    }
    return {
      source: source.isJunction ? nodeCenter(source) : { x, y: sTop },
      target: target.isJunction ? nodeCenter(target) : { x, y: tBottom },
    }
  }

  // Diagonal or overlapping: independent attachment toward each other's center.
  return {
    source: source.isJunction ? nodeCenter(source) : attachPoint(source, nodeCenter(target)),
    target: target.isJunction ? nodeCenter(target) : attachPoint(target, nodeCenter(source)),
  }
}

function nodeCenter(n: NodeBox): Point {
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 }
}

// Attach a connection endpoint to a node's edge using orthogonal projection
// (matches Archi's routing). If the next waypoint is to the side, exit the
// matching side at the waypoint's Y (clamped). If above/below, exit top/bottom
// at the waypoint's X (clamped). Diagonal targets fall through to the side
// they're farther from, which produces a corner attachment.
function attachPoint(box: NodeBox, towards: Point): Point {
  const left = box.x
  const right = box.x + box.w
  const top = box.y
  const bottom = box.y + box.h

  if (towards.x <= left) {
    return { x: left, y: clamp(towards.y, top, bottom) }
  }
  if (towards.x >= right) {
    return { x: right, y: clamp(towards.y, top, bottom) }
  }
  if (towards.y <= top) {
    return { x: clamp(towards.x, left, right), y: top }
  }
  if (towards.y >= bottom) {
    return { x: clamp(towards.x, left, right), y: bottom }
  }
  // Waypoint inside the box — degenerate; default to center.
  return nodeCenter(box)
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

// ---------------------------------------------------------------------------
// Nodes
// Reference: ArchiMate 3.2 spec, sections 4 & 6–8 (Element notation).
// Node shapes:
//   - Junction (And / Or)             → filled black circle
//   - Container / Grouping            → dashed border, transparent fill
//   - Label                           → text only, no border
//   - All other elements              → rounded rectangle + icon glyph
// ---------------------------------------------------------------------------

function NodeShape({ node }: { node: NodeBox }) {
  if (node.isJunction) return <JunctionShape node={node} />
  if (node.nodeType === 'Label') return <LabelShape node={node} />

  const isContainer =
    node.nodeType === 'Container' ||
    node.nodeType === 'Group' ||
    (!node.elementId && !node.nodeType)

  return <ElementShape node={node} dashed={isContainer} transparent={isContainer} />
}

function JunctionShape({ node }: { node: NodeBox }) {
  const cx = node.x + node.w / 2
  const cy = node.y + node.h / 2
  const r = Math.max(4, Math.min(node.w, node.h) / 2)
  return <circle cx={cx} cy={cy} r={r} fill={node.stroke} />
}

function LabelShape({ node }: { node: NodeBox }) {
  if (!node.label) return null
  const fontSize = node.fontSize ?? 11
  return (
    <text
      x={node.x + node.w / 2}
      y={node.y + node.h / 2 + fontSize / 3}
      textAnchor="middle"
      fontFamily={node.fontFamily ?? 'system-ui, -apple-system, sans-serif'}
      fontSize={fontSize}
      fill={node.textColor}
    >
      {node.label}
    </text>
  )
}

// Per-category corner radius. ArchiMate spec uses heavier rounding for
// Behavior and Motivation elements, minimal rounding for Active/Passive
// structure, and a stadium shape for Service.
const MOTIVATION_TYPES = new Set([
  'Stakeholder',
  'Driver',
  'Assessment',
  'Goal',
  'Outcome',
  'Principle',
  'Requirement',
  'Constraint',
  'Meaning',
  'Value',
])
const STRATEGY_TYPES = new Set(['Capability', 'Resource', 'CourseOfAction', 'ValueStream'])
const IMPLEMENTATION_TYPES = new Set([
  'WorkPackage',
  'Deliverable',
  'Plateau',
  'Gap',
  'ImplementationEvent',
])

type Shape = { kind: 'rect'; rx: number } | { kind: 'stadium' }

function shapeForType(elementType: string | undefined, h: number): Shape {
  if (!elementType) return { kind: 'rect', rx: 4 }
  if (elementType.endsWith('Service')) return { kind: 'stadium' }
  if (
    elementType.endsWith('Process') ||
    elementType.endsWith('Function') ||
    elementType.endsWith('Interaction') ||
    elementType.endsWith('Event')
  )
    return { kind: 'rect', rx: Math.min(14, h / 3) }
  if (MOTIVATION_TYPES.has(elementType)) return { kind: 'rect', rx: Math.min(18, h / 2.5) }
  if (STRATEGY_TYPES.has(elementType)) return { kind: 'rect', rx: Math.min(12, h / 3) }
  if (IMPLEMENTATION_TYPES.has(elementType)) return { kind: 'rect', rx: 6 }
  return { kind: 'rect', rx: 2 }
}

function ElementShape({
  node,
  dashed,
  transparent,
}: {
  node: NodeBox
  dashed: boolean
  transparent: boolean
}) {
  const fontSize = node.fontSize ?? 11
  const fill = transparent ? 'none' : node.fill
  const iconName = iconNameForType(node.elementType)
  const showIcon = !!iconName && node.w >= 50 && node.h >= 28
  const iconSize = showIcon ? Math.min(22, Math.max(14, node.w * 0.18)) : 0

  const shape = shapeForType(node.elementType, node.h)
  const radius = shape.kind === 'stadium' ? node.h / 2 : shape.rx

  return (
    <g style={{ color: node.stroke }}>
      <rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        fill={fill}
        stroke={node.stroke}
        strokeWidth={1}
        strokeDasharray={dashed ? '5 4' : undefined}
        rx={radius}
        ry={radius}
      />
      {showIcon ? (
        <IconBadge
          x={node.x + node.w - iconSize - 5}
          y={node.y + 5}
          size={iconSize}
          iconName={iconName!}
          color={node.stroke}
        />
      ) : null}
      {node.label ? (
        <text
          x={node.x + node.w / 2}
          y={node.y + Math.min(16, node.h / 2 + fontSize / 2)}
          textAnchor="middle"
          fontFamily={node.fontFamily ?? 'system-ui, -apple-system, sans-serif'}
          fontSize={fontSize}
          fill={node.textColor}
        >
          {truncateLabel(node.label, node.w - (showIcon ? iconSize + 12 : 8), fontSize)}
        </text>
      ) : null}
    </g>
  )
}

function IconBadge({
  x,
  y,
  size,
  iconName,
  color,
}: {
  x: number
  y: number
  size: number
  iconName: string
  color: string
}) {
  const def = ICONS[iconName]
  if (!def) return null
  const scale = size / 100
  // Stroke width is in the icon's local 0..100 coord space. At scale 0.18
  // (icon ~18 px), strokeWidth 8 ≈ 1.4 px on screen — visible at small sizes
  // without overwhelming the badge.
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      stroke={color}
      strokeWidth={8}
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {def.outline?.map((d, i) => <path key={`o-${i}`} d={d} />)}
      {def.filled?.map((d, i) => <path key={`f-${i}`} d={d} fill={color} stroke="none" />)}
    </g>
  )
}

function truncateLabel(label: string, width: number, fontSize: number): string {
  const maxChars = Math.max(1, Math.floor(width / (fontSize * 0.55)))
  if (label.length <= maxChars) return label
  return label.slice(0, Math.max(1, maxChars - 1)) + '…'
}
