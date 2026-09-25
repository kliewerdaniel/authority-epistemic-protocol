'use client';

import { useState, useMemo } from 'react';
import { Claim } from '@/schemas/models';
import { AuthorityArtifact } from '@/schemas/authority';
import { Evidence } from '@/schemas/models';
import { VerificationResult } from '@/schemas/resolution';
import { verifyClaim } from '@/lib/verification/engine';
import { resolveAuthority } from '@/lib/evidence/authority-resolution';
import { getStateMetadata } from '@/lib/ui/utils';
import {
  DEMO_CLAIMS,
  DEMO_AUTHORITY_ARTIFACTS,
  DEMO_EVIDENCE,
} from '@/data';

type Mode = 'authority-only' | 'full';

export default function Experiment() {
  const [mode, setMode] = useState<Mode>('authority-only');
  const [selectedClaimId, setSelectedClaimId] = useState<string>(DEMO_CLAIMS[0].id);

  const selectedClaim = useMemo(() => 
    DEMO_CLAIMS.find(c => c.id === selectedClaimId),
    [selectedClaimId]
  );

  const claimAuthorities = useMemo(() =>
    DEMO_AUTHORITY_ARTIFACTS.filter(a => a.context === selectedClaim?.subject),
    [selectedClaimId]
  );

  const evidenceToUse = useMemo(() =>
    mode === 'full' ? DEMO_EVIDENCE.filter(e => e.claimId === selectedClaimId) : [],
    [mode, selectedClaimId]
  );

  const authorityResolution = useMemo(() =>
    resolveAuthority(selectedClaim!, claimAuthorities, {
      currentTime: new Date('2026-01-01'),
    }),
    [selectedClaim, claimAuthorities]
  );

  const verificationResult = useMemo(() => {
    if (mode === 'authority-only') {
      return {
        state: authorityResolution.applicable_authorities.length > 0 ? 'SUPPORTED' as const : 'UNVERIFIED' as const,
        predicates: [],
        passed_predicates: [],
        failed_predicates: [],
        unresolved_predicates: [],
        contradictions: [],
        authority_basis: authorityResolution.applicable_authorities.map(a => (a.artifact as { authority_id?: string }).authority_id),
        evidence_basis: [],
        timestamp: new Date().toISOString(),
        rule_version: '1.0.0',
        audit_events: [],
        claim_id: selectedClaim!.id,
      } as VerificationResult;
    }
    return verifyClaim(selectedClaim!, authorityResolution, evidenceToUse, {
      temporalContext: new Date('2026-01-01'),
    });
  }, [selectedClaim, authorityResolution, evidenceToUse, mode]);

  const stateMetadata = getStateMetadata(verificationResult.state);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white">
                AEP
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-100">Experiment Mode</h1>
                <p className="text-xs text-slate-500">Authority vs Authority+Evidence</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Mode selector */}
        <div className="mb-8 p-6 rounded-lg border border-slate-800 bg-slate-900/50">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Verification Mode</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode('authority-only')}
              className={`p-4 rounded-lg border text-left transition-colors ${
                mode === 'authority-only'
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <h3 className="text-sm font-semibold text-blue-400 mb-2">MODE A: Authority Only</h3>
              <p className="text-xs text-slate-400">
                Shows only authority declaration status. Claims are evaluated solely on whether valid authority artifacts exist for the resource.
              </p>
            </button>
            <button
              onClick={() => setMode('full')}
              className={`p-4 rounded-lg border text-left transition-colors ${
                mode === 'full'
                  ? 'border-green-500 bg-green-900/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <h3 className="text-sm font-semibold text-green-400 mb-2">MODE B: Authority + Evidence + Verification</h3>
              <p className="text-xs text-slate-400">
                Full deterministic verification pipeline including evidence evaluation, predicate checking, and epistemic state determination.
              </p>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Claim info */}
          <div className="space-y-6">
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-4">
              <h2 className="text-sm font-semibold text-slate-200 mb-3">Selected Claim</h2>
              {selectedClaim ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-slate-500">Statement</label>
                    <p className="text-sm text-slate-300">{selectedClaim.statement}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400">
                    <span>Subject: {selectedClaim.subject}</span>
                    <span>Predicate: {selectedClaim.predicate}</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500">No claim selected</p>
              )}
            </div>

            {/* Authority artifacts */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-4">
              <h2 className="text-sm font-semibold text-slate-200 mb-3">Authority Artifacts</h2>
              <div className="space-y-2">
                {claimAuthorities.map(auth => (
                  <div key={auth.authority_id} className="p-3 rounded bg-slate-800/20 border border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-purple-400">{auth.issuer}</span>
                      <span className={`px-2 py-0.5 text-xs rounded font-mono ${
                        new Date(auth.timestamp) < new Date() 
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {new Date(auth.timestamp) < new Date() ? 'VALID' : 'FUTURE'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Scope: {auth.scope.join(', ')}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="space-y-6">
            {/* Result */}
            <div className={`rounded-lg border p-6 ${stateMetadata.bgColor} ${stateMetadata.borderColor}`}>
              <div className="text-center mb-4">
                <span className={`text-3xl font-bold font-mono ${stateMetadata.color}`}>
                  {verificationResult.state}
                </span>
              </div>
              
              <div className="text-sm text-slate-300 mb-4">
                {mode === 'authority-only' ? (
                  <>
                    <p className="mb-2">
                      <strong>Authority-Only Evaluation:</strong>
                    </p>
                    <p className="text-slate-400">
                      {authorityResolution.applicable_authorities.length > 0 
                        ? 'Valid authority artifacts detected for this resource. Authority is declared.'
                        : 'No applicable authority artifacts found.'}
                    </p>
                    <div className="mt-3 p-3 rounded bg-slate-800/50 border border-slate-700">
                      <p className="text-xs text-slate-500">Note: Authority declaration does not establish truth. 
                      This mode answers "Who claims authority?" not "What is verified?"</p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mb-2">
                      <strong>Full Verification Evaluation:</strong>
                    </p>
                    <p className="text-slate-400">
                      {verificationResult.state === 'INCONCLUSIVE' 
                        ? 'Authority declaration is valid, but proposition remains INCONCLUSIVE because evidence requirements are unresolved.'
                        : verificationResult.state === 'UNVERIFIED'
                          ? 'No sufficient verified evidence to establish the proposition.'
                          : 'Verification predicates have been evaluated against authority, evidence, and temporal constraints.'
                      }
                    </p>
                    {verificationResult.predicates.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase">Predicate Results</h4>
                        {verificationResult.predicates.map(pred => (
                          <div key={pred.name} className="flex items-center justify-between p-2 rounded bg-slate-800/30">
                            <span className="text-xs font-mono text-slate-300">{pred.name}</span>
                            <span className={`px-2 py-0.5 text-xs rounded font-mono ${
                              pred.result === 'PASS' ? 'bg-green-900/30 text-green-400' :
                              pred.result === 'FAIL' ? 'bg-red-900/30 text-red-400' :
                              'bg-orange-900/30 text-orange-400'
                            }`}>
                              {pred.result}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-4 text-xs text-slate-500">
                <p className="mb-1">
                  Authority artifacts: {authorityResolution.applicable_authorities.length} applicable, {authorityResolution.inapplicable_authorities.length} excluded
                </p>
                {mode === 'full' && (
                  <p>
                    Evidence pieces: {evidenceToUse.length} total
                  </p>
                )}
              </div>
            </div>

            {/* Comparison note */}
            {mode === 'full' && authorityResolution.applicable_authorities.length > 0 && (
              <div className="p-4 rounded-lg border border-yellow-800/50 bg-yellow-900/10">
                <h3 className="text-sm font-semibold text-yellow-400 mb-2">Key Observation</h3>
                <p className="text-xs text-yellow-300/80">
                  In Mode A (authority-only), this would show as "Authority declared" based on the valid authority artifact.
                  In Mode B (full verification), the system evaluates evidence predicates and determines the proposition cannot be fully verified, 
                  demonstrating that <strong>authority ≠ truth</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
