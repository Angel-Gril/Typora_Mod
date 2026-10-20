// 求和靶向测试: 构造前16字符索引和 = t (t=0..31), 观察是否越过第一层
'use strict';
const http = require('http');
const PORT = Number(process.argv[2] || 9441);
const CHARS = 'L23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const jlist = () => new Promise((res, rej) => http.get(`http://127.0.0.1:${PORT}/json/list`, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)[0])); }).on('error', rej));

function buildLicense(t) {
  // 24 字符, 4 组: 前 16 字符之和 = t, 其余 8 个用 L(0)
  const flat = new Array(24).fill('L');
  let rem = t;
  // 把余量放到第 15 位 (偶数流最后一个) 与前面分摊
  for (let i = 0; i < 16 && rem > 0; i++) {
    const add = Math.min(31, rem);
    flat[i] = CHARS[add];
    rem -= add;
  }
  const g = [];
  for (let i = 0; i < 4; i++) g.push(flat.slice(i * 6, i * 6 + 6).join(''));
  return g.join('-');
}

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

  for (let sum = 0; sum < 32; sum++) {
    const lic = buildLicense(sum);
    const expr = `globalThis.__add(globalThis.__ev,{email:'audit@example.com',license:${JSON.stringify(lic)}}).then(r=>JSON.stringify(r)).catch(e=>'ERR:'+e.message)`;
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, 4000);
    const v = r.result && r.result.result && r.result.result.value;
    const ok = r.error === 'timeout' || (typeof v === 'string' && !v.includes('valid license'));
    console.log(`sum=${String(sum).padStart(2)} lic=${lic} => ${r.error === 'timeout' ? 'TIMEOUT(可能通过)' : JSON.stringify(v)}${ok ? '   <<<< CANDIDATE' : ''}`);
    if (ok) break;
  }
  ws.close(); process.exit(0);
})();
