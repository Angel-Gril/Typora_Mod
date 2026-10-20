// L3 探针 v3: 挂钩 JSON.parse，用 Proxy 记录校验器读取的字段与顺序
'use strict';
const fs = require('fs');
const path = require('path');
const LOG = path.join(__dirname, 'rsa-probe.log');

function log(s) {
  try { fs.appendFileSync(LOG, '[' + new Date().toISOString() + '] ' + s + '\n'); } catch (e) {}
}

module.exports = function install(opts) {
  const o = opts || {};
  const fake = o.fake || null;
  const crypto = require('crypto');

  // 1) JSON.parse 钩子: 命中标记的对象包成 Proxy, 记录字段读取
  if (!JSON.__vtPatched) {
    const origParse = JSON.parse;
    JSON.parse = function (text, reviver) {
      const out = origParse.call(this, text, reviver);
      try {
        if (typeof text === 'string' && text.indexOf('"__vt__"') >= 0 && out && typeof out === 'object') {
          log('PARSE hit marker, keys=' + Object.keys(out).join(','));
          const seen = [];
          const proxy = new Proxy(out, {
            get(t, k) {
              const v = t[k];
              if (typeof k === 'string') {
                seen.push(k);
                log('GET ' + k + ' -> ' + (typeof v === 'string' ? JSON.stringify(v).slice(0, 60) : typeof v));
              }
              return v;
            },
            has(t, k) { log('HAS ' + String(k)); return k in t; },
            ownKeys(t) { log('OWNKEYS'); return Reflect.ownKeys(t); }
          });
          Object.defineProperty(proxy, '__vtSeen', { value: seen, enumerable: false });
          return proxy;
        }
      } catch (e) { log('parse hook err ' + e.message); }
      return out;
    };
    JSON.__vtPatched = true;
    log('JSON.parse hook installed');
  }

  // 2) crypto 钩子
  if (!crypto.__vtProbe) {
    const verifyAlways = process.env.VIRT_RSA_VERIFY_TRUE === '1';
    const origVerify = crypto.verify;
    if (verifyAlways && typeof origVerify === 'function') {
      crypto.verify = function () { log('VERIFY -> true (forced)'); return true; };
    }
    const origCreateVerify = crypto.createVerify;
    if (verifyAlways && typeof origCreateVerify === 'function') {
      crypto.createVerify = function (...a) {
        const v = origCreateVerify.apply(this, a);
        v.verify = function () { log('CREATEVERIFY.verify -> true (forced)'); return true; };
        return v;
      };
    }
    const orig = crypto.publicDecrypt;
    crypto.publicDecrypt = function (key, buf, ...rest) {
      try {
        log('CALL publicDecrypt bufLen=' + (buf ? buf.length : -1) + ' bufHead=' + (buf ? Buffer.from(buf).toString('base64').slice(0, 40) : ''));
      } catch (e) {}
      if (fake) { log('RETURN fake len=' + Buffer.byteLength(fake)); return Buffer.from(fake, 'utf8'); }
      return orig.call(this, key, buf, ...rest);
    };
    crypto.__vtProbe = true;
  }
  log('probe v3 installed fake=' + (fake ? 'yes' : 'no'));
};
