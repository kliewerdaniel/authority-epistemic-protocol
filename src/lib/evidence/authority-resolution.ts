import { AuthorityArtifact, AuthorityValidationResult } from '@/schemas/authority';
import { Claim } from '@/schemas/models';
import { AuthorityResolution, ApplicableAuthority } from '@/schemas/resolution';
import { validateAuthorityArtifact, compareAuthorityPrecedence, selectWinningAuthority } from '@/lib/authority/validation';
import { resolveTemporalAuthority } from '@/lib/authority/temporal';

/**
 * Deterministic authority resolution.
 * 
 * Inputs:
 * - claim
 * - authority artifacts
 * - evidence (for scope context)
 * 
 * Outputs:
 * - AuthorityResolution containing:
 *   - applicableAuthorities
 *   - inapplicableAuthorities
 *   - conflicts
 *   - selectedAuthority
 *   - resolutionReason
 *   - deterministicRulesApplied
 */
export function resolveAuthority(
  claim: Claim,
  artifacts: AuthorityArtifact[],
  options?: { currentTime?: Date; targetScopes?: string[] }
): AuthorityResolution {
  const currentTime = options?.currentTime || new Date();
  const targetScopes = options?.targetScopes || (claim.subject ? [claim.subject] : []);
  
  const applicableAuthorities: AuthorityResolution['applicable_authorities'] = [];
  const inapplicableAuthorities: AuthorityResolution['inapplicable_authorities'] = [];
  const conflicts: AuthorityResolution['conflicts'] = [];
  
  const rulesApplied: string[] = [];
  
  // Step 1: Validate each artifact and categorize
  for (const artifact of artifacts) {
    const validation = validateAuthorityArtifact(artifact, {
      targetScope: targetScopes,
      currentTime,
      claimSubject: claim.subject,
    });
    
    if (!validation.valid) {
      inapplicableAuthorities.push({
        artifact: artifact as unknown as AuthorityResolution['inapplicable_authorities'][number]['artifact'],
        reason: `Invalid artifact: ${validation.errors.join(', ')}`,
      });
      continue;
    }
    
    if (validation.isExpired) {
      inapplicableAuthorities.push({
        artifact: artifact as unknown as AuthorityResolution['inapplicable_authorities'][number]['artifact'],
        reason: 'Artifact is temporally expired',
      });
      continue;
    }
    
    if (validation.isOutScope) {
      inapplicableAuthorities.push({
        artifact: artifact as unknown as AuthorityResolution['inapplicable_authorities'][number]['artifact'],
        reason: 'Artifact scope does not match target scope',
      });
      continue;
    }
    
    // Note: Context matching is handled by validateAuthorityArtifact's isOutScope check
    // The artifact's context field and claim's subject should match through scope validation
    
    // Applicable authority
    applicableAuthorities.push({
      artifact: artifact as unknown as AuthorityResolution['applicable_authorities'][number]['artifact'],
      precedence_class: artifact.precedence_class,
      enforcement_weight: artifact.enforcement_weight,
      scope_match: true,
      temporal_valid: true,
    });
    
    rulesApplied.push('VALIDATION');
  }
  
  // Step 2: Check for conflicts
  if (applicableAuthorities.length > 1) {
    // Check for scope conflicts
    const scopes = new Set<string>();
    for (const auth of applicableAuthorities) {
      const artifact = auth.artifact as unknown as AuthorityArtifact;
      for (const scope of artifact.scope || []) {
        scopes.add(scope);
      }
    }
    
    if (scopes.size > 1) {
      conflicts.push({
        authorities: applicableAuthorities.map(a => (a.artifact as unknown as AuthorityArtifact).authority_id),
        conflict_type: 'SCOPE_CONFLICT',
        resolution: 'Multiple scopes detected - selection based on precedence',
      });
    }
    
    // Check for precedence conflicts
    const precedenceValues = new Set(applicableAuthorities.map(a => a.precedence_class));
    if (precedenceValues.size > 1) {
      conflicts.push({
        authorities: applicableAuthorities.map(a => (a.artifact as unknown as AuthorityArtifact).authority_id),
        conflict_type: 'PRECEDENCE_CONFLICT',
        resolution: 'Resolved by precedence class and scope specificity',
      });
    }
    
    rulesApplied.push('CONFLICT_DETECTION');
  }
  
  // Step 3: Select winning authority (if possible)
  const artifactsOnly = applicableAuthorities.map(a => a.artifact as unknown as AuthorityArtifact);
  const selection = selectWinningAuthority(artifactsOnly);
  
  let selectedAuthority: string | undefined;
  let resolutionReason = '';
  
  if (selection) {
    selectedAuthority = selection.selected.authority_id;
    resolutionReason = selection.reason;
    rulesApplied.push(...selection.rulesApplied);
  } else {
    resolutionReason = 'No applicable authorities found';
    rulesApplied.push('NO_AUTHORITIES');
  }
  
  // Rule: Authority does not automatically establish truth
  rulesApplied.push('AUTHORITY_NOT_TRUTH');
  
  // Rule: Conflicting authority declarations remain visible
  rulesApplied.push('CONFLICT_VISIBILITY');
  
  // Rule: If deterministic rules cannot resolve conflict, return INCONCLUSIVE
  // (handled in verification stage)
  rulesApplied.push('INCONCLUSIVE_ON_CONFLICT');
  
  return {
    claim_id: claim.id,
    applicable_authorities: applicableAuthorities,
    inapplicable_authorities: inapplicableAuthorities,
    conflicts,
    selected_authority: selectedAuthority,
    resolution_reason: resolutionReason,
    deterministic_rules_applied: [...new Set(rulesApplied)],
  };
}

/**
 * Get applicable (valid and in-scope) authorities only.
 */
export function getApplicableAuthorities(
  resolution: AuthorityResolution
): AuthorityArtifact[] {
  return resolution.applicable_authorities.map(a => a.artifact as AuthorityArtifact);
}

/**
 * Check if there are unresolvable conflicts.
 */
export function hasUnresolvableConflicts(resolution: AuthorityResolution): boolean {
  // If there are conflicts and no clear winner, conflict is unresolved
  if (resolution.conflicts.length > 0 && !resolution.selected_authority) {
    return true;
  }
  
  // If there are multiple applicable authorities with equal precedence
  if (resolution.applicable_authorities.length > 1) {
    const precedenceValues = resolution.applicable_authorities.map(a => a.precedence_class);
    const uniquePrecedence = new Set(precedenceValues);
    if (uniquePrecedence.size === 1) {
      // Same precedence - check scope specificity
      const specificities = resolution.applicable_authorities.map(a => (a.artifact as AuthorityArtifact).scope?.length || 0);
      if (new Set(specificities).size === 1) {
        return true; // Equal precedence and scope - cannot resolve
      }
    }
  }
  
  return false;
}
