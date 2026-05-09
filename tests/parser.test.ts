import { describe, expect, it } from 'vitest'
import { ArchimateParseError, parseArchimate } from '../src/parser'

describe('parser', () => {
  it('rejects native .archimate format with friendly error', () => {
    const xml =
      '<archimate:model xmlns:archimate="http://www.archimatetool.com/archimate"/>'
    expect(() => parseArchimate(xml)).toThrow(ArchimateParseError)
  })

  it('rejects malformed XML', () => {
    expect(() => parseArchimate('<not-xml')).toThrow(ArchimateParseError)
  })

  // TODO: add Archisurance fixture test once tests/fixtures/archisurance.xml
  // is downloaded from archimatetool/ArchiModels (see publishing doc step 5).
})
