import { AuditEvent } from '@/schemas/resolution';

/**
 * Append-only in-memory audit ledger.
 * Each event is hash-chained to ensure integrity.
 */

// In-memory store for audit events
const auditEvents: AuditEvent[] = [];

// SHA-256 hash implementation
async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a hash for an audit event based on its content and previous event hash.
 */
async function createEventHash(
  event: Omit<AuditEvent, 'event_hash'>,
  previousEventHash: string | undefined
): Promise<string> {
  const contentToHash = JSON.stringify({
    id: event.id,
    timestamp: event.timestamp,
    actor: event.actor,
    operation: event.operation,
    input_hashes: event.input_hashes,
    output_hash: event.output_hash,
    rule_version: event.rule_version,
    result: event.result,
    previous_event_hash: previousEventHash,
  });
  
  return hashContent(contentToHash);
}

/**
 * Append an audit event to the ledger.
 * Returns the complete event with hash chain.
 */
export async function appendAuditEvent(
  event: Omit<AuditEvent, 'event_hash' | 'previous_event_hash' | 'output_hash'>
): Promise<AuditEvent> {
  const previousEvent = auditEvents[auditEvents.length - 1];
  const previousEventHash = previousEvent ? previousEvent.event_hash : undefined;
  
  // Calculate output hash based on event content
  const outputHash = await hashContent(JSON.stringify({
    operation: event.operation,
    result: event.result,
    timestamp: event.timestamp,
  }));
  
  // Create the full event
  const fullEvent: Omit<AuditEvent, 'event_hash'> & { output_hash?: string } = {
    ...event,
    input_hashes: event.input_hashes || [],
    output_hash: outputHash,
    previous_event_hash: previousEventHash,
  };
  
  // Create event hash
  const eventHash = await createEventHash(fullEvent, previousEventHash);
  
  const completeEvent: AuditEvent = {
    ...fullEvent,
    event_hash: eventHash,
  };
  
  auditEvents.push(completeEvent);
  
  return completeEvent;
}

/**
 * Get all audit events.
 */
export function getAuditEvents(): AuditEvent[] {
  return [...auditEvents];
}

/**
 * Clear the audit ledger (for testing purposes).
 */
export function clearAuditLedger(): void {
  auditEvents.length = 0;
}

/**
 * Verify the audit chain integrity.
 * Returns true if all event hashes are valid and chain is unbroken.
 */
export async function verifyAuditChain(): Promise<{ valid: boolean; eventsVerified: number; errors: string[] }> {
  const errors: string[] = [];
  let eventsVerified = 0;
  
  if (auditEvents.length === 0) {
    return { valid: true, eventsVerified: 0, errors: ['Audit ledger is empty'] };
  }
  
  for (let i = 0; i < auditEvents.length; i++) {
    const event = auditEvents[i];
    
    // Verify the event hash
    const previousHash = i > 0 ? auditEvents[i - 1].event_hash : undefined;
    const expectedHash = await createEventHash(
      {
        id: event.id,
        timestamp: event.timestamp,
        actor: event.actor,
        operation: event.operation,
        input_hashes: event.input_hashes,
        output_hash: event.output_hash,
        rule_version: event.rule_version,
        result: event.result,
        previous_event_hash: previousHash,
      },
      previousHash
    );
    
    if (event.event_hash !== expectedHash) {
      errors.push(`Event ${event.id} has invalid hash`);
      continue;
    }
    
    // Verify the chain link
    if (i > 0 && event.previous_event_hash !== auditEvents[i - 1].event_hash) {
      errors.push(`Event ${event.id} has broken chain link`);
      continue;
    }
    
    eventsVerified++;
  }
  
  return {
    valid: errors.length === 0,
    eventsVerified,
    errors,
  };
}

/**
 * Get the last event hash for chain continuity.
 */
export function getLastEventHash(): string | null {
  const last = auditEvents[auditEvents.length - 1];
  return last ? last.event_hash : null;
}

/**
 * Get event by ID.
 */
export function getEventById(id: string): AuditEvent | undefined {
  return auditEvents.find(e => e.id === id);
}
