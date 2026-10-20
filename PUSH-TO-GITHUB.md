# 推送到 GitHub

仓库已在本目录初始化并提交完成：

```
分支 : main
提交 : 63f2559 feat: Typora offline license-state tool (native panel, version-aware)
文件 : 98 个 / 2.79 MB
远端 : https://github.com/Angel-Gril/Typora_Mod.git
```

唯一缺的是**认证**。下面任选一种。

---

## 方式 A：浏览器登录（最简单）

在本目录打开 PowerShell / Git Bash，执行：

```powershell
cd C:\AI\RD\Tool\mcp\typora-license-audit
git push -u origin main
```

会弹出 Git Credential Manager 窗口 → 选 **Sign in with your browser** →
在浏览器里登录 GitHub 并授权 → 推送自动完成。

> 首次推送后 Windows 会记住凭据，以后无需再登录。

---

## 方式 B：使用 Personal Access Token（PAT）

1. 打开 https://github.com/settings/tokens → **Generate new token (classic)**
2. 勾选 **repo** 权限 → 生成 → 复制 token
3. 在本目录执行（把 `<TOKEN>` 换成你的 token）：

```powershell
cd C:\AI\RD\Tool\mcp\typora-license-audit
git -c credential.helper= push https://<TOKEN>@github.com/Angel-Gril/Typora_Mod.git main
```

> ⚠️ 命令里含 token，注意别留下 shell 历史；推送完成后可在 GitHub 上吊销该 token。

---

## 方式 C：SSH（如果你已有 SSH key）

```powershell
cd C:\AI\RD\Tool\mcp\typora-license-audit
git remote set-url origin git@github.com:Angel-Gril/Typora_Mod.git
git push -u origin main
```

没 key 的话先生成并添加到 GitHub：

```powershell
ssh-keygen -t ed25519 -C "your@email"
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard
# 打开 https://github.com/settings/keys 粘贴保存
```

---

## 推送后确认

```powershell
git ls-remote origin          # 应能看到 refs/heads/main
git log --oneline -1
```

浏览器打开 https://github.com/Angel-Gril/Typora_Mod 应能看到 98 个文件。

---

## 说明

- 大文件已按要求排除：`samples/`（厂商程序）、`exports/`（下载的安装包与解包结果）、
  `patches/Typora.exe.orig`（217 MB 备份）、`build/**/target/`（Rust 构建产物）。
- `dist/` 下的两个 exe（504 KB + 2.13 MB）已包含，方便直接取用。
- 若日后要改，改完 `git add -A && git commit -m "..."` 再 `git push` 即可。
