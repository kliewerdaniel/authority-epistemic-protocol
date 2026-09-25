'use client';

import { useState, useMemo } from 'react';
import { Claim } from '@/schemas/models';
import { AuthorityArtifact } from '@/schemas/authority';
import { Evidence } from '@/schemas/models';
import { AuthorityResolution } from '@/schemas/resolution';
import { VerificationResult } from '@/schemas/resolution';
import { EpistemicArtifact } from '@/schemas/resolution';
import { KnowledgeGraph } from '@/lib/graph';
import { verifyClaim } from '@/lib/verification/engine';
import { resolveAuthority } from '@/lib/evidence/authority-resolution';
import { buildKnowledgeGraph } from '@/lib/graph';
import { createEpistemicArtifact, createBoundedAssertion } from '@/lib/epistemic/artifact';
import { appendAuditEvent } from '@/lib/audit/ledger';
import { getStateMetadata } from '@/lib/ui/utils';
import { GraphVisualization } from '@/components/graph/GraphVisualization';
import {
  DEMO_CLAIMS,
  DEMO_AUTHORITY_ARTIFACTS,
  DEMO_EVIDENCE,
} from '@/data';

export default function Dashboard() {
  const [selectedClaimId, setSelectedClaimId] = useState<string>(DEMO_CLAIMS[0].id);
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [epistemicArtifact, setEpistemicArtifact] = useState<EpistemicArtifact | null>(null);
  const [auditEvents, setAuditEvents] = useState<Array<{ id: string; timestamp: string; operation: string; result: string; event_hash: string }>>([]);
  const [auditVerified, setAuditVerified] = useState<boolean | null>(null);

  const selectedClaim = useMemo(() => 
    DEMO_CLAIMS.find(c => c.id === selectedClaimId),
    [selectedClaimId]
  );

  const claimAuthorities = useMemo(() =>
    DEMO_AUTHORITY_ARTIFACTS.filter(a => a.context === selectedClaim?.subject),
    [selectedClaimId]
  );

  const claimEvidence = useMemo(() =>
    DEMO_EVIDENCE.filter(e => e.claimId === selectedClaimId),
    [selectedClaimId]
  );

  const authorityResolution = useMemo(() =>
    resolveAuthority(selectedClaim!, claimAuthorities, {
      currentTime: new Date('2026-01-01'), // Demo time
    }),
    [selectedClaim, claimAuthorities]
  );

  const verificationResult = useMemo(() =>
    verifyClaim(selectedClaim!, authorityResolution, claimEvidence, {
      temporalContext: new Date('2026-01-01'),
    }),
    [selectedClaim, authorityResolution, claimEvidence]
  );

  const knowledgeGraph = useMemo((): KnowledgeGraph => {
    if (!selectedClaim) return { nodes: [], edges: [] };
    
    const identities = DEMO_AUTHORITY_ARTIFACTS.map(a => ({
      did: a.issuer as string,
      name: a.issuer.split(':')[2]?.replace('.example.org', '') || 'Unknown',
    }));

    return buildKnowledgeGraph(
      [selectedClaim],
      claimEvidence,
      claimAuthorities,
      identities
    );
  }, [selectedClaim, claimEvidence, claimAuthorities]);

  const handleGenerateArtifact = async () => {
    if (!selectedClaim) return;

    // Create bounded assertion
    const boundedAssertion = createBoundedAssertion(
      selectedClaim,
      verificationResult,
      claimAuthorities.map(a => a.scope.join(', ')),
      claimAuthorities[0]?.jurisdiction || 'unknown',
      {
        valid_from: claimAuthorities[0]?.validFrom || undefined,
        valid_until: claimAuthorities[0]?.validUntil || undefined,
      }
    );

    // Create epistemic artifact
    const artifact = createEpistemicArtifact(
      selectedClaim,
      authorityResolution,
      claimEvidence,
      verificationResult,
      boundedAssertion
    );

    setEpistemicArtifact(artifact);

    // Log to audit
    const auditEvent = await appendAuditEvent({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actor: 'demo-user',
      operation: 'GENERATE_EPISTEMIC_ARTIFACT',
      input_hashes: [],
      rule_version: '1.0.0',
      result: `STATE:${verificationResult.state}`,
    });

    setAuditEvents(prev => [...prev, {
      id: auditEvent.id,
      timestamp: auditEvent.timestamp,
      operation: auditEvent.operation,
      result: auditEvent.result,
      event_hash: auditEvent.event_hash,
    }]);
  };

  const handleVerifyAudit = async () => {
    const { verifyAuditChain } = await import('@/lib/audit/ledger');
    const result = await verifyAuditChain();
    setAuditVerified(result.valid);
  };

  const stateMetadata = getStateMetadata(verificationResult.state);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white">
                AEP
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-100">Authority-Epistemic Protocol</h1>
                <p className="text-xs text-slate-500">Deterministic verification engine</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className={`px-3 py-1 rounded-full text-xs font-mono ${stateMetadata.bgColor} ${stateMetadata.color} border ${stateMetadata.borderColor}`}>
                {verificationResult.state}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Pipeline visualization */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <span className="px-2 py-1 bg-slate-800 rounded font-mono">Authority</span>
            <span className="text-slate-600">→</span>
            <span className="px-2 py-1 bg-slate-800 rounded font-mono">Evidence</span>
            <span className="text-slate-600">→</span>
            <span className="px-2 py-1 bg-slate-800 rounded font-mono">Verification</span>
            <span className="text-slate-600">→</span>
            <span className="px-2 py-1 bg-slate-800 rounded font-mono">Epistemic State</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Claim and Authorities */}
          <div className="lg:col-span-1 space-y-6">
            {/* Claim Card */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Claim
                </h2>
              </div>
              <div className="p-4">
                {selectedClaim ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Statement</label>
                      <p className="text-sm text-slate-300">{selectedClaim.statement}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Subject</label>
                        <p className="text-xs font-mono text-slate-400">{selectedClaim.subject}</p>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Predicate</label>
                        <p className="text-xs font-mono text-slate-400">{selectedClaim.predicate}</p>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Object</label>
                        <p className="text-xs font-mono text-slate-400">{selectedClaim.object}</p>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Status</label>
                        <p className="text-xs font-mono text-slate-400">{selectedClaim.status}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Claim ID</label>
                      <p className="text-xs font-mono text-slate-500 break-all">{selectedClaim.id}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No claim selected</p>
                )}
              </div>
            </div>

            {/* Authority Artifacts */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Authority Artifacts
                  <span className="ml-2 text-xs text-slate-500">({claimAuthorities.length})</span>
                </h2>
              </div>
              <div className="p-4 max-h-64 overflow-y-auto">
                {claimAuthorities.map(artifact => (
                  <div key={artifact.authority_id} className="mb-3 p-3 rounded border border-slate-800 bg-slate-800/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-purple-400">{artifact.issuer}</span>
                      <div className={`px-2 py-0.5 text-xs rounded font-mono ${
                        artifact.validUntil 
                          ? new Date(artifact.validUntil) < new Date('2026-01-01')
                            ? 'bg-red-900/30 text-red-400'
                            : 'bg-green-900/30 text-green-400'
                          : 'bg-green-900/30 text-green-400'
                      }`}>
                        {artifact.validUntil && new Date(artifact.validUntil) < new Date('2026-01-01') ? 'EXPIRED' : 'VALID'}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mb-2">
                      Scope: {artifact.scope.join(', ')}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="text-slate-500">Prec: {artifact.precedence_class}</span>
                      <span className="text-slate-500">Weight: {artifact.enforcement_weight}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: Evidence, Verification, Graph */}
          <div className="lg:col-span-2 space-y-6">
            {/* Evidence Graph */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Evidence Graph
                </h2>
              </div>
              <div className="p-4">
                <GraphVisualization
                  graph={knowledgeGraph}
                  selectedNodeId={selectedNodeId}
                  onNodeSelect={setSelectedNodeId}
                />
              </div>
            </div>

            {/* Evidence List */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Evidence
                  <span className="ml-2 text-xs text-slate-500">({claimEvidence.length})</span>
                </h2>
              </div>
              <div className="p-4 max-h-48 overflow-y-auto">
                {claimEvidence.map(evidence => (
                  <div key={evidence.id} className={`mb-2 p-3 rounded border ${
                    evidence.relationship === 'CONTRADICTS' 
                      ? 'border-red-800/50 bg-red-900/10'
                      : 'border-slate-800 bg-slate-800/20'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-slate-400">{evidence.source}</span>
                      <span className={`px-2 py-0.5 text-xs rounded font-mono ${
                        evidence.relationship === 'SUPPORTS' 
                          ? 'bg-green-900/30 text-green-400'
                          : evidence.relationship === 'CONTRADICTS'
                            ? 'bg-red-900/30 text-red-400'
                            : 'bg-yellow-900/30 text-yellow-400'
                      }`}>
                        {evidence.relationship}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mb-2 line-clamp-2">{evidence.excerpt}</p>
                    {evidence.validUntil && new Date(evidence.validUntil) < new Date('2026-01-01') && (
                      <div className="text-xs text-red-400">Expired</div>
                    )}
                  </div>
                ))}
                {claimEvidence.length === 0 && (
                  <p className="text-slate-500 text-sm">No evidence for this claim</p>
                )}
              </div>
            </div>

            {/* Verification Predicates */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  Verification Predicates
                </h2>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {verificationResult.predicates.map(predicate => (
                    <div key={predicate.name} className="flex items-center justify-between p-2 rounded border border-slate-800 bg-slate-800/20">
                      <div className="flex-1">
                        <span className="text-xs font-mono text-slate-300">{predicate.name}</span>
                        <p className="text-xs text-slate-500 mt-0.5">{predicate.description}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded font-mono ml-2 ${
                        predicate.result === 'PASS'
                          ? 'bg-green-900/30 text-green-400'
                          : predicate.result === 'FAIL'
                            ? 'bg-red-900/30 text-red-400'
                            : 'bg-orange-900/30 text-orange-400'
                      }`}>
                        {predicate.result}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Passed:</span>
                    <span className="text-green-400 font-mono ml-1">{verificationResult.passed_predicates.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Failed:</span>
                    <span className="text-red-400 font-mono ml-1">{verificationResult.failed_predicates.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Unresolved:</span>
                    <span className="text-orange-400 font-mono ml-1">{verificationResult.unresolved_predicates.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Epistemic State + Actions */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  Epistemic State
                </h2>
              </div>
              <div className="p-4">
                <div className={`p-4 rounded-lg border mb-4 ${stateMetadata.bgColor} ${stateMetadata.borderColor}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${stateMetadata.color.replace('text-', 'bg-')}`}></div>
                    <div className="flex-1">
                      <div className={`text-lg font-bold font-mono ${stateMetadata.color}`}>
                        {verificationResult.state}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{stateMetadata.description}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateArtifact}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors"
                  >
                    Generate Epistemic Artifact
                  </button>
                </div>

                {epistemicArtifact && (
                  <div className="mt-4 p-3 rounded bg-slate-800/50 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-2">Artifact generated successfully</p>
                    <div className="text-xs font-mono text-slate-500 break-all">
                      Hash: {epistemicArtifact.hash}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Chain */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Audit Chain
                </h2>
              </div>
              <div className="p-4">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={handleVerifyAudit}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-medium text-sm transition-colors"
                  >
                    Verify Audit Chain
                  </button>
                  {auditVerified !== null && (
                    <span className={`px-3 py-2 rounded text-sm font-mono ${
                      auditVerified 
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-red-900/30 text-red-400'
                    }`}>
                      {auditVerified ? 'CHAIN VERIFIED' : 'CHAIN INVALID'}
                    </span>
                  )}
                </div>

                <div className="max-h-40 overflow-y-auto space-y-2">
                  {auditEvents.map(event => (
                    <div key={event.id} className="p-2 rounded bg-slate-800/30 border border-slate-700/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-slate-300">{event.operation}</span>
                        <span className="text-xs font-mono text-slate-500">{event.result}</span>
                      </div>
                      <div className="text-xs font-mono text-slate-600 truncate">
                        Hash: {event.event_hash}
                      </div>
                    </div>
                  ))}
                  {auditEvents.length === 0 && (
                    <p className="text-slate-500 text-xs">No audit events yet. Generate an artifact to create one.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
