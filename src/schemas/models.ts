import { z } from 'zod';
import { DidIdentifierSchema, TimestampSchema, OptionalTimestampSchema, EvidenceRelationshipSchema } from './types';

// Claim Schema
export const ClaimSchema = z.object({
  id: z.string().uuid(),
  subject: z.string(),
  predicate: z.string(),
  object: z.string(),
  statement: z.string(),
  sourceReferences: z.array(z.string()).default([]),
  authorityReferences: z.array(z.string()).default([]),
  createdAt: TimestampSchema,
  validFrom: OptionalTimestampSchema.default(null),
  validUntil: OptionalTimestampSchema.default(null),
  supersededBy: z.string().uuid().optional(),
  status: z.string().default('DRAFT'),
});

export type Claim = z.infer<typeof ClaimSchema>;

// Evidence Schema
export const EvidenceSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  source: z.string(),
  claimId: z.string().uuid(),
  excerpt: z.string(),
  retrievedAt: OptionalTimestampSchema.default(null),
  publishedAt: OptionalTimestampSchema.default(null),
  validFrom: OptionalTimestampSchema.default(null),
  validUntil: OptionalTimestampSchema.default(null),
  hash: z.string().optional(),
  relationship: EvidenceRelationshipSchema.default('SUPPORTS'),
  supersededBy: z.string().uuid().optional(),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

// Evidence validation result
export interface EvidenceValidationResult {
  valid: boolean;
  errors: string[];
  isExpired: boolean;
  isSuperseded: boolean;
}
