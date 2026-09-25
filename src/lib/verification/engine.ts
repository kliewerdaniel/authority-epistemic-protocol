import { Claim } from '@/schemas/models';
import { AuthorityResolution } from '@/schemas/resolution';
import { EpistemicState, PredicateResult } from '@/schemas/types';
import { VerificationResult } from '@/schemas/resolution';
import { Evidence } from '@/schemas/models';
import { resolveEvidence, hasContradictoryEvidence } from '@/lib/evidence/validation';
import { hasUnresolvableConflicts } from '@/lib/evidence/authority-resolution';
import { validateAuthorityArtifact } from '@/lib/authority/validation';
import { isTemporallyValid } from '@/lib/authority/temporal';

/**
 * Verification Policy - defines which predicates are required for VERIFIED state.
 */
export interface VerificationPolicy {
  name: string;
  version: string;
  requiredPredicates: string[];
  // If true, ALL required predicates must pass
  // If false, at least one supporting predicate must pass and none can fail
  requireAllPredicates: boolean;
}

/**
 * Default verification policy.
 */
export const DEFAULT_VERIFICATION_POLICY: VerificationPolicy = {
  name: 'Standard Verification',
  version: '1.0.0',
  requiredPredicates: [
    'AUTHORITY_ARTIFACT_VALID',
    'AUTHORITY_SCOPE_MATCHES',
    'EVIDENCE_EXISTS',
    'EVIDENCE_TEMPORALLY_VALID',
    'EVIDENCE_HASH_VALID',
    'NO_CONTRADICTORY_EVIDENCE',
  ],
  requireAllPredicates: true,
};

/**
 * Verify a claim against authority, evidence, and deterministic rules.
 * 
 * This is the core of the epistemic engine.
 * DO NOT TRUST THE MODEL. TRUST THE EXECUTION PROTOCOL.
 */
export function verifyClaim(
  claim: Claim,
  authorityResolution: AuthorityResolution,
  evidenceList: Evidence[],
  options?: {
    temporalContext?: Date;
    verificationPolicy?: VerificationPolicy;
  }
): VerificationResult {
  const temporalContext = options?.temporalContext || new Date();
  const policy = options?.verificationPolicy || DEFAULT_VERIFICATION_POLICY;
  
  const predicates: VerificationResult['predicates'] = [];
  const passedPredicates: string[] = [];
  const failedPredicates: string[] = [];
  const unresolvedPredicates: string[] = [];
  const contradictions: VerificationResult['contradictions'] = [];
  
  // === PREDICATE 1: Authority Artifact Valid ===
  const authorityValidPredicate = evaluateAuthorityArtifactValid(
    claim,
    authorityResolution,
    temporalContext
  );
  predicates.push(authorityValidPredicate);
  if (authorityValidPredicate.result === 'PASS') {
    passedPredicates.push(authorityValidPredicate.name);
  } else if (authorityValidPredicate.result === 'FAIL') {
    failedPredicates.push(authorityValidPredicate.name);
  } else {
    unresolvedPredicates.push(authorityValidPredicate.name);
  }
  
  // === PREDICATE 2: Authority Scope Matches ===
  const authorityScopePredicate = evaluateAuthorityScopeMatches(
    claim,
    authorityResolution
  );
  predicates.push(authorityScopePredicate);
  if (authorityScopePredicate.result === 'PASS') {
    passedPredicates.push(authorityScopePredicate.name);
  } else if (authorityScopePredicate.result === 'FAIL') {
    failedPredicates.push(authorityScopePredicate.name);
  } else {
    unresolvedPredicates.push(authorityScopePredicate.name);
  }
  
  // === PREDICATE 3: Evidence Exists ===
  const evidenceExistsPredicate = evaluateEvidenceExists(
    claim,
    evidenceList,
    temporalContext
  );
  predicates.push(evidenceExistsPredicate);
  if (evidenceExistsPredicate.result === 'PASS') {
    passedPredicates.push(evidenceExistsPredicate.name);
  } else if (evidenceExistsPredicate.result === 'FAIL') {
    failedPredicates.push(evidenceExistsPredicate.name);
  } else {
    unresolvedPredicates.push(evidenceExistsPredicate.name);
  }
  
  // === PREDICATE 4: Evidence Temporally Valid ===
  const evidenceTemporalPredicate = evaluateEvidenceTemporallyValid(
    claim,
    evidenceList,
    temporalContext
  );
  predicates.push(evidenceTemporalPredicate);
  if (evidenceTemporalPredicate.result === 'PASS') {
    passedPredicates.push(evidenceTemporalPredicate.name);
  } else if (evidenceTemporalPredicate.result === 'FAIL') {
    failedPredicates.push(evidenceTemporalPredicate.name);
  } else {
    unresolvedPredicates.push(evidenceTemporalPredicate.name);
  }
  
  // === PREDICATE 5: Evidence Hash Valid ===
  // (In a real system, this would verify cryptographic hashes)
  const evidenceHashPredicate = evaluateEvidenceHashValid(
    claim,
    evidenceList
  );
  predicates.push(evidenceHashPredicate);
  if (evidenceHashPredicate.result === 'PASS') {
    passedPredicates.push(evidenceHashPredicate.name);
  } else if (evidenceHashPredicate.result === 'FAIL') {
    failedPredicates.push(evidenceHashPredicate.name);
  } else {
    unresolvedPredicates.push(evidenceHashPredicate.name);
  }
  
  // === PREDICATE 6: No Contradictory Evidence ===
  const contradictionCheck = hasContradictoryEvidence(evidenceList, claim.id, temporalContext);
  const noContradictionPredicate: VerificationResult['predicates'][number] = {
    name: 'NO_CONTRADICTORY_EVIDENCE',
    description: 'No verified contradictory evidence exists for the claim',
    result: contradictionCheck.hasContradiction ? 'FAIL' : 'PASS',
    details: contradictionCheck.hasContradiction 
      ? { contradictoryEvidenceIds: contradictionCheck.contradictoryEvidence.map(e => e.id) }
      : {},
    timestamp: new Date().toISOString(),
  };
  predicates.push(noContradictionPredicate);
  if (noContradictionPredicate.result === 'PASS') {
    passedPredicates.push(noContradictionPredicate.name);
  } else if (noContradictionPredicate.result === 'FAIL') {
    failedPredicates.push(noContradictionPredicate.name);
    // Collect contradiction details
    for (const evidence of contradictionCheck.contradictoryEvidence) {
      contradictions.push({
        evidence_id: evidence.id,
        claim_id: evidence.claimId,
        type: evidence.relationship,
        excerpt: evidence.excerpt,
      });
    }
  } else {
    unresolvedPredicates.push(noContradictionPredicate.name);
  }
  
  // === Determine Final State ===
  const finalState = determineEpistemicState(
    predicates,
    passedPredicates,
    failedPredicates,
    unresolvedPredicates,
    contradictions,
    authorityResolution,
    evidenceList,
    claim,
    temporalContext
  );
  
  // === Authority Basis ===
  const authorityBasis = authorityResolution.applicable_authorities
    .map(a => a.artifact)
    .filter(Boolean)
    .map(a => (a as { authority_id?: string }).authority_id || 'unknown');
  
  // === Evidence Basis ===
  const evidenceBasis = evidenceList
    .filter(e => e.claimId === claim.id)
    .map(e => e.id);
  
  return {
    claim_id: claim.id,
    state: finalState,
    predicates,
    passed_predicates: passedPredicates,
    failed_predicates: failedPredicates,
    unresolved_predicates: unresolvedPredicates,
    contradictions,
    authority_basis: authorityBasis,
    evidence_basis: evidenceBasis,
    timestamp: new Date().toISOString(),
    rule_version: policy.version,
    audit_events: [],
  };
}

/**
 * Determine the final epistemic state based on predicate results.
 */
function determineEpistemicState(
  predicates: VerificationResult['predicates'],
  passedPredicates: string[],
  failedPredicates: string[],
  unresolvedPredicates: string[],
  contradictions: VerificationResult['contradictions'],
  authorityResolution: AuthorityResolution,
  evidenceList: Evidence[],
  claim: Claim,
  temporalContext: Date
): EpistemicState {
  // If we have contradictory evidence that is verified, state is CONTRADICTED
  if (contradictions.length > 0) {
    return 'CONTRADICTED';
  }
  
  // If authority resolution has no applicable authorities, state is UNVERIFIED
  if (authorityResolution.applicable_authorities.length === 0) {
    // Check if any inapplicable authority is expired/superseded -> STALE
    const hasExpiredOrSuperseded = authorityResolution.inapplicable_authorities.some(
      a => a.reason.includes('expired') || a.reason.includes('superseded')
    );
    if (hasExpiredOrSuperseded) {
      return 'STALE';
    }
    return 'UNVERIFIED';
  }
  
  // If EVIDENCE_EXISTS fails, state is UNVERIFIED (no evidence)
  if (failedPredicates.includes('EVIDENCE_EXISTS')) {
    return 'UNVERIFIED';
  }
  
  // If all required predicates pass and no unresolved contradictions, VERIFIED
  const allRequiredPass = predicates.every(p => p.result === 'PASS');
  if (allRequiredPass && predicates.length > 0) {
    return 'VERIFIED';
  }
  
  // If there is supporting evidence but not all predicates pass, SUPPORTED
  const hasSupportingEvidence = evidenceList.some(
    e => e.claimId === claim.id && e.relationship === 'SUPPORTS'
  );
  if (hasSupportingEvidence && !allRequiredPass) {
    return 'SUPPORTED';
  }
  
  // If evidence exists but cannot deterministically resolve, INCONCLUSIVE
  if (passedPredicates.length > 0 || unresolvedPredicates.length > 0) {
    // Check if there's truly unresolvable conflict
    if (hasUnresolvableConflicts(authorityResolution)) {
      return 'INCONCLUSIVE';
    }
    if (unresolvedPredicates.length > 0) {
      return 'INCONCLUSIVE';
    }
  }
  
  // If authority artifact is expired or superseded, STALE
  if (authorityResolution.inapplicable_authorities.some(
    a => a.reason.includes('expired') || a.reason.includes('superseded')
  )) {
    return 'STALE';
  }
  
  // Default: insufficient evidence
  return 'UNVERIFIED';
}

// === Individual Predicate Evaluations ===

function evaluateAuthorityArtifactValid(
  claim: Claim,
  authorityResolution: AuthorityResolution,
  temporalContext: Date
): VerificationResult['predicates'][number] {
  const hasApplicable = authorityResolution.applicable_authorities.length > 0;
  
  return {
    name: 'AUTHORITY_ARTIFACT_VALID',
    description: 'At least one valid, non-expired authority artifact exists for the claim',
    result: hasApplicable ? 'PASS' : 'FAIL',
    details: {
      applicableCount: authorityResolution.applicable_authorities.length,
      inapplicableCount: authorityResolution.inapplicable_authorities.length,
    },
    timestamp: new Date().toISOString(),
  };
}

function evaluateAuthorityScopeMatches(
  claim: Claim,
  authorityResolution: AuthorityResolution
): VerificationResult['predicates'][number] {
  // Check if any applicable authority's scope matches the claim's subject
  const scopeMatches = authorityResolution.applicable_authorities.some(auth => auth.scope_match);
  
  return {
    name: 'AUTHORITY_SCOPE_MATCHES',
    description: 'At least one applicable authority has a scope that matches the claim',
    result: scopeMatches ? 'PASS' : (authorityResolution.applicable_authorities.length > 0 ? 'FAIL' : 'UNRESOLVED'),
    details: {
      selectedAuthority: authorityResolution.selected_authority,
      resolutionReason: authorityResolution.resolution_reason,
    },
    timestamp: new Date().toISOString(),
  };
}

function evaluateEvidenceExists(
  claim: Claim,
  evidenceList: Evidence[],
  temporalContext: Date
): VerificationResult['predicates'][number] {
  const claimEvidence = evidenceList.filter(e => e.claimId === claim.id);
  const validEvidence = claimEvidence.filter(e => {
    // Simplified validation - in production, this would be more thorough
    return e.id && e.excerpt && e.excerpt.trim().length > 0;
  });
  
  return {
    name: 'EVIDENCE_EXISTS',
    description: 'Evidence exists for the claim',
    result: validEvidence.length > 0 ? 'PASS' : 'FAIL',
    details: {
      totalEvidence: claimEvidence.length,
      validEvidenceCount: validEvidence.length,
    },
    timestamp: new Date().toISOString(),
  };
}

function evaluateEvidenceTemporallyValid(
  claim: Claim,
  evidenceList: Evidence[],
  temporalContext: Date
): VerificationResult['predicates'][number] {
  const claimEvidence = evidenceList.filter(e => e.claimId === claim.id);
  
  // Check if at least one piece of evidence is temporally valid
  const temporallyValid = claimEvidence.some(e => 
    isTemporallyValid(e.validFrom || null, e.validUntil || null, temporalContext)
  );
  
  return {
    name: 'EVIDENCE_TEMPORALLY_VALID',
    description: 'At least one piece of evidence is temporally valid',
    result: temporallyValid ? 'PASS' : (claimEvidence.length > 0 ? 'FAIL' : 'UNRESOLVED'),
    details: {
      totalEvidence: claimEvidence.length,
      temporallyValidCount: claimEvidence.filter(e => 
        isTemporallyValid(e.validFrom || null, e.validUntil || null, temporalContext)
      ).length,
    },
    timestamp: new Date().toISOString(),
  };
}

function evaluateEvidenceHashValid(
  claim: Claim,
  evidenceList: Evidence[]
): VerificationResult['predicates'][number] {
  // In a real system, this would verify cryptographic hashes against canonical content
  // For this demonstration, we pass if evidence has no hash or if hash field is present
  const claimEvidence = evidenceList.filter(e => e.claimId === claim.id);
  
  // If no evidence exists for this claim, hash verification is not applicable
  // We treat this as PASS since there's nothing to verify
  if (claimEvidence.length === 0) {
    return {
      name: 'EVIDENCE_HASH_VALID',
      description: 'Evidence hashes are valid (no evidence to verify)',
      result: 'PASS', // No evidence means nothing to verify - pass by default
      details: {
        evidenceCount: 0,
        note: 'No evidence for this claim - hash verification not applicable',
      },
      timestamp: new Date().toISOString(),
    };
  }
  
  // If no evidence has hashes, we consider this UNRESOLVED (hash verification not applicable)
  // If any evidence has a hash but we can't verify it, FAIL
  // For demo purposes, we consider all evidence hashes valid if present
  const hasHashes = claimEvidence.some(e => e.hash);
  
  return {
    name: 'EVIDENCE_HASH_VALID',
    description: 'Evidence hashes are valid (or hash verification not applicable)',
    result: !hasHashes ? 'UNRESOLVED' : 'PASS', // In demo, we assume hashes are valid
    details: {
      evidenceWithHashes: claimEvidence.filter(e => e.hash).length,
      note: hasHashes ? 'Hash verification assumes integrity in demonstration mode' : 'No hashes to verify',
    },
    timestamp: new Date().toISOString(),
  };
}
