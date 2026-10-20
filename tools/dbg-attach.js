// 保持调试器附着 (Debugger.enable), 使 V8 采用详细栈捕获, 从而 getFunction() 可用
'use strict';
const http = require('http');
const PORT = Number(process.argv[2] || 9361);
const HOLD = Number(process.argv[3] || 45000);

const jlist = () => new Promise((res, rej) => http.get(`http://127.0.0.1:${PORT}/json/list`, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)[0])); }).on('error', rej));

(async () => {
  let t;
  for (let i = 0; i < 40; i++) {
    try { t = await jlist(); break; } catch (e) { await new Promise(r => setTimeout(r, 500)); }
  }
  if (!t) { console.log('no target'); process.exit(1); }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise(r => ws.onopen = r);
  const send = (method, params) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); setTimeout(() => { if (pending.has(i)) { pending.delete(i); res({ error: 'timeout' }); } }, 6000); });
  const r1 = await send('Runtime.enable');
  const r2 = await send('Debugger.enable');
  console.log('attached:', JSON.stringify({ runtime: !r1.error, debugger: !r2.error }));
  await new Promise(r => setTimeout(r, HOLD));
  console.log('detach');
  ws.close();
  process.exit(0);
})();
