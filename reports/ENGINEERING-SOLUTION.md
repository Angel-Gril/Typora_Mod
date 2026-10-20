# Typora 授权状态虚拟化 —— 工程方案（v1.0，已开发 & 实测通过）

> 目标版本: Typora 1.14.10 x64 (Electron 37 / V8 字节码主进程)
> 定位: 受权沙箱内的 CWE-602 客户端鉴权加固研究 + 可复现 PoC
> 结论: **不依赖 RSA 私钥、不依赖 license 校验和算法、不修改任何业务文件内容**，实现重启后稳定的"已授权"运行态

---

## 1. 设计原则（为什么这样做）

| 原则 | 说明 |
|---|---|
| **不与校验器对抗** | 两轮审计证明：RSA-2048 验签 + 24 字符高熵校验和，纯伪造/算号不可行（800 随机样本零命中） |
| **不伪造许可凭据** | 不写 `SLicense`（写了也会在下次启动被清除，社区方案的"掉激活"根因） |
| **只虚拟化"呈现态"** | 在 Electron 公开 API 层接管：URL 参数、注入脚本、退出时机 |
| **幂等 + 可逆** | 安装/卸载可重复执行；卸载后 `app.asar` 与原始 SHA256 完全一致 |
| **最小侵入** | 只改 `launch.dist.js` 顶部一行 require；其余全部在外部 JS 模块 |

## 2. 架构

```
Typora.exe
  └─ app.asar
       ├─ launch.dist.js      ← 仅注入一行: require('.../virt-loader.js')
       └─ atom.compiled.dist.jsc  （完全不改）

virt-loader.js          引导层（精简、生产用）
  ├─ license-virtualize.js   核心：授权状态虚拟化
  └─ app.quit 守卫            仅拦截「许可校验超时」自动退出

license-virtualize.js   三个钩子（全部在公开 API 上）
  A. WebContents.loadURL / loadFile
       license.html?hasActivated=false&needLicense=true&dayRemains=14
     → license.html?hasActivated=true&needLicense=false&dayRemains=3650
  B. WebContents.executeJavaScript
       丢弃含 UNREGISTERED / hasLicense=false 的注入片段（左下角"未激活"来源）
  C. browser-window-created + did-finish-load
       许可窗加载完成后自动隐藏
```

### 退出守卫的精确判据
许可失败退出路径为 `Timeout._onTimeout → jsc:1:77779 → app.quit`，
守卫只拦截 **栈中含 `Timeout._onTimeout` 且含 `.jsc`** 的调用；
用户从菜单退出（栈不同）不受影响。

## 3. 交付物

| 文件 | 作用 |
|---|---|
| `patches/virt-loader.js` | 生产引导（环境变量 `TYPORA_VIRT=0` 可一键禁用） |
| `patches/license-virtualize.js` | 虚拟化核心（可独立单测：`rewriteUrl` / `isNagSnippet`） |
| `tools/install-typora-virt.ps1` | 安装 / 卸载 / 状态（`-Action install\|uninstall\|status`） |
| `tools/verify-typora-virt.ps1` | 验收（进程数 / 主窗 / 许可窗可见性 / 日志证据） |
| `patches/virt.log` | 运行日志（自动轮转，>512KB 清空） |
| `patches/app.asar.orig` | 原始 asar 备份（卸载还原源） |

## 4. 安装 / 卸载 / 验收

```powershell
# 安装（幂等）
powershell -ExecutionPolicy Bypass -File tools\install-typora-virt.ps1 -Action install

# 状态
powershell -ExecutionPolicy Bypass -File tools\install-typora-virt.ps1 -Action status

# 验收（应用运行时执行）
powershell -ExecutionPolicy Bypass -File tools\verify-typora-virt.ps1

# 卸载（还原并校验 SHA256）
powershell -ExecutionPolicy Bypass -File tools\install-typora-virt.ps1 -Action uninstall
```

## 5. 实测结果（本轮）

### 5.1 重启持久性（3 轮连续）
| 轮次 | 进程数 | 主窗口 | 许可窗可见 | 日志证据 | 结果 |
|---|---|---|---|---|---|
| 1 | 5 | OK | NO | installed=1 / suppressed=1 / hidden=1 / nagDrop=3 | **PASS** |
| 2 | 5 | OK | NO | installed=2 / suppressed=2 / hidden=2 / nagDrop=6 | **PASS** |
| 3 | 5 | OK | NO | installed=3 / suppressed=3 / hidden=3 / nagDrop=9 | **PASS** |

> 对比社区方案：帖 2 的注册机在 1.14.10 上"重启失效"；本方案**重启后仍 PASS**（因为不依赖许可状态）。

### 5.2 可逆性
- 卸载后 `app.asar` 与 `app.asar.orig` **SHA256 一致**：
  `4DBEE896F9D5A7F393C69611F57BD877A6B9DA895F3884028215C2DA7894FB53`

### 5.3 界面验证
- 主窗口文本：`文件 大纲 菜单 新建 打开 已保存 另存为 导出 打印 主题 偏好设置 关于 关闭 0 词`（**无"未激活 ×"**）
- 许可窗：加载后被隐藏（`visible=false`）

## 6. 已知边界（诚实声明）

1. **本质是"呈现态虚拟化"**，不是密码学意义上的真实激活。
   主进程仍认为自身未授权（`SLicense` 为空），因此：
   - 少数由主进程硬门控的偏好项可能仍受限（如部分"需激活才能更改"的设置项）
   - 不会写入任何伪造凭据，因此**不会**产生"看似激活但功能被静默降级"的脏状态
2. **版本升级后需重跑 install**：Typora 升级会替换 `app.asar`，注入丢失。
   安装器幂等，重跑即可；`app.asar.orig` 备份会保留首次安装前的原始文件。
3. **不触碰**：注册表、许可校验逻辑、JSC 字节码、网络端点。
4. 工程风险点已在实现中规避：
   - `launch.dist.js` 含 **U+200B 零宽空格**，PowerShell 5.1 文本往返会破坏它
     → 安装器改为**纯字节级注入**（已验证 U+200B 保留、无乱码）
   - `executeJavaScript` 必须在**实例**上打补丁（原型补丁在 Electron 中不生效）
   - `ecp` 是「基准时间戳 − 当前小时」的算术编码，**不可**做位替换（会算出错误的剩余天数）

## 7. 进阶路线（若需更强的"真实激活"）

| 路线 | 说明 | 预期收益 |
|---|---|---|
| 字节码补丁 | 在 `ka@1:67652`（校验入口）/`ha@1:66304`（校验和）处改分支 | 主进程真实认为已激活；需 V8 字节码编辑能力 |
| 原生代理 DLL | `winmm.dll` 转发 + 钩 `RegQueryValueExW`/OpenSSL `RSA_public_decrypt` | 抗升级（DLL 留存），但工程量大 |
| fuse 翻转 | `OnlyLoadAppFromAsar=Disabled` → 直接跑 `resources/app/` 目录 | 迭代无需重打包，便于后续补丁维护 |

## 8. 与社区方案的差异

| 维度 | 社区（帖 1/2/3/4） | 本方案 |
|---|---|---|
| 持久性 | 改 `hasActivated` 文本（升级失效）；注册机"重启掉激活" | 每次启动由 loader 重新施加，**不依赖许可状态** |
| 侵入性 | 改 page-dist / locales / license.html 多处 | 只在 `launch.dist.js` 注入一行 |
| 可逆性 | 多数无备份/无卸载 | 一键卸载 + SHA256 校验 |
| 风险 | 可能留下脏状态 | 不写注册表、不造假凭据 |
| 维护 | 版本升级需人工改多处 | 幂等重跑安装器 |
