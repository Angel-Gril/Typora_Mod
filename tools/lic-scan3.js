// 用 addLicense 作 oracle 穷举 license 校验和 (合法 -> 转网络请求, 非法 -> 立即返回错误)
'use strict';
const http = require('http');
const PORT = Number(process.argv[2] || 9361);
const BASE = process.argv[3] || 'L23456-L23456-L23456-';
const TAIL = process.argv[4] || 'LLLLLL';
const CHARS = 'L23456789ABCDEFGHJKMNPQRSTUVWXYZ';

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
  await send('Runtime.evaluate', { expression: `(()=>{const el=process.mainModule.require('electron');globalThis.__h=el.ipcMain._invokeHandlers.get('addLicense');globalThis.__ev={sender:{send(){},isDestroyed(){return true}}};return 'ok'})()`, returnByValue: true });

  const probe = await send('Runtime.evaluate', { expression: `globalThis.__h(globalThis.__ev,{email:'audit@example.com',license:'L23456-L23456-L23456-LLLLLL'}).then(r=>JSON.stringify(r)).catch(e=>'ERR:'+e.message)`, returnByValue: true, awaitPromise: true }, 6000);
  console.log('baseline:', JSON.stringify(probe.result && probe.result.result && probe.result.result.value || probe.error));

  const hits = [];
  let tested = 0;
  for (let a = 0; a < 32 && hits.length < 3; a++) {
    for (let b = 0; b < 32 && hits.length < 3; b++) {
      const lic = BASE + CHARS[a] + CHARS[b] + TAIL.slice(2);
      const expr = `globalThis.__h(globalThis.__ev,{email:'audit@example.com',license:${JSON.stringify(lic)}}).then(r=>{const s=JSON.stringify(r);return s.includes('valid license')?'INVALID':'OK:'+s}).catch(e=>'ERR:'+e.message)`;
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, 8000);
      tested++;
      const v = r.result && r.result.result && r.result.result.value;
      if (r.error === 'timeout') { console.log('TIMEOUT(candidate may be valid) ' + lic); continue; }
      if (typeof v === 'string' && v.startsWith('OK')) { console.log('HIT ' + lic + ' => ' + v); hits.push(lic); }
    }
    if (a % 8 === 0) console.log(`  a=${a} tested=${tested} hits=${hits.length}`);
  }
  console.log('done tested=' + tested + ' hits=' + JSON.stringify(hits));
  ws.close(); process.exit(0);
})();
