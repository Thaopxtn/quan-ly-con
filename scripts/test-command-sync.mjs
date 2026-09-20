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

// 2. Test Command TTL, Deduplication & Monotonic Sequence Guard
console.log('Test 2: Command TTL, Deduplication & Clock-Skew Resilience');

function createCommandReceiver(storedHandledIds = [], storedLastTimestamp = 0) {
  const COMMAND_TTL_MS = 300 * 1000; // 5 minutes
  const handledIds = new Set(storedHandledIds);
  let lastHandledCmdTimestamp = storedLastTimestamp;
  const executedCommands = [];
  const clearedCommands = [];

  function onIncomingCommand(cmd) {
    if (!cmd || !cmd.command || cmd.command === 'none') {
      return { status: 'IGNORED_EMPTY' };
    }

    const now = Date.now();
    const cmdTs = typeof cmd.timestamp === 'number' ? cmd.timestamp : 0;

    // 1. Missing or non-positive timestamp purge
    if (!cmdTs || cmdTs <= 0) {
      clearedCommands.push(cmd);
      return { status: 'DISCARDED_INVALID_TIMESTAMP', reason: 'Missing or non-positive timestamp' };
    }

    // 2. Check TTL: discard stale zombie commands older than 300s (5m)
    if (now - cmdTs > COMMAND_TTL_MS) {
      clearedCommands.push(cmd);
      return { status: 'DISCARDED_TTL', reason: `Stale command (${now - cmdTs}ms old)` };
    }

    // 3. Persistent Deduplication check: discard if already executed
    const cmdId = cmd.id || `cmd_${cmdTs}`;
    if (handledIds.has(cmdId)) {
      return { status: 'DISCARDED_DUPLICATE_ID', reason: `Command ID ${cmdId} already executed` };
    }

    // 4. Monotonic sequence check: discard any command older than the last executed command
    if (lastHandledCmdTimestamp > 0 && cmdTs < lastHandledCmdTimestamp) {
      clearedCommands.push(cmd);
      return { status: 'DISCARDED_STALE_SEQUENCE', reason: `Older than last handled timestamp` };
    }

    handledIds.add(cmdId);
    lastHandledCmdTimestamp = cmdTs;
    executedCommands.push(cmd);
    clearedCommands.push(cmd);
    return { status: 'EXECUTED', command: cmd.command };
  }

  return { onIncomingCommand, executedCommands, clearedCommands, handledIds };
}

const receiver = createCommandReceiver();

// 2a. Old zombie command sitting in Firebase from 6 minutes ago (previous session)
const zombieCmd = {
  id: 'cmd_old_zombie',
  command: 'lock_now',
  timestamp: Date.now() - 360000, // 6 minutes ago
  payload: { lockType: 'instant' }
};
const res1 = receiver.onIncomingCommand(zombieCmd);
console.log(` - Zombie command from 6m ago: ${res1.status} (${res1.reason})`);
assert.strictEqual(res1.status, 'DISCARDED_TTL');
assert.strictEqual(receiver.executedCommands.length, 0);

// 2b. Valid command sent 4 seconds ago while kid phone was waking up or slight clock drift
const recentWakeupCmd = {
  id: 'cmd_wakeup_lock',
  command: 'lock_now',
  timestamp: Date.now() - 4000, // 4 seconds ago
  payload: { lockType: 'instant' }
};
const res2 = receiver.onIncomingCommand(recentWakeupCmd);
console.log(` - Wakeup command from 4s ago: ${res2.status}`);
assert.strictEqual(res2.status, 'EXECUTED', 'Commands sent seconds ago MUST execute (no artificial clamping drop)');
assert.strictEqual(receiver.executedCommands.length, 1);

// 2c. Fresh command sent right now
const freshCmd1 = {
  id: 'cmd_fresh_1',
  command: 'update_app_rule',
  timestamp: Date.now(),
  payload: { appId: 'app_youtube', status: 'blocked' }
};
const res3 = receiver.onIncomingCommand(freshCmd1);
console.log(` - Fresh command 'update_app_rule': ${res3.status}`);
assert.strictEqual(res3.status, 'EXECUTED');
assert.strictEqual(receiver.executedCommands.length, 2);
assert.strictEqual(receiver.executedCommands[1].command, 'update_app_rule');

// 2d. Replayed command with same ID (deduplication check)
const duplicateCmd = { ...freshCmd1 };
const res4 = receiver.onIncomingCommand(duplicateCmd);
console.log(` - Duplicate replay of same command ID: ${res4.status} (${res4.reason})`);
assert.strictEqual(res4.status, 'DISCARDED_DUPLICATE_ID');
assert.strictEqual(receiver.executedCommands.length, 2);

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
assert.strictEqual(receiver.executedCommands.length, 3);
assert.strictEqual(receiver.executedCommands[2].payload.challengeData.mathChallenge.question, '12 + 15 = ?');

console.log('✅ Test 2 PASSED: TTL and Sequence Guard eliminate zombie & mismatched commands!\n');

// 3. Test Challenge Data Preservation
console.log('Test 3: Challenge Data Preservation on Remote Lock');
const challengePayload = receiver.executedCommands[2].payload;
assert.ok(challengePayload.challengeData, 'Must preserve challengeData');
assert.strictEqual(challengePayload.challengeData.mathChallenge.answer, 27);
console.log('✅ Test 3 PASSED: Math & Quiz challenge contents are preserved accurately!\n');

console.log('ALL COMMAND SYNC TESTS PASSED SUCCESSFULLY! 🚀');
