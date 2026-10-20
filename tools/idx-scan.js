// 校验和输入控制扫描: 让 CHARS.indexOf() 恒返回 v, 遍历 v=0..31
'use strict';
const http = require('http');
const fs = require('fs');
const PORT = Number(process.argv[2] || 9601);
const VAL_FILE = 'C:\\AI\\RD\\Tool\\mcp\\typora-license-audit\\patches\\index-val.txt';

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
  await send('Runtime.evaluate', { expression: `(()=>{const el=process.mainModule.require('electron');globalThis.__add=el.ipcMain._invokeHandlers.get('addLicense');globalThis.__ev={sender:{send(){},isDestroyed(){return true}}};return 'ok'})()`, returnByValue: true });

  const LIC = 'L23456-L23456-L23456-LLLLLL';
  for (let v = 0; v < 32; v++) {
    fs.writeFileSync(VAL_FILE, 'first,' + v);
    const expr = `globalThis.__add(globalThis.__ev,{email:'audit@example.com',license:${JSON.stringify(LIC)}}).then(r=>JSON.stringify(r)).catch(e=>'ERR:'+e.message)`;
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, 4000);
    const val = r.result && r.result.result && r.result.result.value;
    const pass = r.error === 'timeout' || (typeof val === 'string' && !val.includes('valid license'));
    console.log(`v=${String(v).padStart(2)} => ${r.error === 'timeout' ? 'TIMEOUT(可能通过)' : JSON.stringify(val)}${pass ? '   <<<<< PASS' : ''}`);
    if (pass) break;
  }
  ws.close(); process.exit(0);
})();
