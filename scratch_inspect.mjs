async function inspect() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const targets = await res.json();
  const page = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const handled = localStorage.getItem('kidcare_handled_commands_v1');
          const lastTime = localStorage.getItem('kidcare_last_command_time_v1');
          const arr = JSON.parse(handled || '[]');
          return {
            totalHandled: arr.length,
            lastHandled: arr.slice(-5),
            lastTime
          };
        })()`,
        returnByValue: true
      }
    }));
  };
  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.id === 1) {
      console.log('Handled commands result:', d.result.result.value);
      process.exit(0);
    }
  };
}
inspect().catch(console.error);
