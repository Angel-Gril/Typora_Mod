# v6 修订：许可页"已激活"面板补齐关闭能力

> 问题反馈：新版特权状态面板覆盖了旧面板，但没有关闭按钮。
> 结论：**已修复并验证**。同时顺带修正了两处窗口生命周期缺陷。

---

## 1. 问题原因

v5 的面板为了完全遮蔽 React 旧视图，做了两件事：
- `document.getElementById('root').style.display = 'none'`（隐藏旧内容）
- 插入全屏 `position:fixed; inset:0` 的 overlay

结果：**旧页面的关闭按钮也被一起隐藏**，而新面板没有提供关闭入口 →
用户只能靠窗口标题栏的 ×，体验上等于"没有关闭按钮"。

## 2. 修复内容

### 2.1 面板新增三个交互
| 控件 | 位置 | 行为 |
|---|---|---|
| `×` | 右上角 | `window.close()` |
| 「关闭」 | 面板底部主按钮 | `window.close()` |
| 「复制注册码」 | 面板底部次按钮 | 写入剪贴板，1.5s 内显示"已复制" |
| `Esc` 键 | 全局 | `window.close()`（只绑定一次） |

### 2.2 同时修复的两个窗口生命周期缺陷

| 缺陷 | 现象 | 修复 |
|---|---|---|
| 启动弹窗未被自动关闭 | `hidden=0`，每次启动许可窗不消失 | 引导时对**已存在窗口**也挂载处理器（原先只监听新建窗口） |
| 用户主动打开被判为"启动弹窗" | 手动点「我的许可证」窗口被自动隐藏 | 用时间窗区分：`license.show` 在启动 6s 内视为应用自身弹窗，之后视为用户操作 |
| 应用自身不会重现已隐藏窗口 | 用户点击后窗口仍不可见 | 在 `license.show` 包装器里补 `win.show() + focus()` |

## 3. 验证结果

### 3.1 启动阶段（应静默）
```
processes      : 5
main window    : OK
license visible: NO (good)
log: installed=1 suppressed=1 hidden=1 nagDrop=3
RESULT: PASS
```

### 3.2 用户主动打开（应可见且可关闭）
```
open : ok
state: [{"visible":true,"destroyed":false}]
panel: {"panel":true,"dismissBtn":true,"closeBtn":true,"text":"关闭"}
click: (点击后窗口立即销毁)
after: {"count":0,"states":[]}          ← 窗口已关闭
```

面板文案（窗口正文实测）：
```
× Typora 已激活 Licensed / 特权状态已生效
邮箱 user@local
注册码 WG3PH4-8NEUV9-BX5RYJ-EU8N2F
机器码 VT-97JP-MF4L-RKVE-632L
类型 Standard · 永久
复制注册码   关闭
```

## 4. 重新打包

`dist\TyporaSetup.exe` 已用最新模块重新编译：

```
大小   : 467.5 KB
SHA256 : 3A0E6CF8AC0FC46F3C9A80B39DBAF108466337F6C4AC4D189EB4A3D24C3AC689
内嵌   : winmm.dll / virt-loader.js / registration.js / license-virtualize.js / jsc-patch.js
```

> 已部署过的环境无需重装 `winmm.dll`：只需把 `license-virtualize.js` 覆盖到
> `%LOCALAPPDATA%\TyporaVirt\`（或直接运行新版 setup.exe 点"一键安装并激活"）。

---

## 5. 行为矩阵（最终）

| 场景 | 表现 |
|---|---|
| 正常启动 | 许可弹窗注入"已激活"面板 → 0.8s 后自动隐藏；主窗口无"未激活"字样 |
| 启动后点「帮助 → 我的许可证」 | 窗口显示"已激活"面板，可点 ×/关闭/Esc 退出，可复制注册码 |
| 未注册 | 不注入面板、不虚拟化（保持原样，等待注册） |
| 升级 Typora | 原生层自动重建旁路 asar；注册码不变（由 MachineGuid 派生） |
