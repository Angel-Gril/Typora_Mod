// 用 CDP Debugger 在 JSC 字节码偏移处下断, 读取校验函数作用域/局部变量
'use strict';
const http = require('http');
const PORT = Number(process.argv[2] || 9333);
const OFFSETS = (process.argv[3] || '51504').split(',').map(Number);

function jlist() {
  return new Promise((res, rej) => {
    http.get(`http://127.0.0.1:${PORT}/json/list`, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)[0]));
    }).on('error', rej);
  });
}

(async () => {
  const t = await jlist();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.method) events.push(m);
  };
  await new Promise(r => ws.onopen = r);
  const send = (method, params) => new Promise(res => {
    const i = ++id; pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params: params || {} }));
    setTimeout(() => { if (pending.has(i)) { pending.delete(i); res({ error: 'timeout' }); } }, 6000);
  });

  await send('Runtime.enable');
  await send('Debugger.enable');
  await new Promise(r => setTimeout(r, 800));

  const scripts = events.filter(e => e.method === 'Debugger.scriptParsed').map(e => e.params);
  const jsc = scripts.filter(s => /atom\.compiled/.test(s.url || ''));
  console.log('scripts:', scripts.length, 'jsc:', jsc.map(s => `${s.scriptId} ${s.url}`).join(' ; '));
  if (!jsc.length) { console.log('no jsc script parsed yet'); }

  const target = jsc[0];
  if (target) {
    for (const col of OFFSETS) {
      const bp = await send('Debugger.setBreakpoint', { location: { scriptId: target.scriptId, lineNumber: 0, columnNumber: col } });
      console.log('bp@' + col + ':', JSON.stringify(bp.result || bp.error));
    }
  }

  // 触发校验链
  const trig = `(()=>{const el=process.mainModule.require('electron');const h=el.ipcMain._invokeHandlers.get('offlineActivation');const ev={sender:{send(){},isDestroyed(){return true}}};return h(ev,'L23456-L23456-L23456-LLLLLL').then(r=>JSON.stringify(r)).catch(e=>'ERR:'+e.message)})()`;
  const p = send('Runtime.evaluate', { expression: trig, returnByValue: true, awaitPromise: false, userGesture: true });

  // 等 paused 事件
  let paused = null;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 200));
    const ev = events.find(e => e.method === 'Debugger.paused');
    if (ev) { paused = ev.params; break; }
  }
  if (!paused) { console.log('no pause'); process.exit(0); }

  console.log('PAUSED reason=' + paused.reason + ' frames=' + paused.callFrames.length);
  const top = paused.callFrames[0];
  // 1) 直接在该帧作用域求值, 探测可用标识符
  const probeNames = ['D','F','X','N','t','e','n','s','o','r','a','i','license','email','checksum','charset','CHARS','key','token','sum','data','obj','payload','buf','b64','sig'];
  const probes = probeNames.map(nm => `(typeof ${nm}!=='undefined'?(${nm}===null?'null':typeof ${nm}==='function'?'fn:'+${nm}.length:typeof ${nm}==='string'?'str('+${nm}.length+'):'+${nm}.slice(0,40):typeof ${nm}+':'+String(${nm}).slice(0,40)):'-')`);
  const ev1 = await send('Debugger.evaluateOnCallFrame', {
    callFrameId: top.callFrameId,
    expression: `[${probes.join(',')}]`,
    returnByValue: true
  });
  if (ev1.result && ev1.result.result && ev1.result.result.value) {
    probeNames.forEach((nm, i) => {
      const v = ev1.result.result.value[i];
      if (v !== '-') console.log(`  probe ${nm}: ${v}`);
    });
  } else {
    console.log('  probe err:', JSON.stringify(ev1.error || ev1.result).slice(0, 300));
  }

  let idx = 0;
  for (const cf of paused.callFrames) {
    const loc = cf.location || {};
    console.log(`#${idx} fn=${cf.functionName || '(anon)'} script=${loc.scriptId} line=${loc.lineNumber} col=${loc.columnNumber}`);
    const scopes = cf.scopeChain || [];
    for (let si = 0; si < scopes.length; si++) {
      const sc = scopes[si];
      const props = await send('Runtime.getProperties', { objectId: sc.object.objectId, ownProperties: true });
      if (props.result && props.result.result) {
        const items = props.result.result
          .filter(pr => pr.value && pr.value.type !== 'function')
          .map(pr => {
            const v = pr.value;
            let s = v.value;
            if (typeof s === 'string') s = s.slice(0, 80);
            else if (s === undefined) s = v.description || v.type;
            return pr.name + '=' + JSON.stringify(s);
          });
        if (items.length) console.log(`   [${sc.type}] ` + items.slice(0, 25).join(' | ').slice(0, 1200));
        const fns = props.result.result.filter(pr => pr.value && pr.value.type === 'function').map(pr => pr.name);
        if (fns.length) console.log(`   [${sc.type}] fns: ` + fns.slice(0, 30).join(','));
      }
    }
    idx++;
    if (idx >= 4) break;
  }

  await send('Debugger.resume');
  await new Promise(r => setTimeout(r, 500));
  ws.close();
  process.exit(0);
})();
