# 补充审计报告（第二轮）：离线验证码 / 离线特权状态 / 测试密钥

> 目标: Typora 1.14.10 x64 | 沙箱白盒审计 | 接续 `AUDIT-REPORT.md`
> 结论速览: **license 校验链已定位到字节码偏移级; 离线特权状态可被完整写入但重启即被清除; 测试密钥无法纯本地伪造（需厂商私钥 + 未还原的校验和）**

---

## 1. 离线验证码（license code）——本轮新增实证

### 1.1 格式（已实证）
- **必须 4 组 × 6 字符**（24 字符 + 3 横线，共 27 字符）
  - 实验: `L2345678-...`(4×8) / `ABCD-EFGH-JKMN-PQRS`(4×4) → **0 次字符映射**（格式门在更早处直接拒绝）
  - 实验: `L23456-L23456-L23456-LLLLLL`(4×6) → **16 次字符映射**（进入校验和阶段）
- 正则: `^([A-Z0-9]{6}-){3}[A-Z0-9]{6}$`
- 字母表（32 字符）: `L23456789ABCDEFGHJKMNPQRSTUVWXYZ`
  - 实测映射: `CHARS.indexOf(ch)` → `L=0, 2=1, 3=2, 4=3, 5=4, 6=5, A=9, B=10, C=11 …`

### 1.2 校验和迭代顺序（实锤）
对去横线后的 24 字符，**只扫描前 16 个字符**，且顺序为「先偶位、后奇位」：

```
输入: L23456-ABCDEF-GHJKMQ-RSTUVW   (去横线 24 字符)
扫描: 索引 0,2,4,6,8,10,12,14  → L,3,5,A,C,E,G,J
      索引 1,3,5,7,9,11,13,15  → 2,4,6,B,D,F,H,K
共 16 次映射后提前退出
```

同一输入换成 `L23456-L23456-L23456-LLLLLL` 亦为 16 次，顺序同构 → **16 为固定上界，末 8 字符不参与映射**。

### 1.3 校验和函数定位（字节码偏移）
| 角色 | 函数 | 字节码偏移 |
|---|---|---|
| 字符→索引映射 | `e` | `atom.compiled.dist.jsc:1:65890` |
| 校验和循环 | `ha` | `1:66304` |
| 校验入口 | `ka` | `1:67652` |
| RSA 验签 | `D` | `1:51504` |
| 失败退出 | — | `1:77779` (`Timeout._onTimeout` → `app.quit`) |

调用链: `ka@67652 → ha@66304 → e@65890`

### 1.4 已证伪的校验和模型（共 4000+ 组探测，全部零命中）
| 假设 | 探测规模 | 结果 |
|---|---|---|
| 线性加权和 mod 32（单位置 0 / 5） | 2×32 | ✗ |
| 相邻双位组合 (0,1)(1,2)(2,3) | 3072 | ✗ |
| 末组两位全枚举 | 1024 | ✗ |
| 前 16 字符索引和 = 0..31 全靶向 | 32 | ✗ |
| 全同字符 / 全 L（和为 0） | 多个 | ✗ |

> 零命中概率在纯随机模型下约为 e^-96，**说明末 8 字符承担了独立约束**（非简单求和），
> 或校验和含未观测的隐藏维度（如与 email/机器码绑定）。

### 1.5 错误消息不可区分
对所有输入（空串 / 3 字符 / 4×4 / 4×6 / 全数字 / 全 L / 非法字符），
`addLicense` 与 `offlineActivation` 一律返回 `[false,"Please input a valid license code"]`
→ 无法通过错误消息做二分定位。

---

## 2. 离线特权状态（offline privileged state）

### 2.1 状态构成（已确认）
```
HKCU\Software\Typora
  ├─ SLicense : REG_SZ = base64( 明文JSON )        ← 许可凭据
  └─ IDate    : REG_SZ = 首次运行日期 (如 10/19/2026) ← 试用起点
```
`SLicense` 的 base64 解码后为 RSA 签名的明文 JSON：
```json
{
  "deviceId":   "<profile uuid>",
  "fingerprint":"<machineCode>",
  "email":      "<激活邮箱>",
  "license":    "XXXXXX-XXXXXX-XXXXXX-XXXXXX",
  "version":    "1.14.10",
  "date":       <毫秒时间戳>,
  "type":       "standard"
}
```

### 2.2 试用状态（本轮观测到）
`license.show` 打开的许可面板 URL 携带状态位：
```
typora://…/license.html?ecp=568012&dayRemains=14&index=0&hasActivated=false&email=&license=&lang=zh-Hans&needLicense=true&type=&os=win
```
- `dayRemains=14` → **试用期 15 天**（首日计 14）
- `hasActivated=false` → 未激活
- `ecp` 为位编码状态（`[激活, 剩余天数, 需许可, 剩余小时]`）

### 2.3 「状态是否充分」——端到端否证实验
实验步骤：
1. 用 prelude 劫持 `ipcMain._invokeHandlers`（在 `Map.set` 处包装，解决注册时序问题），
   使 `addLicense` / `offlineActivation` **强制返回成功** `[true,"","audit@example.com","2099-12-31"]`；
2. 同时向 `HKCU\Software\Typora\SLicense` 写入 `base64(伪造明文)`（400 字节）；
3. 重启应用观察。

结果：
| 阶段 | 观察 |
|---|---|
| 会话内 IPC 调用 | `invoke=[true,"","audit@example.com","2099-12-31"]`（成功） |
| 注册表写入 | `SLicense` len=400，写入成功 |
| **重启后** | `hasActivated=false`，`SLicense` 被**清空** |

**结论：离线特权状态是必要但非充分条件。** 直接写入的状态在下次启动时会被
「base64 → 公钥验签 → 字段比对 → license 校验和」整链否证并清除。

---

## 3. 测试密钥（test key）可行性判定

### 3.1 三重门（缺一不可）
| 门 | 机制 | 能否本地伪造 |
|---|---|---|
| ① 签名门 | `publicDecrypt(RSA-2048 内嵌公钥, base64(SLicense))` | ✗ 无私钥（除非运行时劫持，见 3.2） |
| ② 字段门 | 明文 JSON 的 `deviceId/fingerprint/email/version/date/type` 比对 | ✓ 已知结构，可构造 |
| ③ 校验和门 | 24 字符 license code 的 `e/ha/ka` 校验链 | ✗ 算法未还原（4000+ 组探测零命中） |

### 3.2 可用的本地绕过（仅限授权测试环境）
1. **运行时劫持签名门**（已验证）：`crypto.publicDecrypt` 返回自定义明文 → 门 ① 通过。
2. **IPC 层伪造激活结果**（已验证）：包装 `addLicense/offlineActivation` → 会话内 UI 显示成功。
3. **状态层写入**（已验证）：可直接写入 `SLicense`，但**重启即被清除**。

> 三条路径均无法产出「重启后仍被接受」的测试密钥——缺的是门 ③（及门 ① 的私钥）。

### 3.3 唯一可行的持久化路线：字节码补丁
依据本轮定位的偏移，补丁点如下（供后续专项）：

| 目标 | 偏移 | 处理方式 |
|---|---|---|
| 校验入口 | `1:67652` (`ka`) | 使返回恒为成功 |
| 校验和循环 | `1:66304` (`ha`) | NOP 掉比较/跳转分支 |
| 签名门 | `1:51504` (`D`) | 保留（劫持即可） |
| 失败退出 | `1:77779` | 阻断 `app.quit` |
| 加载器 | `launch.dist.js`（明文） | 注入 prelude（已实测可行） |

---

## 4. 本轮方法学沉淀（可复用）

1. **打补丁式的日志钩子要防止自递归**：`String.prototype.indexOf` 的包装必须在替换**之前**
   保存原始引用，否则 `_sIndexOf` 指向包装自身 → 无限递归，且会把真实调用完全淹没
   （本轮首两次失败即此因）。
2. **Electron 打包应用的 `NODE_OPTIONS --require` 不可靠**：改用
   `launch.dist.js`（明文加载器）注入，稳定可复现。
3. **IPC handler 注册时序**：在 prelude 阶段 `map.get()` 必然为空，
   应劫持 `Map.prototype.set` 在注册瞬间包装。
4. **`CallSite.getFunction()` 在字节码脚本上恒为 `undefined`**（V8 概览栈模式），
   加 `--detailed-error-stack-trace` 亦无效；`%DisassembleFunction` 因拿不到函数对象不可用。
5. **断点可命中但 `Debugger.evaluateOnCallFrame` 超时**（V8 嵌套消息循环不泵），
   故局部变量读取路线不可行——改用「原型方法钩子 + 调用栈」定位算法。
6. **oracle 设计**：`addLicense` 在 license 本地校验失败时立即返回，
   通过时转网络 → 可作为高吞吐本地 oracle（本轮跑通 4000+ 次）。

---

## 5. 证据文件（本轮新增）

| 文件 | 说明 |
|---|---|
| `reports/EVIDENCE-round2-license-checksum.md` | 校验链偏移、映射序列、证伪矩阵 |
| `exports/prelude.log` | 含 `[lic]` 字符映射、`[poc]` 强制成功、`[rsa]` 验签劫持全记录 |
| `patches/prelude.js` | 可复用插桩探针（TRACE_LICENSE / BC_DISASM / POC_OFFLINE 开关） |
| `patches/forge.json` | 伪造明文载荷（热更新，用于验签劫持实验） |
| `tools/lic-scan[2-4].js` / `lic-sum.js` / `lic-diag.js` | oracle 扫描与诊断矩阵 |
| `tools/dbg-scope.js` / `dbg-wait.js` / `dbg-attach.js` | CDP 断点与作用域探测 |
| `tools/poc-e2e.js` | 主进程 IPC → 渲染进程 UI 的端到端验证 |
| `patches/app.asar.orig` | 原始 app.asar（**已恢复现场**） |
