// 最小 CDP 调试器探测: 下断 -> pause -> 在帧上求值
'use strict';
const http = require('http');
const PORT = Number(process.argv[2] || 9333);
const COL = Number(process.argv[3] || 51504);
const EXPR = process.argv[4] || '1+1';

const jlist = () => new Promise((res, rej) => http.get(`http://127.0.0.1:${PORT}/json/list`, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)[0])); }).on('error', rej));

(async () => {
  const t = await jlist();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pending = new Map(); const events = [];
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method) events.push(m); };
  await new Promise(r => ws.onopen = r);
  const send = (method, params, tmo=8000) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({id:i,method,params:params||{}})); setTimeout(()=>{ if(pending.has(i)){pending.delete(i);res({error:'timeout'});} }, tmo); });

  await send('Runtime.enable'); await send('Debugger.enable');
  await new Promise(r => setTimeout(r, 600));
  const jsc = events.filter(e => e.method==='Debugger.scriptParsed' && /atom\.compiled/.test(e.params.url||'')).map(e=>e.params)[0];
  console.log('script:', jsc && jsc.scriptId);
  const bp = await send('Debugger.setBreakpoint', { location: { scriptId: jsc.scriptId, lineNumber: 0, columnNumber: COL } });
  console.log('bp:', JSON.stringify(bp.result&&bp.result.actualLocation || bp.error));

  const trig = `(()=>{const el=process.mainModule.require('electron');const h=el.ipcMain._invokeHandlers.get('offlineActivation');const ev={sender:{send(){},isDestroyed(){return true}}};return h(ev,'L23456-L23456-L23456-LLLLLL').then(r=>JSON.stringify(r)).catch(e=>'ERR:'+e.message)})()`;
  send('Runtime.evaluate', { expression: trig, returnByValue: true, awaitPromise: false, userGesture: true });

  let paused = null;
  for (let i=0;i<50;i++){ await new Promise(r=>setTimeout(r,200)); const ev = events.find(e=>e.method==='Debugger.paused'); if(ev){paused=ev.params;break;} }
  if (!paused) { console.log('NO PAUSE'); process.exit(0); }
  const top = paused.callFrames[0];
  console.log('paused at', top.functionName, top.location.columnNumber, 'frameId=', top.callFrameId.slice(0,12));

  const r1 = await send('Debugger.evaluateOnCallFrame', { callFrameId: top.callFrameId, expression: EXPR, returnByValue: true });
  console.log('EVAL:', JSON.stringify(r1.result || r1.error).slice(0, 800));

  // 步进 3 次看位置变化
  for (let k=0;k<3;k++){
    const st = await send('Debugger.stepOver');
    let p2 = null;
    for (let i=0;i<40;i++){ await new Promise(r=>setTimeout(r,150)); const evs = events.filter(e=>e.method==='Debugger.paused'); const last = evs[evs.length-1]; if (last && last.params.callFrames[0].callFrameId !== top.callFrameId) { p2 = last.params; break; } }
    if (p2) console.log('step#'+k+' -> col', p2.callFrames[0].location.columnNumber, 'fn', p2.callFrames[0].functionName);
    else { console.log('step#'+k+' no new pause'); break; }
  }

  await send('Debugger.resume');
  setTimeout(()=>{ ws.close(); process.exit(0); }, 300);
})();
