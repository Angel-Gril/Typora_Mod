# 工程方案 v3 —— 旁路 asar + 原生重定向（生产形态）

> 目标: Typora 1.14.10 x64 | 受权沙箱 CWE-602 研究
> 本版核心改进: **完全不修改厂商文件**，激活由「旁路 asar + 原生 IAT 重定向」承载
> 状态: 已实现、已实测、升级生命周期已验证

---

## 1. 架构演进

| 版本 | 载体 | 厂商文件 | 问题 |
|---|---|---|---|
| v1 | 改 `app.asar`（重打包注入） | **被修改** | 升级即失效；文件被改写 |
| v2 | fuse / 目录入口 / 代理 DLL 探针 | 部分 | 目录入口原生崩溃；NODE_OPTIONS 被拦 |
| **v3** | **旁路 `app.virt.asar` + 原生 `CreateFileW` 重定向** | **零修改（字节级一致）** | 升级后需重跑安装（**安全降级**，不跑旧代码） |

### v3 数据流
```
Typora.exe
  ├─ resources\app.asar        ← 厂商原始文件，SHA256 与官方一致（从未被改）
  ├─ resources\app.virt.asar   ← 旁路副本（内含 loader 引导）
  ├─ resources\app.virt.meta   ← 原始 asar 的指纹 {size, head}
  └─ winmm.dll                 ← 代理 DLL（180 导出透明转发）
       └─ DllMain(+0ms)
            ├─ 校验 app.asar 指纹
            ├─ 匹配 → IAT 钩 CreateFileW
            └─ open("...\app.asar") → 重定向到 app.virt.asar
```

---

## 2. 实测证据

### 2.1 正常态（指纹匹配）
```
[HOOK IAT patched CreateFileW (KERNEL32.dll)]
[HOOK installed iat_entries=1]
[HOOK redirect -> app.virt.asar]
```
- 进程 5，主窗口 OK，许可窗不可见
- JS 虚拟化：`installed=1 suppressed=1 hidden=1 nagDrop=3`
- **`app.asar` SHA256 == 官方原始**（零修改）

### 2.2 升级态（指纹不匹配 → 安全降级）
模拟厂商更新（`app.asar` 由 390779 → 390780 字节）：
```
[HOOK size mismatch 390780 != 390779 (run installer)]
[HOOK fingerprint mismatch -> native hooks NOT installed]
```
- **拒绝重定向**，应用以新版本原样运行
- `virt.log` 0 字节（未加载任何补丁）
- 设计意图：**宁可不激活，也绝不运行旧版本代码**

### 2.3 恢复态（重跑安装器）
```
[+] app.virt.asar=390865 bytes; fingerprint(original)=390780
[HOOK installed iat_entries=1]
[HOOK redirect -> app.virt.asar]
RESULT: PASS
```

---

## 3. 技术要点

### 3.1 原生 IAT 钩子（Rust，无第三方依赖）
- 遍历主模块 PE 导入表（`DataDirectory[1]`）
- 定位 `CreateFileW` 的 IAT 槽，`VirtualProtect` 后替换为 detour
- detour 判断路径后缀（`\\resources\\app.asar`，大小写不敏感）→ 替换为 `app.virt.asar`
- 未匹配路径原样透传给真实 `CreateFileW`

### 3.2 180 导出透明转发
- `global_asm!` 生成 `jmp qword ptr [rip + SLOT_n]` 跳板（x64 下零开销、不破坏寄存器/栈）
- DllMain 中 `GetProcAddress(winmm_real!name)` 逐槽填充；未解析回落 `ret 0` 桩
- 实测 `resolved=180/180`

### 3.3 指纹校验（安全降级的关键）
- 记录 `{size, 前 32 字节 hex}`，成本极低、无需哈希库
- 版本变化必然改变长度 → 100% 触发降级（实测 390779 vs 390780）

### 3.4 字节级 asar 注入
- 原 `launch.dist.js` 含 **U+200B**，PowerShell 5.1 文本往返会破坏 → 改为 `ReadAllBytes`/`WriteAllBytes` 直接拼接
- 已验证：注入后 U+200B 保留、无乱码

---

## 4. 生命周期操作

```powershell
# 首次安装 / 每次 Typora 升级后执行（幂等）
powershell -ExecutionPolicy Bypass -File tools\install-typora-virt.ps1 -Action install

# 验收（应用运行时）
powershell -ExecutionPolicy Bypass -File tools\verify-typora-virt.ps1

# 卸载（移除旁路文件与 DLL；厂商 asar 不动）
powershell -ExecutionPolicy Bypass -File tools\install-typora-virt.ps1 -Action uninstall
```

| 场景 | 行为 |
|---|---|
| 正常启动 | 重定向到旁路 asar → 已授权态 |
| Typora 升级 | 指纹不匹配 → 不打补丁，原样运行（安全） |
| 升级后重跑安装 | 重新生成旁路 asar + 指纹 → 恢复 |
| 卸载 | 删除旁路文件与 DLL，厂商文件保持原样 |

---

## 5. 三层能力的最终定位

| 层 | 实现 | 作用 | 状态 |
|---|---|---|---|
| **L1 呈现层** | `license-virtualize.js` | URL 参数、注入片段、许可窗 | ✅ 3/3 重启 PASS |
| **L2 加载层** | 代理 DLL + IAT 重定向 | 旁路 asar、升级安全降级 | ✅ 实测通过 |
| **L3 字节码层** | `jsc-patch.js` | V8 cachedData 等长改写 | ✅ 端到端验证（`PATCHED-JSC-OK~~~`） |

### 仍然未攻克的（诚实声明）
「主进程认为已激活」需要改动 license 校验的**控制流**：
- 校验 = RSA-2048 验签 + 24 字符高熵校验和（800 随机样本零命中）
- L3 已能写字节，但需把源码位置（`ka@67652` / `ha@66304` / `D@51504`）映射到 V8 BytecodeArray 偏移
- 这需要解析 V8 序列化格式（source-position table），是本项目唯一剩余硬骨头

---

## 6. 文件清单

| 文件 | 说明 |
|---|---|
| `patches/virt-loader.js` | 引导（虚拟化 + quit 守卫 + 可选 JSC 补丁/调试端口） |
| `patches/license-virtualize.js` | L1 呈现层虚拟化 |
| `patches/jsc-patch.js` | L3 字节码层补丁框架 |
| `build/winmm/src/hook.rs` | 原生 IAT 钩子（asar 重定向 + 指纹校验） |
| `build/winmm/src/lib.rs` | 生成产物：180 跳板 + 解析 + DllMain |
| `tools/gen-winmm-def.ps1` / `gen-winmm-proxy.ps1` | 导出表解析 / 源码生成 |
| `tools/install-typora-virt.ps1` | 安装/卸载/状态 |
| `tools/verify-typora-virt.ps1` | 验收 |
| `patches/app.asar.orig` | 厂商原始 asar（卸载/比对基准） |
| `patches/Typora.exe.orig` | fuse 翻转前的 exe 备份 |
