/**
 * state-hunt.js —— 在主进程运行时搜索许可状态字段
 * ------------------------------------------------------------
 * 目标: 找到持有 hasLicense / isLicensed / activated 等字段的对象,
 *      若能直接置真, 主进程自身即"认为已激活", 无需任何注入或改写。
 *
 * 用法: VIRT_HUNT=1  (只报告)  /  VIRT_HUNT=set (报告并置真)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const LOG = path.join(__dirname, 'state-hunt.log');
function log(s) {
  try { fs.appendFileSync(LOG, '[' + new Date().toISOString() + '] ' + s + '\n'); } catch (e) {}
}

const KEY_RE = /^(hasLicense|isLicensed|licensed|activated|hasActivated|isActivated|activationStatus|licenseStatus)$/i;

function hunt(opts) {
  const doSet = opts && opts.set;
  const seen = new Set();
  const hits = [];
  let visited = 0;

  function walk(obj, depth, trail) {
    if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return;
    if (depth > 3 || seen.has(obj)) return;
    seen.add(obj);
    visited++;
    let keys;
    try { keys = Object.keys(obj); } catch (e) { return; }
    for (const k of keys) {
      let v;
      try { v = obj[k]; } catch (e) { continue; }
      if (KEY_RE.test(k)) {
        hits.push({ trail: trail + '.' + k, type: typeof v, value: String(v).slice(0, 40) });
        if (doSet && typeof v === 'boolean' && v === false) {
          try { obj[k] = true; log('SET ' + trail + '.' + k + ' -> true'); } catch (e) { log('SET FAIL ' + trail + '.' + k + ': ' + e.message); }
        }
      }
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        // 只往下走两层, 避免爆炸
        if (depth < 2) walk(v, depth + 1, trail + '.' + k);
      }
    }
  }

  // 1) require.cache 里的模块导出
  try {
    const ids = Object.keys(require.cache);
    log('scan require.cache modules=' + ids.length);
    for (const id of ids) {
      if (/node_modules[\\/](electron|typescript)[\\/]/.test(id)) continue;
      try { walk(require.cache[id].exports, 0, path.basename(id)); } catch (e) {}
    }
  } catch (e) { log('cache scan err ' + e.message); }

  // 2) global 对象
  try { walk(globalThis, 0, 'global'); } catch (e) {}
  try { walk(global, 0, 'global2'); } catch (e) {}
  try { walk(process, 0, 'process'); } catch (e) {}

  log('visited objects=' + visited + ' hits=' + hits.length);
  for (const h of hits) log('HIT ' + h.trail + ' = ' + h.value + ' (' + h.type + ')');
  return hits;
}

module.exports = { hunt };
