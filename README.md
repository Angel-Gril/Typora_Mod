# Typora_Mod

Typora（Windows x64）**离线授权状态**研究工具 —— 受权沙箱内的客户端鉴权白盒审计（CWE-602）。

> ⚠️ **仅限已获书面授权的测试环境使用**。本项目用于验证"客户端本地鉴权可被绕过的边界在哪里"，
> 以及厂商应如何加固。请勿用于未授权场景。

---

## 它是什么

一个**单文件图形工具**：输入 Typora 安装目录 → 自动生成与本机绑定的注册码 → 一键部署 →
Typora 自己的许可面板显示「Typora 已激活」。

```
┌─────────────────┐      ┌──────────────────────────────┐
│ TyporaSetup.exe │ ───▶ │ 部署 winmm.dll（原生代理）    │
│ 机器码 / 注册码  │      │ 部署 JS 运行时模块            │
└─────────────────┘      │ 写入本机注册状态              │
                         └──────────────────────────────┘
                                      │
                     Typora 启动 → 加载 winmm.dll
                              → 旁路资源重定向 + 状态注入
                              → 原生许可页渲染「已激活」
```

**关键特性**

| 特性 | 说明 |
|---|---|
| 零厂商文件修改 | 厂商 `app.asar` 始终保持原始字节（SHA256 可校验） |
| 抗版本升级 | 原生层每次启动比对 `app.asar` 指纹，变化即自动重建旁路资源包 |
| 可逆 | 一键卸载，移除全部部署物与状态 |
| 全离线 | 不联网、不写伪造许可、不碰注册表许可项 |
| 原生呈现 | 界面由 Typora 自己的 React 页面渲染，**不是遮罩/自绘图** |

---

## 支持范围（实测）

| Typora 版本 | 支持 | 依据 |
|---|---|---|
| **1.10.8 ～ 1.14.10** | ✅ 完整 | 实测 1.10.8、1.14.10 |
| ≤ 1.9.5 | ❌ 不支持 | 旧版主进程为原生 `main.node`，无 JS 注入点 |

工具会自动识别并提示：

```
状态：未安装 | 检测到 Typora v1.14.10 · 布局支持
状态：未安装 | 检测到 Typora v1.9.5  · 布局不支持（需 1.10+）
```

---

## 使用

1. 双击 `dist/TyporaSetup.exe`（绿色单文件，无需安装）
2. 确认/浏览 Typora 安装目录（含 `Typora.exe`）
3. 点「一键安装并激活」→ 重启 Typora

卸载：同一界面点「卸载 / 还原」。

命令行方式：

```powershell
powershell -ExecutionPolicy Bypass -File tools\typora-keygen.ps1            # 生成机器码/注册码
powershell -ExecutionPolicy Bypass -File tools\typora-keygen.ps1 -WriteState
powershell -ExecutionPolicy Bypass -File tools\install-typora-virt.ps1 -Action install
powershell -ExecutionPolicy Bypass -File tools\install-typora-virt.ps1 -Action uninstall
powershell -ExecutionPolicy Bypass -File tools\verify-typora-virt.ps1
```

---

## 目录结构

```
build/winmm/          原生代理 DLL（Rust）：PE 导出转发 + IAT 钩子 + asar 重建
  src/hook.rs           核心：解析 app.asar、注入引导、重建旁路资源包
build/gui/            图形界面（C# WinForms）+ Inno Setup 脚本 + 图标
patches/              JS 运行时模块
  virt-loader.js        引导：注册检查 / 虚拟化 / 退出守卫
  registration.js       机器码↔注册码算法 + 状态持久化
  license-virtualize.js 许可页状态（URL 重参数化 + 窗口生命周期）
  license-forge.js      [实验] 密码学边界接管
  jsc-patch.js          [实验] V8 字节码等长补丁框架
tools/                PowerShell / Node 辅助脚本与取证工具
dist/                 构建产物（TyporaSetup.exe / 安装包 / 使用说明）
reports/              技术报告（审计链还原、实现演进、版本兼容）
```

---

## 工作原理（简版）

```
Typora.exe ──加载──▶ winmm.dll（同目录同名代理，系统 DLL 也用它）
                       │
                       ├─ 读 virt.cfg → 得到运行时模块路径
                       ├─ 检查 resources\app.asar 指纹
                       │    └─ 变化 → 重建 app.virt.asar（注入 loader 引导）
                       └─ IAT 钩子：打开 app.asar → 改开 app.virt.asar
                              │
                              ▼
                        virt-loader.js
                          ├─ 校验本机注册状态（MachineGuid 派生）
                          ├─ 改写许可页 URL 状态（ecp/hasActivated/email/license）
                          ├─ 接管应用下发的"未注册"注入脚本 → 改为"已激活"
                          ├─ 许可窗口生命周期（启动静默、用户主动打开才显示）
                          └─ 退出守卫（仅拦"许可超时"触发的自动退出）
```

厂商 `app.asar` 从不被写入；所有改动发生在旁路文件与运行时状态中。

---

## 构建

需要：Rust（GNU 或 MSVC 工具链）、.NET Framework 4 的 `csc.exe`、Inno Setup 6（可选）。

```powershell
# 原生代理
cd build\winmm
cargo build --release          # -> target\release\winmm.dll

# 图形界面（内嵌 DLL 与 JS 模块）
$csc = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
& $csc /target:winexe /codepage:65001 /win32icon:build\gui\typora-virt.ico `
      /out:build\gui\TyporaSetup.exe `
      /resource:build\gui\winmm.dll,winmm.dll `
      /resource:build\gui\virt-loader.js,virt-loader.js `
      ... build\gui\SetupForm.cs

# 安装包（可选）
ISCC.exe build\gui\installer.iss
```

---

## 技术报告

| 文件 | 内容 |
|---|---|
| `reports/AUDIT-REPORT.md` | 授权链完整还原（机器码算法、RSA 公钥、令牌结构） |
| `reports/TOOL-v8-native-panel.md` | 许可页状态机还原（`ecp` 算术编码、`stage` 索引） |
| `reports/TOOL-v10-native-fully.md` | 主窗口"未激活"角标的原生消除 |
| `reports/TOOL-v12-version-compat.md` | 版本兼容性实测 + 启动闪现根治 |

---

## 能力边界（诚实说明）

1. **呈现层是原生的，数据层是虚拟化的**：Typora 自己的页面在渲染，但驱动它的状态来自本工具。
2. 应用内部的 `hasLicense` 布尔值仍由启动校验决定；伪造令牌会在启动时被清空，
   因此不写伪造许可、不碰注册表许可项。
3. 新版加密体系（RSA-2048 签名 + 机器绑定）在数学上不可本地伪造 ——
   本项目证明的是"客户端本地鉴权不足以单独作为授权依据"，这正是 CWE-602 的核心。
