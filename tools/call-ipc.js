'use strict';
// 直接调用（原始）IPC 处理器并打印结果
const http = require('http');
const PORT = Number(process.argv[2] || 10301);
const CH = process.argv[3] || 'addLicense';
const ARG = process.argv[4] || '{}';
const jlist = () => new Promise((res, rej) => http.get(`http://127.0.0.1:${PORT}/json/list`, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)[0])); }).on('error', rej));
(async () => {
  const t = await jlist();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise(r => ws.onopen = r);
  const send = (method, params, tmo=25000) => new Promise(res => { const i=++id; pending.set(i,res); ws.send(JSON.stringify({id:i,method,params:params||{}})); setTimeout(()=>{ if(pending.has(i)){pending.delete(i);res({error:'timeout'});} }, tmo); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : ('ERR ' + JSON.stringify(r.error||r.result)); };
  await send('Runtime.enable');
  const script = `(async()=>{
    const el=process.mainModule.require('electron');
    const h=el.ipcMain._invokeHandlers.get(${JSON.stringify(CH)});
    if(!h) return 'no handler';
    const ev2={sender:{send(){},isDestroyed(){return true}}};
    try { const r = await h(ev2, ${ARG}); return 'OK:'+JSON.stringify(r); }
    catch(e){ return 'THROW:'+e.message; }
  })()`;
  console.log(CH + ':', await ev(script));
  ws.close(); process.exit(0);
})();
