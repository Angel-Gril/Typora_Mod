/**
 * Typora 离线注册模块 (Offline Registration Shim)
 * ------------------------------------------------------------------
 * 目标: 提供「机器码 -> 注册码 -> 离线激活」的完整闭环，且不依赖 Typora 版本。
 *
 * 设计:
 *   - 机器码: 由 MachineGuid 派生 (稳定, 与 Typora 版本无关)
 *   - 注册码: codeFor(machine) —— 工具端与此处同一算法, 纯本地校验
 *   - 特权状态: %APPDATA%\Typora\virt-reg.json (自有文件, 升级不受影响)
 *   - 生效方式: 接管 4 个稳定 IPC 通道 (machineCode / addLicense / offlineActivation / removeLicense)
 *
 * 注意: 本模块的注册码由本工具的算法校验, 与 Typora 官方 RSA 签名体系无关。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const ALPHABET = 'L23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const SALT = 'typora-virt-v1';

function fnv1a(str, seed) {
  let h = (seed >>> 0) || 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** 由机器码派生注册码: 4 组 x 6 字符 */
function codeFor(machine) {
  const m = String(machine || '').toUpperCase();
  let out = '';
  for (let b = 0; b < 4; b++) {
    for (let i = 0; i < 6; i++) {
      const h = fnv1a(`${SALT}|${m}|${b}|${i}`, 2166136261);
      out += ALPHABET[h % 32];
    }
    if (b < 3) out += '-';
  }
  return out;
}

/** 稳定机器码: MachineGuid -> 16 位 base32, 格式 VT-XXXX-XXXX-XXXX */
function machineCodeOf(guid) {
  const g = String(guid || '').toUpperCase();
  const h1 = fnv1a(`m1|${g}`, 2166136261);
  const h2 = fnv1a(`m2|${g}`, 0x811c9dc5);
  let bits = '';
  for (const h of [h1, h2]) {
    let v = h;
    for (let i = 0; i < 8; i++) { bits += ALPHABET[v % 32]; v = Math.floor(v / 32); }
  }
  return 'VT-' + bits.slice(0, 4) + '-' + bits.slice(4, 8) + '-' + bits.slice(8, 12) + '-' + bits.slice(12, 16);
}

function readMachineGuid() {
  try {
    const out = require('child_process').execSync(
      'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
      { windowsHide: true, encoding: 'utf8' }
    );
    const m = out.match(/MachineGuid\s+REG_SZ\s+([^\s]+)/i);
    if (m) return m[1];
  } catch (e) {}
  return os.hostname() || 'unknown';
}

const STATE_DIR = path.join(process.env.APPDATA || os.homedir(), 'Typora');
const STATE_FILE = path.join(STATE_DIR, 'virt-reg.json');

function readState() {
  try {
    let raw = fs.readFileSync(STATE_FILE, 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);   // 去掉 BOM
    return JSON.parse(raw);
  } catch (e) { return null; }
}
function writeState(obj) {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(obj, null, 2));
    return true;
  } catch (e) { return false; }
}
function clearState() {
  try { fs.unlinkSync(STATE_FILE); } catch (e) {}
}

/** 校验注册码是否为本机有效码 */
function verify(machine, code) {
  if (!code || typeof code !== 'string') return false;
  const norm = code.replace(/\s+/g, '').toUpperCase();
  return norm === codeFor(machine);
}

/** 读取并校验本机是否已注册 */
function isRegistered(machine) {
  const st = readState();
  if (!st || !st.code) return false;
  if (st.machine && machine && st.machine !== machine) return false;
  return verify(machine || st.machine, st.code);
}

function install(opts) {
  const o = opts || {};
  const log = typeof o.log === 'function' ? o.log : function () {};
  let electron;
  try { electron = require('electron'); } catch (e) { log('reg', 'no electron'); return false; }
  if (!electron || !electron.app) { log('reg', 'not main process'); return false; }

  const machine = machineCodeOf(readMachineGuid());
  log('reg', 'machine=' + machine + ' expected=' + codeFor(machine));

  const map = electron.ipcMain._invokeHandlers;
  if (!map) { log('reg', 'no ipc map'); return false; }

  const wrapped = {};
  const targets = new Set(['license.machineCode', 'addLicense', 'offlineActivation', 'removeLicense']);
  const makers = {};

  const makeWrapper = (name, orig) => {
    if (name === 'license.machineCode') {
      return async function () {
        return Buffer.from(JSON.stringify({ v: 'vt|1', m: machine })).toString('base64');
      };
    }
    if (name === 'addLicense') {
      return async function (ev, arg) {
        try {
          const code = arg && typeof arg === 'object' ? arg.license : arg;
          if (verify(machine, code)) {
            const em = (arg && typeof arg === 'object' && arg.email) ? String(arg.email) : 'registered@local';
            writeState({ machine, email: em, code: String(code).replace(/\s+/g, '').toUpperCase(), issued: new Date().toISOString() });
            log('reg', 'addLicense OK (offline code)');
            return [true, '', 'registered@local', '2099-12-31'];
          }
          log('reg', 'addLicense rejected: ' + String(code).slice(0, 40));
          return [false, 'Invalid registration code'];
        } catch (e) { return [false, 'Invalid registration code']; }
      };
    }
    if (name === 'offlineActivation') {
      return async function (ev, token) {
        try {
          let code = token;
          if (typeof token === 'string' && token.indexOf('+') === 0) {
            const body = token.replace(/^\+/, '').replace(/#$/, '');
            const b64 = body.split('|')[0];
            const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
            code = json.license || json.code;
          }
          if (verify(machine, code)) {
            writeState({ machine, code: String(code).replace(/\s+/g, '').toUpperCase(), issued: new Date().toISOString() });
            log('reg', 'offlineActivation OK');
            return [true, '', 'registered@local', '2099-12-31'];
          }
          return [false, 'Invalid Activation Token'];
        } catch (e) { return [false, 'Invalid Activation Token']; }
      };
    }
    if (name === 'removeLicense') {
      return async function () {
        clearState();
        try { if (global.__vtOnDeactivate) global.__vtOnDeactivate(); } catch (e) {}
        log('reg', 'removeLicense -> state cleared');
        return true;
      };
    }
    return orig;
  };

  const origSet = map.set.bind(map);
  // 1) 已注册的直接替换
  targets.forEach((n) => {
    if (map.has(n)) { origSet(n, makeWrapper(n, map.get(n))); wrapped[n] = true; }
  });
  // 2) 未注册的: 拦截后续 set
  map.set = function (n, fn) {
    if (targets.has(n)) {
      wrapped[n] = true;
      log('reg', 'wrapping on registration: ' + n);
      return origSet(n, makeWrapper(n, fn));
    }
    return origSet(n, fn);
  };

  log('reg', 'shim installed: ' + Object.keys(wrapped).join(','));
  return { machine, codeFor, verify, stateFile: STATE_FILE };
}

module.exports = { install, codeFor, machineCodeOf, verify, isRegistered, STATE_FILE };
