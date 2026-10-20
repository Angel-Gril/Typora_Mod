'use strict';
const http = require('http');
const PORT = Number(process.argv[2] || 9891);
const jlist = () => new Promise((res, rej) => http.get(`http://127.0.0.1:${PORT}/json/list`, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)[0])); }).on('error', rej));
(async () => {
  const t = await jlist();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise(r => ws.onopen = r);
  const send = (method, params, tmo=15000) => new Promise(res => { const i=++id; pending.set(i,res); ws.send(JSON.stringify({id:i,method,params:params||{}})); setTimeout(()=>{ if(pending.has(i)){pending.delete(i);res({error:'timeout'});} }, tmo); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : ('ERR ' + JSON.stringify(r.error||r.result)); };
  await send('Runtime.enable');
  const probe = `(async()=>{
    const el=process.mainModule.require('electron');
    const w=el.BrowserWindow.getAllWindows().find(x=>/license/.test(x.webContents.getURL()||''));
    if(!w) return 'no license window';
    return await w.webContents.executeJavaScript("JSON.stringify({panel:!!document.getElementById('vt-panel'),stop:!!window.__vtStop,root:!!document.getElementById('root'),bodyLen:(document.body?document.body.innerHTML.length:-1),head:(document.body?document.body.innerHTML.slice(0,100):'')})", true);
  })()`;
  console.log('probe:', await ev(probe));
  // 强制再注入一次
  const reinject = `(async()=>{
    const el=process.mainModule.require('electron');
    const w=el.BrowserWindow.getAllWindows().find(x=>/license/.test(x.webContents.getURL()||''));
    if(!w) return 'no win';
    return await w.webContents.executeJavaScript("(function(){var p=document.getElementById('vt-panel');return p?'exists':'missing'})()", true);
  })()`;
  console.log('again:', await ev(reinject));
  ws.close(); process.exit(0);
})();
