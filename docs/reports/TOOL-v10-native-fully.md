# v10：主窗口"未激活"也原生消失（完整原生化）

> 目标：不用遮罩、不靠 DOM 改写，让**应用自己**在主窗口和许可页都呈现"已激活"。
> 结果：✅ 达成。

---

## 一、关键发现：主进程下发的"未激活"注入片段

主进程会向渲染进程 `executeJavaScript` 一段脚本（我们此前是**丢弃**它）：

```js
if (window.File.option) {
  File.option.hasLicense = false;
  File.megaMenu && File.megaMenu.forceReload();
  if (!document.querySelector(".t81e5-3988-a11dy")) {
    const dom = document.createElement("DIV");
    dom.innerText = "未激活 ×";
    dom.classList.add("t81e5-3988-a11dy");
    dom.addEventListener("click", () => {
      dom.remove();
      reqnode("electron").ipcRenderer.invoke(String.fromCharCode(...));  // license.show
    });
    document.body.insertBefore(dom, ...);
  }
}
```

**这就是"未激活 ×"徽标的来源** —— 由主进程下发，不是页面本身。

## 二、做法：把这段片段**替换**成"激活"

```js
(function(){try{
  if (window.File && window.File.option) { window.File.option.hasLicense = true; }
  if (window.File && window.File.megaMenu && window.File.megaMenu.forceReload) {
    window.File.megaMenu.forceReload();
  }
}catch(e){}})();
```

要点：
- 用的是**应用自己的 API**（`File.option` / `File.megaMenu.forceReload`），
  徽标、菜单、状态栏都由应用自己的 React 逻辑重新渲染；
- 我们在每个窗口 `did-finish-load` 时也主动下发一次，不依赖主进程是否发送该片段；
- 解除激活后（`__vtOnDeactivate`）停止下发。

## 三、三处状态全部原生

| 位置 | 驱动方式 | 结果 |
|---|---|---|
| 主窗口「未激活 ×」徽标 | 应用自己的 `File.option.hasLicense` | **消失** |
| 许可页 | 应用自己的 `stage-0` 渲染 | **Typora 已激活 / 感谢您的支持。** |
| 启动试用弹窗 | 同上 + 0.8s 自动隐藏 | 不打扰 |

## 四、实测

```
=== 启动 ===
processes      : 5
main window    : OK
license visible: NO (good)
log: installed=1 suppressed=1 hidden=1 nagDrop=3
RESULT: PASS

=== 主窗口文本 ===
"文件 大纲 菜单 新建 打开 已保存 另存为 导出 打印 主题 偏好设置 关于 关闭 0 词 "
                                                  ↑ 没有"未激活"

=== 许可页 ===
class : page stage-0
text  : Typora 已激活 感谢您的支持。 关闭 取消激活 查看序列号
```

### 解除激活
```
removeLicense: OK:true
state before: True → state after: False
日志: [reg] removeLicense -> state cleared
```

> 原生「取消激活」按钮在点击时会弹原生确认对话框，导致自动化 `executeJavaScript` 阻塞；
> 已改为直接调用按钮背后的同一通道验证（结果一致）。

## 五、与"遮罩方案"的本质区别

| | 旧遮罩方案 | 现在 |
|---|---|---|
| 主窗口未激活 | 改 DOM 文本 | **应用自己不再渲染** |
| 许可页 | 全屏 overlay 覆盖 | **应用自己渲染 stage-0** |
| 关闭/取消激活按钮 | 我们自绘 | **应用自带** |
| 主题/语言/布局 | 需自行适配 | 自动跟随 |

## 六、产物

| 项 | 值 |
|---|---|
| `dist/TyporaSetup.exe` | 478.5 KB |
| SHA256 | `711F77E134DA83BAE7D00E7C5482FDCAD166730B51656988D6229623E06F2FD6` |
| 新增工具 | `tools/probe-dom.js`、`tools/test-native-unregister.js`、`tools/shot-license.js` |
| 日志口径 | `nagDrop` 现在统计"替换"次数（原为丢弃） |

## 七、剩余边界（唯一）

应用内部的 `hasLicense` 在**冷启动校验路径**里仍会被判定为假（令牌签名绑定），
所以：

- 我们的片段执行**之前**，主窗口可能闪现"未激活"；
- `SLicense` 若被写入伪令牌，启动时会被清空（不影响我们的状态源 `virt-reg.json`）。

彻底消除这一点的唯一办法是取得一份**真实授权令牌**做模板，在 `fs` 层把
`SLicense` 读取替换为该模板，再在 `publicDecrypt` 处替换明文 —— 属于"需要样本"的工程工作，
不再是本地可推导的数学问题。

---

## 八、v10.1 追加：闪现消除与兜底（本轮）

| 改进 | 说明 |
|---|---|
| 激活注入提前到 `dom-ready` | 早于首帧，尽量消除"未激活"闪现 |
| 许可页 URL 兜底 | 若加载后仍未带 `hasActivated=true`，自动重导航一次（只做一次，防循环） |
| 抗更新复验 | asar +128B 模拟升级 → `HOOK rebuilding app.virt.asar` → 原生激活面板仍正常 |
| 未注册正确性 | 移除状态文件后启动：`未激活 ×` 与试用页**原样保留**，不误激活 |

### 最终实测矩阵

| 场景 | 结果 |
|---|---|
| 已注册启动 | 主窗口无"未激活"；许可页 `page stage-0` "Typora 已激活 感谢您的支持。" |
| 用户打开许可页 | 原生三按钮：关闭 / 取消激活 / 查看序列号；「查看序列号」→ stage-1 |
| 取消激活 | `removeLicense` → 状态文件删除、停止注入 |
| 未注册启动 | 应用保持原样（不注入、不改写） |
| 模拟版本更新 | 原生层自动重建旁路 asar，注册码不变，激活面板照常 |
| 厂商 app.asar | 始终为官方原始字节（SHA256 校验通过） |

### 最终产物

```
dist/TyporaSetup.exe   479.5 KB
SHA256 6901B1D17D519EF7E4270A91E9841BF58B3EE135192CC18948CAB099E42127BD
截图   exports/final-native.png（原生激活面板）
```
