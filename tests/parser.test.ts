import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ArchimateParseError, parseArchimate } from '../src/parser'

const archisuranceXml = readFileSync(
  resolve(__dirname, 'fixtures/archisurance.xml'),
  'utf-8',
)

describe('parser', () => {
  it('parses Archisurance (v2.1 Open Exchange)', () => {
    // id-4056 is the "Layered" viewpoint — the most populated view in Archisurance.
    const view = parseArchimate(archisuranceXml, 'id-4056')
    expect(view.nodes.length).toBeGreaterThan(0)
    expect(view.connections.length).toBeGreaterThan(0)
    expect(view.viewName).toBeTruthy()
  })

  it('rejects native .archimate format with friendly error', () => {
    const xml =
      '<archimate:model xmlns:archimate="http://www.archimatetool.com/archimate"/>'
    expect(() => parseArchimate(xml)).toThrow(ArchimateParseError)
  })

  it('rejects malformed XML', () => {
    expect(() => parseArchimate('<not-xml')).toThrow(ArchimateParseError)
  })
})
