// Use built-in WebSocket in Node 22+

async function main() {
  const listRes = await fetch('http://localhost:9222/json');
  const list = await listRes.json();
  const page = list[0];
  if (!page) {
    console.error('No page found');
    return;
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const kidInfo = JSON.parse(localStorage.getItem('kid_device_paired_info') || '{}');
          const devId = kidInfo.deviceId || 'kid_default';
          const storageKey = 'parent_pro_kid_state_' + devId + '_v3';
          const rawState = localStorage.getItem(storageKey);
          const stateObj = rawState ? JSON.parse(rawState) : {};
          const targetChildId = kidInfo.childId;
          const targetSettings = stateObj.childSettings?.[targetChildId];
          return JSON.stringify({
            targetChildId,
            serverUrl: localStorage.getItem('parentpro_server_url'),
            localIsLocked: targetSettings?.isLocked,
            localLockChallenge: targetSettings?.lockChallenge,
            rootLockChallenge: stateObj.lockChallenge
          });
        })()`,
        awaitPromise: false
      }
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id === 1) {
      console.log('--- ALL LOCALSTORAGE KEYS ---');
      console.log(data.result?.result?.value);
      ws.close();
      process.exit(0);
    }
  };
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
