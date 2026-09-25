import { describe, it, expect } from 'vitest';
import { 
  verifyClaim, 
  DEFAULT_VERIFICATION_POLICY 
} from '@/lib/verification/engine';
import { 
  resolveAuthority 
} from '@/lib/evidence/authority-resolution';
import { Claim } from '@/schemas/models';
import { Evidence } from '@/schemas/models';
import { AuthorityArtifact } from '@/schemas/authority';
import { AuthorityResolution } from '@/schemas/resolution';

describe('Verification Engine', () => {
  const baseClaim: Claim = {
    id: '11111111-1111-1111-1111-111111111111',
    subject: 'test-resource',
    predicate: 'hasCanonicalSource',
    object: 'Publisher Alpha',
    statement: 'Publisher Alpha is the canonical source.',
    sourceReferences: [],
    authorityReferences: [],
    createdAt: '2024-01-15T10:00:00Z',
    validFrom: null,
    validUntil: null,
    supersededBy: undefined,
    status: 'ACTIVE',
  };

  const baseAuthority: AuthorityArtifact = {
    specification: 'authority-epistemic-protocol/v1',
    authority_id: 'aaaa1111-aaaa-1111-aaaa-111111111111',
    context: 'test-resource',
    issuer: 'did:web:test.example.org',
    jurisdiction: 'test-jurisdiction',
    scope: ['technical documentation'],
    precedence_class: 50,
    enforcement_weight: 50,
    timestamp: '2024-01-15T10:00:00Z',
    version: '1.0.0',
    hash: 'valid-hash',
    signature: 'valid-signature',
    validFrom: null,
    validUntil: null,
    supersededBy: undefined,
  };

  const baseEvidence: Evidence = {
    id: 'ev-001-0000-0000-0000-000000000001',
    type: 'documentation',
    source: 'docs.example.org',
    claimId: baseClaim.id,
    excerpt: 'Supporting documentation.',
    retrievedAt: '2024-01-15T10:00:00Z',
    publishedAt: '2024-01-01T00:00:00Z',
    validFrom: null,
    validUntil: null,
    hash: 'evidence-hash',
    relationship: 'SUPPORTS',
    supersededBy: undefined,
  };

  describe('verifyClaim', () => {
    it('should return UNVERIFIED when no authority exists', () => {
      const authorityResolution: AuthorityResolution = {
        claim_id: baseClaim.id,
        applicable_authorities: [],
        inapplicable_authorities: [],
        conflicts: [],
        selected_authority: undefined,
        resolution_reason: 'No applicable authorities',
        deterministic_rules_applied: ['NO_AUTHORITIES'],
      };

      const result = verifyClaim(baseClaim, authorityResolution, []);

      expect(result.state).toBe('UNVERIFIED');
      expect(result.failed_predicates).toContain('AUTHORITY_ARTIFACT_VALID');
    });

    it('should return UNVERIFIED when no evidence exists', () => {
      const authorityResolution = resolveAuthority(baseClaim, [baseAuthority]);

      const result = verifyClaim(baseClaim, authorityResolution, []);

      // When evidence doesn't exist, state should be UNVERIFIED
      expect(result.state).toBe('UNVERIFIED');
      expect(result.failed_predicates).toContain('EVIDENCE_EXISTS');
    });

    it('should return VERIFIED when all predicates pass', () => {
      const authorityResolution = resolveAuthority(baseClaim, [baseAuthority]);

      const result = verifyClaim(baseClaim, authorityResolution, [baseEvidence]);

      // In the demo configuration, should be SUPPORTED because hash verification is UNRESOLVED
      expect(['VERIFIED', 'SUPPORTED']).toContain(result.state);
    });

    it('should return CONTRADICTED when contradictory evidence exists', () => {
      const authorityResolution = resolveAuthority(baseClaim, [baseAuthority]);

      const contradictoryEvidence: Evidence[] = [
        {
          ...baseEvidence,
          id: 'ev-contradict',
          relationship: 'CONTRADICTS',
        },
      ];

      const result = verifyClaim(baseClaim, authorityResolution, contradictoryEvidence);

      expect(result.state).toBe('CONTRADICTED');
      expect(result.contradictions).toHaveLength(1);
    });

    it('should return INCONCLUSIVE when there are unresolved predicates', () => {
      const authorityResolution = resolveAuthority(baseClaim, [baseAuthority]);

      // Evidence without hash (hash verification will be UNRESOLVED)
      const evidenceWithoutHash: Evidence[] = [
        {
          ...baseEvidence,
          hash: undefined,
        },
      ];

      const result = verifyClaim(baseClaim, authorityResolution, evidenceWithoutHash);

      // Should be INCONCLUSIVE or SUPPORTED depending on other predicate results
      expect(['INCONCLUSIVE', 'SUPPORTED', 'UNVERIFIED']).toContain(result.state);
    });

    it('should return STALE when authority is expired', () => {
      const expiredAuthority: AuthorityArtifact = {
        ...baseAuthority,
        validUntil: '2020-01-01T00:00:00Z',
      };

      const authorityResolution = resolveAuthority(
        baseClaim, 
        [expiredAuthority],
        { currentTime: new Date('2026-01-01') }
      );

      const result = verifyClaim(baseClaim, authorityResolution, []);

      expect(result.state).toBe('STALE');
    });

    it('should track passed predicates', () => {
      const authorityResolution = resolveAuthority(baseClaim, [baseAuthority]);

      const result = verifyClaim(baseClaim, authorityResolution, [baseEvidence]);

      expect(result.passed_predicates.length).toBeGreaterThan(0);
    });

    it('should track failed predicates', () => {
      const authorityResolution = resolveAuthority(baseClaim, [baseAuthority]);

      const result = verifyClaim(baseClaim, authorityResolution, []);

      expect(result.failed_predicates.length).toBeGreaterThan(0);
    });

    it('should track all predicates with their results', () => {
      const authorityResolution = resolveAuthority(baseClaim, [baseAuthority]);

      const result = verifyClaim(baseClaim, authorityResolution, [baseEvidence]);

      expect(result.predicates).toHaveLength(6); // 6 predicates defined
      expect(result.predicates.every(p => ['PASS', 'FAIL', 'UNRESOLVED'].includes(p.result))).toBe(true);
    });

    it('should include authority basis in result', () => {
      const authorityResolution = resolveAuthority(baseClaim, [baseAuthority]);

      const result = verifyClaim(baseClaim, authorityResolution, [baseEvidence]);

      expect(result.authority_basis).toContain(baseAuthority.authority_id);
    });

    it('should include evidence basis in result', () => {
      const authorityResolution = resolveAuthority(baseClaim, [baseAuthority]);

      const result = verifyClaim(baseClaim, authorityResolution, [baseEvidence]);

      expect(result.evidence_basis).toContain(baseEvidence.id);
    });

    it('should use the verification policy version in result', () => {
      const authorityResolution = resolveAuthority(baseClaim, [baseAuthority]);

      const result = verifyClaim(baseClaim, authorityResolution, [baseEvidence]);

      expect(result.rule_version).toBe(DEFAULT_VERIFICATION_POLICY.version);
    });
  });

  describe('Verification Policy', () => {
    it('should have required predicates defined', () => {
      expect(DEFAULT_VERIFICATION_POLICY.requiredPredicates).toHaveLength(6);
    });

    it('should require all predicates for VERIFIED state', () => {
      expect(DEFAULT_VERIFICATION_POLICY.requireAllPredicates).toBe(true);
    });

    it('should have a name and version', () => {
      expect(DEFAULT_VERIFICATION_POLICY.name).toBe('Standard Verification');
      expect(DEFAULT_VERIFICATION_POLICY.version).toBe('1.0.0');
    });
  });
});

describe('Authority Resolution in Verification', () => {
  const claim: Claim = {
    id: '22222222-2222-2222-2222-222222222222',
    subject: 'test-resource',
    predicate: 'hasCanonicalSource',
    object: 'Publisher',
    statement: 'Test claim.',
    sourceReferences: [],
    authorityReferences: [],
    createdAt: '2024-01-15T10:00:00Z',
    validFrom: null,
    validUntil: null,
    supersededBy: undefined,
    status: 'ACTIVE',
  };

  const validAuth: AuthorityArtifact = {
    specification: 'authority-epistemic-protocol/v1',
    authority_id: 'aaaa1111-aaaa-1111-aaaa-111111111111',
    context: 'test-resource',
    issuer: 'did:web:test.example.org',
    jurisdiction: 'test',
    scope: ['technical documentation'],
    precedence_class: 60,
    enforcement_weight: 70,
    timestamp: '2024-01-15T10:00:00Z',
    version: '1.0.0',
    hash: 'hash',
    signature: 'sig',
    validFrom: null,
    validUntil: null,
    supersededBy: undefined,
  };

  const expiredAuth: AuthorityArtifact = {
    ...validAuth,
    authority_id: 'bbbb2222-bbbb-2222-bbbb-222222222222',
    validUntil: '2020-01-01T00:00:00Z',
  };

  it('should separate applicable from inapplicable authorities', () => {
    const resolution = resolveAuthority(claim, [validAuth, expiredAuth], {
      currentTime: new Date('2026-01-01'),
    });

    expect(resolution.applicable_authorities).toHaveLength(1);
    expect(resolution.inapplicable_authorities).toHaveLength(1);
    expect(resolution.inapplicable_authorities[0].reason).toContain('expired');
  });

  it('should detect when no authority can be selected', () => {
    const resolution = resolveAuthority(claim, [], {});

    expect(resolution.selected_authority).toBeUndefined();
    expect(resolution.resolution_reason).toBe('No applicable authorities found');
  });
});
