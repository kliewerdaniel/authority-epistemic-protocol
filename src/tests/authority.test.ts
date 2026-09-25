import { describe, it, expect } from 'vitest';
import { 
  validateAuthorityArtifact, 
  compareAuthorityPrecedence, 
  selectWinningAuthority,
  calculateScopeSpecificity 
} from '@/lib/authority/validation';
import { isTemporallyValid, isSuperseded } from '@/lib/authority/temporal';
import { AuthorityArtifact } from '@/schemas/authority';

describe('Authority Validation', () => {
  const validArtifact: AuthorityArtifact = {
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

  describe('validateAuthorityArtifact', () => {
    it('should accept valid artifact', () => {
      const result = validateAuthorityArtifact(validArtifact);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject artifact with missing authority_id', () => {
      const artifact = { ...validArtifact, authority_id: '' };
      const result = validateAuthorityArtifact(artifact);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing authority_id');
    });

    it('should reject artifact with missing issuer', () => {
      const artifact = { ...validArtifact, issuer: '' };
      const result = validateAuthorityArtifact(artifact);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing issuer');
    });

    it('should reject artifact with empty scope', () => {
      const artifact = { ...validArtifact, scope: [] };
      const result = validateAuthorityArtifact(artifact);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or empty scope');
    });

    it('should detect expired artifact', () => {
      const artifact: AuthorityArtifact = {
        ...validArtifact,
        validUntil: '2020-01-01T00:00:00Z', // Expired long ago
      };
      const result = validateAuthorityArtifact(artifact, {
        currentTime: new Date('2026-01-01'),
      });
      expect(result.isExpired).toBe(true);
      expect(result.warnings).toContain('Artifact is temporally expired');
    });

    it('should detect out-of-scope artifact by context mismatch', () => {
      // When artifact's context doesn't match claim's subject, it's out of scope
      const artifact: AuthorityArtifact = {
        ...validArtifact,
        context: 'different-resource', // Doesn't match claim's subject
      };
      const result = validateAuthorityArtifact(artifact, {
        claimSubject: 'test-resource',
      });
      expect(result.isOutScope).toBe(true);
      expect(result.warnings).toContain('Artifact context does not match claim subject');
    });

    it('should detect superseded artifact', () => {
      const artifact: AuthorityArtifact = {
        ...validArtifact,
        supersededBy: 'some-other-id',
      };
      const result = validateAuthorityArtifact(artifact);
      expect(result.isSuperseded).toBe(true);
      expect(result.warnings).toContain('Artifact has been superseded');
    });
  });

  describe('isTemporallyValid', () => {
    it('should return true for artifact with no temporal bounds', () => {
      expect(isTemporallyValid(null, null)).toBe(true);
    });

    it('should return true for artifact within valid range', () => {
      expect(isTemporallyValid(
        '2020-01-01T00:00:00Z',
        '2030-01-01T00:00:00Z',
        new Date('2024-01-01')
      )).toBe(true);
    });

    it('should return false for artifact before validFrom', () => {
      expect(isTemporallyValid(
        '2025-01-01T00:00:00Z',
        null,
        new Date('2024-01-01')
      )).toBe(false);
    });

    it('should return false for artifact after validUntil', () => {
      expect(isTemporallyValid(
        null,
        '2020-01-01T00:00:00Z',
        new Date('2024-01-01')
      )).toBe(false);
    });
  });

  describe('isSuperseded', () => {
    it('should return false for undefined supersededBy', () => {
      expect(isSuperseded(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isSuperseded('')).toBe(false);
    });

    it('should return true for valid supersededBy', () => {
      expect(isSuperseded('some-uuid')).toBe(true);
    });
  });

  describe('compareAuthorityPrecedence', () => {
    it('should prefer higher precedence_class', () => {
      const a: AuthorityArtifact = { ...validArtifact, precedence_class: 60 };
      const b: AuthorityArtifact = { ...validArtifact, precedence_class: 40 };
      
      expect(compareAuthorityPrecedence(a, b)).toBeGreaterThan(0);
    });

    it('should prefer more specific scope', () => {
      const a: AuthorityArtifact = { ...validArtifact, scope: ['tech', 'docs', 'api'] };
      const b: AuthorityArtifact = { ...validArtifact, scope: ['tech'] };
      
      expect(compareAuthorityPrecedence(a, b)).toBeGreaterThan(0);
    });

    it('should prefer more recent timestamp', () => {
      const a: AuthorityArtifact = { ...validArtifact, timestamp: '2025-01-01T00:00:00Z' };
      const b: AuthorityArtifact = { ...validArtifact, timestamp: '2020-01-01T00:00:00Z' };
      
      expect(compareAuthorityPrecedence(a, b)).toBeGreaterThan(0);
    });

    it('should prefer higher enforcement_weight as tiebreaker', () => {
      // Same precedence_class, different enforcement_weight
      const a: AuthorityArtifact = { 
        ...validArtifact, 
        precedence_class: 50,
        enforcement_weight: 70 
      };
      const b: AuthorityArtifact = { 
        ...validArtifact, 
        precedence_class: 50,
        enforcement_weight: 50 
      };
      const c: AuthorityArtifact = { 
        ...validArtifact, 
        precedence_class: 50,
        enforcement_weight: 60 
      };
      
      // a has higher enforcement_weight than b, so a > b
      expect(compareAuthorityPrecedence(a, b)).toBeGreaterThan(0);
      // c has higher enforcement_weight than b, so c > b
      expect(compareAuthorityPrecedence(c, b)).toBeGreaterThan(0);
      // a has higher enforcement_weight than c, so a > c
      expect(compareAuthorityPrecedence(a, c)).toBeGreaterThan(0);
    });
  });

  describe('selectWinningAuthority', () => {
    it('should return null for empty array', () => {
      const result = selectWinningAuthority([]);
      expect(result).toBeNull();
    });

    it('should return single artifact for single-element array', () => {
      const result = selectWinningAuthority([validArtifact]);
      expect(result).not.toBeNull();
      expect(result!.selected).toBe(validArtifact);
      expect(result!.rulesApplied).toContain('SINGLE_AUTHORITY');
    });

    it('should select highest precedence when clear winner', () => {
      const a: AuthorityArtifact = { ...validArtifact, precedence_class: 60 };
      const b: AuthorityArtifact = { ...validArtifact, precedence_class: 40 };
      
      const result = selectWinningAuthority([a, b]);
      expect(result).not.toBeNull();
      expect(result!.selected.authority_id).toBe(a.authority_id);
    });
  });

  describe('calculateScopeSpecificity', () => {
    it('should return 0 for empty scope', () => {
      expect(calculateScopeSpecificity([])).toBe(0);
    });

    it('should return positive value for non-empty scope', () => {
      expect(calculateScopeSpecificity(['scope1'])).toBeGreaterThan(0);
    });

    it('should give more points for granular scopes', () => {
      const broad = calculateScopeSpecificity(['documentation']);
      const granular = calculateScopeSpecificity(['tech/docs/api']);
      
      expect(granular).toBeGreaterThan(broad);
    });
  });
});
