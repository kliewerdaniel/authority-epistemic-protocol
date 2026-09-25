import { Claim } from '@/schemas/models';

/**
 * Demo Claims for the demonstration scenario.
 * 
 * Scenario: Two publishers have competing authority over a resource.
 * The system must correctly distinguish valid from invalid authority,
 * applicable from inapplicable, and produce INCONCLUSIVE when appropriate.
 */

export const DEMO_CLAIMS: Claim[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    subject: 'resource-alpha',
    predicate: 'hasCanonicalSource',
    object: 'Publisher Alpha',
    statement: 'Publisher Alpha is the canonical source for resource-alpha technical documentation.',
    sourceReferences: ['doc-alpha-001', 'doc-alpha-002'],
    authorityReferences: ['alpha-authority-001'],
    createdAt: '2024-01-15T10:00:00Z',
    validFrom: null,
    validUntil: null,
    supersededBy: undefined,
    status: 'ACTIVE',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    subject: 'resource-alpha',
    predicate: 'hasCanonicalSource',
    object: 'Publisher Beta',
    statement: 'Publisher Beta is the canonical source for resource-alpha historical archive.',
    sourceReferences: ['doc-beta-001', 'doc-beta-002'],
    authorityReferences: ['beta-authority-001'],
    createdAt: '2024-06-20T14:30:00Z',
    validFrom: null,
    validUntil: null,
    supersededBy: undefined,
    status: 'ACTIVE',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    subject: 'resource-alpha',
    predicate: 'hasVersion',
    object: '2.0',
    statement: 'Resource Alpha has version 2.0 as its current release.',
    sourceReferences: ['release-notes-2.0'],
    authorityReferences: ['alpha-authority-001'],
    createdAt: '2025-03-01T09:00:00Z',
    validFrom: null,
    validUntil: null,
    supersededBy: undefined,
    status: 'ACTIVE',
  },
];

/**
 * Get claim by ID helper.
 */
export function getClaimById(id: string): Claim | undefined {
  return DEMO_CLAIMS.find(c => c.id === id);
}
