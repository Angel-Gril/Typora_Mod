/**
 * JSC 加载期补丁框架 (Bytecode-layer patch harness)
 * ------------------------------------------------------------------
 * 原理: atom.compiled.dist.jsc 是 V8 cachedData, 由 launch.dist.js 用
 *       fs.readFileSync 读入后交给 vm.Script 编译。
 *       我们在 fs 层拦截读取, 对字节做同长度替换, V8 仍能正常加载。
 *
 * 约束: 补丁必须是「等长替换」——序列化数据里字符串带长度前缀, 改长度会破坏结构。
 *
 * 用法:
 *   require('./jsc-patch.js').install({ log });
 *   TYPORA_JSC_PATCH=0 可关闭
 */
'use strict';

const fs = require('fs');

function install(opts) {
  const o = opts || {};
  const log = typeof o.log === 'function' ? o.log : function () {};
  if (o.enabled === false) { log('jsc', 'disabled'); return false; }

  const origReadSync = fs.readFileSync;
  const applied = new Set();
  const stats = { reads: 0, patched: 0, hits: {} };

  // 等长补丁表: 自动保证长度一致 (序列化字符串带长度前缀)
  const SRC1 = 'Please input a valid license code';
  const DST1 = 'PATCHED-JSC-OK'.padEnd(SRC1.length, '~');
  const PATCHES = (o.patches || (function () {
    if (process.env.VIRT_JSC_PATCHES) {
      try { return JSON.parse(process.env.VIRT_JSC_PATCHES); } catch (e) { return []; }
    }
    return [
      // 演示补丁: 改写校验失败提示(等长), 用于证明字节修改被 V8 接受
      [SRC1, DST1]
    ];
  })()).filter(function (p) { return p[0].length === p[1].length; });

  function applyPatch(buf, file) {
    let hit = 0;
    for (let i = 0; i < PATCHES.length; i++) {
      const from = Buffer.from(PATCHES[i][0], 'latin1');
      const to = Buffer.from(PATCHES[i][1], 'latin1');
      let idx = buf.indexOf(from);
      while (idx >= 0) {
        to.copy(buf, idx);
        hit++;
        const key = PATCHES[i][0].slice(0, 24);
        stats.hits[key] = (stats.hits[key] || 0) + 1;
        idx = buf.indexOf(from, idx + to.length);
      }
    }
    if (hit) {
      stats.patched++;
      applied.add(file);
      log('jsc', 'patched ' + hit + ' site(s) in ' + file);
    }
    return buf;
  }

  fs.readFileSync = function (p, opt) {
    const r = origReadSync.apply(this, arguments);
    try {
      const ps = String(p);
      if (/\.jsc$/i.test(ps) && Buffer.isBuffer(r)) {
        stats.reads++;
        if (stats.reads <= 3) log('jsc', 'read #' + stats.reads + ' ' + ps + ' len=' + r.length);
        if (!applied.has(ps)) {
          return applyPatch(Buffer.from(r), ps);
        }
      }
    } catch (e) { log('jsc', 'hook err ' + e.message); }
    return r;
  };

  install.stats = stats;
  log('jsc', 'harness installed, patches=' + PATCHES.length);
  return true;
}

module.exports = { install: install };
