import assert from 'node:assert/strict';
import test from 'node:test';
import { claimDelivery, parseRecipientConfig, recordDelivery, resolveSmsRecipients } from '../src/lib/notification-delivery';

type Row = { id: string; lead_id: string; channel: string; recipient: string; state: string; attempt_count: number; [key: string]: unknown };

class FakeDb {
  rows: Row[] = [];
  nextId = 1;
  from() {
    const db = this;
    let filters: Record<string, unknown> = {};
    let update: Record<string, unknown> | null = null;
    const query = {
      select() { return query; },
      eq(key: string, value: unknown) { filters[key] = value; return query; },
      async maybeSingle() {
        const row = db.rows.find((candidate) => Object.entries(filters).every(([key, value]) => candidate[key] === value));
        if (update) {
          if (!row) return { data: null, error: null };
          Object.assign(row, update);
          return { data: { id: row.id }, error: null };
        }
        return { data: row || null, error: null };
      },
      update(values: Record<string, unknown>) { update = values; return query; },
      async insert(values: Omit<Row, 'id'>) {
        const duplicate = db.rows.some((row) => row.lead_id === values.lead_id && row.channel === values.channel && row.recipient === values.recipient);
        if (duplicate) return { error: { code: '23505' } };
        const row = { ...values, id: String(db.nextId++) } as Row;
        db.rows.push(row);
        return { error: null };
      },
      async upsert(values: Record<string, unknown>) {
        const row = db.rows.find((candidate) => candidate.lead_id === values.lead_id && candidate.channel === values.channel && candidate.recipient === values.recipient);
        if (row) Object.assign(row, values); else db.rows.push({ ...values, id: String(db.nextId++) } as Row);
        return { error: null };
      },
    };
    return query;
  }
}

test('duplicate and concurrent claims are idempotent', async () => {
  const db = new FakeDb();
  const results = await Promise.all([
    claimDelivery(db, 'lead-1', 'sms', '+15555550101'),
    claimDelivery(db, 'lead-1', 'sms', '+15555550101'),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(db.rows.length, 1);
});

test('accepted, delivered, and unknown states are not resent', async () => {
  const db = new FakeDb();
  assert.equal(await claimDelivery(db, 'lead-1', 'sms', '+15555550102'), true);
  await recordDelivery(db, 'lead-1', { channel: 'sms', recipient: '+15555550102', state: 'accepted', providerMessageId: 'SM1' });
  assert.equal(await claimDelivery(db, 'lead-1', 'sms', '+15555550102'), false);
  await recordDelivery(db, 'lead-1', { channel: 'sms', recipient: '+15555550103', state: 'unknown' });
  assert.equal(await claimDelivery(db, 'lead-1', 'sms', '+15555550103'), false);
});

test('definitive failure can be retried once', async () => {
  const db = new FakeDb();
  assert.equal(await claimDelivery(db, 'lead-1', 'sms', '+15555550104'), true);
  await recordDelivery(db, 'lead-1', { channel: 'sms', recipient: '+15555550104', state: 'failed', error: 'undelivered' });
  assert.equal(await claimDelivery(db, 'lead-1', 'sms', '+15555550104'), true);
  assert.equal(db.rows[0].state, 'pending');
});

test('Five Star future routing unions required and configured recipients, while other clients stay unchanged', () => {
  assert.deepEqual(parseRecipientConfig('+15555550101,+15555550102,+15555550103', 3), ['+15555550101', '+15555550102', '+15555550103']);
  assert.equal(parseRecipientConfig(undefined, 3), null);
  assert.equal(parseRecipientConfig('+15555550101,not-a-number,+15555550103', 3), null);
  assert.equal(parseRecipientConfig('+15555550101,+15555550101,+15555550103', 3), null);
  assert.deepEqual(
    resolveSmsRecipients('Five Star Claims Adjusting', ['+15555550100'], undefined, undefined, parseRecipientConfig('+15555550101,+15555550102,+15555550103', 3)),
    ['+15555550101', '+15555550102', '+15555550103', '+15555550100']
  );
  assert.deepEqual(resolveSmsRecipients('Yachting Advisors', ['+15555550100'], undefined, '+15555550109'), ['+15555550109', '+15555550100']);
  assert.deepEqual(resolveSmsRecipients('Five Star Claims Adjusting', ['+15555550100'], ['+15555550101', '+15555550102', '+15555550103'], undefined, ['+15555550999']), [
    '+15555550101', '+15555550102', '+15555550103',
  ]);
});
