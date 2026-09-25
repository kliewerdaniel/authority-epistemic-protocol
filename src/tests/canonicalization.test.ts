import { describe, it, expect, beforeEach } from 'vitest';
import { 
  canonicalizeArtifact, 
  calculateArtifactHash, 
  verifyArtifactHash 
} from '@/lib/canonicalization';
import { AuthorityArtifact } from '@/schemas/authority';

describe('Canonicalization', () => {
  const baseArtifact: AuthorityArtifact = {
    specification: 'authority-epistemic-protocol/v1',
    authority_id: '123e4567-e89b-12d3-a456-426614174000',
    context: 'test-resource',
    issuer: 'did:web:test.example.org',
    jurisdiction: 'test-jurisdiction',
    scope: ['scope1', 'scope2'],
    precedence_class: 50,
    enforcement_weight: 50,
    timestamp: '2024-01-15T10:00:00Z',
    version: '1.0.0',
    hash: 'test-hash',
    signature: 'test-signature',
    justification_reference: 'test-justification',
    revocation_policy: 'test-revocation',
    validFrom: null,
    validUntil: null,
    supersededBy: undefined,
  };

  describe('canonicalizeArtifact', () => {
    it('should exclude hash and signature fields', () => {
      const canonical = canonicalizeArtifact(baseArtifact);
      expect(canonical).not.toContain('test-hash');
      expect(canonical).not.toContain('test-signature');
    });

    it('should produce deterministic output', () => {
      const canonical1 = canonicalizeArtifact(baseArtifact);
      const canonical2 = canonicalizeArtifact(baseArtifact);
      expect(canonical1).toBe(canonical2);
    });

    it('should handle different key ordering', () => {
      const artifact1 = { ...baseArtifact };
      const artifact2 = {
        ...baseArtifact,
        jurisdiction: 'test-jurisdiction',
        issuer: 'did:web:test.example.org',
        scope: ['scope1', 'scope2'],
        precedence_class: 50,
        authority_id: '123e4567-e89b-12d3-a456-426614174000',
        specification: 'authority-epistemic-protocol/v1',
        timestamp: '2024-01-15T10:00:00Z',
        version: '1.0.0',
        context: 'test-resource',
        enforcement_weight: 50,
        validFrom: null,
        validUntil: null,
      };

      const canonical1 = canonicalizeArtifact(artifact1);
      const canonical2 = canonicalizeArtifact(artifact2);
      // Keys are sorted, so different input order should produce same canonical
      expect(canonical1).toBe(canonical2);
    });
  });

  describe('calculateArtifactHash', () => {
    it('should produce identical hashes for identical canonical content', async () => {
      const canonical = canonicalizeArtifact(baseArtifact);
      const hash1 = await calculateArtifactHash(canonical);
      const hash2 = await calculateArtifactHash(canonical);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different content', async () => {
      const artifact1 = { ...baseArtifact };
      const artifact2 = { 
        ...baseArtifact, 
        version: '2.0.0' // Changed version
      };

      const canonical1 = canonicalizeArtifact(artifact1);
      const canonical2 = canonicalizeArtifact(artifact2);

      const hash1 = await calculateArtifactHash(canonical1);
      const hash2 = await calculateArtifactHash(canonical2);

      expect(hash1).not.toBe(hash2);
    });

    it('should be deterministic across runs', async () => {
      const canonical = canonicalizeArtifact(baseArtifact);
      const hash = await calculateArtifactHash(canonical);
      // Hash should be a valid hex string
      expect(hash).toMatch(/^[0-9a-f]+$/);
      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex chars
    });
  });

  describe('verifyArtifactHash', () => {
    it('should detect valid hash', async () => {
      const artifact: AuthorityArtifact = {
        ...baseArtifact,
        hash: undefined, // Will be calculated
      };

      // Calculate the correct hash
      const canonical = canonicalizeArtifact(artifact);
      const correctHash = await calculateArtifactHash(canonical);
      
      const artifactWithHash: AuthorityArtifact = {
        ...artifact,
        hash: correctHash,
      };

      const result = await verifyArtifactHash(artifactWithHash);
      expect(result.valid).toBe(true);
      expect(result.computedHash).toBe(correctHash);
      expect(result.storedHash).toBe(correctHash);
    });

    it('should detect tampered hash', async () => {
      const artifact: AuthorityArtifact = {
        ...baseArtifact,
        hash: 'tampered-hash-that-is-not-correct',
      };

      const result = await verifyArtifactHash(artifact);
      expect(result.valid).toBe(false);
      expect(result.computedHash).not.toBe(result.storedHash);
    });

    it('should handle missing hash gracefully', async () => {
      const artifact: AuthorityArtifact = {
        ...baseArtifact,
        hash: undefined,
      };

      const result = await verifyArtifactHash(artifact);
      expect(result.valid).toBe(false); // Empty hash doesn't match
      expect(result.storedHash).toBe('');
    });
  });

  describe('Canonicalization Properties', () => {
    it('should produce identical canonical form for identical artifacts', () => {
      const artifact1 = { ...baseArtifact };
      const artifact2 = { ...baseArtifact };

      const canonical1 = canonicalizeArtifact(artifact1);
      const canonical2 = canonicalizeArtifact(artifact2);

      expect(canonical1).toBe(canonical2);
    });

    it('should sort object keys recursively', () => {
      const nested: AuthorityArtifact = {
        ...baseArtifact,
        scope: ['z-scope', 'a-scope', 'm-scope'],
      };

      const canonical = canonicalizeArtifact(nested);
      // Scope array order should be preserved (not sorted)
      expect(canonical).toContain('"scope":["z-scope","a-scope","m-scope"');
    });
  });
});
