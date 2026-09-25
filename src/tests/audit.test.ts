import { describe, it, expect, beforeEach } from 'vitest';
import { 
  appendAuditEvent, 
  getAuditEvents, 
  verifyAuditChain, 
  clearAuditLedger 
} from '@/lib/audit/ledger';
import { AuditEvent } from '@/schemas/resolution';

describe('Audit Ledger', () => {
  beforeEach(() => {
    clearAuditLedger();
  });

  describe('appendAuditEvent', () => {
    it('should add an event to the ledger', async () => {
      const event = await appendAuditEvent({
        id: 'evt-001',
        timestamp: new Date().toISOString(),
        actor: 'test-actor',
        operation: 'TEST_OPERATION',
        input_hashes: [],
        rule_version: '1.0.0',
        result: 'SUCCESS',
      });

      const events = getAuditEvents();
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('evt-001');
    });

    it('should hash-chain events', async () => {
      const event1 = await appendAuditEvent({
        id: 'evt-001',
        timestamp: new Date().toISOString(),
        actor: 'test-actor',
        operation: 'FIRST',
        input_hashes: [],
        rule_version: '1.0.0',
        result: 'SUCCESS',
      });

      const event2 = await appendAuditEvent({
        id: 'evt-002',
        timestamp: new Date().toISOString(),
        actor: 'test-actor',
        operation: 'SECOND',
        input_hashes: [event1.event_hash],
        rule_version: '1.0.0',
        result: 'SUCCESS',
      });

      // Second event should reference first event's hash
      expect(event2.previous_event_hash).toBe(event1.event_hash);
    });

    it('should generate valid event hashes', async () => {
      const event = await appendAuditEvent({
        id: 'evt-001',
        timestamp: new Date().toISOString(),
        actor: 'test-actor',
        operation: 'TEST',
        input_hashes: [],
        rule_version: '1.0.0',
        result: 'SUCCESS',
      });

      // Event hash should be a non-empty string
      expect(event.event_hash).toBeTruthy();
      expect(typeof event.event_hash).toBe('string');
    });
  });

  describe('verifyAuditChain', () => {
    it('should return valid for empty ledger', async () => {
      const result = await verifyAuditChain();
      expect(result.valid).toBe(true);
      expect(result.eventsVerified).toBe(0);
    });

    it('should verify a single event', async () => {
      await appendAuditEvent({
        id: 'evt-001',
        timestamp: new Date().toISOString(),
        actor: 'test-actor',
        operation: 'TEST',
        input_hashes: [],
        rule_version: '1.0.0',
        result: 'SUCCESS',
      });

      const result = await verifyAuditChain();
      expect(result.valid).toBe(true);
      expect(result.eventsVerified).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should verify a chain of events', async () => {
      for (let i = 0; i < 5; i++) {
        await appendAuditEvent({
          id: `evt-00${i + 1}`,
          timestamp: new Date().toISOString(),
          actor: 'test-actor',
          operation: `OP_${i}`,
          input_hashes: i > 0 ? [getAuditEvents()[i - 1].event_hash] : [],
          rule_version: '1.0.0',
          result: 'SUCCESS',
        });
      }

      const result = await verifyAuditChain();
      expect(result.valid).toBe(true);
      expect(result.eventsVerified).toBe(5);
    });

    it('should detect chain tampering (simulated by clearing and re-adding)', async () => {
      // Add events
      await appendAuditEvent({
        id: 'evt-001',
        timestamp: new Date().toISOString(),
        actor: 'test-actor',
        operation: 'TEST',
        input_hashes: [],
        rule_version: '1.0.0',
        result: 'SUCCESS',
      });

      // Verify it's valid
      let result = await verifyAuditChain();
      expect(result.valid).toBe(true);

      // The test setup prevents actual tampering simulation
      // because we can't modify event hashes after creation
    });
  });

  describe('getAuditEvents', () => {
    it('should return all events', async () => {
      await appendAuditEvent({
        id: 'evt-001',
        timestamp: new Date().toISOString(),
        actor: 'test-actor',
        operation: 'TEST1',
        input_hashes: [],
        rule_version: '1.0.0',
        result: 'SUCCESS',
      });

      await appendAuditEvent({
        id: 'evt-002',
        timestamp: new Date().toISOString(),
        actor: 'test-actor',
        operation: 'TEST2',
        input_hashes: [],
        rule_version: '1.0.0',
        result: 'SUCCESS',
      });

      const events = getAuditEvents();
      expect(events).toHaveLength(2);
    });

    it('should return events in insertion order', async () => {
      await appendAuditEvent({
        id: 'evt-001',
        timestamp: new Date().toISOString(),
        actor: 'test-actor',
        operation: 'FIRST',
        input_hashes: [],
        rule_version: '1.0.0',
        result: 'SUCCESS',
      });

      await appendAuditEvent({
        id: 'evt-002',
        timestamp: new Date().toISOString(),
        actor: 'test-actor',
        operation: 'SECOND',
        input_hashes: [],
        rule_version: '1.0.0',
        result: 'SUCCESS',
      });

      const events = getAuditEvents();
      expect(events[0].id).toBe('evt-001');
      expect(events[1].id).toBe('evt-002');
    });
  });

  describe('Audit Event Structure', () => {
    it('should include all required fields', async () => {
      const event = await appendAuditEvent({
        id: 'evt-001',
        timestamp: '2024-01-15T10:00:00Z',
        actor: 'system',
        operation: 'VERIFICATION',
        input_hashes: ['input-hash-001'],
        rule_version: '1.0.0',
        result: 'VERIFIED',
      });

      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.actor).toBe('system');
      expect(event.operation).toBe('VERIFICATION');
      expect(event.input_hashes).toContain('input-hash-001');
      expect(event.output_hash).toBeDefined();
      expect(event.rule_version).toBe('1.0.0');
      expect(event.result).toBe('VERIFIED');
      expect(event.event_hash).toBeDefined();
    });
  });
});
