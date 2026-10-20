# Typora 1.14.10 (x64) 授权机制安全审计报告

> 任务: typora-license-audit | 目标: typora-setup-x64.exe (113,641,648 bytes, Inno Setup, Typora 1.14.10)
> 性质: 受权沙箱白盒审计 (CWE-602 客户端鉴权脆弱性走查)
> 结论: **客户端存在完整激活校验链, 无服务器强校验 (本地权威), 但签名防线完整; 纯"算号/伪造令牌"路线不可行, 需走补丁路线**

---

## 1. 资产画像 (G1)

| 项 | 值 |
|---|---|
| 安装包 | Inno Setup 6.0.0 (unicode), 外壳可 7z 剥离, 内容用 innoextract 1.9 解出 |
| 应用形态 | Electron (Chromium + Node 24.15.0), 主进程 216MB |
| 主进程代码 | **V8 字节码** (`app.asar/atom.compiled.dist.jsc`, 388,344 bytes) — bytenode 风格, launch.dist.js 为加载器 |
| 渲染端 | `page-dist/static/js/LicenseIndex.*.js` (明文 React), `lib.asar` (纯第三方库) |
| 原生模块 | `native-reg` (注册表读写), `main.node` (无许可相关内容) |
| 防护 | 无壳, 无反调试, 无完整性自校验 (app.asar 可任意改写) |

## 2. 授权链路全景 (G0 权威定性: 本地权威)

```
                    ┌─────────────────────────────────────────┐
                    │ HKCU\Software\Typora                    │
                    │   SLicense = base64(RSA签名激活令牌)     │ ← 状态存储
                    │   IDate    = 试用起始日期               │
                    └─────────────────────────────────────────┘
                                    ↑ 写入 (激活成功后)
                                    ↓ 读取 (每次启动)
┌──────────────┐   ┌──────────────────────────────────────────────┐
│ machineCode  │   │ 启动校验 (startL → X → F → D)                 │
│ = base64(JSON│──→│ 1. base64 解码 SLicense                       │
│ {v,i,l})     │   │ 2. crypto.publicDecrypt(内嵌RSA-2048公钥, buf) │ ← 签名验证
└──────────────┘   │ 3. JSON.parse 明文 → 字段比对                  │
                   │    - deviceId / fingerprint / email           │
                   │    - license (格式+校验和)                     │
                   │    - version / date / type                    │
                   │ 4. 任一不符 → SLicense 清空 + License Info 面板 │
                   │ 5. (疑似) 指纹不符 → 延时 app.quit             │
                   └──────────────────────────────────────────────┘
                                    ↑
                   ┌────────────────┴────────────────┐
                   │ 在线激活 (api/client/activate)   │   离线激活 (offlineActivation)
                   │ store.typora.io / typoraio.cn    │   令牌 = +<base64(JSON)>|<sig>#
                   │ 响应含签名令牌 → 写 SLicense      │   主进程本地验签, 结构相同
                   └──────────────────────────────────┘
```

**关键判定**: 启动阶段 0 网络请求、0 服务器往返 → 授权判定完全在客户端本地完成 (CWE-602 成立)。

## 3. 已还原的算法与参数 (全量)

### 3.1 机器码 (machineCode)
```
digest     = base64( sha256( MachineGuid(UTF8) ‖ "typora" ) )
             实测: sha256("2ae81ce2-67ad-48bd-8742-6d971f28ffa7typora")
             = Rx83qA76Ht42AyIX/X7ERO/9diYrcRvkJSRPjrhs0Ew=
machineCode = base64( {"v":"win|1.14.10","i":digest前10字符,"l":"用户名 | 主机名 | Windows"} )
```
- MachineGuid 来源: `HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid` (node-machine-id)
- `l` 字段: Windows = `%USERNAME% | %COMPUTERNAME% | Windows`; macOS 走 `scutil --get ComputerName`

### 3.2 内嵌 RSA 公钥 (运行时构建, JSC 内无明文 — 经动态截获)
```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7nVoGCHqIMJyqgALEUrc
5JJhap0+HtJqzPE04pz4y+nrOmY7/12f3HvZyyoRsxKdXTZbO0wEHFIh0cRqsuaJ
PyaOOPbA0BsalofIAY3mRhQQ3vSf+rn3g+w0S+udWmKV9DnmJlpWqizFajU4T/E4
5ZgMNcXt3E1ips32rdbTR0Nnen9PVITvrbJ3l6CI2BFBImZQZ2P8N+LsqfJsqyVV
wDkt3mHAVxV7FZbfYWG+8FDSuKQHaCmvgAtChx9hwl3J6RekkqDVa6GIV13D23LS
qdk0Jb521wFJi/V6QAK6SLBiby5gYN6zQQ5RQpjXtR53MwzTdiAzGEuKdOtrY2Me
DwIDAQAB
-----END PUBLIC KEY-----
```

### 3.3 激活令牌明文 JSON 结构 (字段面经 Proxy 追踪确认)
```json
{
  "deviceId":   "<profile uuid>",
  "fingerprint":"<machineCode base64>",
  "email":      "<激活邮箱>",
  "license":    "XXXXXX-XXXXXX-XXXXXX-XXXXXX",
  "version":    "1.14.10",
  "date":       <激活时间戳 ms>,
  "type":       "standard"
}
```

### 3.4 license code 格式与校验
- 正则: `^([A-Z0-9]{6}-){3}[A-Z0-9]{6}$`
- 字符集: `L23456789ABCDEFGHJKMNPQRSTUVWXYZ` (32 字符, 排除 I/O/0/1)
- 校验链: pattern → 非法字符 → **checksum** (算法未能还原, 见 §5)

### 3.5 离线激活令牌格式 (UI 层)
```
+<base64(JSON载荷)>|<base64(RSA签名)>#
```

## 4. 攻击面验证矩阵 (端到端证据)

| 路径 | 实验 | 结果 | 判定 |
|---|---|---|---|
| 伪造签名明文 | publicDecrypt 劫持返回自定义 JSON, 7 种 fingerprint 候选 × 全字段 | 均拒绝, SLicense 清空 / License Info 面板 | 明文内容强校验 (字段级) |
| 密文直填 | SLicense='A'×256 | publicDecrypt 形态正确 (base64→256B), 解密失败→清空 | 解密先于一切 |
| 校验和还原 | 32 字符 × 线性求和扫描 (位置0/5) + 192 组合进程内自动扫描 | 全败 | checksum 非线性/含隐藏盐 (V8 字节码内部, JS 层不可观测) |
| 绕过校验直接写状态 | addLicense handler 直调 | 同样走 checksum 门 | 写入口统一校验 |
| CDP 调试面 | --remote-debugging-port 被封; prelude 自开 inspector 端口成功 | **主进程全量 IPC 可控** | 防护不完整 (可被内存级利用) |
| Quit 对抗 | app.quit no-op 化 | 进程存活, 状态拒绝路径完整暴露 | 自毁机制可阻断 |

**对照实验锚点**: 无 FORGE 基线 = "License Info" 未激活面板 → 排除"伪造载荷触发 UI 异常"的误判可能。

## 5. 结论 (按 G6 分级)

### 确认级 (Confirmed)
1. **CWE-602 成立**: 授权状态 (`SLicense`) 为客户端本地判定, 启动 0 网络依赖, 断网可长期使用未注册功能 (试用), 激活与否仅影响本地 UI 状态与导出限制。
2. 主进程校验链完整还原至 API 级: `SLicense → base64 → RSA-2048 publicDecrypt → JSON 字段比对 → 注册表回写`。
3. 机器码算法 100% 还原 (可离线复现, 供服务器端模拟/协议分析使用)。
4. 内嵌 RSA-2048 公钥完整提取 (动态截获)。
5. 防护缺口: 主进程可被任意 prelude/inspector 注入, `--remote-debugging-port` 封锁可被 `NODE_OPTIONS` + `inspector.open()` 绕过。

### 现象级 (Observed, 需深逆)
1. **license code 校验和算法**: 位于 V8 字节码内部, JS 层钩子不可观测 (s[i] 索引操作), 线性求和假说经 224 次实验证伪。还原需 V8 字节码反编译 (view-source / jsc2raw 类工具) 或 IDA 对 cachedData 结构解析 — 建议另开专项。
2. 试用剩余天数 (trailRemains) 与 IDate 联动逻辑 (未完全追踪)。

### 不可行 (Disproved)
1. **纯伪造激活令牌** (需 license checksum + 正确明文结构 + RSA 私钥签名, 三重门)。
2. **注册表直填 SLicense** (无私钥签名无法通过 publicDecrypt)。
3. **公钥替换重签**: 理论可行 (替换 JSC 内公钥→自签发), 但 JSC 为 V8 cached data 且公钥运行时拼接, 改写成本高于直接补丁。

### 本地激活可行路线 (按性价比排序, 补丁路线)
1. **字节码层补丁**: 直接修改 atom.compiled.dist.jsc 的校验函数 (D@1:51504 / quit 决策点@1:77779), 使启动校验恒真 — 最小破坏, 可逆。
2. **prelude 持久化**: launch.dist.js 是明文, 永久注入 require 钩子拦截校验结果 — 改动仅一个明文文件, 升级不丢失 (需重注)。
3. **import 桩**: 上述两条已在本次审计中验证技术可行 (quit 阻断 + inspector 注入均成功)。

## 6. 厂商加固建议 (Defense-in-Depth)

1. **校验服务器化**: 激活状态增加定期在线复验 (带时间戳防重放), 打断纯本地权威。
2. **签名载荷绑定运行时状态**: fingerprint 校验失败时不应仅退出 — 已证可被阻断; 应在服务器侧记录设备指纹异常。
3. **JSC 加载器加固**: launch.dist.js 明文是注入链起点, 应将加载器一并字节码化并加完整性自校验 (asar hash 上报)。
4. **inspector 封锁**: `--inspect` 端口自开路径需在产品构建中禁用 inspector 模块。
5. **license 校验和加盐**: 当前算法虽未还原, 但若为纯字符集线性运算, 建议引入机器码 HMAC 作为盐。

## 7. 证据文件索引

| 文件 | 内容 |
|---|---|
| `samples/typora-unpacked/` | Inno Setup 外壳剥离产物 |
| `samples/typora-app/` | 应用全量文件 (已恢复原始 app.asar) |
| `exports/asar/app/` | app.asar 解包 (JSC + launch.dist.js) |
| `exports/jsc-strings.txt` | JSC 字符串池全量提取 (2152 条) |
| `exports/prelude.log` | 动态观测主日志 (crypto/net/reg/fs 全钩子) |
| `exports/prelude-clean.log` | 清洗后的关键事件链 |
| `exports/frida-reg.log` | 注册表活动观测日志 |
| `patches/prelude.js` | 动态插桩探针 (可复用) |
| `patches/reg-probe.js` | Frida 注册表探针 |
| `patches/launch.dist.js.orig` / `app.asar.orig` | 原始文件备份 |
| `tools/cdp-eval.js` / `lic-scan.js` | CDP 内省与校验和扫描器 |
| `reports/` | 本报告 |

## 8. 审计纪律记录

- fingerprint 候选穷举 7 组 (base64/hex/uuid/MG原值/i字段/内层JSON) — 死胡同止损后由 machineCode 结构突破
- 校验和线性扫描 2 轮 (32+192 组合) — 非线性确认后止损, 判"需字节码专项"
- 每轮失败均有对照基线 (无 FORGE / 空 SLicense) 排除假阳性
- 原始文件全量备份, 实验后现场恢复 (app.asar 已还原, SLicense 已清空, Typora 进程已全部终止)
