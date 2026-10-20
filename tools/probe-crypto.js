'use strict';
const http = require('http');
const PORT = Number(process.argv[2] || 9991);
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

  console.log('crypto patched:', await ev(`(()=>{const c=process.mainModule.require('crypto');return JSON.stringify({probe:!!c.__vtProbe, pd:String(c.publicDecrypt).slice(0,60)})})()`));

  const token = Buffer.from(JSON.stringify({
    deviceId: 'x', fingerprint: 'y', email: 'a@b',
    license: 'WG3PH4-8NEUV9-BX5RYJ-EU8N2F',
    version: '1.14.10', date: '2099-12-31', type: 'standard'
  })).toString('base64');

  const script = `(async()=>{
    const el=process.mainModule.require('electron');
    const h=el.ipcMain._invokeHandlers.get('offlineActivation');
    if(!h) return 'no handler';
    const ev2={sender:{send(){},isDestroyed(){return true}}};
    try { const r = await h(ev2, ${JSON.stringify(token + '|SIGFAKE#')}); return 'OK:'+JSON.stringify(r); }
    catch(e){ return 'THROW:'+e.message; }
  })()`;
  console.log('offlineActivation:', await ev(script));

  const script2 = `(async()=>{
    const el=process.mainModule.require('electron');
    const h=el.ipcMain._invokeHandlers.get('addLicense');
    if(!h) return 'no handler';
    const ev2={sender:{send(){},isDestroyed(){return true}}};
    try { const r = await h(ev2, {email:'a@b', license:'WG3PH4-8NEUV9-BX5RYJ-EU8N2F'}); return 'OK:'+JSON.stringify(r); }
    catch(e){ return 'THROW:'+e.message; }
  })()`;
  console.log('addLicense:', await ev(script2));

  ws.close(); process.exit(0);
})();
