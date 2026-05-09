# @haikal-fikri/archimate

ArchiMate Open Exchange XML viewer for React — parser plus SVG renderer with full ArchiMate 3.2 notation. Read-only, stateless, dependency-light.

Supports both ArchiMate **3.0** and **2.1** Open Exchange XML.

## Install

```sh
npm install @haikal-fikri/archimate react
```

`react` is a peer dependency (`^18 || ^19`).

## Usage

```tsx
import { parseArchimate, ArchimateRenderer } from '@haikal-fikri/archimate'

const xml = await fetch('/archisurance.xml').then((r) => r.text())
const view = parseArchimate(xml) // first view in the model

return <ArchimateRenderer view={view} style={{ width: '100%', height: 600 }} />
```

To render a specific view by identifier:

```ts
const view = parseArchimate(xml, 'id-4056')
```

## Features

- **Open Exchange XML 2.1 + 3.0** — namespace-tolerant parser, handles British/American spelling differences, `Infrastructure*` → `Technology*` rename, both `<views><view>` and `<views><diagrams><view>` layouts
- **Full element notation** — rounded rects, stadiums (Service), junctions, motivation chamfers, plus per-type icon glyphs (Actor, Process, Component, Service, Node, Device, etc.)
- **All relationship arrowheads** — Composition (filled diamond), Aggregation (hollow diamond), Realization (dashed + hollow triangle), Specialization (solid + hollow triangle), Triggering, Flow, Serving, Used-By, Influence, Access (with Read/Write/ReadWrite), Assignment
- **Smart edge routing** — orthogonal snap when boxes share an axis, rectangle-edge intersection on diagonals, automatic distribution of multiple edges sharing the same node side
- **Word-wrapped labels** — automatic multi-line tspan wrapping into the available width
- **Pan + zoom** — drag to pan, wheel/pinch to zoom; programmatic `fit()` / `reset()` via ref handle
- **Inline marker glyphs** — markers rendered as transformed siblings, not via `<marker>`, so dashed lines never bleed into arrowhead outlines
- **Layer-correct colors** — ArchiMate standard yellow / blue / green / lavender / orange palette built in

## API

### `parseArchimate(xml: string, viewId?: string): ParsedView`

Parses Open Exchange XML and returns one view's geometry. Throws `ArchimateParseError` (with `kind`) on:

- `'invalid-xml'` — malformed XML
- `'wrong-format'` — namespace not Open Exchange (e.g. native `.archimate` file)
- `'no-views'` — model has no views
- `'view-not-found'` — `viewId` doesn't match any view

If `viewId` is omitted, returns the first view.

### `<ArchimateRenderer view={view} ... />`

Props:

- `view: ParsedView` — required
- `className?: string`
- `style?: CSSProperties`

The component sizes itself via the consumer's CSS — set `width` / `height` on the SVG (or its container) to whatever fits your layout. The diagram's aspect ratio is preserved automatically.

`forwardRef` exposes `ArchimateRendererHandle` for programmatic control:

```ts
type ArchimateRendererHandle = {
  zoomIn: () => void
  zoomOut: () => void
  fitView: () => void
  pan: (dirX: number, dirY: number) => void
}
```

### Other exports

- `LAYER_COLORS`, `colorForType(elementType)` — the color palette
- `ICONS`, `iconNameForType(elementType)` — icon glyph map
- Types: `ParsedView`, `NodeBox`, `Edge`, `Point`, `AccessType`, `IconDef`

## What's not supported (yet)

- Editing — read-only viewer
- Native `.archimate` files — only the standard Open Exchange XML format
- Influence relationship `+` / `-` modifier labels
- Real-time updates / collaborative editing

## License

MIT
