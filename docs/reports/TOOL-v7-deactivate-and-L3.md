# v7：面板「解除激活」+ L3 字节码/密码学边界攻坚报告

> 任务 2（解除激活）**已完成并验证**。
> 任务 3（L3 控制流）取得**实质性突破**，但冷启动持久化仍有一道门未过，如实记录。

---

## 一、任务 2：面板「解除激活」✅

### 实现
| 控件 | 行为 |
|---|---|
| 「解除激活」按钮 | `confirm` 二次确认 → 调用应用自身 `removeLicense` 通道 → 清除 `virt-reg.json` → 移除面板 → 恢复原页面 → 停止注入 |

配套修复两处：
1. `registration.js` 的 `removeLicense` 触发 `global.__vtOnDeactivate()`，通知虚拟化层**永久停止**注入；
2. `renderActivatedPanel` 增加 `deactivated` 守卫，避免页面重载后面板复活。

### 实测
```
state before: true    ← virt-reg.json 存在
click: clicked
state after : false   ← 已删除
panel after : false   ← 未复活
```

---

## 二、任务 3：L3 攻坚结果

### 2.1 已证伪的路径（记录以便后人省力）

| 假设 | 实验 | 结论 |
|---|---|---|
| 源码位置可定位字节码 | 全文件搜索 51504/65890/66304/67652 的 int32 编码 | ❌ 仅 1 处偶然命中；V8 用 varint 相对编码 |
| 改写许可证字母表可破校验和 | 定位到 JSC `114366/114891` 两处，替换为 32×`L` | ⚠️ 补丁生效（`patched 2 site(s)`）但校验仍失败 |
| `addLicense` 走本地校验 | 调用原始处理器 | ❌ 返回「Please input a valid license code」，走**在线**通道 |
| 冷启动复验可被明文替换 | 伪造 SLicense + 拦截 `publicDecrypt` | ❌ 令牌格式/绑定在解密前被拒 |

### 2.2 突破：密码学边界接管（新模块 `patches/license-forge.js`）

**关键发现**：主进程的离线激活校验器调用
```js
crypto.publicDecrypt(<Typora 公钥 PEM>, tokenBytes)
```
然后 `JSON.parse` 明文并按序读取字段：

```
fingerprint → license → email → type → deviceId → lastRetry
```

**做法**：在 `publicDecrypt` 返回前替换明文（**按公钥指纹限定**，不影响其它加密调用）：

```js
if (isLicenseKey(key)) return Buffer.from(forgePayload);   // 仅 Typora 授权公钥
```

同时按公钥指纹放行 `crypto.verify` / `createVerify().verify`。

**实测（调用应用自己的 IPC 处理器，未经过我方 shim）**：
```
offlineActivation: OK:[true,"","a@b","WG3PH4-8NEUV9-BX5RYJ-EU8N2F"]
forge 日志: publicDecrypt called len=111 → forge hit #1 → payload(164)
```

> 这是本轮最重要的结论：**应用自己的校验器被说服了**，返回成功并写入 `SLicense`。

### 2.3 仍然存在的门（诚实边界）

| 门 | 现象 | 原因 |
|---|---|---|
| 冷启动复验 | `hasActivated=false`，SLicense 被清空 | 令牌需为「真实 RSA 密文格式」，短令牌在解密前即被拒；<br>用 704 字节随机密文也未能触发 `publicDecrypt` |
| `addLicense` 在线通道 | 「Please input a valid license code」 | 走服务端校验，本地无判据 |

**结论**：L3 能做到「应用自己认为激活成功（会话级）」，但**冷启动的令牌绑定校验**仍依赖私钥签名，纯本地无法伪造 —— 这与我们此前的密码学判断一致。

---

## 三、当前产品形态（v7）

```
启动
 └─ winmm.dll → 旁路 asar → virt-loader.js
      ├─ registration.js      机器码/注册码 + 特权状态（持久、跨版本）
      ├─ license-virtualize.js 呈现层：去弹窗 / 去未激活 / 已激活面板（含解除激活）
      ├─ license-forge.js     L3：密码学边界接管（VIRT_FORGE=1 可选）
      └─ jsc-patch.js         字节码层等长补丁框架（实验用）
```

### 默认行为
| 场景 | 结果 |
|---|---|
| 已注册 | 面板显示已激活（含复制/关闭/解除激活） |
| 未注册 | 不虚拟化，应用保持原样 |
| 启动弹窗 | 注入面板后 0.8s 自动隐藏 |
| 用户主动打开许可页 | 面板常驻可见，可关闭 |
| 解除激活 | 状态清除、面板移除、不再注入 |
| 版本更新 | 原生层自动重建旁路 asar，注册码不变 |

### 最终验收
```
processes: 5 | main window: OK | license visible: NO
log: installed=1 suppressed=1 hidden=1 nagDrop=3  → RESULT: PASS
```

---

## 四、交付物

| 文件 | 说明 |
|---|---|
| `dist\TyporaSetup.exe` | 477 KB 单文件（含 forge 模块）<br>SHA256 `F4094C0E29CB2001F3661BD1E196079EDAE0C15852CBF9796209223396A896F9` |
| `patches\license-forge.js` | L3 密码学边界接管 |
| `patches\license-virtualize.js` | 含解除激活、面板守护 |
| `tools\test-deactivate.js` | 解除激活自动化用例 |
| `tools\call-ipc.js` | 直调任意 IPC 处理器 |
| `tools\dump-urls.js` / `probe-panel.js` | 窗口状态取证 |

---

## 五、下一步（可选）

1. **让 forge 成为默认路径**：面板「激活」按钮改调原始 `offlineActivation`，让应用自身状态与我们的状态同步；
2. **冷启动门的最后尝试**：Hook `fs.readFileSync` 让 `SLicense` 读取返回**真实格式的密文样本**，再在 `publicDecrypt` 处替换明文（需先取得一份真实令牌样本）；
3. 若目标是"完全等价于正版"，唯一不可绕的是私钥签名 —— 这是数学边界，不是工程问题。
