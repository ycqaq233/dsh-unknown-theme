# dsh-unknown-theme

<!-- Hero -->
<div align="center">
  <b style="font-size: 1.15em;">DeepSeek 官网视觉风格主题 · 一套搬到 DSH 里的 deepseek.com</b><br /><br />
  <a href="https://opensource.org/licenses/MIT"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" /></a>
  <img alt="官网流体" src="https://img.shields.io/badge/-官网流体-4d6bfe" /> <img alt="交互网格" src="https://img.shields.io/badge/-交互网格-4d6bfe" /> <img alt="粒子鱼 LOGO" src="https://img.shields.io/badge/-粒子鱼%20LOGO-4d6bfe" /> <img alt="磨砂玻璃" src="https://img.shields.io/badge/-磨砂玻璃-4d6bfe" /> <img alt="双主题" src="https://img.shields.io/badge/-双主题-4d6bfe" /><br /><br />
  把 <a href="https://www.deepseek.com/">deepseek.com</a> 与 <a href="https://www.deepseek.com/harness/en/">harness 落地页</a> 的视觉语言搬进 DeepSeek Harness Web——<br />
  流体渐变背景、交互点阵网格、粒子鱼 LOGO、标题聚光灯、官网质感磨砂玻璃，浅色/深色自动跟随。
</div>

<div align="center">
  <img width="49%" alt="浅色主页" src="assets/浅色主页.png" />
  <img width="49%" alt="深色主页" src="assets/深色主页.png" /><br />
  <img width="49%" alt="浅色对话" src="assets/浅色对话.png" />
  <img width="49%" alt="深色对话" src="assets/深色对话.png" />
</div>

## ✨ 功能一览

- **🌊 官网原版 WebGL 流体背景**：移植 deepseek.com 首页 `fluid` shader（simplex 噪声 FBM + 域扭曲 + curl 噪声、5 色混合、highp、dither 防色带），全屏铺在应用背后；浅色 / 深色两套官网配色
- **🔲 官网交互网格（HeroGrid 移植）**：90px 间距点阵，鼠标 140px 半径内网格线被斥力推开、弹簧回弹；交叉点靠近鼠标变大变亮（放大镜观感）；30fps 节流、静止暂停；底部渐隐
- **🐳 粒子鱼形 LOGO**：新会话页粒子鱼；入场组合动画期间鼠标不产生斥力，鱼形完整成形后才可被打散；打散后以 0.15px/帧（≈20 秒）匀速游回；单例挂载管理，防双份粒子叠加
- **💡 标题聚光灯**：官网 `ds-cursor-ring` 同款圆环（mix-blend-mode difference 自动反色），只在标题文字 / 鱼图标上触发，容器空白区不触发
- **🧊 官网质感磨砂玻璃**：输入卡、用户历史气泡、侧栏新会话按钮、会话日志按钮统一为 harness 落地页终端卡片质感——`bg-black/20` 深色 tint + `backdrop-blur-xl`（24px）磨砂 + 1px 白 8% 描边；无折射层、无高光、无阴影，hover 仅加深 tint
- **🌗 双主题自适应**：浅色 / 深色自动跟随应用的 `color-scheme`

## 🚀 安装

**前置**：已装好 DSH（`dsh web` 能正常运行）。

```sh
# 从 git 仓库安装（推荐，发布到 npm 后可改用包名）
dsh plugin --profile web add <你的GitHub>/dsh-unknown-theme

# 或本地路径
dsh plugin --profile web add /path/to/dsh-unknown-theme
```

装完**硬刷新浏览器**（Cmd/Ctrl+Shift+R）即可看到主题。主题在页面加载时自动生效，无需每次会话手动开启。

<details>
<summary><b>从源码安装 / 开发（可选）</b></summary>

```text
1. git clone <你的GitHub>/dsh-unknown-theme.git
2. ~/.dsh/profiles/web/package.json 的 dependencies 写 "dsh-unknown-theme": "link:<克隆目录绝对路径>"
3. ~/.dsh/profiles/web/cordis.patch.yml 追加挂载行：
   - insert:
       - id: unknown-theme
         name: 'dsh-unknown-theme'
4. 在 ~/.dsh/profiles/web 执行 pnpm install
5. 硬刷新浏览器即可生效
```

</details>

## ⚙️ 配置项

所有可调参数都在 `lib/client.js` 顶部：

| 常量 / 变量 | 含义 |
|---|---|
| `FLUID_SPEED` | 流体流动速度 |
| `FLUID_SCALE` | 流体噪声波长（越大形状越宽） |
| `GRID_SPACING` / `GRID_RADIUS` | 网格点阵间距 / 鼠标交互半径 |
| `RETURN_STEP_ENTRY` | 粒子入场组合动画速度（px/帧） |
| `RETURN_STEP_SLOW` | 粒子被打散后的匀速回正速度（px/帧） |
| `--lg-bg` / `--lg-border` / `--lg-bg-hover` | 磨砂玻璃底色 / 描边 / hover 色（按主题） |

## 🛠️ 工作原理

- **`cordis.patch.yml`**：声明插件行（`unknown-theme`），注入 web profile
- **`lib/client.js`**：整个主题的单一文件——CSS 注入、WebGL 流体渲染、网格渲染、粒子系统、聚光灯、主题监听（MutationObserver 跟随 `color-scheme`）；SVG 折射滤镜定义保留但已不再引用，当前玻璃质感为纯 `backdrop-filter` 磨砂
- **`lib/index.js`**：Host 半（no-op）

## ⚠️ 已知限制

- 流体 canvas 位于 `z-index: -1`，网格 canvas 在其上方并带底部渐隐 mask
- `backdrop-filter` 只用在小组件上（避免 containing block 困住 fixed 浮层）
- 聚光灯只在 `[class$="_headlineText"]` / `[class$="_fishHitbox"]`（标题文字 / 鱼图标）上激活

## 🔗 相关链接

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)：本主题服务的应用
- [deepseek.com](https://www.deepseek.com/) / [harness 落地页](https://www.deepseek.com/harness/en/)：视觉语言来源（流体 shader、HeroGrid 网格、终端卡片质感均为其移植）

## License

MIT
