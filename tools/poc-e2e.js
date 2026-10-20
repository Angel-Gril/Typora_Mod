// 端到端验证: 打开许可面板 -> 在渲染进程触发激活 -> 读取 UI 状态
'use strict';
const http = require('http');
const PORT = Number(process.argv[2] || 9481);
const jlist = () => new Promise((res, rej) => http.get(`http://127.0.0.1:${PORT}/json/list`, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)[0])); }).on('error', rej));

(async () => {
  const t = await jlist();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise(r => ws.onopen = r);
  const send = (method, params, tmo=15000) => new Promise(res => {
    const i = ++id; pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params: params || {} }));
    setTimeout(() => { if (pending.has(i)) { pending.delete(i); res({ error: 'timeout' }); } }, tmo);
  });
  const ev = async (expr, tmo) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }, tmo || 15000);
    const v = r.result && r.result.result ? r.result.result.value : (r.result && r.result.exceptionDetails ? 'EXC:' + JSON.stringify(r.result.exceptionDetails).slice(0, 200) : r.error);
    return v;
  };

  await send('Runtime.enable');

  // 1) 列出窗口
  console.log('windows:', await ev(`(()=>{const el=process.mainModule.require('electron');return JSON.stringify(el.BrowserWindow.getAllWindows().map(w=>({t:w.getTitle(),u:w.webContents.getURL().slice(0,80)})))})()`));

  // 2) 打开许可面板 (license.show)
  console.log('license.show:', await ev(`(()=>{const el=process.mainModule.require('electron');const h=el.ipcMain._invokeHandlers.get('license.show');if(!h)return 'no handler';const e2={sender:{send(){},isDestroyed(){return true}}};return Promise.resolve(h(e2)).then(r=>'ok:'+JSON.stringify(r)).catch(x=>'ERR:'+x.message)})()`, 8000));

  await new Promise(r => setTimeout(r, 3000));
  console.log('windows2:', await ev(`(()=>{const el=process.mainModule.require('electron');return JSON.stringify(el.BrowserWindow.getAllWindows().map(w=>({t:w.getTitle(),u:w.webContents.getURL().slice(0,80)})))})()`));

  // 3) 在许可窗口内触发激活并读状态
  const r3 = await ev(`(async()=>{
    const el=process.mainModule.require('electron');
    const wins=el.BrowserWindow.getAllWindows();
    const w=wins.find(x=>/license/i.test(x.webContents.getURL()))||wins[0];
    if(!w) return 'no window';
    const js=\`(async()=>{try{
       const r = await window.Setting.invokeWithCallback('offlineActivation','+eA==|X#');
       return 'invoke='+JSON.stringify(r)+' | body='+document.body.innerText.replace(/\\s+/g,' ').slice(0,200);
    }catch(e){return 'ERR:'+e.message}})()\`;
    return await w.webContents.executeJavaScript(js, true);
  })()`, 20000);
  console.log('renderer:', JSON.stringify(r3).slice(0, 800));

  ws.close(); process.exit(0);
})();
