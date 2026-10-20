// CDP 客户端 v2: 用 Node 原生 WebSocket
'use strict';
const http = require('http');

const CDP_PORT = Number(process.argv[2] || 9229);
const expr = process.argv[3];
if (!expr) { console.error('usage: node cdp-eval.js "<js expr>"'); process.exit(1); }

http.get('http://127.0.0.1:' + CDP_PORT + '/json/list', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    const targets = JSON.parse(d);
    const node = targets.find(x => x.type === 'node') || targets[0];
    if (!node) { console.error('no target'); process.exit(1); }
    run(node.webSocketDebuggerUrl);
  });
}).on('error', e => { console.error('list fail: ' + e.message); process.exit(1); });

function run(url) {
  const ws = new WebSocket(url);
  const timer = setTimeout(() => { console.error('TIMEOUT'); process.exit(1); }, 10000);
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }
    }));
  };
  ws.onmessage = ev => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.id === 1) {
        clearTimeout(timer);
        if (msg.result && msg.result.exceptionDetails) {
          const ex = msg.result.exceptionDetails;
          console.log('EXCEPTION: ' + (ex.exception && (ex.exception.description || ex.exception.value) || JSON.stringify(ex)).slice(0, 3000));
        } else if (msg.result && msg.result.result) {
          const r = msg.result.result;
          if (r.type === 'string') console.log(r.value);
          else console.log(JSON.stringify(r.value, null, 2));
        } else {
          console.log(JSON.stringify(msg).slice(0, 2000));
        }
        ws.close();
        process.exit(0);
      }
    } catch (e) {}
  };
  ws.onerror = e => { console.error('WS ERR: ' + (e.message || e.type)); process.exit(1); };
}
