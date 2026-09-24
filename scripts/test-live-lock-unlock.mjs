async function evalInWebView(jsCode) {
  const res = await fetch('http://127.0.0.1:9222/json');
  const targets = await res.json();
  const page = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
  if (!page) throw new Error('No inspectable page found in WebView');

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: jsCode, returnByValue: true, awaitPromise: true }
      }));
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === 1) {
        ws.close();
        if (data.result && data.result.exceptionDetails) {
          reject(data.result.exceptionDetails);
        } else {
          resolve(data.result ? data.result.result : null);
        }
      }
    };
    ws.onerror = (err) => reject(err);
    setTimeout(() => {
      try { ws.close(); } catch (_) {}
      reject(new Error('Timeout evaluating JS'));
    }, 5000);
  });
}

async function getPhoneState() {
  const r = await evalInWebView(`(() => {
    try {
      const raw = localStorage.getItem('parent_pro_kid_state_14:5E:69:4B:97:19_v3');
      const s = JSON.parse(raw || '{}');
      const cid = s.selectedChildId || 'child_mub0x9nl7n6';
      const cs = s.childSettings?.[cid] || {};
      return {
        selectedChildId: s.selectedChildId,
        isLocked: Boolean(s.isLocked || cs.isLocked || cs.lockChallenge?.isLocked),
        lockType: cs.lockChallenge?.lockType || s.lockChallenge?.lockType || 'none',
        todayTotalMinutes: cs.screenTime?.todayTotalMinutes || 0,
        screenLimit: cs.screenTimeLimitMinutes || 135,
        hasLockModal: Boolean(document.querySelector('[class*="bg-slate-950"]')),
        routines: cs.smartRoutines
      };
    } catch (e) {
      return { error: e.message };
    }
  })()`);
  return r?.value;
}

async function waitForPhoneState(predicate, maxWaitMs = 10000, intervalMs = 500) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const s = await getPhoneState();
    if (predicate(s)) return s;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return await getPhoneState();
}

async function run() {
  console.log('=== TEST LIVE LOCK & UNLOCK ON OPPO PHONE ===\n');

  const serverBase = 'https://everything-solution-tin-chosen.trycloudflare.com';

  // 1. Get signed parent token
  const tokenRes = await fetch(`${serverBase}/api/auth/token`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer parent_master_secret_2026', 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'parent', id: 'yaDXFmTMcccQV6m53Rxtw4LOF303' })
  });
  const tokenData = await tokenRes.json();
  const token = tokenData.token || tokenData.sessionToken;
  console.log('1. Got signed parent token:', token.substring(0, 30) + '...');

  // 2. Check initial state
  const state0 = await getPhoneState();
  console.log('2. Initial phone state:', state0);

  // 3. Test sending lock_now
  console.log('\n3. Parent sends LOCK_NOW command (instant lock)...');
  const lockRes = await fetch(`${serverBase}/api/command`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      parentId: 'yaDXFmTMcccQV6m53Rxtw4LOF303',
      childId: 'child_mub0x9nl7n6',
      command: 'lock_now',
      payload: {
        lockType: 'instant',
        title: 'Bố mẹ tạm khóa thiết bị 🔒',
        description: 'Con hãy nghỉ ngơi một chút nhé!'
      }
    })
  });
  console.log('   Lock command sent:', await lockRes.json());

  // Wait dynamically for phone to lock
  const stateAfterLock = await waitForPhoneState(s => s.isLocked && s.hasLockModal);
  console.log('4. Phone state after LOCK_NOW:', stateAfterLock);

  if (!stateAfterLock.isLocked || !stateAfterLock.hasLockModal) {
    console.error('❌ FAIL: Lock screen did not show up!');
    process.exit(1);
  }
  console.log('   ✅ LOCK SUCCESS: Phone locked with modal displayed!');

  // 5. Test sending unlock_now
  console.log('\n5. Parent sends UNLOCK_NOW command...');
  const unlockRes = await fetch(`${serverBase}/api/command`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      parentId: 'yaDXFmTMcccQV6m53Rxtw4LOF303',
      childId: 'child_mub0x9nl7n6',
      command: 'unlock_now'
    })
  });
  console.log('   Unlock command sent:', await unlockRes.json());

  // Wait dynamically for phone to unlock
  const stateAfterUnlock = await waitForPhoneState(s => !s.isLocked && !s.hasLockModal);
  console.log('6. Phone state after UNLOCK_NOW:', stateAfterUnlock);

  if (stateAfterUnlock.isLocked || stateAfterUnlock.hasLockModal) {
    console.error('❌ FAIL: Lock screen was not dismissed!');
    process.exit(1);
  }
  if (stateAfterUnlock.todayTotalMinutes < 135) {
    console.error('❌ FAIL: Screen time was reset to 0 or below 135 mins!');
    process.exit(1);
  }
  console.log('   ✅ UNLOCK SUCCESS: Screen unlocked cleanly, usage time preserved at', stateAfterUnlock.todayTotalMinutes, 'mins!');

  console.log('\n🎉 ALL TESTS PASSED! Remote lock and unlock work perfectly on the OPPO phone and screen time is preserved at', stateAfterUnlock.todayTotalMinutes, 'mins without resetting to 0!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
