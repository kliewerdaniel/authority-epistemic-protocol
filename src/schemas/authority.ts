import { z } from 'zod';
import { DidIdentifierSchema, TimestampSchema, OptionalTimestampSchema } from './types';

// Authority Artifact Schema
export const AuthorityArtifactSchema = z.object({
  specification: z.string().default('authority-epistemic-protocol/v1'),
  authority_id: z.string().uuid(),
  context: z.string(),
  issuer: DidIdentifierSchema,
  jurisdiction: z.string(),
  scope: z.array(z.string()),
  precedence_class: z.number().int().min(0).max(100).default(50),
  enforcement_weight: z.number().int().min(0).max(100).default(50),
  timestamp: TimestampSchema,
  version: z.string(),
  hash: z.string().optional(),
  signature: z.string().optional(),
  justification_reference: z.string().optional(),
  revocation_policy: z.string().optional(),
  validFrom: OptionalTimestampSchema.default(null),
  validUntil: OptionalTimestampSchema.default(null),
  supersededBy: z.string().uuid().optional(),
});

export type AuthorityArtifact = z.infer<typeof AuthorityArtifactSchema>;

// Validation result for an authority artifact
export interface AuthorityValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  isExpired: boolean;
  isSuperseded: boolean;
  isOutScope: boolean;
}

// Canonical form for hashing (excludes hash and signature fields)
export interface CanonicalArtifact {
  specification: string;
  authority_id: string;
  context: string;
  issuer: string;
  jurisdiction: string;
  scope: string[];
  precedence_class: number;
  enforcement_weight: number;
  timestamp: string;
  version: string;
  justification_reference?: string;
  revocation_policy?: string;
  validFrom?: string | null;
  validUntil?: string | null;
  supersededBy?: string;
}
