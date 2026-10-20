'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = Number(process.argv[2] || 9941);
const STATE = path.join(process.env.APPDATA, 'Typora', 'virt-reg.json');

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
  console.log('state before:', fs.existsSync(STATE));

  // 打开许可页
  await ev(`(()=>{const el=process.mainModule.require('electron');const h=el.ipcMain._invokeHandlers.get('license.show');const e2={sender:{send(){},isDestroyed(){return true}}};return Promise.resolve(h(e2)).then(()=>'ok')})()`);
  await new Promise(r => setTimeout(r, 2500));

  // 覆盖 confirm 并点击「解除激活」
  const r = await ev(`(async()=>{
    const el=process.mainModule.require('electron');
    const w=el.BrowserWindow.getAllWindows().find(x=>/license/.test(x.webContents.getURL()||''));
    if(!w) return 'no window';
    return await w.webContents.executeJavaScript("(function(){ window.confirm=function(){return true}; var b=document.getElementById('vt-deact'); if(!b) return 'no btn'; b.click(); return 'clicked'; })()", true);
  })()`);
  console.log('click:', r);

  await new Promise(r => setTimeout(r, 3000));
  console.log('state after:', fs.existsSync(STATE));
  console.log('panel after:', await ev(`(async()=>{
    const el=process.mainModule.require('electron');
    const w=el.BrowserWindow.getAllWindows().find(x=>/license/.test(x.webContents.getURL()||''));
    if(!w) return 'window closed';
    return await w.webContents.executeJavaScript("!!document.getElementById('vt-panel')", true);
  })()`));

  ws.close(); process.exit(0);
})();
