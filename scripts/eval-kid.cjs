const http = require('http');

async function evalInWebView(jsCode) {
  const res = await fetch('http://localhost:9222/json');
  const targets = await res.json();
  const page = targets.find(t => {
    if (t.type !== 'page' || !t.webSocketDebuggerUrl) return false;
    try {
      const d = JSON.parse(t.description || '{}');
      return d.attached === true;
    } catch (_) {
      return true;
    }
  }) || targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);

  if (!page) {
    throw new Error('No inspectable attached page found in WebView');
  }

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.onopen = () => {
      const msg = {
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: jsCode,
          returnByValue: true,
          awaitPromise: true
        }
      };
      ws.send(JSON.stringify(msg));
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

const code = process.argv.slice(2).join(' ');
evalInWebView(code)
  .then(res => console.log('Result:', JSON.stringify(res, null, 2)))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
