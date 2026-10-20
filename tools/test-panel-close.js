// 验证"已激活"面板的关闭按钮: 打开 → 点击 vt-dismiss → 检查窗口状态
'use strict';
const http = require('http');
const PORT = Number(process.argv[2] || 9871);
const jlist = () => new Promise((res, rej) => http.get(`http://127.0.0.1:${PORT}/json/list`, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)[0])); }).on('error', rej));

(async () => {
  const t = await jlist();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise(r => ws.onopen = r);
  const send = (method, params, tmo = 15000) => new Promise(res => {
    const i = ++id; pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params: params || {} }));
    setTimeout(() => { if (pending.has(i)) { pending.delete(i); res({ error: 'timeout' }); } }, tmo);
  });
  const ev = async (expr, tmo) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, tmo);
    return r.result && r.result.result ? r.result.result.value : ('ERR ' + JSON.stringify(r.error || r.result));
  };

  await send('Runtime.enable');

  // 1) 打开许可页
  console.log('open:', await ev(`(()=>{const el=process.mainModule.require('electron');const h=el.ipcMain._invokeHandlers.get('license.show');const e2={sender:{send(){},isDestroyed(){return true}}};return Promise.resolve(h(e2)).then(()=>'ok')})()`));
  await new Promise(r => setTimeout(r, 2500));

  // 2) 状态 + 面板存在性
  console.log('state:', await ev(`(()=>{const el=process.mainModule.require('electron');const ws=el.BrowserWindow.getAllWindows().filter(x=>/license/.test(x.webContents.getURL()||''));return JSON.stringify(ws.map(w=>({visible:w.isVisible(),destroyed:w.isDestroyed()})))})()`));
  console.log('panel:', await ev(`(async()=>{const el=process.mainModule.require('electron');const w=el.BrowserWindow.getAllWindows().find(x=>/license/.test(x.webContents.getURL()||''));if(!w)return 'no window';return await w.webContents.executeJavaScript("(function(){var p=document.getElementById('vt-panel');var b=document.getElementById('vt-dismiss');var x=document.getElementById('vt-close');return JSON.stringify({panel:!!p, dismissBtn:!!b, closeBtn:!!x, text:(b?b.textContent:'')})})()",true)})()`));

  // 3) 点击"关闭"
  console.log('click:', await ev(`(async()=>{const el=process.mainModule.require('electron');const w=el.BrowserWindow.getAllWindows().find(x=>/license/.test(x.webContents.getURL()||''));if(!w)return 'no window';return await w.webContents.executeJavaScript("(function(){document.getElementById('vt-dismiss').click();return 'clicked'})()",true)})()`));
  await new Promise(r => setTimeout(r, 1500));

  // 4) 关闭后状态
  console.log('after:', await ev(`(()=>{const el=process.mainModule.require('electron');const ws=el.BrowserWindow.getAllWindows().filter(x=>/license/.test(x.webContents.getURL()||''));return JSON.stringify({count:ws.length,states:ws.map(w=>({visible:w.isVisible(),destroyed:w.isDestroyed()}))})})()`));

  ws.close(); process.exit(0);
})();
