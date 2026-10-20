# 三条工程路线 —— 全部实现与实测（v2.0）

> 目标: Typora 1.14.10 x64 | 受权沙箱 CWE-602 客户端鉴权研究
> 结论: **① fuse 翻转、② 原生代理 DLL、③ 字节码层补丁框架 —— 三条路线全部打通并实测通过**

---

## 路线 ① — Electron Fuse 翻转

### 实现
```powershell
npx @electron/fuses write --app Typora.exe \
    OnlyLoadAppFromAsar=off RunAsNode=on EnableNodeCliInspectArguments=on
```

### 翻转前后
| Fuse | 原值 | 现值 | 工程意义 |
|---|---|---|---|
| `RunAsNode` | Disabled | **Enabled** | 可把 `Typora.exe` 当 node 用（工具链/自动化） |
| `EnableNodeCliInspectArguments` | Disabled | **Enabled** | 可命令行 `--inspect` 直接调试主进程 |
| `OnlyLoadAppFromAsar` | Enabled | **Disabled** | 允许目录加载（实验证明 asar 仍优先，见"经验"） |
| `EnableNodeOptionsEnvironmentVariable` | Enabled | 未变 | 实测**仍被 Electron 拦截**（见"经验"） |

### 实测结论
- 翻转后应用正常启动（5 进程），虚拟化照常工作。
- **目录入口方案不可行**：把 `resources/app/` 作为入口、再 `require('../app.asar/launch.dist.js')`
  会导致主模块语义缺失 → 进程静默退出/原生崩溃（已在 index.js 中实测记录）。
- **结论**：fuse 的价值在于**开发/调试能力**，不作为注入载体。

---

## 路线 ② — 原生代理 DLL（winmm.dll）

### 实现（Rust + GNU 工具链）
| 组件 | 说明 |
|---|---|
| `tools/gen-winmm-def.ps1` | 自写 PE 导出表解析器，从 `System32\winmm.dll` 提取 **180** 个导出名 |
| `tools/gen-winmm-proxy.ps1` | 生成 Rust 源码：每个导出一个 `jmp qword ptr [rip + SLOT_n]` 跳板 |
| `build/winmm/src/lib.rs` | 180 个 naked trampoline + DllMain 解析 + 日志 |
| 部署 | `winmm.dll`（代理）+ `winmm_real.dll`（系统原件副本）同目录 |

### 为什么用「跳板 + 槽位」
- x64 调用约定下 `jmp` **完全透明**：不破坏寄存器/栈/返回地址
- DllMain 中 `GetProcAddress` 逐个填槽，未解析的回落到 `ret 0` 桩，永不空指针
- GNU ld 的 `/DEF` 不可用（实测 `cannot find /DEF:`），因此改用 `global_asm!` + `--export-all-symbols`

### 实测
```
[DLL_PROCESS_ATTACH resolved=180/180] pid=17476 ft=134369122416202256
```
- **180/180 导出全部解析成功**，应用、音频、全部 5 个进程正常
- 关键时序测量：

| 事件 | 时间 |
|---|---|
| winmm.dll 载入主进程 | `19:37:21.620Z` |
| JS loader 引导 | `19:37:21.844Z` |
| **提前量** | **+224 ms** |

> 结论：原生层有 **224ms 窗口**，足以在应用读取 `app.asar` / 注册表之前完成 IAT/内联钩子。

### 踩坑记录（已修复）
1. `b"name"` 字节串**无 NUL 结尾** → `GetProcAddress` 越界读 → 180 个全部解析失败。修复：`b"name\0"`。
2. 零导出 DLL 会破坏 Chromium 的 winmm 调用（应用卡在错误对话框）→ 必须完整转发。
3. MSVC 工具链缺失（无 C++ Build Tools），`cargo +msvc` 不可用 → 全程 GNU 工具链。

---

## 路线 ③ — 字节码层补丁框架（JSC 加载期改写）

### 原理
`atom.compiled.dist.jsc` 是 **V8 cachedData**（bytenode 风格），由 `launch.dist.js` 用
`fs.readFileSync` 读入后交给 `vm.Script(..., {cachedData})`。
我们在 **fs 层拦截**，对序列化数据做**等长字节替换**，V8 依然接受。

### 实现
`patches/jsc-patch.js`
```js
fs.readFileSync = function (p, ...) {
  const buf = orig.apply(this, arguments);
  if (/\.jsc$/i.test(String(p))) return applyPatch(Buffer.from(buf), p);
  return buf;
};
```
补丁表自动保证等长（序列化字符串带长度前缀，改长度会破坏结构）。

### 实测（端到端验证）
```
[jsc] patched 1 site(s) in ...\atom.compiled.dist.jsc
```
调用激活接口的返回：
```json
[false, "PATCHED-JSC-OK~~~~~~~~~~~~~~~~~~~"]
```
→ **原始字符串被改写、V8 正常编译执行、应用功能不受影响**，证明字节码层可写。

### 能力边界
- 可做：常量池字符串改写、导出名/URL/提示语改写、同长度常量替换
- 尚需：**控制流改写**（跳转分支）—— 需解析 V8 BytecodeArray 与 source-position table，
  把已知源码位置（`ka@67652`、`ha@66304`、`D@51504`）映射到字节码偏移

---

## 综合部署（三合一）

```powershell
tools\install-typora-virt.ps1 -Action install    # asar 引导 + 代理 DLL
tools\verify-typora-virt.ps1                     # 验收
tools\install-typora-virt.ps1 -Action uninstall  # 还原（asar SHA256 一致）
```

### 三轮重启验收（全部 PASS）
| 轮次 | 进程 | 主窗口 | 许可窗可见 | JS 虚拟化 | DLL |
|---|---|---|---|---|---|
| 1 | 5 | OK | NO | installed=1 / suppressed=1 / hidden=1 / nagDrop=3 | 180/180 |
| 2 | 5 | OK | NO | installed=2 / suppressed=2 / hidden=2 / nagDrop=6 | 180/180 |
| 3 | 5 | OK | NO | installed=3 / suppressed=3 / hidden=3 / nagDrop=9 | 180/180 |

---

## 三条路线的定位（重要）

| 路线 | 当前作用 | 局限 | 建议 |
|---|---|---|---|
| ① fuse | 开发调试（RunAsNode / --inspect） | 不能作为注入载体；目录加载会导致原生崩溃 | 保留，用于后续深挖 |
| ② 代理 DLL | **透明基座 + 早加载钩子点（+224ms）** | 尚未实现 IAT 钩子（下一阶段） | 保留，作为抗升级方案的基础 |
| ③ JSC 补丁 | **字节码层已可写** | 控制流改写需 V8 字节码解析 | 保留，作为"真实激活"的钥匙 |

### 为什么三者都不能单独完成"真实激活"
经三轮验证，`license` 校验是 **RSA-2048 验签 + 24 字符高熵校验和**（800 随机样本零命中），
因此：
- ① 只改加载方式，不改变校验结果
- ② 只提供钩子能力，本身不改校验结果
- ③ 能改字节，但需要先定位分支指令

**真正的"主进程认为已激活"= ③ 的控制流补丁（下一阶段）**，
其余两条路线的价值在于：①提供调试能力、②提供抗升级的落点。

---

## 下一阶段（明确的技术路线）

1. **V8 字节码定位**
   - 用 `vm.Script` + `createCachedData` 生成已知源码的缓存数据，逆向其序列化布局
   - 用 source-position table 把 `67652 / 66304 / 51504` 映射到 BytecodeArray 偏移
   - 目标：把 `ha`（校验和循环）的失败分支改成恒真
2. **原生 IAT 钩子**（基于 ② 的 224ms 窗口）
   - 钩 `CreateFileW` 重定向 `app.asar` → `app.virt.asar`（升级免疫）
   - 钩 `RegQueryValueExW/RegSetValueExW` 虚拟化 `SLicense`
3. 三者合体：DLL 早期加载 → 内存级 asar 补丁 → 主进程真实激活

---

## 附：本轮新增文件

| 文件 | 说明 |
|---|---|
| `tools/gen-winmm-def.ps1` | PE 导出表解析 → .def |
| `tools/gen-winmm-proxy.ps1` | 生成 180 跳板 Rust 源码 |
| `tools/pe-exports.ps1` | 轻量 PE 导出查看器（无 dumpbin 依赖） |
| `build/winmm/` | 代理 DLL 工程（Cargo） |
| `patches/jsc-patch.js` | 字节码层补丁框架 |
| `patches/Typora.exe.orig` | exe 原始备份（fuse 翻转前） |
| `patches/winmm.dll.bak` | 原目录若已有 winmm 的备份 |
