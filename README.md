# Authority-Epistemic Protocol

**A deterministic reference architecture for connecting machine-readable authority artifacts to inspectable epistemic state.**

---

## Why this exists

AI systems increasingly encounter claims, authority declarations, provenance metadata, cryptographic identity, conflicting sources, and temporal information. 

Existing authority infrastructure can make authority claims machine-readable. The complementary problem is: **how does a machine represent the resulting epistemic state of a claim after authority, provenance, evidence, temporal validity, contradiction, and verification have been evaluated?**

This repository builds the intersection.

---

## The problem

When an AI system encounters a claim, it faces questions that authority infrastructure alone cannot answer:

1. **Authority**: "Who or what has declared authority over this resource or proposition?"
2. **Evidence**: "What evidence exists for the proposition?"
3. **Verification**: "Do the supplied deterministic rules establish the required conditions?"
4. **Epistemic state**: "What state should the system assign to the proposition based on the available verified evidence?"

Authority infrastructure answers question 1. It cannot answer questions 2-4.

This protocol builds the bridge.

---

## Authority is not truth

The fundamental design principle:

> **DO NOT TRUST THE MODEL. TRUST THE EXECUTION PROTOCOL.**

An authority artifact can establish: *"This issuer declares this resource to have this authority within this scope."*

It cannot automatically establish: *"The proposition contained in this resource is true."*

Therefore, this repository implements separate evaluation pipelines:

- **Authority resolution** answers "Who has declared authority?"
- **Evidence resolution** answers "What evidence exists?"
- **Verification** answers "Do deterministic rules establish the required conditions?"
- **Epistemic evaluation** answers "What state should be assigned?"

An authentic authority artifact can still contain a false assertion. Identity integrity ≠ claim truth.

---

## Architecture

```
Publisher
  → Authority Artifact
  → Claim
  → Evidence Graph
  → Authority Resolution
  → Deterministic Verification
  → Epistemic State
  → Audit Event
  → Epistemic Artifact
```

### Directory structure

```
/
  app/                    # Next.js App Router pages
  components/             # React components
  lib/
    authority/            # Authority validation and temporal logic
    epistemic/            # Epistemic artifact creation
    evidence/             # Evidence validation and authority resolution
    verification/         # Deterministic verification engine
    canonicalization/     # Artifact canonicalization and hashing
    audit/                # Append-only audit ledger
    graph/                # Knowledge graph representation
  data/                   # Demo fixtures (JSON/TypeScript)
  schemas/                # Zod schemas for runtime validation
  tests/                  # Vitest test suite
  docs/                   # Documentation
  README.md
  package.json
  tsconfig.json
  next.config.ts
  vercel.json
```

---

## Data model

### Authority Artifact

A machine-readable declaration of authority, inspired by publicly described machine-readable authority concepts. **This is an independent experimental implementation. It is not affiliated with or an official extension of any existing authority standard.**

Fields: `specification`, `authority_id`, `context`, `issuer`, `jurisdiction`, `scope`, `precedence_class`, `enforcement_weight`, `timestamp`, `version`, `hash`, `signature`, `justification_reference`, `revocation_policy`, `validFrom`, `validUntil`, `supersededBy`.

### Claim

A proposition that can be evaluated: `id`, `subject`, `predicate`, `object`, `statement`, `sourceReferences`, `authorityReferences`, `createdAt`, `validFrom`, `validUntil`, `supersededBy`, `status`.

### Evidence

Evidence for or against a claim: `id`, `type`, `source`, `claimId`, `excerpt`, `retrievedAt`, `publishedAt`, `validFrom`, `validUntil`, `hash`, `relationship` (SUPPORTS/CONTRADICTS/QUALIFIES/SUPERSEDES/DERIVES_FROM).

### Epistemic States

```
VERIFIED        - All required verification predicates pass, no unresolved contradiction
SUPPORTED       - Evidence supports the proposition, but complete verification requirements not satisfied
CONTRADICTED    - Verified evidence directly contradicts the proposition
INCONCLUSIVE    - Evidence exists but cannot deterministically resolve the proposition
STALE           - Previously valid but temporal window has expired or been superseded
UNVERIFIED      - Insufficient verified evidence to establish any stronger state
```

**No numerical "truth score." No confidence percentage. The system prefers INCONCLUSIVE over unsupported certainty.**

---

## Deterministic Verification

The core of the epistemic engine. The `verifyClaim` function accepts:

- `claim`
- `authorityResolution`
- `evidence`
- `temporalContext`
- `verificationPolicy`

Returns `VerificationResult` containing:

- `claimId`
- `state` (epistemic state)
- `predicates[]` (each independently inspectable)
- `passed_predicates[]`
- `failed_predicates[]`
- `unresolved_predicates[]`
- `contradictions[]`
- `authority_basis[]`
- `evidence_basis[]`
- `timestamp`
- `rule_version`
- `audit_events[]`

Example predicates:

- `AUTHORITY_ARTIFACT_VALID` - At least one valid, non-expired authority artifact exists
- `AUTHORITY_SCOPE_MATCHES` - Authority scope matches the claim's subject
- `EVIDENCE_EXISTS` - Evidence exists for the claim
- `EVIDENCE_TEMPORALLY_VALID` - At least one piece of evidence is temporally valid
- `EVIDENCE_HASH_VALID` - Evidence hashes are valid
- `NO_CONTRADICTORY_EVIDENCE` - No verified contradictory evidence exists

**The LLM, if used at all, may propose interpretations. It must never determine verification state. Verification must be deterministic and executable without an LLM.**

---

## Bounded Assertions

A bounded assertion defines the scope under which a claim is verified:

- `claim`
- `scope`
- `jurisdiction`
- `temporalBoundary`
- `evidenceRequirements`
- `authorityRequirements`
- `verificationPolicy`

**"Source A is authoritative" must not become "Everything Source A says is true."** 
Instead: "Source A satisfies authority predicate P for resource R within scope S during interval T."

---

## Audit Chain

Append-only in-memory audit ledger with hash chaining. Each event:

- `id`
- `timestamp`
- `actor`
- `operation`
- `inputHashes[]`
- `outputHash`
- `ruleVersion`
- `result`
- `previousEventHash`
- `eventHash`

The UI includes a "VERIFY AUDIT CHAIN" button that deterministically verifies every link.

---

## Epistemic Artifact

The final compiled machine-readable object containing:

- `artifactVersion`
- `generatedAt`
- `claim`
- `authorityResolution`
- `evidenceSummary[]`
- `verificationResult`
- `boundedAssertion`
- `auditTrail[]`
- `provenance[]`
- `hash`

Available for download as JSON. Also viewable in canonical JSON form in the UI.

---

## Demonstration Scenario

The demo uses fictional entities:

- **Publisher Alpha** - Authority for "technical documentation" scope
- **Publisher Beta** - Authority for "historical archive" scope

The scenario includes:
- Valid authority (Alpha)
- Valid authority (Beta)
- Expired authority
- Tampered hash authority
- Out-of-scope authority
- Supporting evidence
- Contradictory evidence
- Expired evidence
- Superseded evidence

The final state is **INCONCLUSIVE** - demonstrating that a rigorous epistemic system knows when it cannot establish an answer.

---

## Threat Model

Documented attacks:

- Authority spoofing
- Hash tampering
- Scope escalation
- Temporal replay
- Stale evidence
- Authority inversion
- Evidence laundering
- Conflicting authorities
- Provenance truncation
- Model-generated unsupported claims
- Overgeneralization of verified claims

**Cryptographic integrity does not establish semantic truth.**

---

## Relationship to machine-mediated authority research

This repository is an **independent experimental implementation**. It is inspired by publicly described concepts of machine-readable authority artifacts, authority graphs, provenance, precedence, and auditability. It is **not affiliated with** and **does not claim to implement** any official authority standard such as Lex Wire.

---

## Relationship to epistemic engines

The epistemic-engine work approaches the complementary problem: representing the epistemic state of a claim after authority, provenance, evidence, temporal validity, contradiction, and verification have been evaluated.

---

## Running locally

```bash
npm install
npm run dev
```

No environment variables required. No database. No API key. No paid service.

Open http://localhost:3000

---

## Testing

```bash
npm test
```

77 tests covering:
- Authority schema tests
- Canonicalization tests
- Hash tests
- Tamper tests
- Scope tests
- Temporal tests
- Precedence tests
- Evidence tests
- Contradiction tests
- Bounded assertion tests
- Audit-chain tests
- Epistemic-state tests
- Serialization tests
- End-to-end tests

---

## Pages

- **/** - Interactive dashboard showing the full verification pipeline
- **/experiment** - Compare authority-only vs full verification modes
- **/adversarial** - Apply mutations and observe deterministic state changes

---

## Deployment

```bash
npm run build
vercel --prod
```

Or push to GitHub and connect to Vercel.

---

## License

MIT
