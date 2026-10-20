'use strict';
// 统计许可窗口数量并截图
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = Number(process.argv[2] || 10571);
const OUT = process.argv[3] || path.join(__dirname, '..', 'exports', 'license-window.png');
const jlist = () => new Promise((res, rej) => http.get(`http://127.0.0.1:${PORT}/json/list`, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)[0])); }).on('error', rej));
(async () => {
  const t = await jlist();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise(r => ws.onopen = r);
  const send = (method, params, tmo=20000) => new Promise(res => { const i=++id; pending.set(i,res); ws.send(JSON.stringify({id:i,method,params:params||{}})); setTimeout(()=>{ if(pending.has(i)){pending.delete(i);res({error:'timeout'});} }, tmo); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : ('ERR ' + JSON.stringify(r.error||r.result)); };
  await send('Runtime.enable');

  console.log('windows:', await ev(`(()=>{const el=process.mainModule.require('electron');return JSON.stringify(el.BrowserWindow.getAllWindows().map(w=>({url:(w.webContents.getURL()||'').slice(-70),vis:w.isVisible(),bounds:w.getBounds()})))})()`));

  const b64 = await ev(`(async()=>{
    const el=process.mainModule.require('electron');
    const w=el.BrowserWindow.getAllWindows().find(x=>/license/.test(x.webContents.getURL()||''));
    if(!w) return '';
    const img = await w.webContents.capturePage();
    return img.toPNG().toString('base64');
  })()`);
  if (b64 && b64.length > 100) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, Buffer.from(b64, 'base64'));
    console.log('screenshot:', OUT, fs.statSync(OUT).size, 'bytes');
  } else {
    console.log('capture failed:', String(b64).slice(0, 120));
  }
  ws.close(); process.exit(0);
})();
