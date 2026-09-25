import { describe, it, expect } from 'vitest';
import { 
  validateEvidence, 
  resolveEvidence, 
  hasContradictoryEvidence,
  hasSupportingEvidence 
} from '@/lib/evidence/validation';
import { Evidence } from '@/schemas/models';

describe('Evidence Validation', () => {
  const validEvidence: Evidence = {
    id: 'ev-001-0000-0000-0000-000000000001',
    type: 'technical documentation',
    source: 'docs.example.org',
    claimId: 'claim-001',
    excerpt: 'This is supporting evidence excerpt.',
    retrievedAt: '2024-01-15T10:00:00Z',
    publishedAt: '2024-01-01T00:00:00Z',
    validFrom: null,
    validUntil: null,
    hash: 'evidence-hash-001',
    relationship: 'SUPPORTS',
    supersededBy: undefined,
  };

  describe('validateEvidence', () => {
    it('should accept valid evidence', () => {
      const result = validateEvidence(validEvidence);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject evidence with missing id', () => {
      const evidence = { ...validEvidence, id: '' };
      const result = validateEvidence(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing evidence id');
    });

    it('should reject evidence with missing type', () => {
      const evidence = { ...validEvidence, type: '' };
      const result = validateEvidence(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing evidence type');
    });

    it('should reject evidence with missing source', () => {
      const evidence = { ...validEvidence, source: '' };
      const result = validateEvidence(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing evidence source');
    });

    it('should reject evidence with missing claimId', () => {
      const evidence = { ...validEvidence, claimId: '' };
      const result = validateEvidence(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing claimId');
    });

    it('should reject evidence with empty excerpt', () => {
      const evidence = { ...validEvidence, excerpt: '' };
      const result = validateEvidence(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or empty excerpt');
    });

    it('should detect expired evidence', () => {
      const evidence: Evidence = {
        ...validEvidence,
        validUntil: '2020-01-01T00:00:00Z',
      };
      const result = validateEvidence(evidence, new Date('2026-01-01'));
      expect(result.isExpired).toBe(true);
    });

    it('should detect superseded evidence', () => {
      const evidence: Evidence = {
        ...validEvidence,
        supersededBy: 'other-evidence-id',
      };
      const result = validateEvidence(evidence);
      expect(result.isSuperseded).toBe(true);
    });
  });

  describe('resolveEvidence', () => {
    it('should categorize evidence by relationship', () => {
      const evidenceList: Evidence[] = [
        { ...validEvidence, id: '1', relationship: 'SUPPORTS' },
        { ...validEvidence, id: '2', relationship: 'CONTRADICTS' },
        { ...validEvidence, id: '3', relationship: 'QUALIFIES' },
        { ...validEvidence, id: '4', relationship: 'SUPPORTS', supersededBy: '5' },
        { ...validEvidence, id: '5', relationship: 'SUPPORTS', validUntil: '2020-01-01T00:00:00Z' },
      ];

      const result = resolveEvidence(evidenceList, 'claim-001', new Date('2026-01-01'));

      expect(result.supporting).toHaveLength(1); // Only the valid supporting one
      expect(result.contradictory).toHaveLength(1);
      expect(result.qualifying).toHaveLength(1);
      expect(result.superseded).toHaveLength(1);
      expect(result.expired).toHaveLength(1);
    });

    it('should filter by claimId', () => {
      const evidenceList: Evidence[] = [
        { ...validEvidence, id: '1', claimId: 'claim-001' },
        { ...validEvidence, id: '2', claimId: 'claim-002' },
      ];

      const result = resolveEvidence(evidenceList, 'claim-001');

      expect(result.supporting).toHaveLength(1);
      expect(result.supporting[0].id).toBe('1');
    });
  });

  describe('hasContradictoryEvidence', () => {
    it('should return false when no contradictory evidence', () => {
      const evidenceList: Evidence[] = [
        { ...validEvidence, id: '1', relationship: 'SUPPORTS' },
      ];

      const result = hasContradictoryEvidence(evidenceList, 'claim-001');

      expect(result.hasContradiction).toBe(false);
      expect(result.contradictoryEvidence).toHaveLength(0);
    });

    it('should return true when contradictory evidence exists', () => {
      const evidenceList: Evidence[] = [
        { ...validEvidence, id: '1', relationship: 'SUPPORTS' },
        { ...validEvidence, id: '2', relationship: 'CONTRADICTS' },
      ];

      const result = hasContradictoryEvidence(evidenceList, 'claim-001');

      expect(result.hasContradiction).toBe(true);
      expect(result.contradictoryEvidence).toHaveLength(1);
    });
  });

  describe('hasSupportingEvidence', () => {
    it('should return true when supporting evidence exists and no contradiction', () => {
      const evidenceList: Evidence[] = [
        { ...validEvidence, id: '1', relationship: 'SUPPORTS' },
      ];

      const result = hasSupportingEvidence(evidenceList, 'claim-001');

      expect(result).toBe(true);
    });

    it('should return false when contradictory evidence exists', () => {
      const evidenceList: Evidence[] = [
        { ...validEvidence, id: '1', relationship: 'SUPPORTS' },
        { ...validEvidence, id: '2', relationship: 'CONTRADICTS' },
      ];

      const result = hasSupportingEvidence(evidenceList, 'claim-001');

      expect(result).toBe(false);
    });

    it('should return false when no evidence exists', () => {
      const evidenceList: Evidence[] = [];

      const result = hasSupportingEvidence(evidenceList, 'claim-001');

      expect(result).toBe(false);
    });
  });
});
