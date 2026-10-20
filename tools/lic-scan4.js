// 多位置组合穷举: 对末组相邻两位做 32x32 枚举, 覆盖不同权重组合
'use strict';
const http = require('http');
const PORT = Number(process.argv[2] || 9381);
const CHARS = 'L23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const BASE = 'L23456-L23456-L23456-';
const PAIRS = (process.argv[3] || '0,1;1,2;2,3;3,4;4,5').split(';').map(s => s.split(',').map(Number));

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

  const hits = [];
  let tested = 0;
  for (const [pa, pb] of PAIRS) {
    let pairHit = 0;
    for (let a = 0; a < 32; a++) {
      for (let b = 0; b < 32; b++) {
        const tail = ['L','L','L','L','L','L'];
        tail[pa] = CHARS[a]; tail[pb] = CHARS[b];
        const lic = BASE + tail.join('');
        const expr = `globalThis.__h(globalThis.__ev,{email:'audit@example.com',license:${JSON.stringify(lic)}}).then(r=>{const s=JSON.stringify(r);return s.includes('valid license')?'INVALID':'OK:'+s}).catch(e=>'ERR:'+e.message)`;
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, 7000);
        tested++;
        if (r.error === 'timeout') { console.log('TIMEOUT(candidate) ' + lic); hits.push(lic); pairHit++; continue; }
        const v = r.result && r.result.result && r.result.result.value;
        if (typeof v === 'string' && v.startsWith('OK')) { console.log('HIT ' + lic + ' => ' + v); hits.push(lic); pairHit++; }
      }
    }
    console.log(`pair(${pa},${pb}) done, hits so far=${hits.length}`);
    if (pairHit) break;
  }
  console.log('TOTAL tested=' + tested + ' hits=' + JSON.stringify(hits));
  ws.close(); process.exit(0);
})();
