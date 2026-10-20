'use strict';
// 启动后高频采样主窗口文本, 检测"未激活"是否闪现
const http = require('http');
const PORT = Number(process.argv[2] || 10731);
const ROUNDS = Number(process.argv[3] || 24);
const GAP = Number(process.argv[4] || 250);

const jlist = () => new Promise((res, rej) => http.get(`http://127.0.0.1:${PORT}/json/list`, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)[0])); }).on('error', rej));

(async () => {
  let t = null;
  for (let i = 0; i < 40 && !t; i++) {
    try { t = await jlist(); } catch (e) { await new Promise(r => setTimeout(r, 200)); }
  }
  if (!t) { console.log('inspector not ready'); process.exit(1); }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise(r => ws.onopen = r);
  const send = (method, params, tmo=8000) => new Promise(res => { const i=++id; pending.set(i,res); ws.send(JSON.stringify({id:i,method,params:params||{}})); setTimeout(()=>{ if(pending.has(i)){pending.delete(i);res({error:'timeout'});} }, tmo); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : 'ERR'; };
  await send('Runtime.enable');

  let bad = 0, samples = 0;
  for (let i = 0; i < ROUNDS; i++) {
    const r = await ev(`(async()=>{try{
      const el=process.mainModule.require('electron');
      const w=el.BrowserWindow.getAllWindows().find(x=>/window\\.html/.test(x.webContents.getURL()||''));
      if(!w) return 'no-main';
      const t=await w.webContents.executeJavaScript('document.body?document.body.innerText:""');
      return (t.indexOf('未激活')>=0)?'BAD':'ok';
    }catch(e){return 'err:'+e.message}})()`);
    samples++;
    if (r === 'BAD') { bad++; console.log('  [t=' + (i*GAP) + 'ms] 未激活 出现'); }
    await new Promise(r2 => setTimeout(r2, GAP));
  }
  console.log(`samples=${samples} bad=${bad} -> ${bad === 0 ? 'NO FLASH' : 'FLASH DETECTED'}`);
  ws.close(); process.exit(0);
})();
