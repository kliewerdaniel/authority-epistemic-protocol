import { AuthorityArtifact } from '@/schemas/authority';

/**
 * Recursively sort object keys for deterministic serialization.
 * Preserves array order.
 */
function sortKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }

  if (typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    for (const key of keys) {
      sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return obj;
}

/**
 * Remove insignificant whitespace from JSON representation.
 * Uses minimal JSON serialization.
 */
function toCompactJSON(obj: unknown): string {
  return JSON.stringify(sortKeys(obj), null, 0);
}

/**
 * Canonicalize an authority artifact for hashing.
 * Excludes hash and signature fields.
 * 
 * Canonicalization must:
 * - Recursively sort object keys
 * - Preserve array order
 * - Use UTF-8
 * - Remove insignificant whitespace
 * - Serialize deterministically
 */
export function canonicalizeArtifact(artifact: AuthorityArtifact): string {
  const { hash, signature, ...rest } = artifact;
  
  return toCompactJSON(rest);
}

/**
 * Calculate SHA-256 hash of the canonical artifact representation.
 * The hash is calculated over the canonical representation excluding the hash field itself.
 */
export async function calculateArtifactHash(canonical: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify that an artifact's hash matches its canonical content.
 */
export async function verifyArtifactHash(
  artifact: AuthorityArtifact
): Promise<{ valid: boolean; computedHash: string; storedHash: string }> {
  const canonical = canonicalizeArtifact(artifact);
  const computedHash = await calculateArtifactHash(canonical);
  const storedHash = artifact.hash || '';
  
  return {
    valid: computedHash === storedHash,
    computedHash,
    storedHash,
  };
}

/**
 * Create a canonical representation object for serialization.
 */
export function createCanonicalObject(artifact: AuthorityArtifact): Record<string, unknown> {
  const { hash, signature, ...rest } = artifact;
  return rest as Record<string, unknown>;
}

/**
 * Verify canonicalization properties:
 * 1. Key ordering does not affect the hash
 * 2. Identical artifacts produce identical hashes
 */
export function verifyCanonicalProperties(): {
  keyOrderIndependence: boolean;
  identicalArtifacts: boolean;
} {
  const timestamp = new Date().toISOString();
  
  // Test 1: Key order independence - same content, different key order in object
  const artifact1 = {
    specification: 'test/v1',
    authority_id: '123e4567-e89b-12d3-a456-426614174000',
    context: 'test',
    issuer: 'did:web:test.org',
    jurisdiction: 'test',
    scope: ['scope1', 'scope2'],
    precedence_class: 50,
    enforcement_weight: 50,
    timestamp,
    version: '1.0.0',
    validFrom: null,
    validUntil: null,
  };

  // Same content, keys in different order
  const artifact2 = {
    jurisdiction: 'test',
    scope: ['scope1', 'scope2'],
    issuer: 'did:web:test.org',
    precedence_class: 50,
    specification: 'test/v1',
    timestamp,
    version: '1.0.0',
    authority_id: '123e4567-e89b-12d3-a456-426614174000',
    context: 'test',
    enforcement_weight: 50,
    validFrom: null,
    validUntil: null,
  };

  const canonical1 = canonicalizeArtifact(artifact1 as AuthorityArtifact);
  const canonical2 = canonicalizeArtifact(artifact2 as AuthorityArtifact);

  return {
    keyOrderIndependence: canonical1 === canonical2,
    identicalArtifacts: canonical1 === canonical2,
  };
}
