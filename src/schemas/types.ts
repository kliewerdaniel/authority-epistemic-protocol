import { z } from 'zod';

// Epistemic States
export const EpistemicStateSchema = z.enum([
  'VERIFIED',
  'SUPPORTED',
  'CONTRADICTED',
  'INCONCLUSIVE',
  'STALE',
  'UNVERIFIED',
]);

export type EpistemicState = z.infer<typeof EpistemicStateSchema>;

// Evidence Relationships
export const EvidenceRelationshipSchema = z.enum([
  'SUPPORTS',
  'CONTRADICTS',
  'QUALIFIES',
  'SUPERSEDES',
  'DERIVES_FROM',
]);

export type EvidenceRelationship = z.infer<typeof EvidenceRelationshipSchema>;

// Graph Node Types
export const GraphNodeTypeSchema = z.enum([
  'CLAIM',
  'EVIDENCE',
  'AUTHORITY',
  'SOURCE',
  'IDENTITY',
  'ARTIFACT',
]);

export type GraphNodeType = z.infer<typeof GraphNodeTypeSchema>;

// Graph Edge Types
export const GraphEdgeTypeSchema = z.enum([
  'ASSERTS',
  'SUPPORTS',
  'CONTRADICTS',
  'AUTHORIZES',
  'SUPERSEDES',
  'DERIVES_FROM',
  'SCOPED_TO',
  'ISSUED_BY',
]);

export type GraphEdgeType = z.infer<typeof GraphEdgeTypeSchema>;

// Predicate Result
export const PredicateResultSchema = z.enum(['PASS', 'FAIL', 'UNRESOLVED']);

export type PredicateResult = z.infer<typeof PredicateResultSchema>;

// DID-like identifier format
export const DidIdentifierSchema = z.string().regex(/^did:[a-z0-9]+:[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=]+$/);

export type DidIdentifier = z.infer<typeof DidIdentifierSchema>;

// Timestamp
export const TimestampSchema = z.string().datetime();

export type Timestamp = z.infer<typeof TimestampSchema>;

// Optional timestamp (can be null or valid timestamp)
export const OptionalTimestampSchema = z.union([z.string().datetime(), z.null()]);

export type OptionalTimestamp = z.infer<typeof OptionalTimestampSchema>;
