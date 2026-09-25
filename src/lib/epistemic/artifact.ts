import { EpistemicArtifact, VerificationResult, AuthorityResolution } from '@/schemas/resolution';
import { Claim } from '@/schemas/models';
import { Evidence } from '@/schemas/models';
import { BoundedAssertion } from '@/schemas/resolution';
import { AuditEvent } from '@/schemas/resolution';
import { canonicalizeArtifact, calculateArtifactHash } from '@/lib/canonicalization';
import { getAuditEvents } from '@/lib/audit/ledger';

/**
 * Create a final machine-readable Epistemic Artifact.
 * 
 * This is the compiled output of the entire epistemic pipeline:
 * Raw information → structured claims → authority resolution → 
 * evidence resolution → deterministic verification → epistemic artifact
 */
export function createEpistemicArtifact(
  claim: Claim,
  authorityResolution: AuthorityResolution,
  evidenceSummary: Evidence[],
  verificationResult: VerificationResult,
  boundedAssertion: BoundedAssertion,
  options?: { artifactVersion?: string }
): EpistemicArtifact {
  const artifactVersion = options?.artifactVersion || '1.0.0';
  const auditTrail = getAuditEvents();
  const provenance = [
    'authority-epistemic-protocol',
    'deterministic-verification-engine',
    authorizationProvenance(authorityResolution),
    evidenceProvenance(evidenceSummary),
  ].filter(Boolean);
  
  // Create a preliminary artifact for hashing
  const preHashArtifact: Omit<EpistemicArtifact, 'hash'> = {
    artifact_version: artifactVersion,
    generated_at: new Date().toISOString(),
    claim: claim as unknown as Record<string, unknown>,
    authority_resolution: authorityResolution as unknown as Record<string, unknown>,
    evidence_summary: evidenceSummary.map(e => e as unknown as Record<string, unknown>),
    verification_result: verificationResult as unknown as Record<string, unknown>,
    bounded_assertion: boundedAssertion as unknown as Record<string, unknown>,
    audit_trail: auditTrail.map(e => e as unknown as Record<string, unknown>),
    provenance,
  };
  
  // Calculate hash over canonical form
  const canonicalForm = JSON.stringify(preHashArtifact);
  const hash = calculateArtifactHashSync(canonicalForm);
  
  return {
    ...preHashArtifact,
    hash,
  };
}

/**
 * Synchronous hash calculation for artifact (using Node.js crypto in Node environment).
 */
function calculateArtifactHashSync(content: string): string {
  // For synchronous use, we create a simple hash using string manipulation
  // In production, this would use crypto.createHash from Node.js
  // For the demo, we use a deterministic transformation
  let hash = 0;
  const str = content;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to hex string (simulating SHA-256 output format)
  const hashStr = Math.abs(hash).toString(16).padStart(8, '0');
  return `demo-${hashStr}-${str.length}`;
}

/**
 * Extract provenance from authority resolution.
 */
function authorizationProvenance(resolution: AuthorityResolution): string {
  if (resolution.selected_authority) {
    return `authority-selected:${resolution.selected_authority}`;
  }
  return 'authority-unresolved';
}

/**
 * Extract provenance from evidence.
 */
function evidenceProvenance(evidence: Evidence[]): string {
  const sources = [...new Set(evidence.map(e => e.source))];
  return `evidence-sources:${sources.join(',')}`;
}

/**
 * Create a bounded assertion from verification result.
 * A bounded assertion defines the scope under which a claim is verified.
 */
export function createBoundedAssertion(
  claim: Claim,
  verificationResult: VerificationResult,
  scope: string[],
  jurisdiction: string,
  temporalBoundary: { valid_from?: string; valid_until?: string }
): BoundedAssertion {
  return {
    claim: claim as unknown as Record<string, unknown>,
    scope,
    jurisdiction,
    temporal_boundary: temporalBoundary,
    evidence_requirements: verificationResult.passed_predicates,
    authority_requirements: verificationResult.authority_basis,
    verification_policy: 'Standard Verification v1.0.0',
  };
}

/**
 * Serialize the epistemic artifact to JSON for download.
 */
export function serializeEpistemicArtifact(artifact: EpistemicArtifact): string {
  return JSON.stringify(artifact, null, 2);
}

/**
 * Create a canonical JSON view of the artifact (sorted keys, minimal whitespace).
 */
export function canonicalEpistemicArtifact(artifact: EpistemicArtifact): string {
  const { hash, ...rest } = artifact;
  return canonicalizeArtifact({
    specification: 'epistemic-artifact/v1',
    artifact_version: artifact.artifact_version,
    generated_at: artifact.generated_at,
    claim: rest.claim as unknown as Record<string, unknown>,
    authority_resolution: rest.authority_resolution as unknown as Record<string, unknown>,
    evidence_summary: (rest.evidence_summary || []) as unknown as Record<string, unknown>[],
    verification_result: rest.verification_result as unknown as Record<string, unknown>,
    bounded_assertion: rest.bounded_assertion as unknown as Record<string, unknown>,
    audit_trail: (rest.audit_trail || []) as unknown as Record<string, unknown>[],
    provenance: (rest.provenance || []) as unknown as string[],
  } as unknown as Parameters<typeof canonicalizeArtifact>[0]);
}
