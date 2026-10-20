'use strict';
// 通过应用自身的「取消激活」按钮验证解除流程
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = Number(process.argv[2] || 10641);
const STATE = path.join(process.env.APPDATA, 'Typora', 'virt-reg.json');
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

  console.log('state before:', fs.existsSync(STATE));
  console.log('open:', await ev(`(()=>{const el=process.mainModule.require('electron');const h=el.ipcMain._invokeHandlers.get('license.show');const e2={sender:{send(){},isDestroyed(){return true}}};return Promise.resolve(h(e2)).then(()=>'ok')})()`));
  await new Promise(r => setTimeout(r, 2500));

  console.log('click:', await ev(`(async()=>{
    const el=process.mainModule.require('electron');
    const w=el.BrowserWindow.getAllWindows().find(x=>/license/.test(x.webContents.getURL()||''));
    if(!w) return 'no window';
    return await w.webContents.executeJavaScript("(function(){var b=Array.from(document.querySelectorAll('button')).find(x=>x.textContent.indexOf('取消激活')>=0);if(!b)return 'no btn';b.click();return 'clicked'})()");
  })()`));
  await new Promise(r => setTimeout(r, 3000));
  console.log('state after:', fs.existsSync(STATE));
  console.log('window text:', await ev(`(async()=>{
    const el=process.mainModule.require('electron');
    const w=el.BrowserWindow.getAllWindows().find(x=>/license/.test(x.webContents.getURL()||''));
    if(!w) return 'window gone';
    return await w.webContents.executeJavaScript("(function(){var p=document.querySelector('.page');return p?(p.className+' | '+(p.innerText||'').replace(/\\\\s+/g,' ').slice(0,60)):'no page'})()");
  })()`));
  ws.close(); process.exit(0);
})();
