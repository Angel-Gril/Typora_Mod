// Typora 字节码反汇编探针 (natives syntax)
// 目的: 抓住许可校验函数对象 (D/F/X/N/...) 并用 %DisassembleFunction 输出字节码
// 输出: stdout (由启动时重定向捕获) ; 日志: bc.log
'use strict';
const fs = require('fs');
const v8 = require('v8');
const LOG = 'C:\\AI\\RD\\Tool\\mcp\\typora-license-audit\\exports\\bc.log';
function L(tag, msg) {
  try { fs.appendFileSync(LOG, `[${tag}] ${msg}\n`); } catch (e) {}
}

// 1) 开启 natives 语法 (必须在 eval 编译 '%...' 之前)
try {
  v8.setFlagsFromString('--allow-natives-syntax');
  L('flags', 'allow-natives-syntax set');
} catch (e) { L('flags', 'ERR ' + e.message); }

// 2) 调用栈函数对象捕获 (Error.prepareStackTrace + CallSite.getFunction)
function captureFrames() {
  const old = Error.prepareStackTrace;
  let out = [];
  try {
    Error.prepareStackTrace = (err, frames) => frames;
    const e = new Error('probe');
    const frames = e.stack;
    Error.prepareStackTrace = old;
    if (Array.isArray(frames)) {
      for (const f of frames) {
        let fn = null, name = '?', file = '?', line = 0;
        try { fn = f.getFunction(); } catch (x) {}
        try { name = f.getFunctionName() || f.getMethodName() || '?'; } catch (x) {}
        try { file = f.getFileName() || '?'; line = f.getLineNumber(); } catch (x) {}
        out.push({ fn, name, file, line });
      }
    }
  } catch (e) {
    try { Error.prepareStackTrace = old; } catch (x) {}
  }
  return out;
}

const seen = new WeakSet();
function disasm(fn, name) {
  if (!fn || typeof fn !== 'function') return;
  try { if (seen.has(fn)) return; seen.add(fn); } catch (e) { return; }
  try {
    const code = fn.toString().slice(0, 120).replace(/\n/g, ' ');
    L('fn', `>>> ${name} () ${code}`);
  } catch (e) {}
  try {
    // %DisassembleFunction 需要 natives 语法, 用 eval 在 flag 生效后编译
    const dis = eval('%DisassembleFunction');
    dis(fn);
    L('fn', `<<< ${name} disassembled`);
  } catch (e) {
    L('fn', `!!! ${name} disasm FAIL: ${e.message}`);
  }
}

// 3) publicDecrypt 处抓调用栈
const crypto = require('crypto');
const _pub = crypto.publicDecrypt;
crypto.publicDecrypt = function (key, buf) {
  L('rsa', 'publicDecrypt hit');
  const frames = captureFrames();
  L('stack', frames.map(f => `${f.name}@${String(f.file).split(/[\\/]/).pop()}:${f.line}`).join(' <- '));
  // 反汇编所有非 prelude 自身的帧函数 (校验链 D/F/X/N/startL)
  for (const f of frames) {
    if (!f.fn) continue;
    if (/prelude-bc|crypto/.test(f.name)) continue;
    disasm(f.fn, f.name + '@' + f.line);
  }
  return _pub.apply(this, arguments);
};

// 4) 同时反汇编被 require 的 JSC 顶层所有可见函数 (兜底)
process.on('uncaughtException', e => L('CRASH', String(e && e.stack || e).slice(0, 800)));

L('boot', 'prelude-bc ready pid=' + process.pid);
