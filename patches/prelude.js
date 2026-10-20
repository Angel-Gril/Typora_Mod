// Typora 主进程 prelude —— 在 atom.compiled.dist.jsc 加载前包装关键运行时 API
// 输出: C:\AI\RD\Tool\mcp\typora-license-audit\exports\prelude.log
'use strict';
const fs = require('fs');
const path = require('path');
const Module = require('module');

const LOG = 'C:\\AI\\RD\\Tool\\mcp\\typora-license-audit\\exports\\prelude.log';
const inLog = { v: false };
function L(tag, msg) {
  if (inLog.v) return;
  inLog.v = true;
  try {
    fs.appendFileSync(LOG, `[${new Date().toISOString()}][${tag}] ${msg}\n`);
  } catch (e) {}
  inLog.v = false;
}
L('boot', 'prelude loaded, pid=' + process.pid);

// ===== 授权状态虚拟化 (VIRT=1) =====
if (process.env.VIRT) {
  try {
    require('C:/AI/RD/Tool/mcp/typora-license-audit/patches/license-virtualize.js')({
      log: function (t, m) { L(t, m); },
      autoClose: process.env.VIRT_AUTOCLOSE !== '0'
    });
    L('virt', 'installed');
  } catch (e) { L('virt', 'install ERR ' + e.message); }
}

// 自动触发校验链 (AUTO_TRIGGER=1): 不占用 CDP 会话, 便于调试器断点后求值
if (process.env.AUTO_TRIGGER) {
  setTimeout(function () {
    try {
      const el = require('electron');
      const lich = el.ipcMain._invokeHandlers.get(process.env.AUTO_HANDLER || 'addLicense');
      const ev = { sender: { send() {}, isDestroyed() { return true; } } };
      const lic = process.env.AUTO_LICENSE || 'L23456-L23456-L23456-LLLLLL';
      L('trigger', (process.env.AUTO_HANDLER || 'addLicense') + '(' + lic + ')');
      const arg = process.env.AUTO_HANDLER === 'offlineActivation' ? lic : { email: 'audit@example.com', license: lic };
      Promise.resolve(lich(ev, arg)).then(r => L('trigger', 'result=' + JSON.stringify(r))).catch(e => L('trigger', 'ERR ' + e.message));
    } catch (e) { L('trigger', 'setup ERR ' + e.message); }
  }, Number(process.env.AUTO_DELAY || 6000));
}

// ===== 字节码反汇编探针 (BC_DISASM=1) =====
if (process.env.BC_DISASM) {
  const v8mod = require('v8');
  try {
    v8mod.setFlagsFromString('--allow-natives-syntax');
    v8mod.setFlagsFromString('--detailed-error-stack-trace');
    v8mod.setFlagsFromString('--experimental-stack-trace-frames');
    L('bc', 'allow-natives-syntax + detailed-error-stack-trace enabled');
  } catch (e) { L('bc', 'flag ERR ' + e.message); }
  const bcLog = (m) => L('bc', m);
  const seen = new WeakSet();
  let dis = null;
  try {
    dis = eval('(function(f){ %DisassembleFunction(f); })');
    bcLog('DisassembleFunction resolved');
  } catch (e) { bcLog('DisassembleFunction unavailable: ' + e.message); }
  global.__bcDisasm = function (fn, name) {
    if (!fn || typeof fn !== 'function' || !dis) return;
    try { if (seen.has(fn)) return; seen.add(fn); } catch (e) { return; }
    try { bcLog('>>> ' + name + ' (len=' + String(fn).length + ')'); } catch (e) {}
    try { dis(fn); bcLog('<<< ' + name); } catch (e) { bcLog('!!! ' + name + ' ' + e.message); }
  };
  global.__bcFrames = function () {
    const old = Error.prepareStackTrace;
    let frames = [];
    try {
      Error.prepareStackTrace = (err, f) => f;
      const st = new Error('probe').stack;
      Error.prepareStackTrace = old;
      if (Array.isArray(st)) frames = st;
    } catch (e) { try { Error.prepareStackTrace = old; } catch (x) {} }
    const out = [];
    for (const f of frames) {
      let fn = null, nm = '?', ln = 0;
      try { fn = f.getFunction(); } catch (e) {}
      try { nm = f.getFunctionName() || f.getMethodName() || '?'; } catch (e) {}
      try { ln = f.getLineNumber(); } catch (e) {}
      out.push({ fn, nm, ln });
    }
    return out;
  };
}
process.on('uncaughtException', e => L('CRASH', (e && e.stack || String(e)).slice(0, 3000)));
process.on('unhandledRejection', e => L('REJECT', (e && (e.stack || e.message) || String(e)).slice(0, 3000)));
// 捕获应用内部日志 (如 "[L] checksum failed")
['log', 'warn', 'error', 'info', 'debug'].forEach(k => {
  const o = console[k];
  if (typeof o !== 'function') return;
  console[k] = function (...a) {
    try {
      const s = a.map(x => (typeof x === 'string' ? x : (() => { try { return JSON.stringify(x); } catch (e) { return String(x); } })())).join(' ');
      if (/\[L\]|license|checksum|activat|machine|fingerprint|token/i.test(s)) L('console', k + ': ' + s.slice(0, 600));
    } catch (e) {}
    return o.apply(console, a);
  };
});
// Electron app.quit/exit 决策点追踪
try {
  const electron = require('electron');
  if (electron && electron.app) {
    electron.app.quit = function (...a) {
      try { L('QUIT', 'app.quit BLOCKED (no-op), stack: ' + new Error().stack.split('\n').slice(1, 6).join(' | ').slice(0, 800)); } catch (e) {}
      if (!process.env.BLOCK_QUIT) { const _q = electron.app.quit; return undefined; }
      return undefined;
    };
    const _exit = electron.app.exit.bind(electron.app);
    electron.app.exit = function (...a) {
      try { L('QUIT', 'app.exit BLOCKED (' + a.join(',') + ') stack: ' + new Error().stack.split('\n').slice(1, 6).join(' | ').slice(0, 800)); } catch (e) {}
      return undefined;
    };
  }
} catch (e) { L('err', 'electron hook: ' + e.message); }
const _pexit = process.exit;
process.exit = function (c) { try { L('QUIT', 'process.exit(' + c + ') stack: ' + new Error().stack.split('\n').slice(1, 8).join(' | ').slice(0, 1200)); } catch (e) {} return _pexit.call(this, c); };
// ===== POC: 离线特权状态注入 (POC_OFFLINE=1) =====
if (process.env.POC_OFFLINE) {
  try {
    const el = require('electron');
    const map = el.ipcMain._invokeHandlers;
    const wrap = (name, orig) => async function (ev, ...args) {
      let r = null;
      try { r = await Promise.race([orig.call(this, ev, ...args), new Promise(res => setTimeout(() => res(['timeout']), 2500))]); } catch (e) { r = [false]; }
      L('poc', name + ' orig => ' + JSON.stringify(r).slice(0, 200));
      if (Array.isArray(r) && r[0] === true) return r;
      L('poc', name + ' FORCED SUCCESS');
      // 同时写入离线特权状态 (base64 明文) —— 验证状态是否充分
      try {
        const fs2 = require('fs');
        let payload = null;
        try { payload = fs2.readFileSync(process.env.FORGE_LICENSE.replace(/^file:/, ''), 'utf8'); } catch (e) {}
        if (payload) {
          const b64 = Buffer.from(payload, 'utf8').toString('base64');
          const cp = require('child_process');
          cp.execSync(`reg add "HKCU\\Software\\Typora" /v SLicense /t REG_SZ /d "${b64}" /f`, { stdio: 'ignore' });
          cp.execSync(`reg add "HKCU\\Software\\Typora" /v IDate /t REG_SZ /d "${new Date().toLocaleDateString('en-US')}" /f`, { stdio: 'ignore' });
          L('poc', 'SLicense written, len=' + b64.length);
        }
      } catch (e) { L('poc', 'write ERR ' + e.message); }
      return [true, '', 'audit@example.com', '2099-12-31'];
    };
    const _set = map.set.bind(map);
    map.set = function (name, fn) {
      if ((name === 'addLicense' || name === 'offlineActivation') && typeof fn === 'function') {
        L('poc', 'wrapping handler on registration: ' + name);
        return _set(name, wrap(name, fn));
      }
      return _set(name, fn);
    };
    L('poc', 'ipcMain._invokeHandlers.set hooked');
  } catch (e) { L('poc', 'patch ERR ' + e.message); }
}

// inspector 通道: 主进程内自开 CDP 端口, 供外部 Runtime.evaluate 深度内省
try {  const inspector = require('inspector');
  const port = Number(process.env.INSPECT_PORT || 9229);
  inspector.open(port, '127.0.0.1', false);
  L('inspector', 'opened on 127.0.0.1:' + port);
} catch (e) { L('err', 'inspector: ' + e.message); }

// ---------- 1. crypto 钩子 (签名验证/解密) ----------
const crypto = require('crypto');
const _verify = crypto.verify, _pubDec = crypto.publicDecrypt, _privDec = crypto.privateDecrypt;
// ---------- 1b. license 校验和算法追踪 (TRACE_LICENSE=1 时启用) ----------
if (process.env.TRACE_LICENSE) {
  const CHARS = 'L23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const LIC_RE = /^([L2-9A-Z]{6}-){3}[L2-9A-Z]{6}$/;
  const LIC_NORM = /^[L2-9A-Z]{24}$/;
  const isLic = (s) => LIC_RE.test(s) || LIC_NORM.test(s);
  let seq = 0;
  const _sIndexOfOrig = String.prototype.indexOf;   // 必须在打补丁前捕获
  const _io = String.prototype.indexOf;
  String.prototype.indexOf = function (...a) {
    try {
      const s = this.toString();
      if (s.length === 32 && _sIndexOfOrig.call(s, CHARS) === 0) {
        const r = _io.apply(this, arguments);
        let st = '';
        try { st = new Error().stack.split('\n').slice(2, 5).map(x => x.trim().replace(/\(.*[\\\/]/, '(').slice(0, 70)).join(' | '); } catch (e) {}
        L('lic', `#${seq++} ARG=${JSON.stringify(a[0]).slice(0, 20)} => ${r}  @ ${st}`);
        return r;
      }
    } catch (e) {}
    return _io.apply(this, arguments);
  };
  const _cca = String.prototype.charCodeAt;
  String.prototype.charCodeAt = function (i) {
    try {
      const s = this.toString();
      if (isLic(s)) {
        const r = _cca.call(this, i);
        L('lic', `#${seq++} charCodeAt(${i}) [${s.slice(0,30)}] => ${r}`);
        return r;
      }
    } catch (e) {}
    return _cca.call(this, i);
  };
  const _cha = String.prototype.charAt;
  String.prototype.charAt = function (i) {
    try {
      const s = this.toString();
      if (s.length >= 8 && s.length <= 40 && LIC_RE.test(s)) {
        const r = _cha.call(this, i);
        L('lic', `${seq++} charAt(${i}) on [${s}] => ${r}`);
        return r;
      }
    } catch (e) {}
    return _cha.call(this, i);
  };
  const _codeAt = String.prototype.codePointAt;
  if (_codeAt) { String.prototype.codePointAt = function (i) { try { const s = this.toString(); if (s.length >= 8 && s.length <= 40 && LIC_RE.test(s)) { const r = _codeAt.call(this, i); L('lic', `${seq++} codePointAt(${i}) on [${s}] => ${r}`); return r; } } catch (e) {} return _codeAt.apply(this, arguments); }; }
  const _slice = String.prototype.slice;
  String.prototype.slice = function (...a) {
    try {
      const s = this.toString();
      if (isLic(s)) {
        const r = _slice.apply(this, arguments);
        L('lic', `#${seq++} slice(${a.join(',')}) [${s.slice(0,30)}] => [${r}]`);
        return r;
      }
    } catch (e) {}
    return _slice.apply(this, arguments);
  };
  const _sub = String.prototype.substring;
  String.prototype.substring = function (...a) {
    try {
      const s = this.toString();
      if (isLic(s)) {
        const r = _sub.apply(this, arguments);
        L('lic', `#${seq++} substring(${a.join(',')}) [${s.slice(0,30)}] => [${r}]`);
        return r;
      }
    } catch (e) {}
    return _sub.apply(this, arguments);
  };
  const _charAt_log = (s) => {}; // placeholder
}

// ===== 校验和输入控制探针 (FORGE_INDEX=1) =====
// 原理: license 校验和依赖 CHARS.indexOf(ch) 的返回值; 接管返回值即可控制校验输入
if (process.env.FORGE_INDEX) {
  const CHARS = 'L23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const VAL_FILE = 'C:\\AI\\RD\\Tool\\mcp\\typora-license-audit\\patches\\index-val.txt';
  const _ioOrig = String.prototype.indexOf;   // 必须在替换前捕获
  let n = 0;
  let cachedMode = 'const', cachedVal = 0, cachedAt = 0;
  const readCtl = () => {
    const now = Date.now();
    if (now - cachedAt > 150) {
      cachedAt = now;
      try {
        const t = fs.readFileSync(VAL_FILE, 'utf8').trim();
        const parts = t.split(',');
        cachedMode = (parts[0] || 'const').trim();
        cachedVal = parseInt((parts[1] || '0').trim(), 10) || 0;
      } catch (e) { cachedMode = 'const'; cachedVal = 0; }
    }
    return { mode: cachedMode, val: cachedVal };
  };
  String.prototype.indexOf = function (...a) {
    try {
      const s = this.toString();
      if (s === CHARS && typeof a[0] === 'string' && a[0].length === 1) {
        n++;
        if (n > 16) n = 1;   // 每次校验固定 16 次, 超出则回绕
        const ctl = readCtl();
        let v = 0;
        if (ctl.mode === 'const') v = ctl.val;
        else if (ctl.mode === 'first') v = (n === 1 ? ctl.val : 0);
        else if (ctl.mode === 'last') v = (n === 16 ? ctl.val : 0);
        else if (ctl.mode === 'idx') v = (n === ctl.val ? 1 : 0);
        else if (ctl.mode === 'ramp') v = (n <= ctl.val ? 1 : 0);
        L('fix', 'idx#' + n + ' ch=' + a[0] + ' [' + ctl.mode + '=' + ctl.val + '] -> ' + v);
        return v;
      }
    } catch (e) {}
    return _ioOrig.apply(this, arguments);
  };
  L('fix', 'indexOf control armed');
}

const FORGE = process.env.FORGE_LICENSE || null;
const _sIndexOf = String.prototype.indexOf; // 注意: 若 TRACE_LICENSE 已打补丁, 此处为包装版; 包装内部使用 _sIndexOfOrig
// 字符串解析追踪: 捕获主进程对伪造明文的解析动作 (排除日志自身: 日志行以'['开头)
function hookStrParse() {
  if (!FORGE) return;
  const needle = FORGE.slice(0, 24);
  const isLog = s => s.length > 0 && s[0] === '[';
  const seen = new Set();
  ['split', 'match', 'indexOf', 'startsWith', 'endsWith', 'trim'].forEach(m => {
    const orig = String.prototype[m];
    String.prototype[m] = function (...args) {
      try {
        const s = this.toString();
        if (!isLog(s) && s.length >= 20 && s.length <= 2000 && _sIndexOf.call(s, needle) >= 0) {
          const key = m + '|' + JSON.stringify(args).slice(0, 200);
          if (!seen.has(key)) { seen.add(key); L('parse', `str.${m}(${JSON.stringify(args).slice(0, 300)}) on [${s.slice(0, 400)}]`); }
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
  });
  const _jp = JSON.parse;
  const fieldVals = new Set();
  JSON.parse = function (s, r) {
    const result = _jp.call(this, s, r);
    try {
      const str = String(s);
      if (result && typeof result === 'object') {
        // 只要解析的是许可类 JSON (含 license/email/fingerprint) 就纳管其字段值
        const keys = Object.keys(result);
        const licLike = keys.some(k => /^(license|email|fingerprint|deviceId|version|type)$/i.test(k));
        if (licLike) {
          L('parse', `JSON.parse [${str.slice(0, 400)}]`);
          try {
            for (const k of keys) {
              const v = result[k];
              if (typeof v === 'string' && v.length < 500) fieldVals.add(v);
            }
          } catch (e) {}
          return new Proxy(result, {
            get(t, p) { const v = t[p]; try { L('parse', `  prop.${String(p)} => ${JSON.stringify(v)}`); } catch (e) {} return v; },
            has(t, p) { try { L('parse', `  has ${String(p)} => ${p in t}`); } catch (e) {} return p in t; }
          });
        }
      }
    } catch (e) {}
    return result;
  };
}
hookStrParse();
// 字段值方法调用追踪 (inLog 守卫防递归)
if (FORGE) {
  const seenOps = new Set();
  const guard = (recv, m, args, r) => {
    if (inLog.v) return;
    try {
      const isField = typeof recv === 'string' && fieldVals.has(recv);
      const isLic = typeof recv === 'string' && /^[L2-9A-Z]{2,8}(-[L2-9A-Z]{0,8}){0,3}$/.test(recv) && recv.length >= 6;
      if (isField || isLic) {
        const key = m + '|' + recv.slice(0, 12) + '|' + JSON.stringify(args).slice(0, 100) + '|' + String(r).slice(0, 80);
        if (!seenOps.has(key)) {
          seenOps.add(key);
          L('op', `"${recv.slice(0, 40)}".${m}(${args.map(x => JSON.stringify(x)).join(',').slice(0, 120)}) => ${JSON.stringify(r).slice(0, 150)}`);
        }
      }
    } catch (e) {}
  };
  ['charCodeAt', 'charAt', 'codePointAt', 'indexOf', 'lastIndexOf', 'slice', 'substring', 'substr', 'split', 'replace', 'match', 'toUpperCase', 'toLowerCase', 'trim', 'padStart', 'startsWith', 'endsWith', 'concat', 'localeCompare'].forEach(m => {
    const orig = String.prototype[m];
    if (typeof orig !== 'function') return;
    String.prototype[m] = function (...a) {
      const r = orig.apply(this, a);
      guard(String(this), m, a, r);
      return r;
    };
  });
  // Array.from + 展开迭代 (校验循环可能用 for-of / Array.from)
  const _af = Array.from;
  Array.from = function (src, ...rest) {
    const r = _af.call(this, src, ...rest);
    guard(String(typeof src === 'string' ? src : ''), 'Array.from', [], r);
    return r;
  };
  // 全局字符串展开探测: Proxy 不可靠, 改钩 Symbol.iterator
  const _itr = String.prototype[Symbol.iterator];
  String.prototype[Symbol.iterator] = function (...a) {
    guard(String(this), '[Symbol.iterator]', a, '(iterator)');
    return _itr.apply(this, a);
  };
}
crypto.publicDecrypt = function (key, buf) {
  try {
    let k = typeof key === 'string' ? key : (key && key.key) || JSON.stringify(key);
    L('rsa', 'publicDecrypt key=[' + String(k).slice(0, 2000) + ']');
    L('rsa', 'publicDecrypt input(hex)=' + (Buffer.isBuffer(buf) ? buf.toString('hex').slice(0, 600) : String(buf).slice(0, 300)));
  } catch (e) {}
  // 字节码反汇编: 抓住校验链上的函数对象
  if (global.__bcDisasm && global.__bcFrames) {
    try {
      const frames = global.__bcFrames();
      L('bc', 'frames: ' + frames.map(f => f.nm + '@' + f.ln).join(' <- '));
      for (const f of frames) {
        L('bc', `cand name=${f.nm} fn=${typeof f.fn}${f.fn ? ' arity=' + f.fn.length : ''}`);
        if (f.fn && !/prelude|publicDecrypt/.test(f.nm)) global.__bcDisasm(f.fn, f.nm + '@' + f.ln);
      }
    } catch (e) { L('bc', 'frame capture ERR ' + e.message); }
  }
  if (FORGE) {
    let forgeText = FORGE;    if (FORGE.startsWith('file:')) {
      try { forgeText = fs.readFileSync(FORGE.slice(5), 'utf8'); } catch (e) { forgeText = FORGE; }
    }
    L('rsa', 'FORGED => [' + forgeText + ']');
    try { L('rsa', 'CALLER STACK: ' + new Error().stack.split('\n').slice(1, 8).join(' | ').slice(0, 1500)); } catch (e) {}
    return Buffer.from(forgeText, 'utf8');
  }
  try {
    const r = _pubDec.apply(this, arguments);
    L('rsa', 'publicDecrypt OK => [' + (Buffer.isBuffer(r) ? r.toString('utf8').slice(0, 2000) : String(r).slice(0, 2000)) + ']');
    return r;
  } catch (e) {
    L('rsa', 'publicDecrypt ERR ' + e.message);
    throw e;
  }
};
crypto.privateDecrypt = function (key, buf) {
  try {
    L('rsa', 'privateDecrypt input(hex)=' + (Buffer.isBuffer(buf) ? buf.toString('hex').slice(0, 600) : String(buf).slice(0, 300)));
  } catch (e) {}
  return _privDec.apply(this, arguments);
};
crypto.verify = function (...args) {
  try {
    let k = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].key) || JSON.stringify(args[0]);
    const dataIdx = args.length >= 4 ? 2 : 1;
    const sigIdx = args.length >= 4 ? 3 : 2;
    L('rsa', 'verify alg=' + args[0] + ' key=[' + String(k).slice(0, 2000) + ']');
    const sig = args[sigIdx];
    L('rsa', 'verify sig(hex)=' + (Buffer.isBuffer(sig) ? sig.toString('hex').slice(0, 600) : String(sig).slice(0, 300)));
  } catch (e) {}
  try {
    const r = _verify.apply(this, args);
    L('rsa', 'verify => ' + r);
    return r;
  } catch (e) { L('rsa', 'verify ERR ' + e.message); throw e; }
};
// createHash 返回对象跟踪 digest 输入
const _createHash = crypto.createHash;
const FORGE_MC = process.env.FORGE_MC || null; // 同步伪造 machineCode
crypto.createHash = function (alg) {
  const h = _createHash.call(this, alg);
  const _digest = h.digest, _update = h.update;
  h.update = function (d, enc) {
    try { L('hash', 'sha-in=' + (Buffer.isBuffer(d) ? d.toString('utf8').slice(0, 2000) : String(d).slice(0, 2000))); } catch (e) {}
    return _digest ? _update.call(this, d, enc) : _update.apply(this, arguments);
  };
  h.digest = function (enc) {
    if (FORGE_MC && enc === 'base64') {
      L('hash', 'digest FORGED => ' + FORGE_MC);
      return FORGE_MC;
    }
    const r = _digest.call(this, enc);
    try { L('hash', 'digest(' + enc + ')=' + (Buffer.isBuffer(r) ? r.toString('hex') : r)); } catch (e) {}
    return r;
  };
  return h;
};

// ---------- 2. net/http(s) 请求钩子 (激活服务器流量) ----------
function hookHttp(modName) {
  const mod = require(modName);
  const orig = mod.request;
  mod.request = function (opt, cb) {
    try {
      const o = typeof opt === 'string' ? { url: opt } : opt;
      const url = o.href || `${o.protocol || modName + ':'}//${o.hostname || o.host}${o.port ? ':' + o.port : ''}${o.path || ''}`;
      L('net', `${modName}.request ${o.method || 'GET'} ${url}`);
      if (o.headers) L('net', '  headers=' + JSON.stringify(o.headers).slice(0, 800));
    } catch (e) {}
    const req = orig.call(this, opt, cb);
    const _write = req.write.bind(req);
    req.write = function (d, enc, cb2) {
      try { L('net', '  body=' + (Buffer.isBuffer(d) ? d.toString('utf8') : String(d)).slice(0, 2000)); } catch (e) {}
      return _write(d, enc, cb2);
    };
    return req;
  };
}
try { hookHttp('https'); } catch (e) { L('err', 'https hook: ' + e.message); }
try { hookHttp('http'); } catch (e) { L('err', 'http hook: ' + e.message); }

// ---------- 3. net.Socket / tls 钩子 (底层流量兜底) ----------
const net = require('net');
const _SocketProtoConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  try {
    const o = args[0];
    if (typeof o === 'object' && o && o.host) L('socket', `connect ${o.host}:${o.port}`);
    else if (typeof args[1] === 'string') L('socket', `connect ${args[1]}:${args[2]}`);
  } catch (e) {}
  return _SocketProtoConnect.apply(this, args);
};
// socket 数据写出
const _sockWrite = net.Socket.prototype.write;
net.Socket.prototype.write = function (d, enc, cb) {
  try {
    const s = Buffer.isBuffer(d) ? d.toString('utf8') : String(d);
    if (s.length < 8192 && /[\x20-\x7e]/.test(s.slice(0, 64))) L('socket', 'write=[' + s.slice(0, 1500) + ']');
  } catch (e) {}
  return _sockWrite.call(this, d, enc, cb);
};

// ---------- 4. Module._load 钩子 (依赖图谱: native-reg, node-machine-id) ----------
const _load = Module._load;
Module._load = function (request, parent, isMain) {
  if (/native-reg|machine-id|node-machine/i.test(request)) L('require', request + '  (from ' + (parent && parent.filename || '?') + ')');
  return _load.call(this, request, parent, isMain);
};

// ---------- 5. vm.Script 钩子 (JSC 二级加载 / eval 行为) ----------
const vm = require('vm');
const _Script = vm.Script;
vm.Script = function (code, opts) {
  try {
    const c = typeof code === 'string' ? code : '';
    if (c.length && c.length < 20000 && /licen|activ|key|secret|RSA|BEGIN/i.test(c)) L('vm', 'Script(' + (opts && opts.filename) + ')=[' + c.slice(0, 3000) + ']');
  } catch (e) {}
  return new _Script(code, opts);
};
vm.Script.prototype = _Script.prototype;
Object.setPrototypeOf(vm.Script, _Script);

// ---------- 6. fs 钩子 (许可文件读写) ----------
const _readFile = fs.readFile, _readFileSync = fs.readFileSync, _writeFileSync = fs.writeFileSync;
fs.readFileSync = function (p, opt) {
  const r = _readFileSync.apply(this, arguments);
  try { if (/licen|key|\.dat|\.json/i.test(String(p)) && !/node_modules|locales|\.pak|\.css|\.html/i.test(String(p))) L('fs', 'readFileSync ' + p + ' len=' + (r && r.length)); } catch (e) {}
  return r;
};
fs.writeFileSync = function (p, data) {
  try { if (String(p) !== LOG && !/node_modules|\.pak/i.test(String(p))) L('fs', 'writeFileSync ' + p + ' data=[' + (Buffer.isBuffer(data) ? data.toString('utf8').slice(0, 1500) : String(data).slice(0, 1500)) + ']'); } catch (e) {}
  return _writeFileSync.apply(this, arguments);
};

// ---------- 7. child_process 钩子 (机器码辅助命令: wmic 等) ----------
const cp = require('child_process');
['exec', 'execSync', 'spawn', 'spawnSync'].forEach(fn => {
  const orig = cp[fn];
  cp[fn] = function (cmd, ...rest) {
    L('cp', fn + ' [' + String(cmd).slice(0, 500) + ']');
    return orig.call(this, cmd, ...rest);
  };
});

// ---------- 8. 环境快照 ----------
L('env', 'argv=' + process.argv.join(' '));
L('env', 'NODE_OPTIONS=' + (process.env.NODE_OPTIONS || '(none)'));
L('env', 'Typora home=' + process.env.APPDATA);

module.exports = {};
