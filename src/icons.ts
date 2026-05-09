// ArchiMate element-type icon glyphs.
//
// Each icon is defined in a 0..100 local coordinate system and rendered as a
// small badge in the top-right corner of each node. The renderer scales and
// translates the icon to its final position. Strokes use `currentColor` so a
// single set adapts to any line color.
//
// Visually patterned on the Archi tool's standard ArchiMate 3.x icon set
// (com.archimatetool.editor/img/archimate/* in the archimatetool/archi
// repository on GitHub). They are simplified vector reproductions, not
// pixel-perfect copies — they aim to be recognisable at ~16 px and to keep
// the right "shape language" per element type.
//
// References:
// - Archi icon source: https://github.com/archimatetool/archi/tree/master/com.archimatetool.editor/img/archimate
// - ArchiMate 3.2 Specification: https://pubs.opengroup.org/architecture/archimate3-doc/

export type IconDef = {
  /** Path data strings in the 0..100 local coord system. Stroked, not filled. */
  outline?: string[]
  /** Path data strings drawn filled with currentColor (no stroke). */
  filled?: string[]
}

export const ICONS: Record<string, IconDef> = {
  // ─── Active structure ──────────────────────────────────────────────────────

  // Actor / Stakeholder — stick figure with head, body, arms, legs
  actor: {
    outline: [
      'M 50 22 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0',
      'M 50 32 L 50 60',
      'M 22 46 L 78 46',
      'M 50 60 L 28 88',
      'M 50 60 L 72 88',
    ],
  },

  // Role — horizontal pill with a small filled dot on the right
  role: {
    outline: ['M 22 32 L 78 32 a 18 18 0 0 1 0 36 L 22 68 a 18 18 0 0 1 0 -36 Z'],
    filled: ['M 70 50 m -7 0 a 7 7 0 1 0 14 0 a 7 7 0 1 0 -14 0'],
  },

  // Collaboration — two full overlapping circles (Venn-style, symmetric)
  collaboration: {
    outline: [
      'M 36 50 m -22 0 a 22 22 0 1 0 44 0 a 22 22 0 1 0 -44 0',
      'M 64 50 m -22 0 a 22 22 0 1 0 44 0 a 22 22 0 1 0 -44 0',
    ],
  },

  // Interaction — two semicircles (D-shapes) facing each other with a gap
  interaction: {
    outline: [
      'M 42 22 A 28 28 0 0 0 42 78 Z',
      'M 58 22 A 28 28 0 0 1 58 78 Z',
    ],
  },

  // Interface — lollipop (line on left, filled circle on right)
  interface: {
    outline: [
      'M 64 50 m -16 0 a 16 16 0 1 0 32 0 a 16 16 0 1 0 -32 0',
      'M 12 50 L 48 50',
    ],
  },

  // Application Component — main rectangle + two connector tabs on the left
  component: {
    outline: [
      'M 30 22 L 88 22 L 88 78 L 30 78 Z',
      'M 14 32 L 38 32 L 38 46 L 14 46 Z',
      'M 14 54 L 38 54 L 38 68 L 14 68 Z',
    ],
  },

  // ─── Behavior ──────────────────────────────────────────────────────────────

  // Process — right-pointing arrow / chevron
  process: {
    outline: ['M 12 35 L 56 35 L 56 22 L 88 50 L 56 78 L 56 65 L 12 65 Z'],
  },

  // Function — concentric chevrons matching the ArchiMate reference notation.
  // Outer V (apex up) and inner V (apex up, lower) sharing the same bottom
  // axis. Both outer-bottom corners and both inner-bottom corners sit on the
  // bottom edge; the inner V's apex sits above, forming the top of the stripe.
  // Vertices (clockwise): outer-bottom-left, outer-apex, outer-bottom-right,
  // inner-bottom-right, inner-apex, inner-bottom-left.
  function: {
    outline: ['M 10 82 L 50 18 L 90 82 L 72 82 L 50 42 L 28 82 Z'],
  },

  // Event — D-shape with chevron notch on the left
  event: {
    outline: ['M 70 22 a 28 28 0 0 1 0 56 L 28 78 L 48 50 L 28 22 Z'],
  },

  // Service — pill / rounded rectangle
  service: {
    outline: ['M 30 32 L 70 32 a 18 18 0 0 1 0 36 L 30 68 a 18 18 0 0 1 0 -36 Z'],
  },

  // ─── Passive structure ─────────────────────────────────────────────────────

  // Object / Data Object — rectangle with filled header bar
  object: {
    outline: ['M 15 22 L 85 22 L 85 78 L 15 78 Z', 'M 15 36 L 85 36'],
    filled: ['M 15 22 L 85 22 L 85 36 L 15 36 Z'],
  },

  // Contract / Material — rectangle with several horizontal text lines
  contract: {
    outline: [
      'M 18 18 L 82 18 L 82 82 L 18 82 Z',
      'M 28 32 L 72 32',
      'M 28 44 L 72 44',
      'M 28 56 L 72 56',
      'M 28 68 L 60 68',
    ],
  },

  // Representation — rectangle with wavy bottom edge
  representation: {
    outline: ['M 18 18 L 82 18 L 82 70 Q 70 88 50 76 Q 30 64 18 82 Z'],
  },

  // Product — rectangle with a small tab notched on the top-left
  product: {
    outline: ['M 18 28 L 38 28 L 42 18 L 82 18 L 82 82 L 18 82 Z'],
  },

  // Artifact — page with folded upper-right corner
  artifact: {
    outline: ['M 22 14 L 70 14 L 86 30 L 86 86 L 22 86 Z', 'M 70 14 L 70 30 L 86 30'],
  },

  // ─── Technology ────────────────────────────────────────────────────────────

  // Node — 3D wireframe box
  node: {
    outline: [
      'M 18 38 L 70 38 L 70 86 L 18 86 Z',
      'M 18 38 L 32 22 L 84 22 L 70 38',
      'M 70 38 L 84 22 L 84 70 L 70 86',
    ],
  },

  // Device — computer monitor with stand
  device: {
    outline: [
      'M 12 22 L 88 22 L 88 64 L 12 64 Z',
      'M 28 78 L 72 78',
      'M 50 64 L 50 78',
    ],
  },

  // System Software — two asymmetrically overlapping circles (different sizes,
  // off-centre overlap — distinct from the symmetric Venn used for Collaboration)
  systemsoftware: {
    outline: [
      'M 38 58 m -28 0 a 28 28 0 1 0 56 0 a 28 28 0 1 0 -56 0',
      'M 72 32 m -16 0 a 16 16 0 1 0 32 0 a 16 16 0 1 0 -32 0',
    ],
  },

  // Communication Network — parallelogram with filled circle nodes at 4 corners
  network: {
    outline: ['M 28 22 L 88 22 L 72 78 L 12 78 Z'],
    filled: [
      'M 28 22 m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0',
      'M 88 22 m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0',
      'M 72 78 m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0',
      'M 12 78 m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0',
    ],
  },

  // Path — bidirectional arrows with a centre dot
  path: {
    outline: [
      'M 12 50 L 38 50',
      'M 22 40 L 12 50 L 22 60',
      'M 88 50 L 62 50',
      'M 78 40 L 88 50 L 78 60',
    ],
    filled: ['M 50 50 m -4 0 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0'],
  },

  // Equipment — two cogs (large + small) overlapping. Each cog: circle +
  // radial teeth at cardinal & intercardinal directions + filled hub.
  equipment: {
    outline: [
      // Big cog at (38, 60), body r=18, teeth out to r=22
      'M 38 60 m -18 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0',
      'M 38 38 L 38 42',
      'M 38 78 L 38 82',
      'M 16 60 L 20 60',
      'M 56 60 L 60 60',
      'M 23 45 L 26 48',
      'M 50 72 L 53 75',
      'M 23 75 L 26 72',
      'M 50 48 L 53 45',
      // Small cog at (74, 32), body r=10, teeth out to r=13
      'M 74 32 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0',
      'M 74 19 L 74 22',
      'M 74 42 L 74 45',
      'M 61 32 L 64 32',
      'M 84 32 L 87 32',
    ],
    filled: [
      'M 38 60 m -4 0 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0',
      'M 74 32 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0',
    ],
  },

  // Facility — factory with sawtooth roof (3 triangular peaks)
  facility: {
    outline: [
      'M 14 86 L 14 38 L 38 14 L 38 38 L 62 14 L 62 38 L 86 14 L 86 38 L 86 86 Z',
    ],
  },

  // Distribution Network — two parallel horizontal lines with arrowheads at
  // both ends (a "double-arrow" mathematical symbol ⇔)
  distributionnetwork: {
    outline: [
      'M 24 45 L 76 45',
      'M 24 55 L 76 55',
      'M 24 45 L 12 50 L 24 55',
      'M 76 45 L 88 50 L 76 55',
    ],
  },

  // Material — hexagon with internal horizontal lines
  material: {
    outline: [
      'M 50 14 L 84 32 L 84 68 L 50 86 L 16 68 L 16 32 Z',
      'M 24 44 L 76 44',
      'M 24 56 L 76 56',
    ],
  },

  // ─── Motivation ────────────────────────────────────────────────────────────

  // Driver — steering wheel: circle with 4-spoke crosshair + center hub
  driver: {
    outline: [
      'M 50 50 m -34 0 a 34 34 0 1 0 68 0 a 34 34 0 1 0 -68 0',
      'M 50 16 L 50 84',
      'M 16 50 L 84 50',
      'M 26 26 L 74 74',
      'M 74 26 L 26 74',
    ],
    filled: ['M 50 50 m -7 0 a 7 7 0 1 0 14 0 a 7 7 0 1 0 -14 0'],
  },

  // Assessment — magnifying glass (lens + handle)
  assessment: {
    outline: [
      'M 38 38 m -22 0 a 22 22 0 1 0 44 0 a 22 22 0 1 0 -44 0',
      'M 56 56 L 86 86',
    ],
  },

  // Goal — concentric circles (bullseye / target)
  goal: {
    outline: [
      'M 50 50 m -36 0 a 36 36 0 1 0 72 0 a 36 36 0 1 0 -72 0',
      'M 50 50 m -22 0 a 22 22 0 1 0 44 0 a 22 22 0 1 0 -44 0',
    ],
    filled: ['M 50 50 m -8 0 a 8 8 0 1 0 16 0 a 8 8 0 1 0 -16 0'],
  },

  // Outcome — bullseye with arrow stuck through it
  outcome: {
    outline: [
      'M 50 50 m -28 0 a 28 28 0 1 0 56 0 a 28 28 0 1 0 -56 0',
      'M 50 50 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0',
      'M 78 22 L 50 50',
      'M 66 22 L 78 22 L 78 34',
    ],
  },

  // Principle — tall rectangle with exclamation mark inside (a "tablet")
  principle: {
    outline: ['M 35 14 L 65 14 L 65 86 L 35 86 Z', 'M 50 28 L 50 60'],
    filled: ['M 50 70 m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0'],
  },

  // Requirement — parallelogram
  requirement: {
    outline: ['M 30 22 L 88 22 L 70 78 L 12 78 Z'],
  },

  // Constraint — parallelogram with horizontal line through middle
  constraint: {
    outline: ['M 30 22 L 88 22 L 70 78 L 12 78 Z', 'M 21 50 L 79 50'],
  },

  // Meaning — speech / cloud bubble with tail
  meaning: {
    outline: [
      'M 30 28 Q 18 28 18 42 Q 18 56 30 58 L 25 78 L 42 60 Q 70 64 78 50 Q 86 32 64 26 Q 50 14 30 28 Z',
    ],
  },

  // Value — horizontal ellipse
  value: {
    outline: ['M 50 50 m -32 0 a 32 18 0 1 0 64 0 a 32 18 0 1 0 -64 0'],
  },

  // Stakeholder — pill with filled dot (same family as Role)
  stakeholder: {
    outline: ['M 22 32 L 78 32 a 18 18 0 0 1 0 36 L 22 68 a 18 18 0 0 1 0 -36 Z'],
    filled: ['M 70 50 m -7 0 a 7 7 0 1 0 14 0 a 7 7 0 1 0 -14 0'],
  },

  // ─── Strategy ──────────────────────────────────────────────────────────────

  // Resource — rectangle with three vertical bars (stack of cards)
  resource: {
    outline: [
      'M 18 30 L 82 30 L 82 70 L 18 70 Z',
      'M 36 38 L 36 62',
      'M 50 38 L 50 62',
      'M 64 38 L 64 62',
    ],
  },

  // Capability — stepped staircase (three blocks ascending)
  capability: {
    outline: [
      'M 14 78 L 38 78 L 38 60 L 62 60 L 62 42 L 86 42 L 86 24 L 70 24',
      'M 70 24 L 70 42 L 46 42 L 46 60 L 22 60 L 22 78',
    ],
  },

  // Course of Action — right-pointing arrow (similar to process)
  courseofaction: {
    outline: ['M 12 35 L 56 35 L 56 22 L 88 50 L 56 78 L 56 65 L 12 65 Z'],
  },

  // Value Stream — chevron with concave back
  valuestream: {
    outline: ['M 12 28 L 65 28 L 88 50 L 65 72 L 12 72 L 32 50 Z'],
  },

  // ─── Implementation & Migration ────────────────────────────────────────────

  // Work Package — small rectangle (placeholder; Archi uses a banded shape)
  workpackage: {
    outline: ['M 18 30 L 82 30 L 82 70 L 18 70 Z', 'M 18 50 L 82 50'],
  },

  // Deliverable — rectangle with curled / wavy bottom edge
  deliverable: {
    outline: ['M 18 18 L 82 18 L 82 75 Q 70 88 50 78 Q 30 68 18 82 Z'],
  },

  // Plateau — stack of three horizontal bars
  plateau: {
    outline: [
      'M 18 22 L 82 22 L 82 32 L 18 32 Z',
      'M 18 44 L 82 44 L 82 54 L 18 54 Z',
      'M 18 66 L 82 66 L 82 76 L 18 76 Z',
    ],
  },

  // Gap — circle with a horizontal line through the middle
  gap: {
    outline: [
      'M 50 50 m -32 0 a 32 32 0 1 0 64 0 a 32 32 0 1 0 -64 0',
      'M 14 50 L 86 50',
    ],
  },
}

export function iconNameForType(elementType?: string): string | null {
  if (!elementType) return null
  const t = elementType

  // ─── Active structure ────────────────────────────────────────────────────
  if (t === 'BusinessActor') return 'actor'
  if (t === 'BusinessRole') return 'role'
  if (
    t === 'BusinessCollaboration' ||
    t === 'ApplicationCollaboration' ||
    t === 'TechnologyCollaboration'
  )
    return 'collaboration'
  if (t.endsWith('Interface')) return 'interface'
  if (t === 'ApplicationComponent') return 'component'

  // ─── Behavior ────────────────────────────────────────────────────────────
  if (t === 'BusinessProcess' || t === 'ApplicationProcess' || t === 'TechnologyProcess')
    return 'process'
  if (t === 'BusinessFunction' || t === 'ApplicationFunction' || t === 'TechnologyFunction')
    return 'function'
  if (t.endsWith('Interaction')) return 'interaction'
  if (t.endsWith('Service')) return 'service'
  if (t.endsWith('Event')) return 'event'

  // ─── Passive structure ───────────────────────────────────────────────────
  if (t === 'BusinessObject' || t === 'DataObject') return 'object'
  if (t === 'Contract') return 'contract'
  if (t === 'Representation') return 'representation'
  if (t === 'Product') return 'product'
  if (t === 'Artifact') return 'artifact'

  // ─── Technology / Physical ───────────────────────────────────────────────
  if (t === 'Node') return 'node'
  if (t === 'SystemSoftware') return 'systemsoftware'
  if (t === 'Device') return 'device'
  if (t === 'Equipment') return 'equipment'
  if (t === 'Facility') return 'facility'
  if (t === 'DistributionNetwork') return 'distributionnetwork'
  if (t === 'CommunicationNetwork') return 'network'
  if (t === 'Path') return 'path'
  if (t === 'Material') return 'material'

  // ─── Motivation ──────────────────────────────────────────────────────────
  if (t === 'Stakeholder') return 'stakeholder'
  if (t === 'Driver') return 'driver'
  if (t === 'Assessment') return 'assessment'
  if (t === 'Goal') return 'goal'
  if (t === 'Outcome') return 'outcome'
  if (t === 'Principle') return 'principle'
  if (t === 'Requirement') return 'requirement'
  if (t === 'Constraint') return 'constraint'
  if (t === 'Meaning') return 'meaning'
  if (t === 'Value') return 'value'

  // ─── Strategy ────────────────────────────────────────────────────────────
  if (t === 'Capability') return 'capability'
  if (t === 'Resource') return 'resource'
  if (t === 'CourseOfAction') return 'courseofaction'
  if (t === 'ValueStream') return 'valuestream'

  // ─── Implementation & Migration ──────────────────────────────────────────
  if (t === 'WorkPackage') return 'workpackage'
  if (t === 'Deliverable') return 'deliverable'
  if (t === 'Plateau') return 'plateau'
  if (t === 'Gap') return 'gap'
  if (t === 'ImplementationEvent') return 'event'

  return null
}
