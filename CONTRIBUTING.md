# 参与贡献

感谢你对本项目的关注。提交代码前请先阅读以下约定。

## 开发环境

| 组件 | 版本 / 说明 |
|---|---|
| Windows | 10 / 11 x64 |
| Rust | stable（GNU 或 MSVC 工具链均可） |
| .NET Framework | 4.0+（使用系统自带 `csc.exe`） |
| Inno Setup | 6.0+（仅打包安装程序时需要） |
| Node.js | 18+（仅辅助脚本与 asar 工具需要） |

## 本地构建

```powershell
# 1. 原生代理 DLL
cd build\winmm
cargo build --release

# 2. 图形界面（内嵌 DLL 与运行时模块）
Copy-Item build\winmm\target\release\winmm.dll build\gui\
Copy-Item patches\*.js, patches\VERSION build\gui\
& "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe" `
    /target:winexe /codepage:65001 /win32icon:build\gui\typora-virt.ico `
    /out:build\gui\TyporaSetup.exe `
    /r:System.Windows.Forms.dll /r:System.Drawing.dll `
    /resource:build\gui\winmm.dll,winmm.dll `
    /resource:build\gui\virt-loader.js,virt-loader.js `
    /resource:build\gui\registration.js,registration.js `
    /resource:build\gui\license-virtualize.js,license-virtualize.js `
    /resource:build\gui\jsc-patch.js,jsc-patch.js `
    /resource:build\gui\license-forge.js,license-forge.js `
    /resource:build\gui\state-hunt.js,state-hunt.js `
    /resource:build\gui\VERSION,VERSION `
    build\gui\SetupForm.cs
```

## 提交规范

采用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat:     新功能
fix:      修复缺陷
docs:     文档变更
refactor: 重构（不改变行为）
build:    构建/依赖调整
chore:    杂项
```

示例：

```
fix(loader): prevent license window flash on startup
feat(gui): detect Typora layout and warn on unsupported versions
```

## Pull Request

1. Fork 并新建分支：`feat/xxx`、`fix/xxx`
2. 保持改动聚焦，一个 PR 只做一件事
3. 涉及运行时模块的改动，请在 PR 中附上 `verify-typora-virt.ps1` 的输出
4. 更新 `CHANGELOG.md`（如涉及用户可见行为）

## 代码约定

- **Rust**：不引入不必要依赖；`hook.rs` 中所有文件操作需带错误处理，失败时安全降级而非崩溃
- **C#**：界面文本使用中文；所有异常必须有用户可读的提示
- **JS 运行时**：不得抛未捕获异常；任何 hook 失败都要 `log()` 并放行原逻辑
- **绝不修改厂商文件**：所有改动只能发生在旁路文件（`app.virt.asar`、`virt.cfg`、`winmm.dll`）与自有状态文件中
