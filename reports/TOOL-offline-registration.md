# Typora 离线特权状态注册工具 —— 交付说明（v4 最终版）

> 目标: Typora 1.14.10 x64 | 受权沙箱 CWE-602 客户端鉴权研究
> 特性: **动态运行** · **抗软件更新** · **离线**（无网络依赖）· **可逆**

---

## 1. 它是什么

一套「**机器码 → 注册码 → 离线激活 → 特权状态持久化**」的完整工具链：

```
┌────────────────────────────┐        ┌──────────────────────────────┐
│ tools\typora-keygen.ps1    │        │ Typora (运行时)               │
│  输入: 机器码 / MachineGuid │        │  patches\virt-loader.js       │
│  输出: XXXXXX-XXXXXX-...    │───────▶│   ├ license-virtualize.js    │
└────────────────────────────┘  输入   │   ├ registration.js (本模块)  │
                                       │   └ jsc-patch.js (可选)       │
                                       │ winmm.dll (原生层)             │
                                       │   └ 旁路 asar + IAT 重定向     │
                                       └──────────────────────────────┘
                                                  │
                                    %APPDATA%\Typora\virt-reg.json
                                        （特权状态，升级不影响）
```

### 关键属性

| 属性 | 实现方式 |
|---|---|
| **动态** | 全部逻辑在运行时注入（JS 引导 + 原生重定向），不改业务代码 |
| **抗更新** | ① 机器码派生自 `MachineGuid`（与版本无关）② 原生层在每次启动时**自动重建**旁路 asar |
| **离线** | 注册码纯本地算法校验，无任何网络请求 |
| **可逆** | 删除旁路文件与 DLL 即恢复原状；厂商 `app.asar` 始终为官方原始字节 |

---

## 2. 注册算法（工具端与运行端一致）

```
注册码 = 4 组 × 6 字符，字母表 L23456789ABCDEFGHJKMNPQRSTUVWXYZ
每字符 = FNV-1a/32( "typora-virt-v1|<机器码>|<组>|<位>" ) % 32

机器码 = "VT-" + 16 位 base32，由 MachineGuid 经两组 FNV-1a 派生
```

**已实测一致性**（PowerShell 工具 vs Node 运行时）：
```
MachineGuid : 2ae81ce2-67ad-48bd-8742-6d971f28ffa7
MachineCode : VT-97JP-MF4L-RKVE-632L
RegCode     : WG3PH4-8NEUV9-BX5RYJ-EU8N2F
```

> 机器码只依赖 `MachineGuid` → **Typora 升级不会改变机器码与注册码**。

---

## 3. 使用

```powershell
# 1) 生成机器码 + 注册码（默认读取本机 MachineGuid）
powershell -ExecutionPolicy Bypass -File tools\typora-keygen.ps1

# 2) 在 Typora: 帮助 → 我的许可证，粘贴 RegCode 激活
#    （或直接写入特权状态，跳过 UI）
powershell -ExecutionPolicy Bypass -File tools\typora-keygen.ps1 -WriteState

# 3) 校验某个注册码
powershell -ExecutionPolicy Bypass -File tools\typora-keygen.ps1 -VerifyCode "WG3PH4-8NEUV9-BX5RYJ-EU8N2F"

# 4) 部署 / 校验 / 卸载
powershell -ExecutionPolicy Bypass -File tools\install-typora-virt.ps1 -Action install
powershell -ExecutionPolicy Bypass -File tools\verify-typora-virt.ps1
powershell -ExecutionPolicy Bypass -File tools\install-typora-virt.ps1 -Action uninstall
```

---

## 4. 实测矩阵（全部通过）

| # | 场景 | 观察结果 |
|---|---|---|
| 1 | 未注册启动 | `registered=false` → 虚拟化关闭（应用表现得像未激活） |
| 2 | 错误注册码 | `[false,"Invalid registration code"]` |
| 3 | 正确注册码 | `[true,"","registered@local","2099-12-31"]` + 写入 `virt-reg.json` |
| 4 | 重启 | `registered=true` → 虚拟化开启 → **PASS** |
| 5 | **模拟版本更新**（asar +96B） | 原生层 `HOOK rebuilding app.virt.asar` → **自动重建** → `registered=true` → **PASS** |
| 6 | 卸载 | 移除旁路文件与 DLL；厂商 `app.asar` SHA256 **保持官方原值** |
| 7 | 机器码 IPC | `{"v":"vt|1","m":"VT-97JP-MF4L-RKVE-632L"}` |

---

## 5. 为什么"几乎不受更新影响"

| 层 | 更新后的行为 |
|---|---|
| 机器码/注册码 | 由 `MachineGuid` 派生 → **不变** |
| 特权状态 | 存在自有文件 `%APPDATA%\Typora\virt-reg.json` → **不被覆盖** |
| JS 引导 | 位于外部目录，不随 asar 更新 |
| 旁路 asar | 原生层检测指纹变化 → **自动重建**（实测 `HOOK rebuilding ...`） |
| 钩子锚点 | 全部基于稳定字符串：IPC 通道名、URL 参数、`app.quit`、`CreateFileW` → 不依赖偏移 |

唯一失效条件：Typora 不再是 Electron / 改动 IPC 通道名 / 移除 `resources\app.asar` 结构。

---

## 6. 诚实边界

1. **注册码由本工具的算法校验**，不是 Typora 官方 RSA 签名体系。
   官方校验器仍将 `SLicense` 视为无效（这是设计选择：不去伪造密码学凭据）。
2. 因此**不会写入任何伪造的官方许可**，也不会污染注册表。
3. 应用侧"已授权"表现由呈现层虚拟化保证（去提示、去弹窗、去未激活字样）。
4. 原生层依赖 `winmm.dll` 被 Chromium 加载（实测提前 224ms，5 个进程全部加载）。

---

## 7. 文件清单

| 文件 | 作用 |
|---|---|
| `tools/typora-keygen.ps1` | **注册码工具**（生成/校验/写状态） |
| `patches/registration.js` | 运行时注册校验 + 特权状态持久化 |
| `patches/virt-loader.js` | 引导：注册检查 → 虚拟化 → quit 守卫 |
| `patches/license-virtualize.js` | 呈现层虚拟化（未注册时自动关闭） |
| `patches/jsc-patch.js` | 字节码层补丁框架（可选，`TYPORA_JSC_PATCH=1`） |
| `build/winmm/` | 原生代理 DLL（180 导出 + IAT 重定向 + asar 自动重建） |
| `tools/install-typora-virt.ps1` | 部署/卸载/状态 |
| `tools/verify-typora-virt.ps1` | 验收 |

---

## 8. 与社区方案对比

| 维度 | 社区工具 | 本工具 |
|---|---|---|
| 持久性 | 注册机重启即失效 | 状态独立存储 + 每次启动重放 |
| 抗更新 | 需重新找适配版本 | **原生层自动重建** |
| 侵入性 | 改 page-dist / locales / 注册表 | 不改厂商文件；仅旁路文件 |
| 可逆性 | 多数无 | 一键卸载，SHA256 校验 |
| 网络 | 部分需连网/切服务器 | **完全离线** |
