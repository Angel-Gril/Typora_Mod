## 改动说明

<!-- 一两句话说明这个 PR 做了什么、为什么 -->

## 类型

- [ ] 新功能 (`feat`)
- [ ] 修复 (`fix`)
- [ ] 文档 (`docs`)
- [ ] 重构 (`refactor`)
- [ ] 构建/CI (`build` / `ci`)
- [ ] 其它

## 涉及范围

- [ ] 原生代理 `build/winmm`
- [ ] 图形界面 `build/gui`
- [ ] 运行时模块 `patches`
- [ ] 工具脚本 `tools`
- [ ] 文档 `docs` / `README`

## 验证

<!-- 请勾选已执行的验证 -->

- [ ] `cargo build --release` 通过
- [ ] `TyporaSetup.exe` 可正常编译与启动
- [ ] `verify-typora-virt.ps1` 输出 `RESULT: PASS`
- [ ] 卸载后无残留（Typora 目录、`%LOCALAPPDATA%\TyporaVirt`、`virt-reg.json`）
- [ ] 未修改厂商 `app.asar`（SHA256 与原始一致）

<details>
<summary>验收输出</summary>

```
（粘贴 verify-typora-virt.ps1 的结果）
```

</details>

## 检查清单

- [ ] 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 提交信息
- [ ] 已更新 `CHANGELOG.md`（涉及用户可见行为时）
- [ ] 不包含任何密钥、令牌或个人信息
- [ ] 不包含厂商二进制或 `.orig` 备份
