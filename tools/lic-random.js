// 随机序列号搜索: 测真实接受率, 顺带找可用 key
'use strict';
const http = require('http');
const PORT = Number(process.argv[2] || 9621);
const N = Number(process.argv[3] || 1500);
const CHARS = 'L23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const jlist = () => new Promise((res, rej) => http.get(`http://127.0.0.1:${PORT}/json/list`, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)[0])); }).on('error', rej));

function randLic() {
  let a = '';
  for (let g = 0; g < 4; g++) { if (g) a += '-'; for (let i = 0; i < 6; i++) a += CHARS[Math.floor(Math.random() * 32)]; }
  return a;
}

(async () => {
  const t = await jlist();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise(r => ws.onopen = r);
  const send = (method, params, tmo=8000) => new Promise(res => {
    const i = ++id; pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params: params || {} }));
    setTimeout(() => { if (pending.has(i)) { pending.delete(i); res({ error: 'timeout' }); } }, tmo);
  });
  await send('Runtime.enable');
  await send('Runtime.evaluate', { expression: `(()=>{const el=process.mainModule.require('electron');globalThis.__add=el.ipcMain._invokeHandlers.get('addLicense');globalThis.__ev={sender:{send(){},isDestroyed(){return true}}};return 'ok'})()`, returnByValue: true });

  let hits = 0, tested = 0, timeouts = 0, other = 0;
  const found = [];
  for (let i = 0; i < N; i++) {
    const lic = randLic();
    const expr = `globalThis.__add(globalThis.__ev,{email:'audit@example.com',license:${JSON.stringify(lic)}}).then(r=>JSON.stringify(r)).catch(e=>'ERR:'+e.message)`;
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, 3000);
    tested++;
    if (r.error === 'timeout') { timeouts++; continue; }
    const v = r.result && r.result.result && r.result.result.value;
    if (typeof v === 'string' && !v.includes('valid license')) {
      hits++; found.push(lic + ' => ' + v);
      console.log('HIT ' + lic + ' => ' + v);
      if (hits >= 5) break;
    } else if (typeof v === 'string' && v !== '[false,"Please input a valid license code"]') {
      other++; console.log('OTHER ' + lic + ' => ' + v);
    }
    if (i % 200 === 0) console.log(`  progress ${i} tested=${tested} hits=${hits} timeouts=${timeouts}`);
  }
  console.log(`DONE tested=${tested} hits=${hits} timeouts=${timeouts} other=${other}`);
  ws.close(); process.exit(0);
})();
