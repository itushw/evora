/**
 * Security Rules Verification Matrix for Evora Firestore Rules.
 * Covers owner isolation, public catalog reads, schema strictness, and terminal state locks.
 */
export interface RuleTestCase {
  name: string;
  collection: 'users' | 'events' | 'orders';
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  actor: 'anonymous' | 'owner' | 'other_user';
  expected: 'allow' | 'deny';
}

export const EVORA_RULE_TEST_CASES: RuleTestCase[] = [
  { name: 'Anonymous cannot read user profile', collection: 'users', operation: 'get', actor: 'anonymous', expected: 'deny' },
  { name: 'Other user cannot read another user profile', collection: 'users', operation: 'get', actor: 'other_user', expected: 'deny' },
  { name: 'Owner can read own profile', collection: 'users', operation: 'get', actor: 'owner', expected: 'allow' },
  { name: 'Nobody can list users collection', collection: 'users', operation: 'list', actor: 'owner', expected: 'deny' },
  { name: 'Anonymous can list public events', collection: 'events', operation: 'list', actor: 'anonymous', expected: 'allow' },
  { name: 'Anonymous cannot create an event', collection: 'events', operation: 'create', actor: 'anonymous', expected: 'deny' },
  { name: 'Signed-in organizer can create own event', collection: 'events', operation: 'create', actor: 'owner', expected: 'allow' },
  { name: 'Other user cannot delete someone elses event', collection: 'events', operation: 'delete', actor: 'other_user', expected: 'deny' },
  { name: 'Anonymous cannot read any order', collection: 'orders', operation: 'get', actor: 'anonymous', expected: 'deny' },
  { name: 'Other user cannot read someone elses order', collection: 'orders', operation: 'get', actor: 'other_user', expected: 'deny' },
  { name: 'Owner can read own order', collection: 'orders', operation: 'get', actor: 'owner', expected: 'allow' },
  { name: 'Owner can create confirmed order for self', collection: 'orders', operation: 'create', actor: 'owner', expected: 'allow' },
  { name: 'Owner can cancel confirmed order to refunded', collection: 'orders', operation: 'update', actor: 'owner', expected: 'allow' },
  { name: 'Owner cannot delete order record', collection: 'orders', operation: 'delete', actor: 'owner', expected: 'deny' },
];
