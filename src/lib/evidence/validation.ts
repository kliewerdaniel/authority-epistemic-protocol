import { Evidence, EvidenceValidationResult } from '@/schemas/models';
import { OptionalTimestamp } from '@/schemas/types';
import { isTemporallyValid, isSuperseded } from '@/lib/authority/temporal';

/**
 * Validate evidence.
 * Evidence itself should not automatically become verified merely because it is present.
 */
export function validateEvidence(
  evidence: Evidence,
  currentTime: Date = new Date()
): EvidenceValidationResult {
  const errors: string[] = [];
  
  // Check required fields
  if (!evidence.id) {
    errors.push('Missing evidence id');
  }
  if (!evidence.type) {
    errors.push('Missing evidence type');
  }
  if (!evidence.source) {
    errors.push('Missing evidence source');
  }
  if (!evidence.claimId) {
    errors.push('Missing claimId');
  }
  if (!evidence.excerpt || evidence.excerpt.trim().length === 0) {
    errors.push('Missing or empty excerpt');
  }

  // Check temporal validity
  const validFrom = evidence.validFrom || null;
  const validUntil = evidence.validUntil || null;
  const temporalValid = isTemporallyValid(validFrom, validUntil, currentTime);
  
  const isExpired = !temporalValid;
  const isSuperseded_ = isSuperseded(evidence.supersededBy);

  return {
    valid: errors.length === 0,
    errors,
    isExpired,
    isSuperseded: isSuperseded_,
  };
}

/**
 * Validate evidence hash if present.
 */
export async function verifyEvidenceHash(
  evidence: Evidence,
  canonicalContent: string
): Promise<{ valid: boolean; computedHash: string; storedHash: string }> {
  if (!evidence.hash) {
    return { valid: true, computedHash: '', storedHash: '' };
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalContent);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const computedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  
  return {
    valid: computedHash === evidence.hash,
    computedHash,
    storedHash: evidence.hash,
  };
}

/**
 * Evidence resolution - determine what evidence exists for a claim.
 */
export interface EvidenceResolution {
  supporting: Evidence[];
  contradictory: Evidence[];
  qualifying: Evidence[];
  superseded: Evidence[];
  expired: Evidence[];
  unresolved: Evidence[];
}

export function resolveEvidence(
  evidenceList: Evidence[],
  claimId: string,
  currentTime: Date = new Date()
): EvidenceResolution {
  const result: EvidenceResolution = {
    supporting: [],
    contradictory: [],
    qualifying: [],
    superseded: [],
    expired: [],
    unresolved: [],
  };
  
  for (const evidence of evidenceList) {
    // Only consider evidence for this claim
    if (evidence.claimId !== claimId) {
      continue;
    }
    
    const validation = validateEvidence(evidence, currentTime);
    
    if (!validation.valid) {
      result.unresolved.push(evidence);
      continue;
    }
    
    if (validation.isSuperseded) {
      result.superseded.push(evidence);
      continue;
    }
    
    if (validation.isExpired) {
      result.expired.push(evidence);
      continue;
    }
    
    // Categorize by relationship
    switch (evidence.relationship) {
      case 'SUPPORTS':
        result.supporting.push(evidence);
        break;
      case 'CONTRADICTS':
        result.contradictory.push(evidence);
        break;
      case 'QUALIFIES':
        result.qualifying.push(evidence);
        break;
      default:
        result.unresolved.push(evidence);
    }
  }
  
  return result;
}

/**
 * Check if there is contradictory evidence for a claim.
 */
export function hasContradictoryEvidence(
  evidenceList: Evidence[],
  claimId: string,
  currentTime: Date = new Date()
): { hasContradiction: boolean; contradictoryEvidence: Evidence[] } {
  const resolution = resolveEvidence(evidenceList, claimId, currentTime);
  
  return {
    hasContradiction: resolution.contradictory.length > 0,
    contradictoryEvidence: resolution.contradictory,
  };
}

/**
 * Check if evidence is sufficient to support a claim.
 * This does NOT mean the claim is verified - only that supporting evidence exists.
 */
export function hasSupportingEvidence(
  evidenceList: Evidence[],
  claimId: string,
  currentTime: Date = new Date()
): boolean {
  const resolution = resolveEvidence(evidenceList, claimId, currentTime);
  return resolution.supporting.length > 0 && resolution.contradictory.length === 0;
}
