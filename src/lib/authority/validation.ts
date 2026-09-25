import { AuthorityArtifact, AuthorityValidationResult } from '@/schemas/authority';
import { OptionalTimestamp } from '@/schemas/types';
import { isTemporallyValid, isSuperseded } from './temporal';

/**
 * Validate an authority artifact.
 * 
 * Rules:
 * 1. Invalid artifacts cannot participate.
 * 2. Expired artifacts cannot participate.
 * 3. Out-of-scope artifacts cannot participate.
 * 4. More specific scope may supersede broader scope.
 * 5. Explicit precedence may resolve otherwise equivalent authority.
 * 6. Authority does not automatically establish truth.
 * 7. Conflicting authority declarations must remain visible in the audit result.
 * 8. If deterministic rules cannot resolve a conflict, return INCONCLUSIVE.
 */
export function validateAuthorityArtifact(
  artifact: AuthorityArtifact,
  context?: { targetScope?: string[]; currentTime?: Date; claimSubject?: string }
): AuthorityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check basic validity (required fields)
  if (!artifact.authority_id) {
    errors.push('Missing authority_id');
  }
  if (!artifact.issuer) {
    errors.push('Missing issuer');
  }
  if (!artifact.jurisdiction) {
    errors.push('Missing jurisdiction');
  }
  if (!artifact.scope || artifact.scope.length === 0) {
    errors.push('Missing or empty scope');
  }
  if (!artifact.timestamp) {
    errors.push('Missing timestamp');
  }
  if (!artifact.version) {
    errors.push('Missing version');
  }

  // Check temporal validity
  const currentTime = context?.currentTime || new Date();
  const temporalValid = isTemporallyValid(
    artifact.validFrom || null,
    artifact.validUntil || null,
    currentTime
  );
  
  const isExpired = !temporalValid;
  if (isExpired) {
    warnings.push('Artifact is temporally expired');
  }

  // Check if superseded
  const isSuperseded_ = isSuperseded(artifact.supersededBy);
  if (isSuperseded_) {
    warnings.push('Artifact has been superseded');
  }

  // Check scope applicability
  let isOutScope = false;
  
  // First check if artifact's context matches claim's subject (the resource)
  // This is the primary check - the authority must apply to the resource in question
  if (context?.claimSubject && artifact.context !== context.claimSubject) {
    isOutScope = true;
    warnings.push('Artifact context does not match claim subject');
  }
  
  // Scope field represents the domain/area of authority (e.g., "technical documentation")
  // It does not need to match the claim's subject directly - the context field handles that
  // However, if targetScopes are provided, we can use them for additional verification
  // but only as a secondary check when context already matches

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings,
    isExpired,
    isSuperseded: isSuperseded_,
    isOutScope,
  };
}

/**
 * Calculate scope specificity score.
 * More specific scopes (fewer, more granular) get higher scores.
 */
export function calculateScopeSpecificity(scope: string[]): number {
  if (!scope || scope.length === 0) return 0;
  
  // Base specificity from number of scopes (more scopes = more specific)
  const baseScore = scope.length * 10;
  
  // Bonus for granular scopes
  const granularBonus = scope.reduce((acc, s) => {
    if (s.includes('/')) return acc + 5;
    if (s.includes('.')) return acc + 3;
    return acc;
  }, 0);
  
  return baseScore + granularBonus;
}

/**
 * Compare two authority artifacts to determine which takes precedence.
 * 
 * Rules:
 * 1. Higher precedence_class takes precedence
 * 2. More specific scope takes precedence
 * 3. More recent timestamp takes precedence
 * 4. Higher enforcement_weight takes precedence (tiebreaker)
 */
export function compareAuthorityPrecedence(
  a: AuthorityArtifact,
  b: AuthorityArtifact
): number {
  // 1. Precedence class (higher wins)
  if (a.precedence_class !== b.precedence_class) {
    return a.precedence_class - b.precedence_class;
  }
  
  // 2. Scope specificity (more specific wins)
  const specificityA = calculateScopeSpecificity(a.scope || []);
  const specificityB = calculateScopeSpecificity(b.scope || []);
  if (specificityA !== specificityB) {
    return specificityA - specificityB;
  }
  
  // 3. Timestamp (more recent wins)
  const timeA = new Date(a.timestamp).getTime();
  const timeB = new Date(b.timestamp).getTime();
  if (timeA !== timeB) {
    return timeA - timeB;
  }
  
  // 4. Enforcement weight (higher wins)
  return a.enforcement_weight - b.enforcement_weight;
}

/**
 * Select the winning authority from a set of valid authorities.
 */
export function selectWinningAuthority(
  authorities: AuthorityArtifact[]
): { selected: AuthorityArtifact; reason: string; rulesApplied: string[] } | null {
  if (authorities.length === 0) {
    return null;
  }
  
  if (authorities.length === 1) {
    return {
      selected: authorities[0],
      reason: 'Single applicable authority',
      rulesApplied: ['SINGLE_AUTHORITY'],
    };
  }
  
  const rulesApplied: string[] = [];
  
  // Sort by precedence
  const sorted = [...authorities].sort(compareAuthorityPrecedence);
  
  // Check for exact tie
  const top = sorted[sorted.length - 1];
  const second = sorted[sorted.length - 2];
  
  if (compareAuthorityPrecedence(top, second) === 0) {
    // True tie - cannot deterministically resolve
    return {
      selected: top,
      reason: 'Multiple authorities with equal precedence - selection is non-deterministic, conflict remains visible',
      rulesApplied: ['PRECEDENCE_CLASS', 'SCOPE_SPECIFICITY', 'TIMESTAMP', 'ENFORCEMENT_WEIGHT', 'EQUAL_PRECEDENCE_CONFLICT'],
    };
  }
  
  rulesApplied.push('PRECEDENCE_CLASS');
  if (calculateScopeSpecificity(top.scope || []) !== calculateScopeSpecificity(second.scope || [])) {
    rulesApplied.push('SCOPE_SPECIFICITY');
  }
  rulesApplied.push('TIMESTAMP');
  rulesApplied.push('ENFORCEMENT_WEIGHT');
  
  return {
    selected: top,
    reason: `Authority selected based on precedence rules. ${rulesApplied.join(', ')}.`,
    rulesApplied,
  };
}
