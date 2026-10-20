# 更新日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 与 [Conventional Commits](https://www.conventionalcommits.org/)。

## [1.0.0] - 2026-10-20

首个公开版本（运行时 `2026.10.20-r3`）。

### 新增

- **原生代理 DLL**（Rust）：`winmm.dll` 同名代理，透明转发 180 个导出，`DllMain` 阶段解析并挂钩
- **旁路资源包**：`app.asar` → `app.virt.asar` 的 IAT 重定向，启动时按指纹自动重建
- **离线注册体系**：`MachineGuid` → 机器码 → 注册码（FNV-1a / 32 字符集），状态持久化于 `%APPDATA%\Typora\virt-reg.json`
- **原生许可页**：改写 `ecp` 算术编码与 `stage` 索引，由 Typora 自身页面渲染激活视图
- **角标消除**：替换主进程下发的未注册注入脚本，主窗口不再出现「未激活 ×」
- **窗口生命周期**：启动静默（创建即隐形）、用户主动打开才显示、`license.show` 轮询包装
- **图形界面**：安装 / 仅写状态 / 卸载 / 启动 Typora，状态行显示版本与布局支持情况
- **单文件安装包**：Inno Setup 中文向导，开始菜单 + 系统卸载项，卸载时自动还原补丁
- **版本自检**：识别 `launch.dist.js` / `main.node` 两种结构，旧版明确提示不支持

### 修复

- 启动时许可窗闪现（含纸屑动画）——改为创建即 `opacity=0` + `hide()`，40 ms 粒度采样 0 命中
- 未注册状态下被误激活 —— 状态文件缺失时不注入任何虚拟化
- `map.set` 双重拦截导致主进程崩溃 —— 改为轮询包装
- 状态文件带 BOM 导致 `JSON.parse` 失败 —— 读取时剥离 BOM

### 实验性

- `license-forge.js`：密码学边界接管（`crypto.publicDecrypt` / `crypto.verify` 按公钥指纹作用域）
- `jsc-patch.js`：V8 缓存的字节码等长补丁框架
- `state-hunt.js`：主进程许可状态对象扫描

### 已知限制

- 仅支持 Typora **1.10.8 ～ 1.14.10**；≤ 1.9.5 为原生主进程，无 JS 注入点
- 应用内部 `hasLicense` 仍由启动校验决定，冷启动签名绑定不可本地伪造
