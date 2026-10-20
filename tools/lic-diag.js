// 诊断矩阵: 不同形态输入, 观察返回消息是否变化 (定位拦截层)
'use strict';
const http = require('http');
const PORT = Number(process.argv[2] || 9381);

const CANDS = [
  ['empty', ''],
  ['3char', 'abc'],
  ['4x4', 'AAAA-BBBB-CCCC-DDDD'],
  ['6x4-A', 'AAAAAA-AAAAAA-AAAAAA-AAAAAA'],
  ['6x4-digit', '234567-234567-234567-234567'],
  ['6x4-zero', '000000-000000-000000-000000'],
  ['6x4-L', 'LLLLLL-LLLLLL-LLLLLL-LLLLLL'],
  ['lower', 'aaaaaa-aaaaaa-aaaaaa-aaaaaa'],
  ['mixed', 'L23456-ABCDEF-GHJKMQ-RSTUVW'],
  ['long', 'AAAAAA-AAAAAA-AAAAAA-AAAAAAA'],
];

const jlist = () => new Promise((res, rej) => http.get(`http://127.0.0.1:${PORT}/json/list`, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)[0])); }).on('error', rej));

(async () => {
  const t = await jlist();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise(r => ws.onopen = r);
  const send = (method, params, tmo=9000) => new Promise(res => {
    const i = ++id; pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params: params || {} }));
    setTimeout(() => { if (pending.has(i)) { pending.delete(i); res({ error: 'timeout' }); } }, tmo);
  });

  await send('Runtime.enable');
  await send('Runtime.evaluate', { expression: `(()=>{const el=process.mainModule.require('electron');globalThis.__add=el.ipcMain._invokeHandlers.get('addLicense');globalThis.__off=el.ipcMain._invokeHandlers.get('offlineActivation');globalThis.__ev={sender:{send(){},isDestroyed(){return true}}};return 'ok'})()`, returnByValue: true });

  for (const [name, lic] of CANDS) {
    const expr = `globalThis.__add(globalThis.__ev,{email:'audit@example.com',license:${JSON.stringify(lic)}}).then(r=>JSON.stringify(r)).catch(e=>'ERR:'+e.message)`;
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, 6000);
    const v = r.result && r.result.result && r.result.result.value;
    console.log(`${name.padEnd(12)} ${JSON.stringify(lic).padEnd(30)} => ${r.error === 'timeout' ? 'TIMEOUT(可能通过本地校验)' : JSON.stringify(v)}`);
  }
  ws.close(); process.exit(0);
})();
