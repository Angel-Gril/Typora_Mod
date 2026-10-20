'use strict';
// 读取许可页 DOM 结构 / 各 stage 的计算样式
const http = require('http');
const PORT = Number(process.argv[2] || 10581);
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

  const js = `(function(){
    var w = process.mainModule.require('electron').BrowserWindow.getAllWindows().find(x=>/license/.test(x.webContents.getURL()||''));
    if(!w) return Promise.resolve('no window');
    return w.webContents.executeJavaScript(\`(function(){
      var out = { pages: [], bodyChildren: [], zoom: window.devicePixelRatio, inner: [window.innerWidth, window.innerHeight] };
      document.querySelectorAll('.page').forEach(function(p, i){
        var cs = getComputedStyle(p);
        out.pages.push({ i: i, cls: p.className, display: cs.display, position: cs.position, transform: cs.transform, opacity: cs.opacity, zIndex: cs.zIndex, h: p.offsetHeight, text: (p.innerText||'').replace(/\\\\s+/g,' ').slice(0,60) });
      });
      Array.from(document.body.children).forEach(function(c){
        var cs = getComputedStyle(c);
        out.bodyChildren.push({ tag: c.tagName, id: c.id, cls: c.className, display: cs.display });
      });
      return JSON.stringify(out, null, 1);
    })()\`);
  })()`;
  console.log(await ev(js));
  ws.close(); process.exit(0);
})();
