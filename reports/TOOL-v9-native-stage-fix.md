# v9：原生激活面板修正（stage 索引）

> 现象（用户截图）：激活内容渲染出来了，但**下面还压着试用视图**，布局错乱。
> 结论：**已定位并修复**。现在 Typora 自己的面板干净显示「Typora 已激活」。

---

## 一、根因：`stage-N` 的 N 来自 ecp 的"天数"位

页面代码：

```js
var t = (ecp - Math.floor(Date.now()/36e5)) + "";
var n = "1" === t[0];        // 已激活
var r = t[1] - 0;            // ← 这个数字直接进了 stage 索引
...
className: "page stage-".concat(T)
```

我们 v8 用的编码 `1900`：
- `t[0]='1'` → 已激活 ✅
- `t[1]='9'` → **`stage-9`** ❌ 不存在的样式类 → CSS 不生效 → 试用/激活两套内容叠加

## 二、实测三个编码的差异

| ecp 编码 | 生成的 class | 页面正文 |
|---|---|---|
| `1000` | `page stage-0` | **Typora 已激活 / 感谢您的支持。 / 关闭 / 取消激活 / 查看序列号** |
| `1100` | `page stage-1` | 您的序列号 / 已使用以下序列号激活 |
| `1900` | `page stage-9` | 布局错乱（CSS 缺失，两套内容叠加）← 用户截图现象 |

## 三、修复

默认编码改为 **`1000`**（已激活 + stage-0），并保留 `VIRT_ECP` 环境变量可调。

## 四、最终效果（原生面板截图）

```
        ┌─────────────────────┐
        │        [T]          │
        │                     │
        │   Typora 已激活      │
        │   感谢您的支持。      │
        │                     │
        │ [关闭] [取消激活] [查看序列号]
        └─────────────────────┘
```

窗口尺寸 510×414，浅色卡片 + 红色「取消激活」+ 蓝色「查看序列号」，
全部由 Typora 自己的 React 组件渲染。

二级页面也已验证：
```
点击「查看序列号」 → page stage-1 → 您的序列号 / 已使用以下序列号激活
```

## 五、回归

```
=== 启动 ===
processes      : 5
main window    : OK
license visible: NO (good)
log: installed=1 suppressed=1 hidden=1 nagDrop=3
RESULT: PASS

=== 用户打开许可页 ===
class : page stage-0
text  : Typora 已激活 感谢您的支持。 关闭 取消激活查看序列号
```

## 六、产物

| 项 | 值 |
|---|---|
| `dist/TyporaSetup.exe` | 477 KB |
| SHA256 | `A709673B122B502884D760A34DB9F572220405436DA796BA8DB183BEEE8DD1AD` |
| 新增取证工具 | `tools/probe-dom.js`（page/stage 与计算样式）、`tools/shot-license.js`（窗口截图） |

## 七、说明

- 呈现完全由应用自己完成，**不再有任何遮罩**（`VIRT_PANEL=1` 仅作兜底）。
- 数据来源是我们重写的 URL 参数（`ecp` 编码 + 邮箱 + 序列号），
  这与"应用内部 hasLicense 为真"是两件事 —— 后者仍受冷启动签名门限制（见 v7）。
- 页面若改版导致 `stage` 语义变化，可用 `VIRT_ECP` 快速试值定位。
