// 断点 + 帧内求值 (外部触发模式: 由 prelude AUTO_TRIGGER 自行调用校验)
'use strict';
const http = require('http');
const PORT = Number(process.argv[2] || 9341);
const COL = Number(process.argv[3] || 51504);
const EXPR = process.argv[4] || "JSON.stringify({fn:this&&this.constructor&&this.constructor.name})";

const jlist = () => new Promise((res, rej) => http.get(`http://127.0.0.1:${PORT}/json/list`, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)[0])); }).on('error', rej));

(async () => {
  const t = await jlist();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pending = new Map(); const events = [];
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method) events.push(m); };
  await new Promise(r => ws.onopen = r);
  const send = (method, params, tmo=8000) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({id:i,method,params:params||{}})); setTimeout(()=>{ if(pending.has(i)){pending.delete(i);res({error:'timeout'});} }, tmo); });

  await send('Runtime.enable'); await send('Debugger.enable');
  await new Promise(r => setTimeout(r, 500));
  const jsc = events.filter(e => e.method==='Debugger.scriptParsed' && /atom\.compiled/.test(e.params.url||'')).map(e=>e.params)[0];
  const bp = await send('Debugger.setBreakpoint', { location: { scriptId: jsc.scriptId, lineNumber: 0, columnNumber: COL } });
  console.log('bp:', JSON.stringify(bp.result && bp.result.actualLocation || bp.error));

  let paused = null;
  for (let i=0;i<80;i++){ await new Promise(r=>setTimeout(r,250)); const ev = events.find(e=>e.method==='Debugger.paused'); if(ev){paused=ev.params;break;} }
  if (!paused) { console.log('NO PAUSE'); process.exit(0); }
  const top = paused.callFrames[0];
  console.log('PAUSED fn=' + top.functionName + ' col=' + top.location.columnNumber);

  // 帧内求值
  const r1 = await send('Debugger.evaluateOnCallFrame', { callFrameId: top.callFrameId, expression: EXPR, returnByValue: true }, 6000);
  console.log('EVAL:', JSON.stringify(r1.result && r1.result.result ? r1.result.result.value : (r1.error||r1.result)).slice(0, 1200));

  // 作用域变量
  for (const sc of (top.scopeChain||[])) {
    const pr = await send('Runtime.getProperties', { objectId: sc.object.objectId, ownProperties: true }, 5000);
    if (pr.result && pr.result.result) {
      const items = pr.result.result.map(p => {
        const v = p.value || {};
        let s = v.value !== undefined ? v.value : (v.type === 'function' ? 'fn' : v.description);
        if (typeof s === 'string' && s.length > 60) s = s.slice(0, 60) + '…';
        return p.name + '=' + JSON.stringify(s);
      });
      console.log(`[${sc.type}] ` + items.slice(0, 30).join(' | ').slice(0, 1500));
    } else {
      console.log(`[${sc.type}] getProperties err ${JSON.stringify(pr.error||pr.result).slice(0,120)}`);
    }
  }

  await send('Debugger.resume');
  setTimeout(()=>{ ws.close(); process.exit(0); }, 300);
})();
