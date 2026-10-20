'use strict';
// 打印指定端口所有窗口的完整 URL 与正文（不截断）
const http = require('http');
const PORT = Number(process.argv[2] || 10101);
const jlist = () => new Promise((res, rej) => http.get(`http://127.0.0.1:${PORT}/json/list`, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)[0])); }).on('error', rej));
(async () => {
  const t = await jlist();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise(r => ws.onopen = r);
  const send = (method, params, tmo=15000) => new Promise(res => { const i=++id; pending.set(i,res); ws.send(JSON.stringify({id:i,method,params:params||{}})); setTimeout(()=>{ if(pending.has(i)){pending.delete(i);res({error:'timeout'});} }, tmo); });
  await send('Runtime.enable');
  const r = await send('Runtime.evaluate', { expression: `(()=>{const el=process.mainModule.require('electron');return JSON.stringify(el.BrowserWindow.getAllWindows().map(w=>({url:w.webContents.getURL(),vis:w.isVisible()})))})()`, returnByValue: true });
  const val = r.result && r.result.result ? r.result.result.value : 'ERR';
  try { console.log(JSON.parse(val).map(x => x.url).join('\n')); } catch (e) { console.log(val); }
  ws.close(); process.exit(0);
})();
