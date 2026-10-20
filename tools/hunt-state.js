'use strict';
// 应用启动后调用 state-hunt 扫描主进程对象
const http = require('http');
const path = require('path');
const PORT = Number(process.argv[2] || 10721);
const MOD = (process.env.LOCALAPPDATA + '\\TyporaVirt\\state-hunt.js').replace(/\\/g, '/');
const jlist = () => new Promise((res, rej) => http.get(`http://127.0.0.1:${PORT}/json/list`, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)[0])); }).on('error', rej));
(async () => {
  const t = await jlist();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise(r => ws.onopen = r);
  const send = (method, params, tmo=30000) => new Promise(res => { const i=++id; pending.set(i,res); ws.send(JSON.stringify({id:i,method,params:params||{}})); setTimeout(()=>{ if(pending.has(i)){pending.delete(i);res({error:'timeout'});} }, tmo); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : ('ERR ' + JSON.stringify(r.error||r.result)); };
  await send('Runtime.enable');

  console.log('modules:', await ev(`Object.keys(require.cache).length`));
  console.log('hunt:', await ev(`(()=>{ try { const h=process.mainModule.require(${JSON.stringify(MOD)}).hunt({set:false}); return JSON.stringify(h.slice(0,25)); } catch(e){ return 'ERR '+e.message; } })()`));
  ws.close(); process.exit(0);
})();
