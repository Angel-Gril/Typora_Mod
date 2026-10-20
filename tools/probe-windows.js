// 读取各窗口标题/URL/正文, 验证虚拟化效果
'use strict';
const http = require('http');
const PORT = Number(process.argv[2] || 9641);
const jlist = () => new Promise((res, rej) => http.get(`http://127.0.0.1:${PORT}/json/list`, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)[0])); }).on('error', rej));

(async () => {
  const t = await jlist();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise(r => ws.onopen = r);
  const send = (method, params, tmo=20000) => new Promise(res => {
    const i = ++id; pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params: params || {} }));
    setTimeout(() => { if (pending.has(i)) { pending.delete(i); res({ error: 'timeout' }); } }, tmo);
  });
  await send('Runtime.enable');

  const expr = `(async()=>{
    const el = process.mainModule.require('electron');
    const wins = el.BrowserWindow.getAllWindows();
    const out = [];
    for (const w of wins) {
      let u = '';
      try { u = w.webContents.getURL(); } catch(e){}
      let txt = '';
      try { txt = await w.webContents.executeJavaScript('document.body?document.body.innerText.replace(/[\\\\r\\\\n\\\\t ]+/g," ").slice(0,260):""'); } catch(e) { txt = 'ERR:' + e.message; }
      out.push({ url: u.slice(0, 90), visible: w.isVisible(), text: txt });
    }
    return JSON.stringify(out, null, 1);
  })()`;
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }, 25000);
  const v = r.result && r.result.result ? r.result.result.value : JSON.stringify(r.result || r.error);
  console.log(v);
  ws.close(); process.exit(0);
})();
