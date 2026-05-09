'use client'

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
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

    const endpointPlan = useMemo(
      () => planEndpoints(view.connections, nodeMap),
      [view, nodeMap],
    )

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
        <g ref={gRef}>
          {view.nodes.map((n) => (
            <NodeShape key={n.id} node={n} />
          ))}
          {view.connections.map((c) => {
            const pts = endpointPlan.get(c.id)
            if (!pts) return null
            return (
              <ConnectionPath
                key={c.id}
                edge={c}
                sourcePoint={pts.source}
                targetPoint={pts.target}
              />
            )
          })}
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

// Marker glyphs rendered inline (NOT via <marker>) so they don't inherit
// stroke-dasharray from a dashed parent polyline — Chrome/Safari otherwise
// dot-strokes the marker outline, which we don't want for Realization /
// Specialization / Flow / Influence / Access. Each glyph defines its
// reference point (where the line endpoint lands), the path geometry, and
// whether it should flip 180° at line start (was orient="auto-start-reverse").
type MarkerGlyph = {
  refX: number
  refY: number
  paint: ReactNode
  // True if this glyph should be reversed when used as markerStart (matches
  // the SVG `orient="auto-start-reverse"` behavior of its old <marker>).
  reverseAtStart: boolean
}

const MARKER_GLYPHS: Record<string, MarkerGlyph> = {
  'archi-arrow-filled': {
    refX: 11,
    refY: 5,
    reverseAtStart: true,
    paint: <path d="M 0 0 L 12 5 L 0 10 Z" fill="currentColor" />,
  },
  'archi-arrow-open': {
    refX: 11,
    refY: 5,
    reverseAtStart: true,
    paint: (
      <path d="M 0 0 L 12 5 L 0 10" fill="none" stroke="currentColor" strokeWidth="1.2" />
    ),
  },
  'archi-triangle-hollow': {
    refX: 11,
    refY: 6,
    reverseAtStart: true,
    paint: (
      <path d="M 0 0 L 12 6 L 0 12 Z" fill="white" stroke="currentColor" strokeWidth="1" />
    ),
  },
  'archi-diamond-filled': {
    refX: 0,
    refY: 5,
    reverseAtStart: false,
    paint: (
      <path
        d="M 0 5 L 7 0 L 14 5 L 7 10 Z"
        fill="#1A1A1A"
        stroke="#1A1A1A"
        strokeWidth="1"
      />
    ),
  },
  'archi-diamond-hollow': {
    refX: 0,
    refY: 5,
    reverseAtStart: false,
    paint: (
      <path
        d="M 0 5 L 7 0 L 14 5 L 7 10 Z"
        fill="white"
        stroke="#1A1A1A"
        strokeWidth="1"
      />
    ),
  },
  'archi-arrow-thin': {
    refX: 9,
    refY: 4,
    reverseAtStart: true,
    paint: <path d="M 0 0 L 10 4 L 0 8" fill="none" stroke="currentColor" strokeWidth="1" />,
  },
  'archi-dot-filled': {
    refX: 1,
    refY: 4,
    reverseAtStart: false,
    paint: <circle cx="4" cy="4" r="3" fill="currentColor" />,
  },
}

function MarkerInline({
  glyph,
  position,
  pathAngleRad,
  isStart,
}: {
  glyph: string
  position: Point
  pathAngleRad: number
  isStart: boolean
}) {
  const spec = MARKER_GLYPHS[glyph]
  if (!spec) return null
  const angle = isStart && spec.reverseAtStart ? pathAngleRad + Math.PI : pathAngleRad
  const angleDeg = (angle * 180) / Math.PI
  return (
    <g
      transform={`translate(${position.x} ${position.y}) rotate(${angleDeg}) translate(${-spec.refX} ${-spec.refY})`}
    >
      {spec.paint}
    </g>
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
      if (at === 'Read') return { dashArray: DOT_PATTERN, markerStart: 'archi-arrow-thin' }
      if (at === 'Write') return { dashArray: DOT_PATTERN, markerEnd: 'archi-arrow-thin' }
      if (at === 'ReadWrite')
        return {
          dashArray: DOT_PATTERN,
          markerStart: 'archi-arrow-thin',
          markerEnd: 'archi-arrow-thin',
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

function ConnectionPath({
  edge,
  sourcePoint,
  targetPoint,
}: {
  edge: Edge
  sourcePoint: Point
  targetPoint: Point
}) {
  const allPoints = [sourcePoint, ...edge.bendpoints, targetPoint]
  const pointsStr = allPoints.map((p) => `${p.x},${p.y}`).join(' ')

  const style = styleForEdge(edge)
  const stroke = edge.stroke ?? DEFAULT_STROKE

  // Path direction at each end: from neighbor toward the endpoint. Markers are
  // rendered inline (not via <marker>) so a dashed polyline doesn't bleed its
  // stroke-dasharray into the marker outline.
  const startNeighbor = allPoints[1] ?? sourcePoint
  const endNeighbor = allPoints[allPoints.length - 2] ?? targetPoint
  const startAngle = Math.atan2(
    startNeighbor.y - sourcePoint.y,
    startNeighbor.x - sourcePoint.x,
  )
  const endAngle = Math.atan2(
    targetPoint.y - endNeighbor.y,
    targetPoint.x - endNeighbor.x,
  )

  return (
    <g style={{ color: stroke }}>
      <polyline
        points={pointsStr}
        fill="none"
        stroke={stroke}
        strokeWidth={1}
        strokeDasharray={style.dashArray}
      />
      {style.markerStart ? (
        <MarkerInline
          glyph={style.markerStart}
          position={sourcePoint}
          pathAngleRad={startAngle}
          isStart
        />
      ) : null}
      {style.markerEnd ? (
        <MarkerInline
          glyph={style.markerEnd}
          position={targetPoint}
          pathAngleRad={endAngle}
          isStart={false}
        />
      ) : null}
    </g>
  )
}

// Compute endpoint positions for every connection in the view, distributing
// attachments along each node side when multiple edges share it.
//
// - Connections with authored bendpoints are honored as-is (no distribution).
// - Single-edge groups keep the orthogonal-snap / diagonal-edge behavior from
//   `endpointsForConnection`.
// - Multi-edge groups: edges sharing the same exit side of a node are sorted
//   by the position of their other end (so lines don't cross at the boundary)
//   and spread evenly along that side at i/(N+1) fractions.
type Side = 'left' | 'right' | 'top' | 'bottom'

function pickSide(box: NodeBox, towards: Point): Side {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const dx = towards.x - cx
  const dy = towards.y - cy
  const ax = Math.abs(dx) / Math.max(box.w / 2, 1)
  const ay = Math.abs(dy) / Math.max(box.h / 2, 1)
  if (ax >= ay) return dx >= 0 ? 'right' : 'left'
  return dy >= 0 ? 'bottom' : 'top'
}

function pointOnSide(box: NodeBox, side: Side, t: number): Point {
  switch (side) {
    case 'left':
      return { x: box.x, y: box.y + box.h * t }
    case 'right':
      return { x: box.x + box.w, y: box.y + box.h * t }
    case 'top':
      return { x: box.x + box.w * t, y: box.y }
    case 'bottom':
      return { x: box.x + box.w * t, y: box.y + box.h }
  }
}

function planEndpoints(
  connections: Edge[],
  nodeMap: Map<string, NodeBox>,
): Map<string, { source: Point; target: Point }> {
  const result = new Map<string, { source: Point; target: Point }>()

  // Per-(node, side) lists of {edgeId, isSourceEnd, guideCoord}.
  type Slot = { edgeId: string; isSourceEnd: boolean; guideCoord: number }
  const groups = new Map<string, Map<Side, Slot[]>>()
  const addSlot = (nodeId: string, side: Side, slot: Slot) => {
    let byNode = groups.get(nodeId)
    if (!byNode) groups.set(nodeId, (byNode = new Map()))
    let list = byNode.get(side)
    if (!list) byNode.set(side, (list = []))
    list.push(slot)
  }

  for (const edge of connections) {
    const s = nodeMap.get(edge.sourceId)
    const t = nodeMap.get(edge.targetId)
    if (!s || !t) continue
    const initial = endpointsForConnection(s, t, edge.bendpoints)
    result.set(edge.id, initial)

    if (edge.bendpoints.length > 0) continue
    if (s.isJunction || t.isJunction) continue

    const tCenter = nodeCenter(t)
    const sCenter = nodeCenter(s)
    const sSide = pickSide(s, tCenter)
    const tSide = pickSide(t, sCenter)
    const sGuide = sSide === 'left' || sSide === 'right' ? tCenter.y : tCenter.x
    const tGuide = tSide === 'left' || tSide === 'right' ? sCenter.y : sCenter.x
    addSlot(s.id, sSide, { edgeId: edge.id, isSourceEnd: true, guideCoord: sGuide })
    addSlot(t.id, tSide, { edgeId: edge.id, isSourceEnd: false, guideCoord: tGuide })
  }

  for (const [nodeId, byNode] of groups) {
    const node = nodeMap.get(nodeId)!
    for (const [side, slots] of byNode) {
      if (slots.length < 2) continue
      slots.sort((a, b) => a.guideCoord - b.guideCoord)
      for (let i = 0; i < slots.length; i++) {
        const point = pointOnSide(node, side, (i + 1) / (slots.length + 1))
        const cur = result.get(slots[i].edgeId)!
        result.set(
          slots[i].edgeId,
          slots[i].isSourceEnd
            ? { source: point, target: cur.target }
            : { source: cur.source, target: point },
        )
      }
    }
  }

  return result
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

// Attach a connection endpoint to a node's edge.
//
// - Strictly orthogonal (waypoint to one side only): exit that side at the
//   waypoint's matching coordinate. Matches Archi's routing.
// - Corner-zone (waypoint diagonally beyond a corner): exit at the actual
//   line-rectangle intersection from the box center toward the waypoint, so
//   the line meets the edge cleanly and the arrow head sits flush against
//   the shape (avoids the gap that corner-snapping produces).
function attachPoint(box: NodeBox, towards: Point): Point {
  const left = box.x
  const right = box.x + box.w
  const top = box.y
  const bottom = box.y + box.h
  const xOut = towards.x < left ? -1 : towards.x > right ? 1 : 0
  const yOut = towards.y < top ? -1 : towards.y > bottom ? 1 : 0

  if (xOut !== 0 && yOut === 0) {
    return { x: xOut < 0 ? left : right, y: clamp(towards.y, top, bottom) }
  }
  if (xOut === 0 && yOut !== 0) {
    return { x: clamp(towards.x, left, right), y: yOut < 0 ? top : bottom }
  }
  if (xOut !== 0 && yOut !== 0) {
    const cx = (left + right) / 2
    const cy = (top + bottom) / 2
    const dx = towards.x - cx
    const dy = towards.y - cy
    const t = Math.min((box.w / 2) / Math.abs(dx), (box.h / 2) / Math.abs(dy))
    return { x: cx + dx * t, y: cy + dy * t }
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
  const textX = node.x + node.w / 2
  const lines = wrapLabel(node.label, node.w - 8, fontSize)
  const lineHeight = fontSize * 1.2
  // Vertically center the block of lines around the node's middle.
  const blockHeight = lineHeight * (lines.length - 1)
  const firstY = node.y + node.h / 2 + fontSize / 3 - blockHeight / 2
  return (
    <text
      x={textX}
      y={firstY}
      textAnchor="middle"
      fontFamily={node.fontFamily ?? 'system-ui, -apple-system, sans-serif'}
      fontSize={fontSize}
      fill={node.textColor}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={textX} dy={i === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
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
        (() => {
          const textX = node.x + node.w / 2
          const textY = node.y + Math.min(16, node.h / 2 + fontSize / 2)
          const availWidth = node.w - (showIcon ? iconSize + 12 : 8)
          const lines = wrapLabel(node.label, availWidth, fontSize)
          return (
            <text
              x={textX}
              y={textY}
              textAnchor="middle"
              fontFamily={node.fontFamily ?? 'system-ui, -apple-system, sans-serif'}
              fontSize={fontSize}
              fill={node.textColor}
            >
              {lines.map((line, i) => (
                <tspan key={i} x={textX} dy={i === 0 ? 0 : fontSize * 1.2}>
                  {line}
                </tspan>
              ))}
            </text>
          )
        })()
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
  // Stroke width is in the icon's local 0..100 coord space. At scale 0.18,
  // strokeWidth 5 ≈ 0.9 px on screen — thin and crisp at small sizes.
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      stroke={color}
      strokeWidth={5}
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {def.outline?.map((d, i) => <path key={`o-${i}`} d={d} />)}
      {def.filled?.map((d, i) => <path key={`f-${i}`} d={d} fill={color} stroke="none" />)}
    </g>
  )
}

// Greedy word-wrap to fit `width`, with a hard line cap. The last visible line
// is truncated with an ellipsis if there's overflow. Single words longer than
// the line budget are hard-broken at the character boundary.
function wrapLabel(
  label: string,
  width: number,
  fontSize: number,
  maxLines = 3,
): string[] {
  const maxChars = Math.max(1, Math.floor(width / (fontSize * 0.55)))
  const words = label.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxChars) {
      current = candidate
      continue
    }
    if (current) lines.push(current)
    if (word.length > maxChars) {
      let rest = word
      while (rest.length > maxChars) {
        lines.push(rest.slice(0, maxChars))
        rest = rest.slice(maxChars)
      }
      current = rest
    } else {
      current = word
    }
  }
  if (current) lines.push(current)
  if (lines.length > maxLines) {
    const truncated = lines.slice(0, maxLines)
    const last = truncated.length - 1
    truncated[last] = truncated[last].slice(0, Math.max(1, maxChars - 1)) + '…'
    return truncated
  }
  return lines
}
