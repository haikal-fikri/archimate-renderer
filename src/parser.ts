import { colorForType, DEFAULT_STROKE, DEFAULT_TEXT } from './colors'
import type { AccessType, Edge, NodeBox, ParsedView, Point } from './types'

const ACCESS_TYPES: ReadonlySet<AccessType> = new Set(['Access', 'Read', 'Write', 'ReadWrite'])

function isJunctionType(t?: string): boolean {
  if (!t) return false
  return t === 'Junction' || t === 'AndJunction' || t === 'OrJunction'
}

const OPEN_EXCHANGE_NS = 'http://www.opengroup.org/xsd/archimate/3.0/'
const NATIVE_ARCHI_NS = 'http://www.archimatetool.com/archimate'
const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance'

// Archi's Open Exchange exporter writes nested <node> x/y as absolute
// view coordinates, contradicting the v3 spec which says they should be
// relative to the parent container. Real-world XML wins — keep this `false`
// unless rendering against an exporter that follows the spec strictly.
const RELATIVE_COORDINATES = false

export type ArchimateParseErrorKind =
  | 'invalid-xml'
  | 'wrong-format'
  | 'no-views'
  | 'view-not-found'

export class ArchimateParseError extends Error {
  readonly kind: ArchimateParseErrorKind
  constructor(message: string, kind: ArchimateParseErrorKind) {
    super(message)
    this.name = 'ArchimateParseError'
    this.kind = kind
  }
}

function childrenOf(el: Element, name: string): Element[] {
  return Array.from(el.children).filter((c) => c.localName === name)
}

function firstChild(el: Element, name: string): Element | null {
  for (const c of Array.from(el.children)) if (c.localName === name) return c
  return null
}

function xsiType(el: Element): string | undefined {
  return el.getAttributeNS(XSI_NS, 'type') ?? el.getAttribute('xsi:type') ?? undefined
}

function textOf(el: Element | null): string {
  return (el?.textContent ?? '').trim()
}

function rgbaFromColor(el: Element | null): string | undefined {
  if (!el) return undefined
  const r = el.getAttribute('r')
  const g = el.getAttribute('g')
  const b = el.getAttribute('b')
  const a = el.getAttribute('a')
  if (r === null || g === null || b === null) return undefined
  const alpha = a === null ? 1 : Math.max(0, Math.min(1, Number(a) / 100))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function num(el: Element, attr: string, fallback = 0): number {
  const v = el.getAttribute(attr)
  if (v === null) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function parseArchimate(xml: string, viewId?: string): ParsedView {
  if (typeof xml !== 'string' || xml.trim().length === 0) {
    throw new ArchimateParseError('No XML provided.', 'invalid-xml')
  }

  let doc: Document
  try {
    doc = new DOMParser().parseFromString(xml, 'application/xml')
  } catch (e) {
    throw new ArchimateParseError(`Could not parse XML: ${(e as Error).message}`, 'invalid-xml')
  }

  const errEl = doc.getElementsByTagName('parsererror')[0]
  if (errEl) {
    const msg = errEl.textContent?.split('\n').find((l) => l.trim().length > 0) ?? 'malformed XML'
    throw new ArchimateParseError(`Invalid XML: ${msg.trim()}`, 'invalid-xml')
  }

  const root = doc.documentElement
  if (!root) {
    throw new ArchimateParseError('XML document has no root element.', 'invalid-xml')
  }

  if (root.namespaceURI === NATIVE_ARCHI_NS) {
    throw new ArchimateParseError(
      "This looks like Archi's native .archimate file. In Archi: File → Export → Open Exchange XML, then paste the exported XML here instead.",
      'wrong-format',
    )
  }

  if (root.namespaceURI !== OPEN_EXCHANGE_NS) {
    throw new ArchimateParseError(
      `Expected ArchiMate Open Exchange XML (namespace ${OPEN_EXCHANGE_NS}). Got ${root.namespaceURI ?? 'no namespace'}.`,
      'wrong-format',
    )
  }

  const elementsEl = firstChild(root, 'elements')
  const elementMap = new Map<string, { name: string; type?: string }>()
  if (elementsEl) {
    for (const el of childrenOf(elementsEl, 'element')) {
      const id = el.getAttribute('identifier')
      if (!id) continue
      elementMap.set(id, {
        name: textOf(firstChild(el, 'name')) || id,
        type: xsiType(el),
      })
    }
  }

  const relationshipsEl = firstChild(root, 'relationships')
  const relationshipMap = new Map<
    string,
    {
      source: string
      target: string
      type?: string
      accessType?: AccessType
      isDirected?: boolean
      name?: string
    }
  >()
  if (relationshipsEl) {
    for (const r of childrenOf(relationshipsEl, 'relationship')) {
      const id = r.getAttribute('identifier')
      const source = r.getAttribute('source')
      const target = r.getAttribute('target')
      if (!id || !source || !target) continue
      const rawAccess = r.getAttribute('accessType')
      const accessType =
        rawAccess && ACCESS_TYPES.has(rawAccess as AccessType)
          ? (rawAccess as AccessType)
          : undefined
      const isDirectedAttr = r.getAttribute('isDirected')
      const isDirected =
        isDirectedAttr === 'true' ? true : isDirectedAttr === 'false' ? false : undefined
      relationshipMap.set(id, {
        source,
        target,
        type: xsiType(r),
        accessType,
        isDirected,
        name: textOf(firstChild(r, 'name')) || undefined,
      })
    }
  }

  const viewsEl = firstChild(root, 'views')
  if (!viewsEl) throw new ArchimateParseError('Model has no <views> section.', 'no-views')
  const diagramsEl = firstChild(viewsEl, 'diagrams')
  if (!diagramsEl) throw new ArchimateParseError('Model has no <diagrams> section.', 'no-views')

  const allViews = childrenOf(diagramsEl, 'view')
  if (allViews.length === 0) throw new ArchimateParseError('Model contains no views.', 'no-views')

  let viewEl: Element | null = null
  if (viewId) {
    viewEl = allViews.find((v) => v.getAttribute('identifier') === viewId) ?? null
    if (!viewEl) {
      throw new ArchimateParseError(
        `No view with identifier "${viewId}" found in this model.`,
        'view-not-found',
      )
    }
  } else {
    viewEl = allViews[0]
  }

  const viewName =
    textOf(firstChild(viewEl, 'name')) || viewEl.getAttribute('identifier') || 'Untitled view'

  const nodes: NodeBox[] = []

  function walkNode(nodeEl: Element, offsetX: number, offsetY: number) {
    const id = nodeEl.getAttribute('identifier')
    if (!id) return
    const lx = num(nodeEl, 'x')
    const ly = num(nodeEl, 'y')
    const w = num(nodeEl, 'w')
    const h = num(nodeEl, 'h')

    const x = RELATIVE_COORDINATES ? lx + offsetX : lx
    const y = RELATIVE_COORDINATES ? ly + offsetY : ly

    const elementRef = nodeEl.getAttribute('elementRef')
    const elementInfo = elementRef ? elementMap.get(elementRef) : undefined
    const nodeType = xsiType(nodeEl)

    const styleEl = firstChild(nodeEl, 'style')
    const fillEl = styleEl ? firstChild(styleEl, 'fillColor') : null
    const lineEl = styleEl ? firstChild(styleEl, 'lineColor') : null
    const fontEl = styleEl ? firstChild(styleEl, 'font') : null
    const fontColorEl = fontEl ? firstChild(fontEl, 'color') : null

    const fontSizeAttr = fontEl?.getAttribute('size')
    const fontSize = fontSizeAttr ? Number(fontSizeAttr) : undefined

    nodes.push({
      id,
      elementId: elementRef ?? undefined,
      elementType: elementInfo?.type,
      nodeType,
      isJunction: isJunctionType(elementInfo?.type),
      label: elementInfo?.name ?? textOf(firstChild(nodeEl, 'label')),
      x,
      y,
      w,
      h,
      fill: rgbaFromColor(fillEl) ?? colorForType(elementInfo?.type),
      stroke: rgbaFromColor(lineEl) ?? DEFAULT_STROKE,
      textColor: rgbaFromColor(fontColorEl) ?? DEFAULT_TEXT,
      fontFamily: fontEl?.getAttribute('name') ?? undefined,
      fontSize: fontSize && Number.isFinite(fontSize) ? fontSize : undefined,
    })

    for (const childNode of childrenOf(nodeEl, 'node')) {
      walkNode(childNode, x, y)
    }
  }

  for (const n of childrenOf(viewEl, 'node')) walkNode(n, 0, 0)

  const nodeMap = new Map<string, NodeBox>()
  for (const n of nodes) nodeMap.set(n.id, n)

  const connections: Edge[] = []
  for (const c of childrenOf(viewEl, 'connection')) {
    const id = c.getAttribute('identifier')
    const source = c.getAttribute('source')
    const target = c.getAttribute('target')
    if (!id || !source || !target) continue
    if (!nodeMap.has(source) || !nodeMap.has(target)) continue

    const relRef = c.getAttribute('relationshipRef')
    const relInfo = relRef ? relationshipMap.get(relRef) : undefined

    const bendpoints: Point[] = []
    for (const bp of childrenOf(c, 'bendpoint')) {
      bendpoints.push({ x: num(bp, 'x'), y: num(bp, 'y') })
    }

    const styleEl = firstChild(c, 'style')
    const lineEl = styleEl ? firstChild(styleEl, 'lineColor') : null

    connections.push({
      id,
      sourceId: source,
      targetId: target,
      relationshipType: relInfo?.type,
      accessType: relInfo?.accessType,
      isDirected: relInfo?.isDirected,
      name: relInfo?.name,
      bendpoints,
      stroke: rgbaFromColor(lineEl),
    })
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    if (n.x < minX) minX = n.x
    if (n.y < minY) minY = n.y
    if (n.x + n.w > maxX) maxX = n.x + n.w
    if (n.y + n.h > maxY) maxY = n.y + n.h
  }
  if (!Number.isFinite(minX)) {
    minX = 0
    minY = 0
    maxX = 100
    maxY = 100
  }
  const pad = 20

  return {
    viewId: viewEl.getAttribute('identifier') ?? '',
    viewName,
    viewBox: {
      x: minX - pad,
      y: minY - pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    },
    nodes,
    connections,
  }
}
