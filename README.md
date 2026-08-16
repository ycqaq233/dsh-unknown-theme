# dsh-deepseek-theme

DeepSeek 官网视觉风格主题（DeepSeek official-site visual theme）for [DeepSeek Harness](https://www.deepseek.com/harness/en/) Web.

A static client bundle that restyles the DeepSeek Harness web UI with the visual language of deepseek.com — the fluid gradient background, the interactive dot-grid, the fish-shaped particle logo, the spotlight ring, and the frosted-glass components lifted from the harness landing page. Light & dark, auto-detected from the app's `color-scheme`.

## 预览 / Preview

| 浅色 · 对话 | 深色 · 对话 |
|---|---|
| ![浅色对话](assets/浅色对话.png) | ![深色对话](assets/深色对话.png) |

| 浅色 · 主页 | 深色 · 主页 |
|---|---|
| ![浅色主页](assets/浅色主页.png) | ![深色主页](assets/深色主页.png) |

## 特性 / Features

- 🌊 **官网原版 WebGL 流体背景** — the official `fluid` fragment shader (simplex noise FBM + domain warp + curl noise, 5-color blend, highp, dither) extracted from the deepseek.com homepage bundle, running full-screen behind the app. Light / dark palettes.
- 🔲 **官网交互网格（HeroGrid 移植）** — the official interactive dot-grid: 90px-spaced lattice, lines repel away from the cursor within 140px with spring-back physics, intersection dots grow & brighten near the mouse (magnifier feel), 30 fps with idle pause. Fades out toward the bottom.
- 🐳 **粒子鱼形 LOGO** — the DeepSeek fish logo sampled as particles on the new-session page. The entry animation plays undisturbed (the mouse does **not** repel until the fish is fully formed), then mouse sweeps scatter the particles and they glide back at a uniform **slow** speed (0.15 px/frame ≈ 20 s). Race-free mount management: single canvas instance, live loop with health checks.
- 💡 **标题聚光灯** — official `ds-cursor-ring` style spotlight ring (mix-blend-mode difference), triggered only when the pointer is over the title text or the fish icon — not on the headline's empty padding.
- 🧊 **官网质感磨砂玻璃** — glass components (composer input card, user message bubbles, sidebar new-session button, session-log button) use the same texture as the harness landing page terminal card: `bg-black/20` dark tint + `backdrop-blur-xl` (24 px) frosted blur + 1 px white 8% border. No refraction layers, no specular highlights, no drop shadows; hover only deepens the tint.
- 🌗 **双主题自适应** — light & dark, auto-detected from the app's `color-scheme`.

## 安装 / Install

The plugin is a static web bundle for the `web` profile. Install it from a local path or a git URL:

```sh
# local
dsh plugin --profile web add /path/to/dsh-deepseek-theme

# or from git
dsh plugin --profile web add <your-github>/dsh-deepseek-theme
```

Then restart the harness. The theme applies on page load; no per-session activation needed.

## 工作原理 / How it works

- `cordis.patch.yml` — declares the plugin row (`deepseek-theme`) injected into the web profile.
- `lib/client.js` — the whole theme: CSS injection, WebGL fluid renderer, grid renderer, particle system, spotlight ring, theme observer. (The SVG `feDisplacementMap` liquid-glass filter definitions are kept in the code but are no longer referenced — the current glass look is pure `backdrop-filter` frost.)
- `lib/index.js` — Host entry (no-op).

## 配置项 / Configuration knobs

All tunables live at the top of `lib/client.js`:

| Constant / var | Meaning |
| --- | --- |
| `FLUID_SPEED` | Fluid flow speed |
| `FLUID_SCALE` | Fluid noise wavelength (higher = wider shapes) |
| `GRID_SPACING` / `GRID_RADIUS` | Grid lattice pitch / mouse interaction radius |
| `RETURN_STEP_ENTRY` | Particle formation-animation speed (px/frame) |
| `RETURN_STEP_SLOW` | Particle return speed after being scattered (px/frame) |
| `--lg-bg` / `--lg-border` / `--lg-bg-hover` | Glass tint, border, and hover tint (per theme) |

## 注意事项 / Notes

- The fluid canvas sits at `z-index: -1` behind the app frame; the grid canvas sits above it with a bottom fade mask.
- `backdrop-filter` is used only on small glass elements to avoid trapping fixed-position overlays.
- The spotlight ring activates only over `[class$="_headlineText"]` / `[class$="_fishHitbox"]` (title text / fish icon).
- Visual language references: the fluid shader, the HeroGrid component and the frosted terminal card are ports of deepseek.com / deepseek.com/harness designs.

## License

MIT
