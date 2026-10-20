/**
 * Typora 授权状态虚拟化模块 (License State Virtualization)
 * ------------------------------------------------------------------
 * 设计目标（工程化）:
 *   1. 不与 license 校验器对抗（不依赖 RSA 私钥 / 不依赖 checksum 算法）
 *   2. 不修改 app.asar 内任何业务文件 —— 升级后仍可复用
 *   3. 幂等、可逆、可日志审计
 *
 * 作用面（全部在 Electron 主进程的公开 API 层）:
 *   A. WebContents.loadURL / loadFile  -> 重写 license.html 的查询参数
 *      hasActivated=true / needLicense=false / dayRemains=3650
 *   B. WebContents.executeJavaScript   -> 丢弃"未注册"注入片段(含 UNREGISTERED / hasLicense=false)
 *   C. 许可窗口自动隐藏（可选）
 *
 * 用法:
 *   require('./license-virtualize.js')({ log, autoClose: true, dayRemains: 3650 });
 */
'use strict';

const MODULE_START = Date.now();

module.exports = function install(opts) {
  const o = opts || {};
  const log = typeof o.log === 'function' ? o.log : function () {};
  if (o.enabled === false) { log('virt', 'disabled (not registered)'); return false; }
  const autoClose = o.autoClose !== false;
  const dayRemains = o.dayRemains || 3650;

  let electron;
  try { electron = require('electron'); } catch (e) { log('virt', 'electron unavailable: ' + e.message); return false; }
  const app = electron.app;
  const BrowserWindow = electron.BrowserWindow;
  if (!app || !BrowserWindow) { log('virt', 'not main process'); return false; }

  let patched = false;
  const identity = o.identity || null;   // { email, license } —— 注入后许可页才会渲染"已激活"
  const stats = { urlRewrites: 0, jsDropped: 0, jsInspected: 0, windowsClosed: 0 };

  function rewriteUrl(u) {
    if (typeof u !== 'string' || !/license\.html/i.test(u)) return u;
    const before = u;
    let out = u
      .replace(/hasActivated=(true|false)/i, 'hasActivated=true')
      .replace(/needLicense=(true|false)/i, 'needLicense=false')
      .replace(/dayRemains=\d+/i, 'dayRemains=' + dayRemains);

    // ecp 是页面的真实状态源: t = ecp - 当前小时数, t[0]=已激活, t[1]=天数, t[2]=needLicense, t[3..]=小时
    // 写成 "1" + 天数 + "0" + 小时 → 已激活 / 不需再购 / 余量充足
    try {
      const nowH = Math.floor(Date.now() / 3600000);
      const enc = String(o.ecpEncoded || '1900');           // 1=已激活 9=天数 0=needLicense=false 0=小时
      const ecp = nowH + parseInt(enc, 10);
      out = /[?&]ecp=\d+/i.test(out) ? out.replace(/ecp=\d+/i, 'ecp=' + ecp) : out + '&ecp=' + ecp;
    } catch (e) { log('virt', 'ecp calc err ' + e.message); }
    // 注入身份（许可页靠 email+license 判定展示"已激活"而非输入表单）
    if (identity && identity.email && identity.license) {
      const em = encodeURIComponent(identity.email);
      const lc = encodeURIComponent(identity.license);
      if (/[&?]email=/i.test(out)) out = out.replace(/email=[^&]*/i, 'email=' + em);
      else out += '&email=' + em;
      if (/[&?]license=/i.test(out)) out = out.replace(/license=[^&]*/i, 'license=' + lc);
      else out += '&license=' + lc;
      if (!/[&?]type=/i.test(out)) out += '&type=standard';
    }
    // 注: ecp 是「基准时间戳 - 当前小时数」的算术编码, 不可做位替换, 保持原值
    if (out !== before) { stats.urlRewrites++; log('virt', 'URL rewritten: ' + before.slice(0, 160)); }
    return out;
  }

  // 判断是否为"未注册"注入片段
  function isNagSnippet(code) {
    if (typeof code !== 'string') return false;
    return /UNREGISTERED/i.test(code) || /hasLicense\s*=\s*false/i.test(code);
  }

  // 把应用的"未注册"注入片段替换为"已激活" (使用应用自己的 File.option / megaMenu API)
  const ACTIVATE_SNIPPET =
    '(function(){try{' +
    'if(window.File&&window.File.option){window.File.option.hasLicense=true;}' +
    'if(window.File&&window.File.megaMenu&&window.File.megaMenu.forceReload){window.File.megaMenu.forceReload();}' +
    '}catch(e){}})();';

  let nagDumped = false;
  function dumpNag(code) {
    if (nagDumped) return;
    nagDumped = true;
    try {
      const fsx = require('fs');
      const px = require('path');
      fsx.writeFileSync(px.join(__dirname, 'nag-snippet.txt'), String(code).slice(0, 6000), 'utf8');
    } catch (e) {}
  }

  // 用户主动打开许可页的标记 (用于区分启动弹窗与手动查看)
  let userOpenedAt = 0;
  let deactivated = false;   // 解除激活后停止注入
  // 供 registration.js 在 removeLicense 时回调
  global.__vtOnDeactivate = function () {
    deactivated = true;
    identity = null;   // 不再重注入
    log('virt', 'deactivated: panel injection stopped');
  };

  // 轮询包装 license.show (不改 map.set, 避开与 registration.js 的拦截冲突)
  function ensureShowWrapped() {
    try {
      const map = electron.ipcMain._invokeHandlers;
      if (!map || !map.get || !map.set) return;
      const cur = map.get('license.show');
      if (typeof cur !== 'function' || cur.__vtShow) return;
      const wrapped = function () {
        const elapsed = Date.now() - MODULE_START;
        if (elapsed > 8000) { userOpenedAt = Date.now(); log('virt', 'license.show (user, t=' + Math.round(elapsed / 1000) + 's)'); }
        const ret = cur.apply(this, arguments);
        setTimeout(function () {
          try {
            electron.BrowserWindow.getAllWindows().forEach(function (w) {
              const u = w.webContents ? (w.webContents.getURL() || '') : '';
              if (!/license\.html/i.test(u)) return;
              if (Date.now() - userOpenedAt < 20000) {
                try { w.setOpacity(1); } catch (e) {}
                if (!w.isVisible()) w.show();
                w.focus();
              }
            });
          } catch (e) {}
        }, 150);
        return ret;
      };
      wrapped.__vtShow = true;
      map.set('license.show', wrapped);
      log('virt', 'license.show wrapped (poll)');
    } catch (e) { log('virt', 'show wrap err ' + e.message); }
  }
  ensureShowWrapped();
  setInterval(ensureShowWrapped, 1000);
  function renderActivatedPanel(win) {
    if (!identity) return;
    if (deactivated) return;
    if (o.panel === false) return;   // 关闭遮罩: 完全依赖应用自身页面
    const payload = JSON.stringify({ email: identity.email, license: identity.license, machine: identity.machine || '' });
    const js = `(function(){ try {
      var d = ${payload};
      function paint(){
        if(!document.body) return;
        if(window.__vtStop) return;
        if(document.getElementById('vt-panel')) return;
        try {
          var r = document.getElementById('root');
          if (r) r.style.display = 'none';
          var w = document.querySelector('.ty-welcome');
          if (w) w.style.display = 'none';
        } catch(e){}
        var wrap = document.createElement('div');
        wrap.id = 'vt-panel';
        wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:var(--bg-color,#fff);color:var(--text-color,#222);font-family:-apple-system,Segoe UI,sans-serif;padding:48px 56px;box-sizing:border-box';
        wrap.innerHTML = '<button id="vt-close" title="关闭 (Esc)" style="position:absolute;top:16px;right:18px;width:34px;height:34px;border:0;border-radius:8px;background:#00000010;color:inherit;font-size:20px;line-height:1;cursor:pointer">&times;</button>'
          + '<h1 style="margin:0 0 8px;font-size:26px">Typora 已激活</h1>'
          + '<p style="margin:0 0 28px;color:#4caf50;font-weight:600">Licensed / 特权状态已生效</p>'
          + '<table style="border-collapse:collapse;font-size:14px;line-height:1.9">'
          + '<tr><td style="padding-right:18px;color:#888">邮箱</td><td>'+d.email+'</td></tr>'
          + '<tr><td style="padding-right:18px;color:#888">注册码</td><td style="font-family:Consolas,monospace">'+d.license+'</td></tr>'
          + (d.machine ? '<tr><td style="padding-right:18px;color:#888">机器码</td><td style="font-family:Consolas,monospace">'+d.machine+'</td></tr>' : '')
          + '<tr><td style="padding-right:18px;color:#888">类型</td><td>Standard · 永久</td></tr>'
          + '</table>'
          + '<div style="margin-top:34px">'
          + '<button id="vt-copy" style="padding:9px 18px;border:1px solid #d0d0d8;border-radius:8px;background:#fff;color:inherit;cursor:pointer;margin-right:10px">复制注册码</button>'
          + '<button id="vt-dismiss" style="padding:9px 18px;border:1px solid #d0d0d8;border-radius:8px;background:#fff;color:inherit;cursor:pointer;margin-right:10px">关闭</button>'
          + '<button id="vt-deact" style="padding:9px 18px;border:0;border-radius:8px;background:#e5484d;color:#fff;cursor:pointer">解除激活</button>'
          + '</div>'
          + '<p id="vt-msg" style="margin-top:18px;font-size:13px;color:#888"></p>';
        document.body.appendChild(wrap);
        var close = function(){ try { window.close(); } catch(e){} };
        var b1 = document.getElementById('vt-close'); if (b1) b1.onclick = close;
        var b2 = document.getElementById('vt-dismiss'); if (b2) b2.onclick = close;
        var b3 = document.getElementById('vt-copy');
        if (b3) b3.onclick = function(){
          try { navigator.clipboard.writeText(d.license); b3.textContent = '已复制'; setTimeout(function(){ b3.textContent = '复制注册码'; }, 1500); } catch(e){}
        };
        // 解除激活: 调用应用自身的 removeLicense 通道, 并恢复原页面视图
        var b4 = document.getElementById('vt-deact');
        if (b4) b4.onclick = async function(){
          if (!window.confirm('确认解除本机激活？解除后需重新输入注册码。')) return;
          b4.disabled = true; b4.textContent = '处理中…';
          var msg = document.getElementById('vt-msg');
          try {
            var r = null;
            if (window.Setting && window.Setting.invokeWithCallback) {
              r = await window.Setting.invokeWithCallback('removeLicense');
            }
            if (msg) msg.textContent = '已解除激活，请重启 Typora 完成清理。';
            // 停止守护并恢复原页面
            window.__vtStop = true;
            var p = document.getElementById('vt-panel'); if (p) p.remove();
            var rt = document.getElementById('root'); if (rt) rt.style.display = '';
            var wl = document.querySelector('.ty-welcome'); if (wl) wl.style.display = '';
            try { window.location.reload(); } catch(e){}
          } catch (e) {
            if (msg) msg.textContent = '解除失败: ' + e.message;
            b4.disabled = false; b4.textContent = '解除激活';
          }
        };
        if (!window.__vtEsc) {
          window.__vtEsc = true;
          document.addEventListener('keydown', function(ev){ if (ev.key === 'Escape') close(); });
        }
      }
      paint();
      // React 重渲染后会覆盖, 持续守护
      try { new MutationObserver(paint).observe(document.documentElement, {childList:true, subtree:true}); } catch(e){}
      setInterval(paint, 800);
      return 'OK';
    } catch (e) { return 'ERR:' + e.message; } })();`;
    try {
      if (process.env.VIRT_DUMP_JS) {
        try { require('fs').writeFileSync('C:/AI/RD/Tool/mcp/typora-license-audit/exports/panel.js', js); } catch (e) {}
      }
      win.webContents.executeJavaScript(js, true)
        .then(function (r) {
          if (r === 'OK') { stats.panelRendered = (stats.panelRendered || 0) + 1; log('virt', 'activated panel injected'); }
          else log('virt', 'panel inner ' + String(r).slice(0, 300));
        })
        .catch(function (e) { log('virt', 'panel inject ERR ' + (e && e.message)); });
    } catch (e) { log('virt', 'panel inject err ' + e.message); }
  }

  function patchProto(protoObj, methods) {
    if (!protoObj) return;
    methods.forEach(function (m) {
      const orig = protoObj[m];
      if (typeof orig !== 'function' || orig.__virtPatched) return;
      const wrapper = function () {
        try {
          if (m === 'loadURL') {
            arguments[0] = rewriteUrl(arguments[0]);
          } else if (m === 'executeJavaScript') {
            stats.jsInspected++;
            if (isNagSnippet(arguments[0])) {
              stats.jsDropped++;
              dumpNag(arguments[0]);
              log('virt', 'nag snippet -> activate snippet');
              arguments[0] = ACTIVATE_SNIPPET;
            }
          }
        } catch (e) { log('virt', m + ' hook err ' + e.message); }
        return orig.apply(this, arguments);
      };
      wrapper.__virtPatched = true;
      try { protoObj[m] = wrapper; } catch (e) { log('virt', 'patch fail ' + m + ': ' + e.message); }
    });
  }

  // 直接对某个 webContents 实例打补丁 (实例属性优先于原型, 最可靠)
  function patchWebContents(wc) {
    if (!wc || wc.__virt) return;
    try { wc.__virt = true; } catch (e) { return; }
    const wrapMethod = function (m) {
      const orig = wc[m];
      if (typeof orig !== 'function' || orig.__virtPatched) return;
      const wrapper = function () {
        try {
          if (m === 'loadURL') arguments[0] = rewriteUrl(arguments[0]);
          else if (m === 'executeJavaScript') {
            stats.jsInspected++;
            if (isNagSnippet(arguments[0])) {
              stats.jsDropped++;
              dumpNag(arguments[0]);
              log('virt', 'nag snippet -> activate snippet');
              arguments[0] = ACTIVATE_SNIPPET;
            }
          }
        } catch (e) { log('virt', m + ' err ' + e.message); }
        return orig.apply(this, arguments);
      };
      wrapper.__virtPatched = true;
      try { wc[m] = wrapper; } catch (e) { log('virt', 'instance patch fail ' + m + ': ' + e.message); }
    };
    ['loadURL', 'loadFile', 'executeJavaScript'].forEach(wrapMethod);
    log('virt', 'webContents instance patched');
  }

  function patchAll() {
    // BrowserWindow.prototype.loadURL / loadFile
    patchProto(BrowserWindow.prototype, ['loadURL', 'loadFile']);
    // 已存在窗口: 逐实例打补丁
    try {
      BrowserWindow.getAllWindows().forEach(function (w) { patchWebContents(w.webContents); });
    } catch (e) { log('virt', 'existing win err ' + e.message); }
    patched = true;
  }

  // 许可窗口自动关闭（仅针对 license.html，避免误伤主窗口）
  function installAutoClose() {
    const readyAt = MODULE_START;   // 以模块加载时刻为基准(早于 app ready)
    let windowSeq = 0;

    // 主进程侧守护: 页面重新渲染/导航后确保面板仍在
    if (autoClose) {
      setInterval(function () {
        if (deactivated || !identity) return;
        try {
          electron.BrowserWindow.getAllWindows().forEach(function (w) {
            const u = w.webContents ? (w.webContents.getURL() || '') : '';
            if (/license\.html/i.test(u)) renderActivatedPanel(w);
          });
        } catch (e) {}
      }, 2500);
    }

    function hookWindow(win) {
      try {
        patchWebContents(win.webContents);   // 逐实例接管
        const wc = win.webContents;

        // 确认窗口身份后恢复透明度（非许可页）
        const revealIfNotLicense = function (url) {
          if (/license\.html/i.test(String(url || ''))) return;
          try { win.setOpacity(1); } catch (e) {}
        };
        wc.on('did-start-navigation', function (_e, url) { revealIfNotLicense(url); });
        wc.on('did-finish-load', function () {
          let u = '';
          try { u = wc.getURL() || ''; } catch (e) {}
          revealIfNotLicense(u);
        });
        // 安全兜底: 3s 后仍不是许可页就恢复可见性
        setTimeout(function () {
          let u = '';
          try { u = wc.getURL() || ''; } catch (e) {}
          if (!/license\.html/i.test(u)) { try { win.setOpacity(1); } catch (e) {} }
        }, 3000);

        // 关键: 许可页一开始导航就把它"隐形"，从根上避免弹窗闪现
        wc.on('did-start-navigation', function (_e, url) {
          if (!/license\.html/i.test(String(url || ''))) return;
          if (deactivated) return;
          const isUserOpen = (Date.now() - userOpenedAt) < 20000;
          if (!isUserOpen) {
            try { win.setOpacity(0); } catch (e) {}
            try { win.hide(); } catch (e) {}
            log('virt', 'license nav: window made invisible (startup phase)');
          }
        });

        const onLoaded = function () {
          const u = wc.getURL() || '';
          // 主动同步激活态到渲染进程 (使用应用自己的 File.option API)
          if (!deactivated) {
            try { wc.executeJavaScript(ACTIVATE_SNIPPET).catch(function () {}); } catch (e) {}
          }
          log('virt', 'did-finish-load url=' + u.slice(0, 80));
          if (!/license\.html/i.test(u)) return;
          renderActivatedPanel(win);
          const isUserOpen = (Date.now() - userOpenedAt) < 20000;
          const isStartupNag = !isUserOpen && (Date.now() - readyAt) < (o.nagWindowMs || 10000);
          if (isStartupNag && autoClose) {
            setTimeout(function () {
              try {
                if (!win.isDestroyed()) {
                  try { win.setOpacity(0); } catch (e) {}
                  win.hide();
                  stats.windowsClosed++;
                  log('virt', 'startup license window suppressed');
                }
              } catch (e) {}
            }, 50);
          } else {
            log('virt', 'license window kept visible (user-opened=' + isUserOpen + ')');
            try {
              if (!win.isDestroyed()) { win.setOpacity(1); win.show(); win.focus(); }
            } catch (e) {}
          }
        };
        wc.on('did-finish-load', onLoaded);
        // dom-ready 早于首帧: 尽可能消除"未激活"闪现
        wc.on('dom-ready', function () {
          if (deactivated) return;
          try { wc.executeJavaScript(ACTIVATE_SNIPPET).catch(function () {}); } catch (e) {}
        });
        // 兜底: 许可页若未被改写成激活态, 重新导航一次 (只做一次, 防循环)
        wc.on('did-finish-load', function () {
          const u = wc.getURL() || '';
          if (!/license\.html/i.test(u) || deactivated) return;
          if (/hasActivated=true/i.test(u)) return;
          if (wc.__vtRenav) return;
          wc.__vtRenav = true;
          const fixed = rewriteUrl(u);
          if (fixed !== u) {
            log('virt', 're-navigate with activated params');
            setTimeout(function () { try { wc.loadURL(fixed); } catch (e) {} }, 50);
          }
        });
        // 若窗口已加载完成, 立即处理
        try { if (wc.getURL && /license\.html/i.test(wc.getURL() || '')) setTimeout(onLoaded, 50); } catch (e) {}
        win.on('show', function () {
          try {
            const u = wc.getURL() || '';
            const isUserOpen = (Date.now() - userOpenedAt) < 20000;
            if (/license\.html/i.test(u) && !isUserOpen && autoClose) {
              // 启动阶段应用自己弹窗: 立即隐形并隐藏, 避免任何可见闪现
              try { win.setOpacity(0); } catch (e) {}
              try { win.hide(); } catch (e) {}
            }
          } catch (e) {}
        });
      } catch (e) { log('virt', 'window hook err ' + e.message); }
    }

    app.on('browser-window-created', function (_e, win) {
      windowSeq++;
      // 除首个窗口(主窗口)外, 创建时即全透明并隐藏: 杜绝首帧闪现
      if (windowSeq > 1) {
        try { win.setOpacity(0); } catch (e) {}
        try { win.hide(); } catch (e) {}
      }
      hookWindow(win);
    });
    // 覆盖安装前已存在的窗口
    try { BrowserWindow.getAllWindows().forEach(hookWindow); } catch (e) {}
  }

  if (app.isReady && app.isReady()) { patchAll(); installAutoClose(); }
  else { app.whenReady().then(function () { patchAll(); installAutoClose(); }); }

  // 暴露统计
  install.stats = stats;
  install.rewriteUrl = rewriteUrl;
  install.isNagSnippet = isNagSnippet;
  return true;
};
