/**
 * Typora 授权状态虚拟化 —— 启动引导 (精简版, 仅生产必需逻辑)
 * 由 app.asar 内 launch.dist.js 顶部 require 加载。
 *
 * 关闭方式: 环境变量 TYPORA_VIRT=0
 * 日志:     <本文件目录>/virt.log  (仅关键事件, 自动截断)
 */
'use strict';

const path = require('path');
const fs = require('fs');

if (process.env.TYPORA_VIRT === '0') return;

const LOG = path.join(__dirname, 'virt.log');

function log(tag, msg) {
  try {
    if (fs.existsSync(LOG) && fs.statSync(LOG).size > 512 * 1024) {
      fs.writeFileSync(LOG, '');   // 简单轮转
    }
    fs.appendFileSync(LOG, '[' + new Date().toISOString() + '][' + tag + '] ' + msg + '\n');
  } catch (e) { /* 静默 */ }
}

function boot() {
  // 运行时版本戳（用于确认各设备上部署的是哪一版）
  let VIRT_VER = 'unknown';
  try { VIRT_VER = fs.readFileSync(path.join(__dirname, 'VERSION'), 'utf8').trim(); } catch (e) {}
  log('boot', 'virt-runtime version=' + VIRT_VER + ' dir=' + __dirname);
  // 1) 安装授权状态虚拟化 (仅当已注册; VIRT_ALWAYS=1 可强制开启)
  let registered = true;
  try {
    const regMod = require(path.join(__dirname, 'registration.js'));
    const guid = (function () {
      try {
        const out = require('child_process').execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { windowsHide: true, encoding: 'utf8' });
        const m = out.match(/MachineGuid\s+REG_SZ\s+(\S+)/i);
        if (m) return m[1];
      } catch (e) {}
      return require('os').hostname();
    })();
    const machine = regMod.machineCodeOf(guid);
    registered = regMod.isRegistered(machine);
    if (process.env.VIRT_ALWAYS === '1') registered = true;
    log('boot', 'machine=' + machine + ' registered=' + registered);
  } catch (e) { log('boot', 'registration check failed: ' + e.message); }

  try {
    const install = require(path.join(__dirname, 'license-virtualize.js'));
    let identity = null;
    try {
      const regMod2 = require(path.join(__dirname, 'registration.js'));
      const st = JSON.parse(require('fs').readFileSync(regMod2.STATE_FILE, 'utf8').replace(/^\uFEFF/, ''));
      if (st && st.code) identity = { email: st.email || 'registered@local', license: st.code, machine: st.machine || '' };
      // 同步回机器码（若状态文件缺失机器码）
      if (identity && !st.machine) {
        identity.machine = regMod2.machineCodeOf(require('os').hostname());
      }
    } catch (e) {}
    install({ log: log, autoClose: registered, dayRemains: 3650, enabled: registered, identity: identity,
              // 默认不叠加遮罩: 由应用自身页面渲染已激活 (URL 状态驱动)
              // VIRT_PANEL=1 可回退到遮罩模式 (旧版本/布局差异时使用)
              panel: process.env.VIRT_PANEL === '1',
              ecpEncoded: process.env.VIRT_ECP || '1000' });
    log('boot', 'license virtualization installed (pid=' + process.pid + ') registered=' + registered + ' identity=' + (identity ? identity.email : 'none'));
  } catch (e) {
    log('boot', 'install failed: ' + e.message);
  }

  // 1b) 字节码层补丁 (TYPORA_JSC_PATCH=1)
  if (process.env.TYPORA_JSC_PATCH === '1') {
    try {
      require(path.join(__dirname, 'jsc-patch.js')).install({ log: log });
      log('boot', 'jsc patch harness installed');
    } catch (e) { log('boot', 'jsc harness failed: ' + e.message); }
  }

  // 1c) 离线注册模块 (特权状态注册)
  if (process.env.VIRT_NO_REG !== '1') {
    try {
      const reg = require(path.join(__dirname, 'registration.js'));
      const info = reg.install({ log: log });
      if (info) log('boot', 'registration shim installed machine=' + info.machine);
    } catch (e) { log('boot', 'registration failed: ' + e.message); }
  } else {
    log('boot', 'registration shim skipped (VIRT_NO_REG=1)');
  }

  // 1f) 状态猎手 (实验): VIRT_HUNT=1 报告 / VIRT_HUNT=set 置真
  if (process.env.VIRT_HUNT) {
    try {
      const { hunt } = require(path.join(__dirname, 'state-hunt.js'));
      const hits = hunt({ set: process.env.VIRT_HUNT === 'set' });
      log('boot', 'state-hunt hits=' + (hits ? hits.length : 0));
    } catch (e) { log('boot', 'state-hunt err ' + e.message); }
  }

  // 1d) L3 密码学边界伪造 (VIRT_FORGE=1 开启)
  if (process.env.VIRT_FORGE === '1') {
    try {
      require(path.join(__dirname, 'license-forge.js')).install({ log: log, license: process.env.VIRT_LICENSE || '' });
      log('boot', 'license-forge installed (RSA 边界接管)');
    } catch (e) { log('boot', 'license-forge err ' + e.message); }
  }

  // 1e) L3 探针: 拦截主进程 RSA 验签 (仅实验时开启)
  if (process.env.VIRT_RSA_PROBE === '1') {
    try {
      require(path.join(__dirname, 'rsa-probe.js'))({ fake: process.env.VIRT_RSA_FAKE || null });
      log('boot', 'rsa-probe installed fake=' + (process.env.VIRT_RSA_FAKE ? 'yes' : 'no'));
    } catch (e) { log('boot', 'rsa-probe err ' + e.message); }
  }

  // 2) 主进程退出保护: 仅拦截「许可校验超时」触发的自动退出, 保留用户主动退出
  try {
    const electron = require('electron');
    if (electron && electron.app) {
      const app = electron.app;
      const _quit = app.quit.bind(app);
      const _exit = app.exit.bind(app);
      let blocked = 0;
      const isLicenseAutoQuit = function () {
        try {
          const st = new Error().stack || '';
          // 许可失败路径: setTimeout -> Timeout._onTimeout -> jsc
          return /Timeout\._onTimeout|listOnTimeout/i.test(st) && /atom\.compiled|\.jsc/i.test(st);
        } catch (e) { return false; }
      };
      app.quit = function () {
        if (isLicenseAutoQuit()) {
          blocked++;
          log('quit', 'license auto-quit suppressed (#' + blocked + ')');
          return;
        }
        log('quit', 'user/other quit allowed: ' + new Error().stack.split('\n').slice(1, 4).join(' | '));
        return _quit();
      };
      app.exit = function (code) {
        if (isLicenseAutoQuit()) {
          blocked++;
          log('quit', 'license auto-exit suppressed (#' + blocked + ')');
          return;
        }
        return _exit(code);
      };
    }
  } catch (e) { log('boot', 'electron hook failed: ' + e.message); }

  // 3) 可选调试端口 (仅验证/调试时使用)
  if (process.env.INSPECT_PORT) {
    try {
      require('inspector').open(Number(process.env.INSPECT_PORT), '127.0.0.1', false);
      log('boot', 'inspector on ' + process.env.INSPECT_PORT);
    } catch (e) { log('boot', 'inspector failed: ' + e.message); }
  }
}

boot();
