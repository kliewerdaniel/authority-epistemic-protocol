import { GraphNodeType, GraphEdgeType } from '@/schemas/types';
import { Claim } from '@/schemas/models';
import { Evidence } from '@/schemas/models';
import { AuthorityArtifact } from '@/schemas/authority';

/**
 * Knowledge Graph representation.
 * Nodes: Claim, Evidence, Authority, Source, Identity, Artifact
 * Edges: ASSERTS, SUPPORTS, CONTRADICTS, AUTHORIZES, SUPERSEDES, DERIVES_FROM, SCOPED_TO, ISSUED_BY
 */

// Graph Node
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  data: Record<string, unknown>;
  x?: number;
  y?: number;
}

// Graph Edge
export interface GraphEdge {
  source: string;
  target: string;
  type: GraphEdgeType;
  label?: string;
  data?: Record<string, unknown>;
}

// Graph representation
export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Create a node from a claim.
 */
export function createClaimNode(claim: Claim): GraphNode {
  return {
    id: `claim-${claim.id}`,
    type: 'CLAIM',
    label: claim.statement.slice(0, 50) + (claim.statement.length > 50 ? '...' : ''),
    data: claim,
  };
}

/**
 * Create a node from evidence.
 */
export function createEvidenceNode(evidence: Evidence): GraphNode {
  return {
    id: `evidence-${evidence.id}`,
    type: 'EVIDENCE',
    label: `${evidence.type}: ${evidence.source}`,
    data: evidence,
  };
}

/**
 * Create a node from an authority artifact.
 */
export function createAuthorityNode(artifact: AuthorityArtifact): GraphNode {
  return {
    id: `authority-${artifact.authority_id}`,
    type: 'AUTHORITY',
    label: `${artifact.issuer} (${artifact.scope.join(', ')})`,
    data: artifact,
  };
}

/**
 * Create a node from a source/identity.
 */
export function createSourceNode(name: string, did?: string): GraphNode {
  return {
    id: `source-${name}`,
    type: 'SOURCE',
    label: name,
    data: { name, did },
  };
}

/**
 * Create a node from an identity.
 */
export function createIdentityNode(did: string, name: string): GraphNode {
  return {
    id: `identity-${did}`,
    type: 'IDENTITY',
    label: name,
    data: { did, name },
  };
}

/**
 * Create a node for an artifact.
 */
export function createArtifactNode(name: string, artifactType: string): GraphNode {
  return {
    id: `artifact-${name}`,
    type: 'ARTIFACT',
    label: name,
    data: { type: artifactType },
  };
}

/**
 * Create an ASSERTS edge from a claim to its subject.
 */
export function createAssertsEdge(claim: Claim, targetId: string): GraphEdge {
  return {
    source: `claim-${claim.id}`,
    target: targetId,
    type: 'ASSERTS',
    label: claim.predicate,
  };
}

/**
 * Create a SUPPORTS edge from evidence to claim.
 */
export function createSupportsEdge(evidence: Evidence): GraphEdge {
  return {
    source: `evidence-${evidence.id}`,
    target: `claim-${evidence.claimId}`,
    type: 'SUPPORTS',
    label: evidence.relationship,
  };
}

/**
 * Create a CONTRADICTS edge from evidence to claim.
 */
export function createContradictsEdge(evidence: Evidence): GraphEdge {
  return {
    source: `evidence-${evidence.id}`,
    target: `claim-${evidence.claimId}`,
    type: 'CONTRADICTS',
    label: evidence.relationship,
  };
}

/**
 * Create an AUTHORIZES edge from authority to claim.
 */
export function createAuthorizesEdge(
  artifact: AuthorityArtifact,
  claimId: string
): GraphEdge {
  return {
    source: `authority-${artifact.authority_id}`,
    target: `claim-${claimId}`,
    type: 'AUTHORIZES',
    label: artifact.scope.join(', '),
  };
}

/**
 * Create a SCOPED_TO edge from authority to resource.
 */
export function createScopedToEdge(
  artifact: AuthorityArtifact,
  resourceId: string
): GraphEdge {
  return {
    source: `authority-${artifact.authority_id}`,
    target: resourceId,
    type: 'SCOPED_TO',
    label: artifact.scope.join(', '),
  };
}

/**
 * Create an ISSUED_BY edge from artifact to identity.
 */
export function createIssuedByEdge(
  artifact: AuthorityArtifact,
  identityId: string
): GraphEdge {
  return {
    source: `authority-${artifact.authority_id}`,
    target: identityId,
    type: 'ISSUED_BY',
    label: artifact.issuer,
  };
}

/**
 * Create a DERIVES_FROM edge.
 */
export function createDerivesFromEdge(
  sourceId: string,
  targetId: string,
  note?: string
): GraphEdge {
  return {
    source: sourceId,
    target: targetId,
    type: 'DERIVES_FROM',
    label: note,
  };
}

/**
 * Create a SUPERSEDES edge.
 */
export function createSupersedesEdge(
  supersedingId: string,
  supersededId: string
): GraphEdge {
  return {
    source: supersedingId,
    target: supersededId,
    type: 'SUPERSEDES',
    label: 'supersedes',
  };
}

/**
 * Convert a set of claims, evidence, and authority artifacts into a graph.
 */
export function buildKnowledgeGraph(
  claims: Claim[],
  evidenceList: Evidence[],
  artifacts: AuthorityArtifact[],
  identities: Array<{ did: string; name: string }> = []
): KnowledgeGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  // Add claims
  for (const claim of claims) {
    nodes.push(createClaimNode(claim));
  }
  
  // Add evidence
  for (const evidence of evidenceList) {
    nodes.push(createEvidenceNode(evidence));
    
    // Add edges from evidence to claims
    if (evidence.relationship === 'SUPPORTS' || evidence.relationship === 'CONTRADICTS') {
      const edge = evidence.relationship === 'SUPPORTS' 
        ? createSupportsEdge(evidence)
        : createContradictsEdge(evidence);
      edges.push(edge);
    }
  }
  
  // Add authority artifacts
  for (const artifact of artifacts) {
    nodes.push(createAuthorityNode(artifact));
    
    // Add edges to claims they authorize
    for (const claimId of artifact.context ? [artifact.context] : []) {
      // This would need proper mapping - for now, link to all claims
    }
  }
  
  // Add identities
  for (const identity of identities) {
    nodes.push(createIdentityNode(identity.did, identity.name));
    
    // Add ISSUED_BY edges
    for (const artifact of artifacts) {
      if ((artifact.issuer as string) === identity.did) {
        edges.push(createIssuedByEdge(artifact, `identity-${identity.did}`));
      }
    }
  }
  
  // Layout nodes in a simple grid for visualization
  layoutGraph({ nodes, edges });
  
  return { nodes, edges };
}

/**
 * Simple grid layout for graph nodes.
 */
function layoutGraph(graph: KnowledgeGraph): void {
  const nodesByLayer: Record<string, GraphNode[]> = {
    claim: [],
    evidence: [],
    authority: [],
    source: [],
    identity: [],
    artifact: [],
  };
  
  for (const node of graph.nodes) {
    const key = node.type.toLowerCase();
    if (nodesByLayer[key]) {
      nodesByLayer[key].push(node);
    }
  }
  
  const layerOrder = ['claim', 'evidence', 'authority', 'source', 'identity', 'artifact'];
  let y = 50;
  const layerHeight = 100;
  
  for (const layer of layerOrder) {
    const nodes = nodesByLayer[layer];
    const xSpacing = 200;
    const totalWidth = (nodes.length - 1) * xSpacing;
    const startX = -totalWidth / 2;
    
    nodes.forEach((node, i) => {
      node.x = startX + i * xSpacing;
      node.y = y;
    });
    
    y += layerHeight;
  }
}

/**
 * Serialize the graph to JSON for storage/transmission.
 */
export function serializeGraph(graph: KnowledgeGraph): string {
  return JSON.stringify(graph, null, 2);
}

/**
 * Get node by ID.
 */
export function getNodeById(graph: KnowledgeGraph, id: string): GraphNode | undefined {
  return graph.nodes.find(n => n.id === id);
}

/**
 * Get edges connected to a node.
 */
export function getNodeEdges(
  graph: KnowledgeGraph,
  nodeId: string
): Array<{ edge: GraphEdge; connectedNode: GraphNode }> {
  const result: Array<{ edge: GraphEdge; connectedNode: GraphNode }> = [];
  
  for (const edge of graph.edges) {
    const connectedId = edge.source === nodeId ? edge.target : 
                      edge.target === nodeId ? edge.source : null;
    if (connectedId) {
      const connectedNode = graph.nodes.find(n => n.id === connectedId);
      if (connectedNode) {
        result.push({ edge, connectedNode });
      }
    }
  }
  
  return result;
}
