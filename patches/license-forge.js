/**
 * license-forge.js —— 密码学边界伪造 (L3)
 * ------------------------------------------------------------------
 * 原理:
 *   主进程用 crypto.publicDecrypt(PUBKEY, token) 解开授权令牌后做字段校验。
 *   我们在该函数返回前替换明文, 使应用自己的校验器认为令牌合法。
 *   —— 不改字节码、不碰注册表, 也不伪造官方签名格式。
 *
 * 作用域:
 *   仅拦截「看起来像授权令牌」的调用 (以 '+' 开头 / 长度很小 / 含 '|'),
 *   其它加密调用原样透传, 避免影响应用其它功能。
 *
 * 能力边界:
 *   · offlineActivation / addLicense 路径: 应用返回成功并写入 SLicense
 *   · 冷启动复验路径: 应用还会做令牌与签名的绑定比对, 此处不保证通过
 *     (因此持久化仍由 registration.js + 呈现层虚拟化兜底)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const LOG = path.join(__dirname, 'license-forge.log');

function log(s) {
  try { fs.appendFileSync(LOG, '[' + new Date().toISOString() + '] ' + s + '\n'); } catch (e) {}
}

function machineFields() {
  const crypto = require('crypto');
  const os = require('os');
  let guid = '';
  try {
    const out = require('child_process').execSync(
      'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
      { windowsHide: true, encoding: 'utf8' });
    const m = out.match(/MachineGuid\s+REG_SZ\s+(\S+)/i);
    if (m) guid = m[1];
  } catch (e) {}
  if (!guid) guid = os.hostname();
  const digest = crypto.createHash('sha256').update(guid + 'typora').digest('base64');
  const i = digest.slice(0, 10);
  const l = [os.userInfo().username, os.hostname(), 'Windows'].join(' | ');
  const machineCode = Buffer.from(JSON.stringify({ v: 'win|1.14.10', i, l })).toString('base64');
  return { guid, digest, i, l, machineCode };
}

function readState() {
  try {
    const p = path.join(process.env.APPDATA, 'Typora', 'virt-reg.json');
    let raw = fs.readFileSync(p, 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function buildPayload(license, email) {
  const mf = machineFields();
  return JSON.stringify({
    deviceId: mf.i,
    fingerprint: mf.i,
    email: email || 'user@local',
    license: license,
    version: '1.14.10',
    date: '2099-12-31',
    type: 'standard'
  });
}

function looksLikeToken(buf) {
  try {
    if (!buf) return false;
    const s = Buffer.from(buf).toString('latin1');
    return s.length <= 64 && (s[0] === '+' || s.indexOf('|') >= 0 || /^[A-Za-z0-9+/=]{1,64}$/.test(s));
  } catch (e) { return false; }
}

// 仅对 Typora 的授权公钥放行验签, 避免影响其它 TLS/签名场景
const KEY_MARK = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A';
function isLicenseKey(k) {
  try {
    if (!k) return false;
    let s = '';
    if (typeof k === 'string') s = k;
    else if (Buffer.isBuffer(k)) s = k.toString('latin1');
    else if (k.export) { try { s = k.export({ type: 'spki', format: 'pem' }); } catch (e) { s = ''; } }
    return String(s).replace(/\s+/g, '').indexOf(KEY_MARK) >= 0;
  } catch (e) { return false; }
}

function install(opts) {
  const o = opts || {};
  const crypto = require('crypto');
  if (crypto.__vtForge) return false;

  const orig = crypto.publicDecrypt;
  let hits = 0;

  crypto.publicDecrypt = function (key, buf, ...rest) {
    try {
      log('publicDecrypt called len=' + (buf ? Buffer.from(buf).length : -1) + ' head=' + (buf ? Buffer.from(buf).toString('latin1').slice(0, 20) : ''));
    } catch (e) {}
    try {
      if (isLicenseKey(key)) {
        const st = readState();
        const license = (st && st.code) || (o.license || '');
        const email = (st && st.email) || o.email || 'user@local';
        if (license) {
          const payload = buildPayload(license, email);
          hits++;
          log('forge hit #' + hits + ' inLen=' + (buf ? Buffer.from(buf).length : -1) + ' -> payload(' + payload.length + ')');
          const tag = o.tag || '';
          // 启动复验路径会拿 sig 再解一次; 带上标记便于区分
          const out = tag && Buffer.from(buf).toString('latin1').indexOf(tag) >= 0
            ? Buffer.from(JSON.stringify({ ok: true }), 'utf8')
            : Buffer.from(payload, 'utf8');
          return out;
        }
      }
    } catch (e) { log('forge err ' + e.message); }
    return orig.call(this, key, buf, ...rest);
  };

  crypto.__vtForge = true;

  // 验签放行 (仅授权公钥)
  const origVerify = crypto.verify;
  if (typeof origVerify === 'function') {
    crypto.verify = function (alg, data, key, sig, ...rest) {
      let dbg = '';
      try { dbg = (typeof key) + ':' + (typeof key === 'string' ? key.replace(/\s+/g, '').slice(0, 30) : (key && key.constructor ? key.constructor.name : '')); } catch (e) {}
      log('verify called key=' + dbg + ' match=' + isLicenseKey(key));
      if (isLicenseKey(key)) { log('verify -> true (license key)'); return true; }
      return origVerify.call(this, alg, data, key, sig, ...rest);
    };
  }
  const origCreateVerify = crypto.createVerify;
  if (typeof origCreateVerify === 'function') {
    crypto.createVerify = function (...a) {
      const v = origCreateVerify.apply(this, a);
      const ov = v.verify;
      v.verify = function (key, sig, ...rest) {
        if (isLicenseKey(key)) { log('createVerify.verify -> true (license key)'); return true; }
        return ov.call(this, key, sig, ...rest);
      };
      return v;
    };
  }

  log('license-forge installed (license=' + ((readState() || {}).code || 'none') + ')');
  return true;
}

module.exports = { install, buildPayload, machineFields };
