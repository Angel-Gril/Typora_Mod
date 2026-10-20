# v12：版本兼容性实测 + 启动闪现根治

> 反馈：① 其他设备上只有最新版能用；② 每次启动都闪一下许可页。
> 结论：① 已定位原因并给出支持矩阵；② 已根治（本机实测零闪现）。

---

## 一、为什么"只有最新版能用"——结构分代

实测下载并解包了 6 个官方版本（`downloads.typora.io`），对比 `resources/app.asar` 内容：

| 版本 | `package.json.main` | app.asar 内文件 | 结论 |
|---|---|---|---|
| 1.7.6 | `main.node` | `atom.js`, `main.node`, `package.json` | 旧代 |
| 1.8.10 | `main.node` | `atom.js`, `main.node`, `package.json` | 旧代 |
| 1.9.5 | `main.node` | `atom.js`, `main.node`, `package.json` | 旧代 |
| **1.10.8** | `launch.dist.js` | `atom.compiled.dist.jsc`, `launch.dist.js`, `package.json` | 新代 |
| 1.11.7 | 同上 | 同上 | 新代 |
| 1.12.4 | 同上 | 同上 | 新代 |
| 1.14.10 | 同上 | 同上 | 新代 |

**分界线是 1.10.0**：

- **新代（1.10+）**：主进程入口是明文 `launch.dist.js`，真正的业务逻辑是 `atom.compiled.dist.jsc`（bytenode 字节码）。
  → 我们可以把 `require(virt-loader)` 插进 `launch.dist.js`，**这就是全部注入点**。
- **旧代（≤1.9.x）**：主进程是**原生模块 `main.node`**（N-API 编译产物），`atom.js` 是一段加密/编码 blob。
  → **没有任何 JS 注入点**，我们的 loader 无法运行，工具必然无效。

> 这也解释了为什么旧版页面里根本没有 `ecp` 参数（1.10.8 与 1.14.10 也都没有 ecp，
> 只有 1.14.x 的部分构建引入），旧版页面只需要 `hasActivated=true`。

---

## 二、实测结果

| 版本 | 部署结果 | 页面表现 |
|---|---|---|
| 1.14.10 | ✅ PASS | `Typora 已激活 感谢您的支持。` |
| 1.10.8 | ✅ 生效 | `Typora 已激活 感谢您的支持。`（自动重建 `app.virt.asar` 367.5 KB） |
| 1.9.5 | ⛔ 正确拒绝 | DLL 日志：`unexpected asar layout`；不生成旁路 asar；**应用不被破坏** |

工具现在会**主动识别**：

```
状态：未安装 | 检测到 Typora v1.9.5 · 布局不支持（需 1.10+）   ← 红色
状态：未安装 | 检测到 Typora v1.14.10 · 布局支持             ← 正常色
```

点「一键安装并激活」时会弹窗说明并允许取消；即使强行继续，DLL 也只会记日志、不改动应用。

---

## 三、启动闪现已根治

### 原因
之前的实现是：许可窗**先正常显示** → 800ms 后才 `hide()/destroy()`。
所以每次启动都能看到一帧"Typora 已激活（含纸屑动画）"。

### 修复
三层防护，确保窗口**从未以不透明状态出现过**：

1. **创建即隐形**：除首个窗口（主窗口）外，`browser-window-created` 时立刻
   `setOpacity(0)` + `hide()`；
2. **导航即隐形**：`did-start-navigation` 命中 `license.html` 时再次 `setOpacity(0)` + `hide()`；
3. **显示即拦截**：应用自己调 `show()` 时同步 `hide()`，不留给它渲染的机会。

非许可窗口（偏好设置、关于等）在 `did-start-navigation` / `did-finish-load`
或 3 秒兜底时恢复 `opacity=1`，不影响正常使用。

用户主动点「帮助 → 我的许可证」时（>8s），包装器才 `setOpacity(1) + show()`。

### 实测（40ms 粒度采样，仅统计"可见且不透明"）
```
samples=180  visibleHits=0  => NO FLASH
```

---

## 四、版本戳（用于确认各设备部署的是哪一版）

运行时目录新增 `VERSION` 文件，启动即写入日志首行：

```
[boot] virt-runtime version=2026.10.20-r3 dir=C:\Users\...\AppData\Local\TyporaVirt
```

GUI 标题同步显示：`Typora 离线注册器  v1.0  (runtime 2026.10.20-r3)`。

> 你那台设备如果日志里版本号不是 `2026.10.20-r3`，就是还在跑旧模块 —— 用新 exe 重新点一次安装即可。

---

## 五、产物

| 文件 | 大小 | SHA256 |
|---|---|---|
| `dist/TyporaSetup.exe` | 504 KB | `8CB9A22A4D395695C71D560D565224ADA93502033AE4F956966A2C4676FFE492` |
| `dist/TyporaVirt-Setup-1.0.exe` | 2.13 MB | `00822EB96FD30C95A51568B570B03A130509264E242B152559F29011D33F3B8C` |

## 六、支持矩阵（最终）

| Typora 版本 | 支持 | 说明 |
|---|---|---|
| 1.10.8 – 1.14.10 | ✅ 完整 | 原生许可页显示已激活、无"未激活"角标、无启动弹窗 |
| ≤ 1.9.5 | ❌ 不支持 | 原生主进程，无 JS 注入点 |
| 未来版本 | ⚠️ 待测 | 只要仍是 `launch.dist.js` + `.jsc` 结构就应继续可用 |

## 七、若要支持 ≤1.9.x（可选路线）

旧版唯一可控的是**磁盘上的明文页面文件**：

```
resources\page-dist\static\js\LicenseIndex.*.chunk.js
```

可以在 `CreateFileW` 层把这些文件重定向到我们打过补丁的副本
（强制 `e.hasActivated = true` 并注入邮箱/序列号），
这样**许可页**能显示已激活；但：

- 主窗口的"未激活"角标由原生代码注入，**拦不住**；
- 启动试用弹窗由原生代码弹出，**压不住**。

即：只能做到"许可页显示已激活"，做不到完整效果。是否要做，取决于你对旧版的重视程度。

---

## 八、现场确认（v12.1）

用户在另一台设备（`D:\Typora`，Typora 1.14.10，运行时 `2026.10.20-r3`）执行「卸载 → 重装」后确认：

> 确实 没有弹窗了

说明启动闪现问题在真实设备上同样已修复。

### 该设备日志要点

```
[15:06:51] 检测到 Typora: D:\Typora（已安装本工具）  版本=1.14.10  布局=JSC(支持)
[15:06:57] 卸载：移除 winmm.dll / winmm_real.dll / virt.cfg / app.virt.asar / app.virt.meta / 特权状态
[15:07:00] 部署 7 个模块 + winmm.dll + winmm_real.dll
[15:07:00] virt.cfg -> C:/Users/550W/AppData/Local/TyporaVirt/virt-loader.js
[15:07:00] 完成：重启 Typora 即生效
```

### 该设备自检清单

| 检查 | 预期 |
|---|---|
| GUI 状态行 | `已安装 · 已激活`（绿色） |
| `%LOCALAPPDATA%\TyporaVirt\virt.log` 首行 | `virt-runtime version=2026.10.20-r3` |
| Typora → 帮助 → 我的许可证 | `Typora 已激活 / 感谢您的支持。` + 关闭/取消激活/查看序列号 |
| 启动 Typora | 无弹窗、主窗口无「未激活」角标 |
