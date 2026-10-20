// license 校验和扫描器: 用 CDP 在目标进程内逐个翻转尾组字符
'use strict';
const http = require('http');

const port = process.argv[2] || '9317';
const CHARS = 'L23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const BASE = 'L23456-L23456-L23456-';
const TAIL = 'MLLLLL';

http.get(`http://127.0.0.1:${port}/json/list`, r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => run(JSON.parse(d)[0].webSocketDebuggerUrl));
});

async function run(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
  };
  await new Promise(res => ws.onopen = res);

  function evalJS(expr) {
    return new Promise(res => {
      const i = ++id;
      pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
      setTimeout(() => { if (pending.has(i)) { pending.delete(i); res({ error: 'timeout' }); } }, 8000);
    });
  }

  const setup = `(()=>{const el=process.mainModule.require('electron');
    globalThis.__h=el.ipcMain._invokeHandlers.get('offlineActivation');
    globalThis.__ev={sender:{send(){},isDestroyed(){return true}}};
    return 'ok'})()`;
  console.log('setup:', (await evalJS(setup)).result?.result?.value);

  const results = [];
  for (let pos = 0; pos < 6; pos++) {
    for (let ci = 0; ci < CHARS.length; ci++) {
      const c = CHARS[ci];
      const lic = BASE + TAIL.substring(0, pos) + c + TAIL.substring(pos + 1);
      // 更新 forge 文件 (由目标进程读) —— 改用直接传 license: 通过文件
      const payload = { deviceId: '537b86dc-4152-403f-b6f4-5718db93bcf1', fingerprint: 'eyJ2Ijoid2lufDEuMTQuMTAiLCJpIjoiUng4M3FBNzZIdCIsImwiOiJERVNLVE9QLTZEREVSTEUgfCBBZG1pbiB8IFdpbmRvd3MifQ==', email: 'audit@lab.local', license: lic, version: '1.14.10', date: 4102444800000, type: 'standard' };
      const expr = `(()=>{
        const fs=process.mainModule.require('fs');
        fs.writeFileSync('C:/AI/RD/Tool/mcp/typora-license-audit/patches/forge.json', ${JSON.stringify(JSON.stringify(payload))});
        return globalThis.__h(globalThis.__ev, ${JSON.stringify(lic)}).then(r=>JSON.stringify(r));
      })()`;
      const resp = await evalJS(expr);
      const val = resp.result?.result?.value;
      const ok = val && !val.includes('valid license');
      if (ok || ci === 0) results.push(`${lic} => ${val}${ok ? '  <<<< HIT' : ''}`);
      if (ok) {
        console.log(results.join('\n'));
        console.log('HIT:', lic, val);
        ws.close();
        process.exit(0);
      }
    }
  }
  console.log(results.join('\n'));
  console.log('no hit');
  ws.close();
  process.exit(0);
}
