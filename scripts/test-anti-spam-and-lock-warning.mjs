// Uses global WebSocket in Node 22+

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
        lockTitle: cs.lockChallenge?.title || s.lockChallenge?.title || '',
        todayTotalMinutes: cs.screenTime?.todayTotalMinutes || 0,
        screenLimit: cs.screenTimeLimitMinutes || 135,
        hasLockModal: Boolean(document.querySelector('[class*="bg-slate-950"]'))
      };
    } catch (e) {
      return { error: e.message };
    }
  })()`);
  return r?.value;
}

async function waitForPhoneState(predicate, maxWaitMs = 10000, intervalMs = 400) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const s = await getPhoneState();
    if (predicate(s)) return s;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return await getPhoneState();
}

async function run() {
  console.log('===========================================================');
  console.log('🚀 TESTING ANTI-SPAM AND REAL-TIME LOCK WARNING SYSTEM');
  console.log('===========================================================\n');

  const serverBase = 'http://127.0.0.1:3000';
  const childId = 'child_mub0x9nl7n6';
  const parentId = 'yaDXFmTMcccQV6m53Rxtw4LOF303';

  // 1. Get signed parent token
  console.log('1. Authenticating parent...');
  const tokenRes = await fetch(`${serverBase}/api/auth/token`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer parent_master_secret_2026', 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'parent', id: parentId })
  });
  const tokenData = await tokenRes.json();
  const token = tokenData.token || tokenData.sessionToken;
  console.log('   ✅ Parent authenticated. Token acquired.\n');

  // 2. Test Anti-Spam on Remote Commands (/api/command)
  console.log('2. Testing Anti-Spam command throttling (/api/command)...');
  console.log('   Firing 5 rapid LOCK_NOW commands in parallel...');
  const sendCommand = (cmd, payload = {}) => fetch(`${serverBase}/api/command`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentId, childId, command: cmd, payload })
  });

  const cmdPayload = {
    lockType: 'instant',
    title: 'Bố mẹ tạm khóa thiết bị 🔒',
    description: 'Con hãy nghỉ ngơi một chút nhé!'
  };

  const burstResults = await Promise.all([
    sendCommand('lock_now', cmdPayload),
    sendCommand('lock_now', cmdPayload),
    sendCommand('lock_now', cmdPayload),
    sendCommand('lock_now', cmdPayload),
    sendCommand('lock_now', cmdPayload)
  ]);

  const burstJson = await Promise.all(burstResults.map(r => r.json().catch(() => ({ status: r.status }))));
  console.log('   Burst responses:', burstJson.map(j => ({ success: j.success, throttled: j.throttled, code: j.code, message: j.message })));

  const throttledCount = burstJson.filter(j => j.throttled === true || j.code === 'RATE_LIMIT_EXCEEDED').length;
  const successCount = burstJson.filter(j => j.success === true && !j.throttled).length;
  console.log(`   Processed: ${successCount} executed, ${throttledCount} throttled by Anti-Spam.`);

  if (throttledCount < 4) {
    console.error('❌ FAIL: Anti-spam did not throttle duplicate burst commands adequately!');
    process.exit(1);
  }
  console.log('   ✅ PASS: Anti-spam successfully blocked duplicate burst commands!\n');

  // 3. Test Different Command Not Blocked (e.g. unlock immediately allowed)
  console.log('3. Testing that different command key (unlock_now) is NOT blocked by lock cooldown...');
  const unlockDiffRes = await sendCommand('unlock_now');
  const unlockDiffJson = await unlockDiffRes.json();
  console.log('   Unlock result:', unlockDiffJson);
  if (unlockDiffJson.throttled) {
    console.error('❌ FAIL: unlock_now was incorrectly throttled by lock_now cooldown!');
    process.exit(1);
  }
  console.log('   ✅ PASS: Different command executed without false throttle.\n');

  // 4. Test Anti-Spam on /api/time-requests (10s cooldown)
  console.log('4. Testing Anti-Spam on /api/time-requests (10s cooldown)...');
  const reqTime = () => fetch(`${serverBase}/api/time-requests`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      childId,
      childName: 'Bé An',
      requestedMinutes: 15,
      reason: 'Con cần xem bài học'
    })
  });

  const tr1 = await reqTime();
  const tr1Json = await tr1.json();
  const tr2 = await reqTime();
  const tr2Json = await tr2.json();

  console.log('   Request 1:', { status: tr1.status, success: tr1Json.success });
  console.log('   Request 2 (immediate spam):', { status: tr2.status, throttled: tr2Json.throttled, error: tr2Json.error });

  if (!tr2Json.throttled) {
    console.error('❌ FAIL: Time extension spam was not rate limited!');
    process.exit(1);
  }
  console.log('   ✅ PASS: Time extension request rate limit successfully throttled duplicate request!\n');

  // 5. Test Anti-Spam on /api/sos (5s cooldown)
  console.log('5. Testing Anti-Spam on /api/sos (5s cooldown)...');
  const sendSos = () => fetch(`${serverBase}/api/sos`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      childId,
      childName: 'Bé An',
      lat: 21.0285,
      lng: 105.8542,
      address: 'Hà Nội'
    })
  });

  const sos1 = await sendSos();
  const sos1Json = await sos1.json();
  const sos2 = await sendSos();
  const sos2Json = await sos2.json();

  console.log('   SOS 1:', { status: sos1.status, success: sos1Json.success });
  console.log('   SOS 2 (immediate spam):', { status: sos2.status, throttled: sos2Json.throttled });

  if (!sos2Json.throttled) {
    console.error('❌ FAIL: SOS spam was not rate limited!');
    process.exit(1);
  }
  console.log('   ✅ PASS: SOS rate limit successfully prevented alert flood!\n');

  // 6. Test Real-Time Lock and Phone Telemetry Verification
  console.log('6. Testing Real-Time Lock and Hardware Telemetry Verification...');
  console.log('   Locking phone via parent command...');
  await new Promise(r => setTimeout(r, 2200)); // wait past 2s command cooldown
  const lockExecRes = await sendCommand('lock_now', {
    lockType: 'instant',
    title: 'Bố mẹ tạm khóa thiết bị 🔒',
    description: 'Giờ học bài tập trung con nhé!'
  });
  console.log('   Sent lock_now command:', await lockExecRes.json());

  console.log('   Waiting for OPPO phone to receive lock and render lock screen...');
  const lockedState = await waitForPhoneState(s => s.isLocked && s.hasLockModal, 10000);
  console.log('   Phone state after lock:', lockedState);

  if (!lockedState.isLocked || !lockedState.hasLockModal) {
    console.error('❌ FAIL: Physical phone did not lock!');
    process.exit(1);
  }
  console.log('   ✅ PASS: OPPO phone is physically locked with modal displayed!');

  // Check telemetry on server
  console.log('   Checking live telemetry on server for child...');
  await new Promise(r => setTimeout(r, 1500));
  const telemetryRes = await fetch(`${serverBase}/api/telemetry?childId=${childId}&limit=5`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const telemetryData = await telemetryRes.json();
  const latestLoc = telemetryData.locations?.[0] || {};
  console.log('   Latest telemetry from cloud:', {
    isLocked: latestLoc.isLocked,
    lockType: latestLoc.lockType,
    lockTitle: latestLoc.lockTitle,
    lockedAt: latestLoc.lockedAt,
    batteryLevel: latestLoc.batteryLevel
  });

  if (!latestLoc.isLocked) {
    console.error('❌ FAIL: Server telemetry does not reflect real-time lock state!');
    process.exit(1);
  }
  console.log('   ✅ PASS: Real-time lock telemetry reported to cloud and parent dashboard!\n');

  // 7. Test Real-Time Unlock and Screen Time Preservation
  console.log('7. Testing Real-Time Unlock and Screen Time Preservation...');
  await new Promise(r => setTimeout(r, 2200)); // wait past command cooldown
  const unlockExecRes = await sendCommand('unlock_now');
  console.log('   Sent unlock_now command:', await unlockExecRes.json());

  console.log('   Waiting for OPPO phone to unlock...');
  const unlockedState = await waitForPhoneState(s => !s.isLocked && !s.hasLockModal, 10000);
  console.log('   Phone state after unlock:', unlockedState);

  if (unlockedState.isLocked || unlockedState.hasLockModal) {
    console.error('❌ FAIL: Phone did not unlock!');
    process.exit(1);
  }
  if (unlockedState.todayTotalMinutes < 135) {
    console.error('❌ FAIL: Screen time was reset to 0 or dropped below 135 minutes!');
    process.exit(1);
  }
  console.log(`   ✅ PASS: Phone unlocked cleanly! Screen time preserved at ${unlockedState.todayTotalMinutes} mins (Limit: ${unlockedState.screenLimit} mins).\n`);

  // Check telemetry after unlock
  await new Promise(r => setTimeout(r, 1500));
  const telemetryAfterRes = await fetch(`${serverBase}/api/telemetry?childId=${childId}&limit=5`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const telemetryAfterData = await telemetryAfterRes.json();
  const latestAfterLoc = telemetryAfterData.locations?.[0] || {};
  console.log('   Telemetry after unlock:', {
    isLocked: latestAfterLoc.isLocked,
    lockType: latestAfterLoc.lockType
  });

  console.log('===========================================================');
  console.log('🎉 ALL TESTS PASSED: Anti-spam and Real-time lock warning verified on physical OPPO device!');
  console.log('===========================================================');
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
