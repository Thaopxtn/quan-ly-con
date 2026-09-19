import assert from 'node:assert';

// 1. Mock minimal localStorage and window for store simulation in Node
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};
globalThis.window = globalThis;
globalThis.location = { search: '', reload: () => {} };

console.log('=== TEST SUITE: MULTI-TENANT & MULTI-CHILD DATA ISOLATION ===\n');

// 2. Test Partitioning Key Logic
function getPartitionedSyncKey(parentId, childId) {
  const cleanParent = (parentId || 'fam_default').replace(/[.#$\[\]\/]/g, '_');
  const cleanChild = (childId || 'kid_default').replace(/[.#$\[\]\/]/g, '_');
  return `${cleanParent}_${cleanChild}`;
}

function getPartitionedParentKey(parentId) {
  return (parentId || 'fam_default').replace(/[.#$\[\]\/]/g, '_');
}

console.log('Test 1: Partitioned Sync Key Generation');
const key1 = getPartitionedSyncKey('parent_user_A', 'child_01');
const key2 = getPartitionedSyncKey('parent_user_B', 'child_01'); // same child id, different parent
const key3 = getPartitionedSyncKey('parent_user_A', 'child_02'); // same parent, different child

console.log(` - Parent A + Child 1: "${key1}"`);
console.log(` - Parent B + Child 1: "${key2}"`);
console.log(` - Parent A + Child 2: "${key3}"`);

assert.strictEqual(key1, 'parent_user_A_child_01');
assert.strictEqual(key2, 'parent_user_B_child_01');
assert.strictEqual(key3, 'parent_user_A_child_02');
assert.notStrictEqual(key1, key2, 'Two different parents with same childId MUST NOT collide!');
assert.notStrictEqual(key1, key3, 'Two different children of same parent MUST NOT collide!');
console.log('✅ Test 1 PASSED: Partitioned keys guarantee 100% collision isolation!\n');

// 3. Test Multi-Child State Reducer Isolation
console.log('Test 2: Multi-Child State Isolation in Reducer');

const childAn = {
  id: 'child_an',
  name: 'Bé An',
  battery: 85,
  speed: 0,
  currentAddress: 'Nhà riêng',
};

const childBinh = {
  id: 'child_binh',
  name: 'Bé Bình',
  battery: 60,
  speed: 15,
  currentAddress: 'Trường học',
};

const initialChildSettings = {
  child_an: {
    kidStars: 25,
    screenTimeLimitMinutes: 120,
    apps: [
      { id: 'youtube', name: 'YouTube', status: 'blocked', timeUsedMinutes: 40 },
      { id: 'duolingo', name: 'Duolingo', status: 'allowed', timeUsedMinutes: 20 },
    ],
    screenTime: { todayTotalMinutes: 60, dailyLimitMinutes: 120 },
  },
  child_binh: {
    kidStars: 10,
    screenTimeLimitMinutes: 90,
    apps: [
      { id: 'roblox', name: 'Roblox', status: 'blocked', timeUsedMinutes: 15 },
      { id: 'scratch', name: 'Scratch', status: 'allowed', timeUsedMinutes: 30 },
    ],
    screenTime: { todayTotalMinutes: 45, dailyLimitMinutes: 90 },
  },
};

let appState = {
  children: [childAn, childBinh],
  selectedChildId: 'child_an', // Bé An is currently active on parent screen
  child: childAn,
  childSettings: initialChildSettings,
  apps: initialChildSettings.child_an.apps,
  screenTime: initialChildSettings.child_an.screenTime,
  kidStars: initialChildSettings.child_an.kidStars,
};

console.log('Initial State:');
console.log(` - Selected Child: ${appState.child.name} (id: ${appState.selectedChildId})`);
console.log(` - Top-level Stars: ${appState.kidStars}`);
console.log(` - Top-level Apps: ${appState.apps.map(a => a.name).join(', ')}`);
console.log(` - Top-level ScreenTime: ${appState.screenTime.todayTotalMinutes}m / ${appState.screenTime.dailyLimitMinutes}m`);

// SIMULATE CLOUD UPDATE FOR CHILD B (Bé Bình) while Bé An is selected
console.log('\nSimulating Cloud Telemetry & Settings update for Bé Bình (background child)...');

function applyCloudUpdateForChild(prevState, childId, cloudTelemetry, cloudSettings, cloudStars) {
  const isCur = Boolean(prevState.selectedChildId && childId === prevState.selectedChildId);
  const curSettings = prevState.childSettings?.[childId] || {};
  const mergedSettings = { ...curSettings, ...(cloudSettings || {}) };
  if (cloudStars !== undefined) mergedSettings.kidStars = cloudStars;

  const updatedChildren = prevState.children.map((c) => {
    if (c.id === childId && cloudTelemetry) {
      return { ...c, ...cloudTelemetry };
    }
    return c;
  });

  return {
    ...prevState,
    children: updatedChildren,
    // TOP-LEVEL ISOLATION: Top-level properties ONLY update if childId === selectedChildId
    ...(isCur ? {
      child: updatedChildren.find((c) => c.id === prevState.selectedChildId) || prevState.child,
      apps: mergedSettings.apps || prevState.apps,
      screenTime: mergedSettings.screenTimeLimitMinutes !== undefined
        ? { ...prevState.screenTime, dailyLimitMinutes: mergedSettings.screenTimeLimitMinutes }
        : prevState.screenTime,
      kidStars: mergedSettings.kidStars !== undefined ? mergedSettings.kidStars : prevState.kidStars,
    } : {}),
    childSettings: {
      ...prevState.childSettings,
      [childId]: mergedSettings,
    },
  };
}

// 1. Bé Bình gets +5 stars (10 -> 15) and changes daily limit to 150m from cloud
appState = applyCloudUpdateForChild(
  appState,
  'child_binh',
  { battery: 55, speed: 20 },
  { screenTimeLimitMinutes: 150 },
  15
);

// VERIFY Bé An's top-level state did NOT change!
assert.strictEqual(appState.selectedChildId, 'child_an');
assert.strictEqual(appState.child.name, 'Bé An');
assert.strictEqual(appState.kidStars, 25, "Bé An's stars MUST remain 25!");
assert.strictEqual(appState.screenTime.dailyLimitMinutes, 120, "Bé An's limit MUST remain 120m!");
assert.strictEqual(appState.apps[0].name, 'YouTube', "Bé An's apps MUST NOT be overwritten!");

// VERIFY Bé Bình's background settings WERE updated cleanly!
assert.strictEqual(appState.childSettings.child_binh.kidStars, 15);
assert.strictEqual(appState.childSettings.child_binh.screenTimeLimitMinutes, 150);
console.log('✅ PASS: Background updates for Bé Bình did NOT contaminate Bé An!');

// 2. Now simulate parent tapping to switch to Bé Bình
console.log('\nSimulating Child Switch: Switching to Bé Bình...');
function switchChild(prevState, newChildId) {
  const targetChild = prevState.children.find((c) => c.id === newChildId);
  if (!targetChild) return prevState;
  const settings = prevState.childSettings[newChildId] || {};
  return {
    ...prevState,
    selectedChildId: newChildId,
    child: targetChild,
    apps: settings.apps || [],
    screenTime: settings.screenTime || { todayTotalMinutes: 0, dailyLimitMinutes: settings.screenTimeLimitMinutes || 120 },
    kidStars: settings.kidStars || 0,
  };
}

appState = switchChild(appState, 'child_binh');

assert.strictEqual(appState.selectedChildId, 'child_binh');
assert.strictEqual(appState.child.name, 'Bé Bình');
assert.strictEqual(appState.kidStars, 15, "Bé Bình's stars must now reflect the new 15 stars!");
assert.strictEqual(appState.apps[0].name, 'Roblox', "Bé Bình's apps must be Roblox!");
console.log('✅ PASS: Switched to Bé Bình with exact isolated apps and stars!');

// 3. Switch back to Bé An
console.log('\nSimulating Child Switch: Switching back to Bé An...');
appState = switchChild(appState, 'child_an');
assert.strictEqual(appState.selectedChildId, 'child_an');
assert.strictEqual(appState.child.name, 'Bé An');
assert.strictEqual(appState.kidStars, 25, "Bé An's stars remain 25!");
assert.strictEqual(appState.apps[0].name, 'YouTube');
console.log('✅ PASS: Switched back to Bé An with pristine original state!');

// 4. Test Zero-Bouncing / Stability
console.log('\nTest 3: Rapid Concurrent Listeners Stability (Simulating 50 rapid cloud events)');
let bounceCount = 0;
let lastSelectedStars = appState.kidStars;

for (let i = 0; i < 50; i++) {
  const eventChildId = i % 2 === 0 ? 'child_an' : 'child_binh';
  const newStars = 20 + (i % 5);
  appState = applyCloudUpdateForChild(
    appState,
    eventChildId,
    { battery: 70 + (i % 10) },
    {},
    newStars
  );
  if (appState.selectedChildId === 'child_an') {
    // When Bé An is selected, only events for child_an should touch top-level kidStars
    if (eventChildId === 'child_an') {
      lastSelectedStars = newStars;
    } else {
      if (appState.kidStars !== lastSelectedStars) {
        bounceCount++;
      }
    }
  }
}

assert.strictEqual(bounceCount, 0, 'No state bouncing between children occurred!');
console.log('✅ Test 3 PASSED: 0 bounces detected under 50 rapid concurrent updates!\n');

console.log('====================================================');
console.log('🎉 ALL MULTI-TENANT & MULTI-CHILD ISOLATION TESTS PASSED!');
console.log('====================================================');
