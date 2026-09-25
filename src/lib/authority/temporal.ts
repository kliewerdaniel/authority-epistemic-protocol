import { OptionalTimestamp } from '@/schemas/types';

/**
 * Temporal validity checking.
 */

/**
 * Check if a time-bounded entity is currently valid.
 * 
 * @param validFrom - Earliest time of validity (null = no lower bound)
 * @param validUntil - Latest time of validity (null = no upper bound)
 * @param currentTime - Current time to check against
 * @returns true if currently within the validity window
 */
export function isTemporallyValid(
  validFrom: OptionalTimestamp | null,
  validUntil: OptionalTimestamp | null,
  currentTime: Date = new Date()
): boolean {
  const now = currentTime.getTime();
  
  // Check lower bound
  if (validFrom) {
    const fromTime = new Date(validFrom).getTime();
    if (now < fromTime) {
      return false;
    }
  }
  
  // Check upper bound
  if (validUntil) {
    const untilTime = new Date(validUntil).getTime();
    if (now > untilTime) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if an entity has been superseded.
 */
export function isSuperseded(supersededBy: string | undefined): boolean {
  return !!(supersededBy && supersededBy.trim().length > 0);
}

/**
 * Resolve temporal authority for a set of artifacts.
 * Returns which artifacts are currently valid.
 */
export interface TemporalResolution {
  validArtifacts: Array<{ artifact: unknown; validFrom: string | null; validUntil: string | null }>;
  expiredArtifacts: Array<{ artifact: unknown; expiredAt: string }>;
  futureArtifacts: Array<{ artifact: unknown; validFrom: string }>;
}

export function resolveTemporalAuthority<T extends { timestamp: string; validFrom?: OptionalTimestamp | null; validUntil?: OptionalTimestamp | null }>(
  artifacts: T[],
  currentTime: Date = new Date()
): TemporalResolution {
  const validArtifacts: TemporalResolution['validArtifacts'] = [];
  const expiredArtifacts: TemporalResolution['expiredArtifacts'] = [];
  const futureArtifacts: TemporalResolution['futureArtifacts'] = [];
  
  for (const artifact of artifacts) {
    const validFrom = artifact.validFrom || null;
    const validUntil = artifact.validUntil || null;
    const tempValid = isTemporallyValid(validFrom, validUntil, currentTime);
    
    if (tempValid) {
      validArtifacts.push({
        artifact,
        validFrom: validFrom || null,
        validUntil: validUntil || null,
      });
    } else {
      // Determine why it's not valid
      if (validFrom) {
        const fromTime = new Date(validFrom).getTime();
        if (currentTime.getTime() < fromTime) {
          futureArtifacts.push({
            artifact,
            validFrom: validFrom,
          });
          continue;
        }
      }
      
      if (validUntil) {
        const untilTime = new Date(validUntil).getTime();
        if (currentTime.getTime() > untilTime) {
          expiredArtifacts.push({
            artifact,
            expiredAt: validUntil,
          });
        }
      }
    }
  }
  
  return { validArtifacts, expiredArtifacts, futureArtifacts };
}

/**
 * Check if one temporal range supersedes another.
 * A supersedes B if A's validity window is strictly within B's or starts after B's.
 */
export function doesSupersede(
  superseded: { validFrom?: OptionalTimestamp | null; validUntil?: OptionalTimestamp | null },
  superseding: { validFrom?: OptionalTimestamp | null; validUntil?: OptionalTimestamp | null }
): boolean {
  // If superseding has no temporal bounds, it doesn't clearly supersede
  if (!superseding.validFrom && !superseding.validUntil) {
    return false;
  }
  
  // Simple check: if superseding's validFrom is after superseded's validFrom,
  // or superseding's validUntil is before superseded's validUntil
  const superFrom = superseding.validFrom ? new Date(superseding.validFrom).getTime() : 0;
  const superUntil = superseding.validUntil ? new Date(superseding.validUntil).getTime() : Infinity;
  
  const subFrom = superseded.validFrom ? new Date(superseded.validFrom).getTime() : 0;
  const subUntil = superseded.validUntil ? new Date(superseded.validUntil).getTime() : Infinity;
  
  // Superseding is more recent
  return superFrom >= subFrom;
}
