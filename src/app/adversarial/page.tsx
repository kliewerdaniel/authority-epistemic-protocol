'use client';

import { useState, useMemo } from 'react';
import { Claim } from '@/schemas/models';
import { AuthorityArtifact } from '@/schemas/authority';
import { Evidence } from '@/schemas/models';
import { AuthorityResolution } from '@/schemas/resolution';
import { VerificationResult } from '@/schemas/resolution';
import { EpistemicArtifact } from '@/schemas/resolution';
import { verifyClaim } from '@/lib/verification/engine';
import { resolveAuthority } from '@/lib/evidence/authority-resolution';
import { createEpistemicArtifact, createBoundedAssertion } from '@/lib/epistemic/artifact';
import { appendAuditEvent } from '@/lib/audit/ledger';
import { getStateMetadata } from '@/lib/ui/utils';
import {
  DEMO_CLAIMS,
  DEMO_AUTHORITY_ARTIFACTS,
  DEMO_EVIDENCE,
} from '@/data';

interface Mutation {
  id: string;
  name: string;
  description: string;
}

const MUTATIONS: Mutation[] = [
  { id: 'tamper-hash', name: 'Tamper Authority Hash', description: 'Modify the authority artifact hash to simulate tampering' },
  { id: 'expire-evidence', name: 'Expire Evidence', description: 'Set evidence validUntil to a past date' },
  { id: 'add-contradiction', name: 'Add Contradictory Evidence', description: 'Add evidence that contradicts the claim' },
  { id: 'change-scope', name: 'Change Authority Scope', description: 'Modify authority scope to be out of scope' },
  { id: 'reverse-precedence', name: 'Reverse Precedence', description: 'Swap precedence class values between authorities' },
  { id: 'remove-provenance', name: 'Remove Provenance', description: 'Remove issuer information from authority' },
  { id: 'modify-timestamp', name: 'Modify Timestamp', description: 'Set authority timestamp to future date' },
];

export default function Adversarial() {
  const [selectedClaimId, setSelectedClaimId] = useState<string>(DEMO_CLAIMS[0].id);
  const [appliedMutations, setAppliedMutations] = useState<string[]>([]);
  const [beforeResult, setBeforeResult] = useState<VerificationResult | null>(null);
  const [afterResult, setAfterResult] = useState<VerificationResult | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [artifact, setArtifact] = useState<EpistemicArtifact | null>(null);

  const selectedClaim = useMemo(() => 
    DEMO_CLAIMS.find(c => c.id === selectedClaimId),
    [selectedClaimId]
  );

  // Create mutated data based on applied mutations
  const mutatedAuthorities = useMemo(() => {
    return DEMO_AUTHORITY_ARTIFACTS.map(auth => {
      let mutated = { ...auth };
      
      if (appliedMutations.includes('tamper-hash') && auth.authority_id === DEMO_AUTHORITY_ARTIFACTS[0].authority_id) {
        mutated = { ...mutated, hash: 'TAMPERED-HASH-VALUE' };
      }
      if (appliedMutations.includes('change-scope') && auth.authority_id === DEMO_AUTHORITY_ARTIFACTS[0].authority_id) {
        mutated = { ...mutated, scope: ['unrelated-scope'] };
      }
      if (appliedMutations.includes('reverse-precedence')) {
        if (auth.authority_id === DEMO_AUTHORITY_ARTIFACTS[0].authority_id) {
          mutated = { ...mutated, precedence_class: 30 };
        } else if (auth.authority_id === DEMO_AUTHORITY_ARTIFACTS[1].authority_id) {
          mutated = { ...mutated, precedence_class: 80 };
        }
      }
      if (appliedMutations.includes('remove-provenance') && auth.authority_id === DEMO_AUTHORITY_ARTIFACTS[0].authority_id) {
        mutated = { ...mutated, issuer: 'did:web:unknown' };
      }
      if (appliedMutations.includes('modify-timestamp') && auth.authority_id === DEMO_AUTHORITY_ARTIFACTS[0].authority_id) {
        mutated = { ...mutated, timestamp: '2027-01-01T00:00:00Z' };
      }
      
      return mutated;
    });
  }, [appliedMutations]);

  const mutatedEvidence = useMemo(() => {
    return DEMO_EVIDENCE.map(ev => {
      let mutated = { ...ev };
      
      if (appliedMutations.includes('expire-evidence') && ev.claimId === selectedClaimId) {
        mutated = { ...mutated, validUntil: '2020-01-01T00:00:00Z' };
      }
      
      return mutated;
    });
  }, [appliedMutations, selectedClaimId]);

  const baseAuthorities = useMemo(() =>
    DEMO_AUTHORITY_ARTIFACTS.filter(a => a.context === selectedClaim?.subject),
    [selectedClaimId]
  );

  const baseEvidence = useMemo(() =>
    DEMO_EVIDENCE.filter(e => e.claimId === selectedClaimId),
    [selectedClaimId]
  );

  const baseResolution = useMemo(() =>
    resolveAuthority(selectedClaim!, baseAuthorities, {
      currentTime: new Date('2026-01-01'),
    }),
    [selectedClaim, baseAuthorities]
  );

  const mutatedResolution = useMemo(() =>
    resolveAuthority(selectedClaim!, mutatedAuthorities, {
      currentTime: new Date('2026-01-01'),
    }),
    [selectedClaim, mutatedAuthorities]
  );

  const baseVerification = useMemo(() =>
    verifyClaim(selectedClaim!, baseResolution, baseEvidence, {
      temporalContext: new Date('2026-01-01'),
    }),
    [selectedClaim, baseResolution, baseEvidence]
  );

  const mutatedVerification = useMemo(() =>
    verifyClaim(selectedClaim!, mutatedResolution, mutatedEvidence, {
      temporalContext: new Date('2026-01-01'),
    }),
    [selectedClaim, mutatedResolution, mutatedEvidence]
  );

  const handleReset = () => {
    setAppliedMutations([]);
    setBeforeResult(null);
    setAfterResult(null);
    setShowDiff(false);
    setArtifact(null);
  };

  const handleApplyMutation = (mutationId: string) => {
    if (!appliedMutations.includes(mutationId)) {
      setAppliedMutations(prev => [...prev, mutationId]);
      setBeforeResult(baseVerification);
      setAfterResult(mutatedVerification);
      setShowDiff(true);
    }
  };

  const hasChanged = beforeResult && afterResult && beforeResult.state !== afterResult.state;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center font-bold text-white">
                AEP
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-100">Adversarial Mode</h1>
                <p className="text-xs text-slate-500">Test deterministic verification against mutations</p>
              </div>
            </div>
            {appliedMutations.length > 0 && (
              <span className="px-3 py-1 bg-orange-900/30 text-orange-400 rounded-full text-xs font-mono">
                {appliedMutations.length} mutation(s) active
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Controls */}
        <div className="mb-6 flex flex-wrap gap-4">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-medium text-sm transition-colors"
          >
            Reset All Mutations
          </button>
          <button
            onClick={() => {
              const artifactResult = createEpistemicArtifact(
                selectedClaim!,
                mutatedResolution,
                mutatedEvidence,
                mutatedVerification,
                createBoundedAssertion(
                  selectedClaim!,
                  mutatedVerification,
                  mutatedAuthorities.map(a => a.scope.join(', ')),
                  mutatedAuthorities[0]?.jurisdiction || 'unknown',
                  {}
                )
              );
              setArtifact(artifactResult);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors"
          >
            Generate Artifact (After)
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Mutations */}
          <div className="space-y-4">
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-4">
              <h2 className="text-sm font-semibold text-slate-200 mb-4">Available Mutations</h2>
              <div className="grid grid-cols-1 gap-2">
                {MUTATIONS.map(mutation => {
                  const isApplied = appliedMutations.includes(mutation.id);
                  return (
                    <button
                      key={mutation.id}
                      onClick={() => handleApplyMutation(mutation.id)}
                      disabled={isApplied}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        isApplied
                          ? 'border-red-500/50 bg-red-900/20 opacity-60'
                          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-mono text-slate-200">{mutation.name}</span>
                        {isApplied && (
                          <span className="px-2 py-0.5 bg-red-900/30 text-red-400 rounded text-xs font-mono">
                            APPLIED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{mutation.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Diff view */}
          <div className="space-y-4">
            {/* Before/After comparison */}
            {showDiff && beforeResult && afterResult && (
              <div className="grid grid-cols-2 gap-4">
                {/* BEFORE */}
                <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-4">
                  <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">BEFORE</h3>
                  <div className="mb-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-mono ${
                      getStateMetadata(beforeResult.state).bgColor
                    } ${getStateMetadata(beforeResult.state).color} border ${getStateMetadata(beforeResult.state).borderColor}`}>
                      {beforeResult.state}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    <p>Passed: <span className="text-green-400">{beforeResult.passed_predicates.length}</span></p>
                    <p>Failed: <span className="text-red-400">{beforeResult.failed_predicates.length}</span></p>
                    <p>Unresolved: <span className="text-orange-400">{beforeResult.unresolved_predicates.length}</span></p>
                  </div>
                  <div className="mt-3 p-2 rounded bg-slate-800/30">
                    <p className="text-xs text-slate-500 mb-1">Predicates:</p>
                    {beforeResult.predicates.length === 0 ? (
                      <p className="text-xs text-slate-600">No predicates evaluated</p>
                    ) : (
                      <div className="space-y-1">
                        {beforeResult.predicates.map(p => (
                          <div key={p.name} className="flex justify-between text-xs">
                            <span className="text-slate-400">{p.name}</span>
                            <span className={`font-mono ${
                              p.result === 'PASS' ? 'text-green-400' : p.result === 'FAIL' ? 'text-red-400' : 'text-orange-400'
                            }`}>
                              {p.result}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* AFTER */}
                <div className={`rounded-lg border p-4 ${hasChanged ? 'border-yellow-500' : 'border-slate-800'}`}>
                  <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">AFTER</h3>
                  <div className="mb-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-mono ${
                      hasChanged ? 'bg-yellow-900/30 text-yellow-400 border-yellow-500' : ''
                    } ${getStateMetadata(afterResult.state).bgColor} ${
                      getStateMetadata(afterResult.state).color
                    } border ${getStateMetadata(afterResult.state).borderColor}`}>
                      {afterResult.state}
                      {hasChanged && ' (CHANGED)'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    <p>Passed: <span className="text-green-400">{afterResult.passed_predicates.length}</span></p>
                    <p>Failed: <span className="text-red-400">{afterResult.failed_predicates.length}</span></p>
                    <p>Unresolved: <span className="text-orange-400">{afterResult.unresolved_predicates.length}</span></p>
                  </div>
                  <div className="mt-3 p-2 rounded bg-slate-800/30">
                    <p className="text-xs text-slate-500 mb-1">Predicates:</p>
                    {afterResult.predicates.map(p => {
                      const beforePredicate = beforeResult.predicates.find(bp => bp.name === p.name);
                      const changed = beforePredicate && beforePredicate.result !== p.result;
                      return (
                        <div key={p.name} className="flex justify-between text-xs">
                          <span className="text-slate-400">
                            {p.name}
                            {changed && <span className="text-yellow-400 ml-1">(CHANGED)</span>}
                          </span>
                          <span className={`font-mono ${
                            p.result === 'PASS' ? 'text-green-400' : p.result === 'FAIL' ? 'text-red-400' : 'text-orange-400'
                          }`}>
                            {p.result}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Artifact */}
            {artifact && (
              <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">Generated Epistemic Artifact</h3>
                <div className="p-3 rounded bg-slate-800/50 border border-slate-700 font-mono text-xs text-slate-400 break-all">
                  {artifact.hash}
                </div>
              </div>
            )}

            {/* Instructions */}
            {!showDiff && (
              <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-4">
                <h3 className="text-sm font-semibold text-slate-400 mb-2">How to Use</h3>
                <p className="text-xs text-slate-500">
                  Click on mutations to apply them and see how the verification state changes.
                  Each mutation simulates an attack or manipulation that the protocol should detect.
                  The BEFORE and AFTER panels will show the verification state and predicate results.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
