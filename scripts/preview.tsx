import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

// Polyfill DOMParser before importing the parser/renderer modules.
const { window } = new JSDOM()
globalThis.DOMParser = window.DOMParser

const { createElement } = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { ArchimateRenderer } = await import('../src/renderer')
const { parseArchimate } = await import('../src/parser')

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

const archisurance = readFileSync(
  resolve(repoRoot, 'tests/fixtures/archisurance.xml'),
  'utf-8',
)

// Synthetic v3 Open Exchange XML showing AndJunction + OrJunction wired to a
// Specialization relationship — Archisurance has neither junctions in any
// view nor specialization in the Layered viewpoint.
const junctionFixture = `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       identifier="m1">
  <name xml:lang="en">Junctions Example</name>
  <elements>
    <element identifier="e-actor"  xsi:type="BusinessActor"><name xml:lang="en">Customer</name></element>
    <element identifier="e-svc-a"  xsi:type="BusinessService"><name xml:lang="en">Online Channel</name></element>
    <element identifier="e-svc-b"  xsi:type="BusinessService"><name xml:lang="en">Branch Channel</name></element>
    <element identifier="e-and"    xsi:type="AndJunction"/>
    <element identifier="e-or"     xsi:type="OrJunction"/>
    <element identifier="e-base"   xsi:type="ApplicationService"><name xml:lang="en">Generic Booking Service</name></element>
    <element identifier="e-spec"   xsi:type="ApplicationService"><name xml:lang="en">Premium Booking Service</name></element>
  </elements>
  <relationships>
    <relationship identifier="r1" source="e-actor" target="e-or"   xsi:type="Triggering"/>
    <relationship identifier="r2" source="e-or"    target="e-svc-a" xsi:type="Triggering"/>
    <relationship identifier="r3" source="e-or"    target="e-svc-b" xsi:type="Triggering"/>
    <relationship identifier="r4" source="e-svc-a" target="e-and"  xsi:type="Triggering"/>
    <relationship identifier="r5" source="e-svc-b" target="e-and"  xsi:type="Triggering"/>
    <relationship identifier="r6" source="e-spec"  target="e-base" xsi:type="Specialization"/>
  </relationships>
  <views>
    <diagrams>
      <view identifier="v1"><name xml:lang="en">Junctions &amp; Specialization</name>
        <node identifier="n-actor" elementRef="e-actor"  x="40"  y="40"  w="140" h="50"/>
        <node identifier="n-or"    elementRef="e-or"     x="240" y="55"  w="20"  h="20"/>
        <node identifier="n-sa"    elementRef="e-svc-a"  x="320" y="20"  w="160" h="50"/>
        <node identifier="n-sb"    elementRef="e-svc-b"  x="320" y="90"  w="160" h="50"/>
        <node identifier="n-and"   elementRef="e-and"    x="540" y="65"  w="20"  h="20"/>
        <node identifier="n-base"  elementRef="e-base"   x="220" y="200" w="180" h="50"/>
        <node identifier="n-spec"  elementRef="e-spec"   x="420" y="200" w="180" h="50"/>
        <connection identifier="c1" relationshipRef="r1" source="n-actor" target="n-or"/>
        <connection identifier="c2" relationshipRef="r2" source="n-or"    target="n-sa"/>
        <connection identifier="c3" relationshipRef="r3" source="n-or"    target="n-sb"/>
        <connection identifier="c4" relationshipRef="r4" source="n-sa"    target="n-and"/>
        <connection identifier="c5" relationshipRef="r5" source="n-sb"    target="n-and"/>
        <connection identifier="c6" relationshipRef="r6" source="n-spec"  target="n-base"/>
      </view>
    </diagrams>
  </views>
</model>`

const renders = [
  { title: 'Archisurance — Layered', xml: archisurance, viewId: 'id-4056' },
  { title: 'Archisurance — Information Structure (Specialization)', xml: archisurance, viewId: 'id-3821' },
  { title: 'Synthetic — Junctions + Specialization', xml: junctionFixture, viewId: 'v1' },
]

const sections = renders.map(({ title, xml, viewId }) => {
  const view = parseArchimate(xml, viewId)
  const svg = renderToStaticMarkup(createElement(ArchimateRenderer, { view }))
  console.log(`✓ ${title}: ${view.nodes.length} nodes, ${view.connections.length} connections`)
  return `<section>
    <h2>${title}</h2>
    <div class="meta">${view.nodes.length} nodes · ${view.connections.length} connections</div>
    <div class="svg-wrap">${svg}</div>
  </section>`
})

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>archimate-renderer preview</title>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; background: #fafafa; color: #1a1a1a; }
      main { padding: 24px; max-width: 1400px; margin: 0 auto; }
      section { margin-bottom: 32px; background: white; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
      section h2 { margin: 0; padding: 12px 16px; font-size: 15px; font-weight: 600; border-bottom: 1px solid #eee; }
      .meta { padding: 6px 16px; color: #666; font-size: 13px; border-bottom: 1px solid #eee; }
      .svg-wrap { padding: 16px; }
      svg { width: 100%; height: auto; }
    </style>
  </head>
  <body>
    <main>${sections.join('\n')}</main>
  </body>
</html>
`

const outDir = resolve(repoRoot, 'out')
mkdirSync(outDir, { recursive: true })
const outPath = resolve(outDir, 'archisurance.html')
writeFileSync(outPath, html)

console.log(`  → ${outPath}`)
