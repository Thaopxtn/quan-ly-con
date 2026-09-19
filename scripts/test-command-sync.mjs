import assert from 'node:assert';

console.log('=== TEST SUITE: REMOTE COMMAND TTL, ORDERING & SYNC CHANNELS ===\n');

// 1. Test Partitioning Key for Commands
function getPartitionedSyncKey(parentId, childId) {
  const cleanParent = (parentId || 'fam_default').replace(/[.#$\[\]\/]/g, '_');
  const cleanChild = (childId || 'kid_default').replace(/[.#$\[\]\/]/g, '_');
  return `${cleanParent}_${cleanChild}`;
}

console.log('Test 1: Partitioned Command Channel Path');
const syncKeyA1 = getPartitionedSyncKey('parent_user_1', 'child_1');
const syncKeyA2 = getPartitionedSyncKey('parent_user_1', 'child_2');
const syncKeyB1 = getPartitionedSyncKey('parent_user_2', 'child_1');

const commandPathA1 = `pairings/sync/${syncKeyA1}/commands/active`;
const commandPathA2 = `pairings/sync/${syncKeyA2}/commands/active`;
const commandPathB1 = `pairings/sync/${syncKeyB1}/commands/active`;

console.log(` - Parent 1 + Child 1: "${commandPathA1}"`);
console.log(` - Parent 1 + Child 2: "${commandPathA2}"`);
console.log(` - Parent 2 + Child 1: "${commandPathB1}"`);

assert.strictEqual(commandPathA1, 'pairings/sync/parent_user_1_child_1/commands/active');
assert.notStrictEqual(commandPathA1, commandPathA2, 'Sibling children must have separate command queues');
assert.notStrictEqual(commandPathA1, commandPathB1, 'Different families must have separate command queues');
console.log('✅ Test 1 PASSED: Command paths are 100% isolated.\n');

// 2. Test Command TTL & Monotonic Sequence Guard
console.log('Test 2: Command TTL & Monotonic Sequence Guard');

function createCommandReceiver() {
  const COMMAND_TTL_MS = 60 * 1000;
  let lastHandledCmdTimestamp = Date.now() - 3000;
  const executedCommands = [];
  const clearedCommands = [];

  function onIncomingCommand(cmd) {
    if (!cmd || !cmd.command || cmd.command === 'none') {
      return { status: 'IGNORED_EMPTY' };
    }

    const now = Date.now();
    const cmdTs = typeof cmd.timestamp === 'number' ? cmd.timestamp : 0;

    // Check TTL: discard stale zombie commands older than 60s
    if (cmdTs > 0 && now - cmdTs > COMMAND_TTL_MS) {
      clearedCommands.push(cmd);
      return { status: 'DISCARDED_TTL', reason: `Stale command (${now - cmdTs}ms old)` };
    }

    // Monotonic guard: discard any command with timestamp <= last handled
    if (cmdTs > 0 && cmdTs <= lastHandledCmdTimestamp) {
      clearedCommands.push(cmd);
      return { status: 'DISCARDED_STALE_SEQUENCE', reason: `Older than last handled timestamp` };
    }

    lastHandledCmdTimestamp = cmdTs > 0 ? cmdTs : now;
    executedCommands.push(cmd);
    clearedCommands.push(cmd);
    return { status: 'EXECUTED', command: cmd.command };
  }

  return { onIncomingCommand, executedCommands, clearedCommands };
}

const receiver = createCommandReceiver();

// 2a. Old zombie command sitting in Firebase from 5 minutes ago (previous session)
const zombieCmd = {
  command: 'lock_now',
  timestamp: Date.now() - 300000, // 5 minutes ago
  payload: { lockType: 'instant' }
};
const res1 = receiver.onIncomingCommand(zombieCmd);
console.log(` - Zombie command from 5m ago: ${res1.status} (${res1.reason})`);
assert.strictEqual(res1.status, 'DISCARDED_TTL');
assert.strictEqual(receiver.executedCommands.length, 0);

// 2b. Stale command from just before app booted (3 seconds ago)
const preBootCmd = {
  command: 'broadcast_msg',
  timestamp: Date.now() - 4000,
  payload: { title: 'Old message', message: 'Hello' }
};
const res2 = receiver.onIncomingCommand(preBootCmd);
console.log(` - Pre-boot command from 4s ago: ${res2.status} (${res2.reason})`);
assert.strictEqual(res2.status, 'DISCARDED_STALE_SEQUENCE');
assert.strictEqual(receiver.executedCommands.length, 0);

// 2c. Fresh command sent right now
const freshCmd1 = {
  command: 'update_app_rule',
  timestamp: Date.now(),
  payload: { appId: 'app_youtube', status: 'blocked' }
};
const res3 = receiver.onIncomingCommand(freshCmd1);
console.log(` - Fresh command 'update_app_rule': ${res3.status}`);
assert.strictEqual(res3.status, 'EXECUTED');
assert.strictEqual(receiver.executedCommands.length, 1);
assert.strictEqual(receiver.executedCommands[0].command, 'update_app_rule');

// 2d. Replayed command with same timestamp
const duplicateCmd = { ...freshCmd1 };
const res4 = receiver.onIncomingCommand(duplicateCmd);
console.log(` - Duplicate replay of same command: ${res4.status} (${res4.reason})`);
assert.strictEqual(res4.status, 'DISCARDED_STALE_SEQUENCE');
assert.strictEqual(receiver.executedCommands.length, 1);

// 2e. Fresh command sent next
const freshCmd2 = {
  command: 'lock_now',
  timestamp: Date.now() + 50,
  payload: {
    lockType: 'math',
    title: 'Thử thách Toán Học',
    challengeData: {
      mathChallenge: { question: '12 + 15 = ?', answer: 27 }
    }
  }
};
const res5 = receiver.onIncomingCommand(freshCmd2);
console.log(` - Fresh command 'lock_now' with challengeData: ${res5.status}`);
assert.strictEqual(res5.status, 'EXECUTED');
assert.strictEqual(receiver.executedCommands.length, 2);
assert.strictEqual(receiver.executedCommands[1].payload.challengeData.mathChallenge.question, '12 + 15 = ?');

console.log('✅ Test 2 PASSED: TTL and Sequence Guard eliminate zombie & mismatched commands!\n');

// 3. Test Challenge Data Preservation
console.log('Test 3: Challenge Data Preservation on Remote Lock');
const challengePayload = receiver.executedCommands[1].payload;
assert.ok(challengePayload.challengeData, 'Must preserve challengeData');
assert.strictEqual(challengePayload.challengeData.mathChallenge.answer, 27);
console.log('✅ Test 3 PASSED: Math & Quiz challenge contents are preserved accurately!\n');

console.log('ALL COMMAND SYNC TESTS PASSED SUCCESSFULLY! 🚀');
