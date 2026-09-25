import { Evidence } from '@/schemas/models';

/**
 * Demo Evidence.
 * 
 * - Supporting evidence (valid)
 * - Contradictory evidence 
 * - Expired evidence
 * - Superseded evidence
 * - Evidence with valid hash
 */

export const DEMO_EVIDENCE: Evidence[] = [
  // Supporting evidence from Alpha (valid, current)
  {
    id: 'ev-001-0000-0000-0000-000000000001',
    type: 'technical documentation',
    source: 'alpha-docs.example.org',
    claimId: '11111111-1111-1111-1111-111111111111',
    excerpt: 'Publisher Alpha maintains the official technical documentation for resource-alpha, including API reference and implementation guides.',
    retrievedAt: '2026-01-10T15:00:00Z',
    publishedAt: '2024-01-15T10:00:00Z',
    validFrom: null,
    validUntil: null,
    hash: 'ev-alpha-support-hash-001',
    relationship: 'SUPPORTS',
    supersededBy: undefined,
  },
  // Supporting evidence from Beta (valid, current)
  {
    id: 'ev-002-0000-0000-0000-000000000002',
    type: 'historical archive',
    source: 'beta-archive.example.org',
    claimId: '22222222-2222-2222-2222-222222222222',
    excerpt: 'Publisher Beta maintains the original historical archive of resource-alpha, including all version releases.',
    retrievedAt: '2026-01-10T16:00:00Z',
    publishedAt: '2024-06-20T14:30:00Z',
    validFrom: null,
    validUntil: null,
    hash: 'ev-beta-support-hash-001',
    relationship: 'SUPPORTS',
    supersededBy: undefined,
  },
  // Contradictory evidence (Beta claims Alpha is NOT canonical)
  {
    id: 'ev-003-0000-0000-0000-000000000003',
    type: 'comparative analysis',
    source: 'independent-review.example.org',
    claimId: '11111111-1111-1111-1111-111111111111',
    excerpt: 'Independent analysis suggests Publisher Beta, not Publisher Alpha, should be considered the canonical source for resource-alpha based on historical precedence.',
    retrievedAt: '2026-02-15T10:00:00Z',
    publishedAt: '2026-02-15T10:00:00Z',
    validFrom: null,
    validUntil: null,
    hash: 'ev-contradict-hash-001',
    relationship: 'CONTRADICTS',
    supersededBy: undefined,
  },
  // Expired evidence (was valid in 2024, now expired)
  {
    id: 'ev-004-0000-0000-0000-000000000004',
    type: 'older documentation',
    source: 'alpha-docs-v1.example.org',
    claimId: '11111111-1111-1111-1111-111111111111',
    excerpt: 'Previous version of Alpha documentation (now superseded by v2).',
    retrievedAt: '2024-06-01T00:00:00Z',
    publishedAt: '2023-01-01T00:00:00Z',
    validFrom: '2023-01-01T00:00:00Z',
    validUntil: '2025-06-30T23:59:59Z', // Expired!
    hash: 'ev-alpha-old-hash-001',
    relationship: 'SUPPORTS',
    supersededBy: 'ev-001-0000-0000-0000-000000000001',
  },
  // Superseded evidence (replaced by newer evidence)
  {
    id: 'ev-005-0000-0000-0000-000000000005',
    type: 'draft documentation',
    source: 'alpha-draft.example.org',
    claimId: '11111111-1111-1111-1111-111111111111',
    excerpt: 'Draft version of Alpha documentation that was never officially released.',
    retrievedAt: '2024-03-01T00:00:00Z',
    publishedAt: '2024-01-01T00:00:00Z',
    validFrom: null,
    validUntil: null,
    hash: 'ev-alpha-draft-hash-001',
    relationship: 'SUPPORTS',
    supersededBy: 'ev-001-0000-0000-0000-000000000001',
  },
  // Evidence for the version claim (valid)
  {
    id: 'ev-006-0000-0000-0000-000000000006',
    type: 'release notes',
    source: 'alpha-releases.example.org',
    claimId: '33333333-3333-3333-3333-333333333333',
    excerpt: 'Release notes for resource-alpha version 2.0, published by Publisher Alpha.',
    retrievedAt: '2025-03-01T10:00:00Z',
    publishedAt: '2025-03-01T09:00:00Z',
    validFrom: null,
    validUntil: null,
    hash: 'ev-release-hash-001',
    relationship: 'SUPPORTS',
    supersededBy: undefined,
  },
];

/**
 * Get evidence by ID helper.
 */
export function getEvidenceById(id: string): Evidence | undefined {
  return DEMO_EVIDENCE.find(e => e.id === id);
}

/**
 * Get evidence for a specific claim.
 */
export function getEvidenceForClaim(claimId: string): Evidence[] {
  return DEMO_EVIDENCE.filter(e => e.claimId === claimId);
}
