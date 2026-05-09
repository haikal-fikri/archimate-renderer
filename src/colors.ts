export const LAYER_COLORS: Record<string, string> = {
  Strategy: '#F5DEAA',
  Resource: '#F5DEAA',
  Capability: '#F5DEAA',
  CourseOfAction: '#F5DEAA',
  ValueStream: '#F5DEAA',

  Business: '#FFFFB5',
  BusinessActor: '#FFFFB5',
  BusinessRole: '#FFFFB5',
  BusinessCollaboration: '#FFFFB5',
  BusinessInterface: '#FFFFB5',
  BusinessProcess: '#FFFFB5',
  BusinessFunction: '#FFFFB5',
  BusinessInteraction: '#FFFFB5',
  BusinessEvent: '#FFFFB5',
  BusinessService: '#FFFFB5',
  BusinessObject: '#FFFFB5',
  Contract: '#FFFFB5',
  Representation: '#FFFFB5',
  Product: '#FFFFB5',

  Application: '#B5FFFF',
  ApplicationComponent: '#B5FFFF',
  ApplicationCollaboration: '#B5FFFF',
  ApplicationInterface: '#B5FFFF',
  ApplicationFunction: '#B5FFFF',
  ApplicationInteraction: '#B5FFFF',
  ApplicationProcess: '#B5FFFF',
  ApplicationEvent: '#B5FFFF',
  ApplicationService: '#B5FFFF',
  DataObject: '#B5FFFF',

  Technology: '#C9E7B7',
  TechnologyCollaboration: '#C9E7B7',
  TechnologyInterface: '#C9E7B7',
  TechnologyFunction: '#C9E7B7',
  TechnologyProcess: '#C9E7B7',
  TechnologyInteraction: '#C9E7B7',
  TechnologyEvent: '#C9E7B7',
  TechnologyService: '#C9E7B7',
  Node: '#C9E7B7',
  Device: '#C9E7B7',
  SystemSoftware: '#C9E7B7',
  Path: '#C9E7B7',
  CommunicationNetwork: '#C9E7B7',
  Artifact: '#C9E7B7',

  Equipment: '#C9E7B7',
  Facility: '#C9E7B7',
  DistributionNetwork: '#C9E7B7',
  Material: '#C9E7B7',

  Stakeholder: '#CCCCFF',
  Driver: '#CCCCFF',
  Assessment: '#CCCCFF',
  Goal: '#CCCCFF',
  Outcome: '#CCCCFF',
  Principle: '#CCCCFF',
  Requirement: '#CCCCFF',
  Constraint: '#CCCCFF',
  Meaning: '#CCCCFF',
  Value: '#CCCCFF',

  WorkPackage: '#E0FFE0',
  Deliverable: '#E0FFE0',
  Plateau: '#E0FFE0',
  Gap: '#E0FFE0',
  ImplementationEvent: '#E0FFE0',

  AndJunction: '#000000',
  OrJunction: '#000000',
  Junction: '#000000',
}

export const DEFAULT_FILL = '#FFFFFF'
export const DEFAULT_STROKE = '#1A1A1A'
export const DEFAULT_TEXT = '#1A1A1A'

export function colorForType(elementType?: string): string {
  if (!elementType) return DEFAULT_FILL
  if (LAYER_COLORS[elementType]) return LAYER_COLORS[elementType]
  const prefixes = ['Strategy', 'Business', 'Application', 'Technology', 'Motivation', 'Implementation']
  for (const p of prefixes) {
    if (elementType.startsWith(p)) {
      return LAYER_COLORS[p] ?? DEFAULT_FILL
    }
  }
  if (elementType.endsWith('Junction')) return LAYER_COLORS.Junction
  return DEFAULT_FILL
}
