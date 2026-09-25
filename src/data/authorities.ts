import { AuthorityArtifact } from '@/schemas/authority';

/**
 * Demo Authority Artifacts.
 * 
 * - Alpha: Valid authority for technical documentation scope
 * - Beta: Valid authority for historical archive scope  
 * - Alpha-Expired: Expired authority artifact
 * - Alpha-BadHash: Authority with deliberately modified hash
 * - Gamma: Out-of-scope authority
 */

export const DEMO_AUTHORITY_ARTIFACTS: AuthorityArtifact[] = [
  // Publisher Alpha - Valid authority for technical docs
  {
    specification: 'authority-epistemic-protocol/v1',
    authority_id: 'aaaa1111-aaaa-1111-aaaa-111111111111',
    context: 'resource-alpha',
    issuer: 'did:web:alpha.example.org',
    jurisdiction: 'technical-domains',
    scope: ['technical documentation', 'software reference'],
    precedence_class: 60,
    enforcement_weight: 70,
    timestamp: '2024-01-15T10:00:00Z',
    version: '1.0.0',
    hash: 'alpha-valid-hash-001',
    signature: 'alpha-signature-001',
    justification_reference: 'alpha-justification-doc',
    revocation_policy: 'manual-revocation-required',
    validFrom: null,
    validUntil: null,
    supersededBy: undefined,
  },
  // Publisher Beta - Valid authority for historical archive
  {
    specification: 'authority-epistemic-protocol/v1',
    authority_id: 'bbbb2222-bbbb-2222-bbbb-222222222222',
    context: 'resource-alpha',
    issuer: 'did:web:beta.example.org',
    jurisdiction: 'historical-domains',
    scope: ['historical archive', 'original publications'],
    precedence_class: 55,
    enforcement_weight: 65,
    timestamp: '2024-06-20T14:30:00Z',
    version: '1.0.0',
    hash: 'beta-valid-hash-001',
    signature: 'beta-signature-001',
    justification_reference: 'beta-justification-doc',
    revocation_policy: 'time-based-expiry',
    validFrom: null,
    validUntil: null,
    supersededBy: undefined,
  },
  // Expired authority (was valid in 2024, now expired in 2026)
  {
    specification: 'authority-epistemic-protocol/v1',
    authority_id: 'cccc3333-cccc-3333-cccc-333333333333',
    context: 'resource-alpha',
    issuer: 'did:web:gamma-old.example.org',
    jurisdiction: 'legacy-domains',
    scope: ['legacy documentation'],
    precedence_class: 40,
    enforcement_weight: 50,
    timestamp: '2024-03-01T00:00:00Z',
    version: '1.0.0',
    hash: 'gamma-expired-hash-001',
    signature: 'gamma-signature-001',
    justification_reference: 'gamma-justification-doc',
    revocation_policy: 'automatic-expiry',
    validFrom: '2024-03-01T00:00:00Z',
    validUntil: '2025-12-31T23:59:59Z', // Expired!
    supersededBy: undefined,
  },
  // Authority with bad hash (tampered)
  {
    specification: 'authority-epistemic-protocol/v1',
    authority_id: 'dddd4444-dddd-4444-dddd-444444444444',
    context: 'resource-alpha',
    issuer: 'did:web:delta-fake.example.org',
    jurisdiction: 'testing-domains',
    scope: ['test scope'],
    precedence_class: 50,
    enforcement_weight: 50,
    timestamp: '2025-01-15T12:00:00Z',
    version: '1.0.0',
    hash: 'tampered-hash-that-does-not-match', // Intentionally wrong hash
    signature: 'delta-signature-001',
    justification_reference: 'delta-justification-doc',
    revocation_policy: 'manual-revocation',
    validFrom: null,
    validUntil: null,
    supersededBy: undefined,
  },
  // Out-of-scope authority (different resource)
  {
    specification: 'authority-epistemic-protocol/v1',
    authority_id: 'eeee5555-eeee-5555-eeee-555555555555',
    context: 'resource-beta', // Different resource!
    issuer: 'did:web:epsilon.example.org',
    jurisdiction: 'other-domains',
    scope: ['other documentation'],
    precedence_class: 70,
    enforcement_weight: 80,
    timestamp: '2025-06-01T08:00:00Z',
    version: '2.0.0',
    hash: 'epsilon-valid-hash-001',
    signature: 'epsilon-signature-001',
    justification_reference: 'epsilon-justification-doc',
    revocation_policy: 'instant-revocation',
    validFrom: null,
    validUntil: null,
    supersededBy: undefined,
  },
];

/**
 * Get artifact by ID helper.
 */
export function getArtifactById(id: string): AuthorityArtifact | undefined {
  return DEMO_AUTHORITY_ARTIFACTS.find(a => a.authority_id === id);
}
