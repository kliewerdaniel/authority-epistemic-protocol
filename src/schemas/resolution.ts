import { z } from 'zod';
import { EpistemicStateSchema } from './types';

// Authority Resolution Schema
export const ApplicableAuthoritySchema = z.object({
  artifact: z.record(z.string(), z.any()),
  precedence_class: z.number(),
  enforcement_weight: z.number(),
  scope_match: z.boolean(),
  temporal_valid: z.boolean(),
});

export type ApplicableAuthority = z.infer<typeof ApplicableAuthoritySchema>;

export const AuthorityResolutionSchema = z.object({
  claim_id: z.string().uuid(),
  applicable_authorities: z.array(ApplicableAuthoritySchema),
  inapplicable_authorities: z.array(z.object({
    artifact: z.record(z.string(), z.any()),
    reason: z.string(),
  })),
  conflicts: z.array(z.object({
    authorities: z.array(z.string()),
    conflict_type: z.string(),
    resolution: z.string(),
  })),
  selected_authority: z.string().uuid().optional(),
  resolution_reason: z.string(),
  deterministic_rules_applied: z.array(z.string()),
});

export type AuthorityResolution = z.infer<typeof AuthorityResolutionSchema>;

// Verification Predicate Schema
export const VerificationPredicateSchema = z.object({
  name: z.string(),
  description: z.string(),
  result: z.enum(['PASS', 'FAIL', 'UNRESOLVED']),
  details: z.record(z.string(), z.any()).optional(),
  timestamp: z.string().datetime(),
});

export type VerificationPredicate = z.infer<typeof VerificationPredicateSchema>;

// Verification Result Schema
export const VerificationResultSchema = z.object({
  claim_id: z.string().uuid(),
  state: EpistemicStateSchema,
  predicates: z.array(VerificationPredicateSchema),
  passed_predicates: z.array(z.string()),
  failed_predicates: z.array(z.string()),
  unresolved_predicates: z.array(z.string()),
  contradictions: z.array(z.object({
    evidence_id: z.string().uuid(),
    claim_id: z.string().uuid(),
    type: z.string(),
    excerpt: z.string(),
  })),
  authority_basis: z.array(z.string()),
  evidence_basis: z.array(z.string()),
  timestamp: z.string().datetime(),
  rule_version: z.string(),
  audit_events: z.array(z.record(z.string(), z.any())),
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;

// Bounded Assertion Schema
export const BoundedAssertionSchema = z.object({
  claim: z.record(z.string(), z.any()),
  scope: z.array(z.string()),
  jurisdiction: z.string(),
  temporal_boundary: z.object({
    valid_from: z.string().datetime().optional(),
    valid_until: z.string().datetime().optional(),
  }),
  evidence_requirements: z.array(z.string()),
  authority_requirements: z.array(z.string()),
  verification_policy: z.string(),
});

export type BoundedAssertion = z.infer<typeof BoundedAssertionSchema>;

// Audit Event Schema
export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  actor: z.string(),
  operation: z.string(),
  input_hashes: z.array(z.string()),
  output_hash: z.string(),
  rule_version: z.string(),
  result: z.string(),
  previous_event_hash: z.string().optional(),
  event_hash: z.string(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

// Epistemic Artifact Schema
export const EpistemicArtifactSchema = z.object({
  artifact_version: z.string(),
  generated_at: z.string().datetime(),
  claim: z.record(z.string(), z.any()),
  authority_resolution: z.record(z.string(), z.any()),
  evidence_summary: z.array(z.record(z.string(), z.any())),
  verification_result: z.record(z.string(), z.any()),
  bounded_assertion: z.record(z.string(), z.any()),
  audit_trail: z.array(z.record(z.string(), z.any())),
  provenance: z.array(z.string()),
  hash: z.string(),
});

export type EpistemicArtifact = z.infer<typeof EpistemicArtifactSchema>;
