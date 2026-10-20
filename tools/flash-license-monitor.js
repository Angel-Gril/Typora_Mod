'use strict';
// 高频监测许可窗口是否曾经可见（检测闪现）
const http = require('http');
const PORT = Number(process.argv[2] || 10811);
const DURATION = Number(process.argv[3] || 9000);
const GAP = Number(process.argv[4] || 50);

const jlist = () => new Promise((res, rej) => http.get(`http://127.0.0.1:${PORT}/json/list`, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)[0])); }).on('error', rej));

(async () => {
  let t = null;
  for (let i = 0; i < 60 && !t; i++) { try { t = await jlist(); } catch (e) { await new Promise(r => setTimeout(r, 100)); } }
  if (!t) { console.log('inspector not ready'); process.exit(1); }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise(r => ws.onopen = r);
  const send = (method, params, tmo=5000) => new Promise(res => { const i=++id; pending.set(i,res); ws.send(JSON.stringify({id:i,method,params:params||{}})); setTimeout(()=>{ if(pending.has(i)){pending.delete(i);res({error:'timeout'});} }, tmo); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : 'ERR'; };
  await send('Runtime.enable');

  const start = Date.now();
  let visibleHits = [], samples = 0;
  while (Date.now() - start < DURATION) {
    const r = await ev(`(()=>{try{
      const el=process.mainModule.require('electron');
      const ws=el.BrowserWindow.getAllWindows().filter(x=>/license/.test((x.webContents&&x.webContents.getURL())||''));
      return JSON.stringify(ws.map(w=>({v:w.isVisible(),o:w.getOpacity()})));
    }catch(e){return '[]'}})()`);
    samples++;
    try {
      const arr = JSON.parse(r);
      for (const w of arr) if (w.v && w.o > 0.01) visibleHits.push({ t: Date.now() - start, o: w.o });
    } catch (e) {}
    await new Promise(r2 => setTimeout(r2, GAP));
  }
  console.log(`samples=${samples} visibleHits=${visibleHits.length}`);
  if (visibleHits.length) {
    console.log('WINDOWS:', JSON.stringify(visibleHits.slice(0, 12)));
    console.log('=> FLASH DETECTED');
  } else {
    console.log('=> NO FLASH (可见且不透明才算闪现)');
  }
  ws.close(); process.exit(0);
})();
