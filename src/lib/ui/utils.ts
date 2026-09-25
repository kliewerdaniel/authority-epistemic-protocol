import { EpistemicState } from '@/schemas/types';

/**
 * Get display metadata for an epistemic state.
 */
export function getStateMetadata(state: EpistemicState): {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  switch (state) {
    case 'VERIFIED':
      return {
        label: 'VERIFIED',
        description: 'All required verification predicates pass and no unresolved contradiction exists.',
        color: 'text-green-400',
        bgColor: 'bg-green-900/30',
        borderColor: 'border-green-500/50',
      };
    case 'SUPPORTED':
      return {
        label: 'SUPPORTED',
        description: 'Evidence supports the proposition but complete verification requirements are not satisfied.',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-900/30',
        borderColor: 'border-yellow-500/50',
      };
    case 'CONTRADICTED':
      return {
        label: 'CONTRADICTED',
        description: 'Verified evidence directly contradicts the proposition.',
        color: 'text-red-400',
        bgColor: 'bg-red-900/30',
        borderColor: 'border-red-500/50',
      };
    case 'INCONCLUSIVE':
      return {
        label: 'INCONCLUSIVE',
        description: 'Evidence exists but the available information cannot deterministically resolve the proposition.',
        color: 'text-orange-400',
        bgColor: 'bg-orange-900/30',
        borderColor: 'border-orange-500/50',
      };
    case 'STALE':
      return {
        label: 'STALE',
        description: 'The proposition may previously have been valid but its temporal authority/evidence window has expired or has been superseded.',
        color: 'text-slate-400',
        bgColor: 'bg-slate-800/30',
        borderColor: 'border-slate-600/50',
      };
    case 'UNVERIFIED':
      return {
        label: 'UNVERIFIED',
        description: 'The proposition has insufficient verified evidence to establish any stronger state.',
        color: 'text-gray-400',
        bgColor: 'bg-gray-800/30',
        borderColor: 'border-gray-600/50',
      };
    default:
      return {
        label: state,
        description: 'Unknown state',
        color: 'text-gray-400',
        bgColor: 'bg-gray-800/30',
        borderColor: 'border-gray-600/50',
      };
  }
}

/**
 * Format bytes as human-readable.
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format a UUID for display.
 */
export function formatId(id: string): string {
  if (!id || id.length < 8) return id;
  return id.slice(0, 8) + '...' + id.slice(-8);
}

/**
 * Format a date for display.
 */
export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return dateString;
  }
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Highlight a predicate result.
 */
export function getPredicateColor(result: 'PASS' | 'FAIL' | 'UNRESOLVED'): string {
  switch (result) {
    case 'PASS':
      return 'text-green-400';
    case 'FAIL':
      return 'text-red-400';
    case 'UNRESOLVED':
      return 'text-orange-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Check if predicate passed.
 */
export function isPredicatePass(result: 'PASS' | 'FAIL' | 'UNRESOLVED'): boolean {
  return result === 'PASS';
}
