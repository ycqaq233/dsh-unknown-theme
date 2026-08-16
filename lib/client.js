/**
 * dsh-deepseek-theme — Client half (static web bundle).
 *
 * DeepSeek 官网视觉复刻（代码级）：
 *   - 会话主区：官网原版 WebGL 流体 shader（snoise+fbm+域扭曲+curl+5色，highp，
 *     对比拉伸 + dither 防色带），canvas 加 blur(9px) 毛玻璃柔化条纹
 *   - 输入卡：液态玻璃（lg-dist 折射方案）——feTurbulence + feDisplacementMap
 *     scale=70 整卡表面折射扭曲 + blur(0) + 半透明 tint + inset 高光
 *   - 侧栏/详情列：主题渐变（不透明，避免浮层穿帮）
 *   - 标题聚光灯：官网 ds-cursor-ring 同款（difference 自动反色）
 *   - 粒子 LOGO：FishLogo path 采样 + 动量斥力；resize 清空重采样重播动画
 *
 * 纯 DOM/CSS 实现，主题切换通过 MutationObserver 监听 <html> 的
 * color-scheme 完成。
 */
window.__ModuleLoader__.load({
  id: 'dsh-deepseek-theme',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    // ---- 官网原版流体 fragment shader（8226.js 提取 + highp + 对比拉伸 + dither） ----
    const FLUID_FRAG = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_c1, u_c2, u_c3, u_c4, u_c5;
uniform float u_scale;
uniform float u_grain;

out vec4 fragColor;

vec3 mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289v4(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289v4(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}

float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289v3(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

float hash(vec2 p){
  vec3 p3=fract(vec3(p.xyx)*.1031);
  p3+=dot(p3,p3.yzx+33.33);
  return fract((p3.x+p3.y)*p3.z);
}

float fbm(vec3 p){
  float v=0.,amp=.6;vec3 shift=vec3(100.);
  for(int i=0;i<1;i++){v+=amp*snoise(p);p=p*2.+shift;amp*=.4;}
  return v;
}

float fluidNoise(vec2 uv,float t){
  float n1=fbm(vec3(uv*.6,t*.06));
  float n2=fbm(vec3(uv*.6+5.2,t*.06+1.3));
  vec2 w1=vec2(n1,n2)*.6;
  float n3=fbm(vec3((uv+w1)*.7+1.7,t*.05+3.1));
  float n4=fbm(vec3((uv+w1)*.7+9.2,t*.05+5.7));
  vec2 w2=vec2(n3,n4)*.5;
  return fbm(vec3((uv+w1+w2)*.5,t*.04));
}

vec2 curlish(vec2 uv,float t){
  float eps=.02;
  float n=snoise(vec3(uv*.8,t));
  float nx=snoise(vec3((uv+vec2(eps,0.))*.8,t));
  float ny=snoise(vec3((uv+vec2(0.,eps))*.8,t));
  return vec2(-(ny-n)/eps,(nx-n)/eps)*.003;
}

void main(){
  float aspect=u_resolution.x/u_resolution.y;
  vec2 uv=gl_FragCoord.xy/u_resolution;
  vec2 suv=vec2(uv.x*aspect, uv.y) * u_scale;
  float t=u_time;

  vec2 curl=curlish(suv,t*.04);
  vec2 uvD=suv+curl*12.;
  float f=fluidNoise(uvD,t);
  float swirl=snoise(vec3(uvD*.8+f*1.5,t*.035))*.5+.5;
  float n=f*.5+.5;
  // 对比度拉伸（温和）：明暗起伏明显但不两极分化闪变
  n=clamp((n-.5)*1.7+.5,0.,1.);
  vec3 col=mix(u_c1,u_c2,smoothstep(.2,.5,n));
  col=mix(col,u_c3,smoothstep(.35,.65,n+swirl*.25));
  col=mix(col,u_c4,smoothstep(.6,.85,swirl)*.55);
  col=mix(col,u_c5,smoothstep(.5,.8,n*swirl)*.35);

  if(u_grain>0.0){
    vec2 flowOffset = (uvD - suv) * u_resolution.y;
    vec2 gp = floor((gl_FragCoord.xy + flowOffset) / 5.0);
    float gr=hash(gp)*2.-1.;
    col+=gr*u_grain;
  }

  // 暗角已移除（会压暗底部形成黑色区域）
  // 抖动（防 8-bit 色带）
  col+=(hash(gl_FragCoord.xy)*2.-1.)/255.*1.5;
  fragColor=vec4(col,1.);
}
`
    const FLUID_VERT = `#version 300 es
in vec4 a_position;
void main() {
  gl_Position = a_position;
}
`
    const FLUID_SPEED = 15
    const FLUID_SCALE = 0.8
    const FLUID_GRAIN = 0

    // FishLogo path
    const FISH_PATH = 'M22.9168 1.43018C22.6713 1.31018 22.5658 1.53918 22.4223 1.65519C22.3733 1.69269 22.3318 1.74169 22.2903 1.78669C21.9317 2.1697 21.5127 2.42121 20.9657 2.39121C20.1657 2.34621 19.4827 2.59771 18.8787 3.20973C18.7502 2.45521 18.3236 2.0047 17.6746 1.71569C17.3351 1.56568 16.9916 1.41518 16.7536 1.08867C16.5876 0.856163 16.5421 0.597155 16.4591 0.341647C16.4061 0.187643 16.3536 0.0301382 16.1761 0.00363739C15.9836 -0.0263635 15.9081 0.135141 15.8326 0.270145C15.5306 0.822162 15.4136 1.43018 15.4251 2.0462C15.4516 3.43174 16.0366 4.53527 17.1991 5.3203C17.3311 5.4103 17.3651 5.5003 17.3236 5.63181C17.2441 5.90231 17.1501 6.16482 17.0671 6.43533C17.0141 6.60784 16.9351 6.64584 16.7501 6.57033C16.1121 6.30383 15.5611 5.90931 15.074 5.4328C14.2475 4.63328 13.5 3.75075 12.568 3.05973C12.349 2.89822 12.13 2.74822 11.9034 2.60522C10.9524 1.68169 12.028 0.923165 12.277 0.833162C12.5375 0.739159 12.3675 0.41615 11.5259 0.42015C10.6844 0.42365 9.91439 0.705658 8.93286 1.08117C8.78935 1.13767 8.63835 1.17867 8.48384 1.21267C7.59332 1.04367 6.66829 1.00617 5.70226 1.11517C3.88321 1.31768 2.43016 2.1777 1.36213 3.64575C0.0790928 5.4103 -0.222916 7.41536 0.146595 9.50642C0.535106 11.7105 1.66014 13.535 3.38869 14.9616C5.18125 16.4406 7.24581 17.1657 9.60138 17.0266C11.0319 16.9441 12.6245 16.7526 14.421 15.2321C14.874 15.4576 15.3496 15.5476 16.1381 15.6151C16.7456 15.6716 17.3306 15.5851 17.7836 15.4911C18.4931 15.3411 18.4441 14.6841 18.1876 14.5636C16.1081 13.595 16.5646 13.9891 16.1496 13.67C17.2061 12.42 18.8202 10.1979 19.3182 7.17235C19.3672 6.83834 19.4297 6.36783 19.4222 6.09732C19.4182 5.93231 19.4562 5.86831 19.6447 5.84931C20.1657 5.78931 20.6712 5.64681 21.1357 5.3913C22.4833 4.65528 23.0268 3.44624 23.1548 1.9972C23.1738 1.77569 23.1508 1.54668 22.9168 1.43018ZM11.1749 14.4736C9.15936 12.889 8.18184 12.3675 7.77832 12.39C7.40081 12.4125 7.46881 12.8445 7.55182 13.126C7.63882 13.404 7.75182 13.5955 7.91033 13.8396C8.01983 14.0011 8.09533 14.2411 7.80083 14.4216C7.15181 14.8231 6.02327 14.2866 5.97027 14.2601C4.65673 13.4865 3.5587 12.4655 2.78467 11.069C2.03715 9.72493 1.60314 8.28289 1.53164 6.74384C1.51264 6.37233 1.62214 6.24082 1.99215 6.17332C2.47916 6.08332 2.98118 6.06432 3.46769 6.13582C5.52476 6.43633 7.27581 7.35586 8.74385 8.8129C9.58188 9.64243 10.2159 10.634 10.8689 11.6025C11.5634 12.631 12.3105 13.611 13.262 14.4146C13.598 14.6961 13.866 14.9101 14.1225 15.0681C13.349 15.1546 12.058 15.1731 11.1749 14.4746L11.1749 14.4736ZM12.141 8.25988C12.141 8.09488 12.273 7.96338 12.439 7.96338C12.4765 7.96338 12.5105 7.97088 12.541 7.98188C12.5825 7.99688 12.6205 8.01938 12.6505 8.05338C12.7035 8.10588 12.7335 8.18088 12.7335 8.25988C12.7335 8.42489 12.6015 8.55639 12.4355 8.55639C12.2695 8.55639 12.141 8.42489 12.141 8.25988ZM15.1415 9.79893C14.949 9.87793 14.7565 9.94544 14.5715 9.95294C14.2845 9.96794 13.9715 9.85143 13.8015 9.70893C13.5375 9.48742 13.3485 9.36342 13.2695 8.97691C13.2355 8.8119 13.2545 8.55639 13.2845 8.40989C13.3525 8.09438 13.277 7.89187 13.0545 7.70787C12.8735 7.55786 12.643 7.51636 12.39 7.51636C12.2955 7.51636 12.209 7.47486 12.1445 7.44136C12.039 7.38886 11.9519 7.25735 12.035 7.09585C12.0615 7.04335 12.19 6.91584 12.22 6.89334C12.5635 6.69784 12.9595 6.76184 13.326 6.90834C13.6655 7.04735 13.9225 7.30236 14.292 7.66287C14.6695 8.09838 14.7375 8.21838 14.9525 8.54539C15.1225 8.8009 15.277 9.06341 15.3831 9.36392C15.4471 9.55142 15.3641 9.70493 15.1415 9.79893Z'
    const FISH_W = 23.16
    const FISH_H = 17.04

    function apply(ctx) {
      const cleanups = []

      // ---------- 1. 全局样式 ----------
      const styleEl = document.createElement('style')
      styleEl.dataset.plugin = 'dsh-deepseek-theme'
      styleEl.textContent = `
        /* 会话主区：官网渐隐渐变（流体 canvas 挂载于其上的 z-index:-1 层） */
        [data-phase="hero"], [data-phase="active"] {
          background: var(--ds-ds-bg, linear-gradient(180deg, rgba(34,68,110,0.55) 0%, rgba(34,68,110,0.45) 10%, rgba(20,35,60,0.3) 30%, rgba(13,20,32,0.2) 55%, rgba(27,47,78,0.5) 100%)) !important;
          position: relative;
          isolation: isolate;
        }
        /* composerSeat：背景透明，直接显示流体背景（DSH 原背景是 bg-base 不透明色块） */
        [data-phase="active"] [class$="_composerSeat"] {
          background: transparent !important;
        }
        /* 粒子画布定位基准 */
        [class$="_scrollBody"] {
          position: relative;
        }
        /* 侧栏 / 详情列：融入主题渐变（不透明，避免浮层穿帮） */
        /* 侧栏/详情列：半透明渐变（透出背后模糊的流体 = 毛玻璃感）。
           注意：不能加 backdrop-filter——它会创建 containing block，把
           fixed 定位的浮层（设置面板等）困在侧栏列内。 */
        [data-slot="sidebar"] > div, [data-slot="details"] > div {
          background: var(--ds-sidebar-grad, linear-gradient(180deg, rgba(251,252,254,0.3) 0%, rgba(237,242,250,0.3) 34%, rgba(245,246,248,0.3) 100%)) !important;
        }
        /* 输入卡：液态玻璃（参考 lg-dist 折射方案移植）
           精髓：整卡表面 feTurbulence + feDisplacementMap scale=70 折射扭曲，
           几乎不模糊（blur 0px）；::before = 折射层，::after = tint + inset 高光 */
        [data-composer-card] {
          position: relative !important;
          background: transparent !important;
          border-color: transparent !important;
          box-shadow: var(--lg-shadow, 0 6px 6px rgba(0,0,0,0.2)) !important;
        }
        /* ::before = glass-filter：backdrop 捕获(磨砂 blur 4px) + 整卡域扭曲折射 */
        [data-composer-card]::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          border-radius: inherit;
          pointer-events: none;
          -webkit-backdrop-filter: blur(4px);
          backdrop-filter: blur(4px);
          filter: url(#lg-dist);
          isolation: isolate;
        }
        /* ::after = glass-overlay + glass-specular：半透明 tint + inset 高光 */
        [data-composer-card]::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          border-radius: inherit;
          pointer-events: none;
          background: var(--lg-overlay, rgba(255,255,255,0.25));
          box-shadow: inset 1px 1px 0 var(--lg-hi, rgba(255,255,255,0.75)),
            inset -1px -1px 0 var(--lg-hi-lo, rgba(255,255,255,0.2)),
            inset 0 0 5px var(--lg-hi, rgba(255,255,255,0.75));
        }
        /* 内容（textarea / 工具栏）置于玻璃层之上 */
        [data-composer-card] > * {
          position: relative !important;
          z-index: 2 !important;
        }
        /* 用户历史消息气泡：液态玻璃（同输入卡，小号折射 lg-dist-sm） */
        [class$="_userStack"] [class$="_bubble"] {
          position: relative !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        [class$="_userStack"] [class$="_bubble"]::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          border-radius: inherit;
          pointer-events: none;
          -webkit-backdrop-filter: blur(0px);
          backdrop-filter: blur(0px);
          filter: url(#lg-dist-sm);
          isolation: isolate;
        }
        [class$="_userStack"] [class$="_bubble"]::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          border-radius: inherit;
          pointer-events: none;
          background: var(--lg-overlay, rgba(255,255,255,0.25));
          /* 平衡高光：左上锐线 + 右下柔线 + 全周内辉光（小件不再单侧发亮） */
          box-shadow:
            inset 1px 1px 0 var(--lg-hi, rgba(255,255,255,0.75)),
            inset -1px -1px 0 var(--lg-hi-lo, rgba(255,255,255,0.2)),
            inset 0 0 4px var(--lg-hi, rgba(255,255,255,0.75));
        }
        [class$="_userStack"] [class$="_bubble"] > * {
          position: relative !important;
          z-index: 2 !important;
        }
        /* 侧栏"新会话"按钮 + 会话头"下载日志"按钮：完全通透液态玻璃（lg-dist-sm） */
        .hHd-Xa_newSession,
        .nL4_yW_sessionLogButton {
          position: relative !important;
          background: transparent !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }
        .hHd-Xa_newSession::before,
        .nL4_yW_sessionLogButton::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          border-radius: inherit;
          pointer-events: none;
          -webkit-backdrop-filter: blur(0px);
          backdrop-filter: blur(0px);
          filter: url(#lg-dist-sm);
          isolation: isolate;
        }
        .hHd-Xa_newSession::after,
        .nL4_yW_sessionLogButton::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          border-radius: inherit;
          pointer-events: none;
          background: var(--lg-overlay, rgba(255,255,255,0.25));
          /* 平衡高光：左上锐线 + 右下柔线 + 全周内辉光 */
          box-shadow:
            inset 1px 1px 0 var(--lg-hi, rgba(255,255,255,0.75)),
            inset -1px -1px 0 var(--lg-hi-lo, rgba(255,255,255,0.2)),
            inset 0 0 4px var(--lg-hi, rgba(255,255,255,0.75));
        }
        /* hover 反馈：tint 微微变化（替代被透明掉的 DSH hover 背景） */
        .hHd-Xa_newSession:hover::after,
        .nL4_yW_sessionLogButton:hover:not(:disabled)::after {
          background: var(--lg-hover, rgba(255,255,255,.14));
        }
        .hHd-Xa_newSession > *,
        .nL4_yW_sessionLogButton > * {
          position: relative !important;
          z-index: 2 !important;
        }
        /* 聚光灯圆环（官网 ds-cursor-ring 同款） */
        .ds-ring {
          position: fixed;
          left: 0;
          top: 0;
          width: 64px;
          height: 64px;
          margin: -32px 0 0 -32px;
          border-radius: 50%;
          background: var(--ds-ring-color, #fff);
          mix-blend-mode: difference;
          pointer-events: none;
          z-index: 9999;
          opacity: 0;
          transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform, opacity;
        }
        .ds-ring[data-on="1"] {
          opacity: 1;
        }
        /* 流体 canvas：z-index -1 位于背景之上内容之下；blur 毛玻璃柔化条纹 */
        .ds-fluid-canvas {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: -1;
          pointer-events: none;
          filter: blur(9px) saturate(1.15);
        }
        /* 官网网格 canvas：位于流体之上、内容之下；底部渐隐（官方 mask 风格） */
        .ds-grid-canvas {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: -1;
          pointer-events: none;
          -webkit-mask-image: linear-gradient(rgba(0,0,0,1) 0%, rgba(0,0,0,.9) 20%, rgba(0,0,0,.4) 55%, rgba(0,0,0,0) 100%);
          mask-image: linear-gradient(rgba(0,0,0,1) 0%, rgba(0,0,0,.9) 20%, rgba(0,0,0,.4) 55%, rgba(0,0,0,0) 100%);
        }
        /* frame 背景透明：让全屏流体 canvas 透出（侧栏/详情/会话区背后都是它） */
        [class$="_frame"] {
          background: transparent !important;
        }
        /* 侧栏列容器（sidebarCol）不透明背景（--dsw-specific-sidebar-fill）会盖住流体，改为透明 */
        [class$="_sidebarCol"] {
          background: transparent !important;
        }
      `
      document.head.appendChild(styleEl)
      cleanups.push(() => styleEl.remove())

      // ---------- 2.5 液态玻璃 SVG filter（lg-dist：feTurbulence 域扭曲 + feDisplacementMap）
      //    lg-dist = 输入卡整卡折射（scale 70）；lg-dist-sm = 用户气泡小号折射（scale 40） ----------
      const makeLgFilter = (id, scale) => {
        const f = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
        f.setAttribute('id', id)
        f.setAttribute('x', '0%')
        f.setAttribute('y', '0%')
        f.setAttribute('width', '100%')
        f.setAttribute('height', '100%')
        f.setAttribute('filterUnits', 'objectBoundingBox')
        const turb = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence')
        turb.setAttribute('type', 'fractalNoise')
        turb.setAttribute('baseFrequency', '0.008 0.008')
        turb.setAttribute('numOctaves', '2')
        turb.setAttribute('seed', '92')
        turb.setAttribute('result', 'noise')
        const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur')
        blur.setAttribute('in', 'noise')
        blur.setAttribute('stdDeviation', '2')
        blur.setAttribute('result', 'blurred')
        const disp = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap')
        disp.setAttribute('in', 'SourceGraphic')
        disp.setAttribute('in2', 'blurred')
        disp.setAttribute('scale', String(scale))
        disp.setAttribute('xChannelSelector', 'R')
        disp.setAttribute('yChannelSelector', 'G')
        f.appendChild(turb)
        f.appendChild(blur)
        f.appendChild(disp)
        return f
      }
      const lgSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      lgSvg.setAttribute('width', '0')
      lgSvg.setAttribute('height', '0')
      lgSvg.style.cssText = 'position:absolute;width:0;height:0;'
      const lgDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
      lgDefs.appendChild(makeLgFilter('lg-dist', 70))
      lgDefs.appendChild(makeLgFilter('lg-dist-sm', 40))
      lgSvg.appendChild(lgDefs)
      document.body.appendChild(lgSvg)
      cleanups.push(() => lgSvg.remove())

      // ---------- 3. 聚光灯圆环元素 ----------
      const ring = document.createElement('div')
      ring.className = 'ds-ring'
      document.body.appendChild(ring)
      cleanups.push(() => ring.remove())

      // ---------- 4. 主题切换 ----------
      const paintTheme = () => {
        const htmlStyle = document.documentElement.getAttribute('style') || ''
        const dark = htmlStyle.indexOf('color-scheme: dark') !== -1
        const root = document.documentElement
        if (dark) {
          root.style.setProperty('--ds-ds-bg', 'linear-gradient(180deg, rgba(34,68,110,0.55) 0%, rgba(34,68,110,0.45) 10%, rgba(20,35,60,0.3) 30%, rgba(13,20,32,0.2) 55%, rgba(27,47,78,0.5) 100%)')
          root.style.setProperty('--ds-sidebar-grad', 'linear-gradient(180deg, rgba(27,47,78,0.3) 0%, rgba(23,38,62,0.3) 22%, rgba(16,21,31,0.3) 62%)')
          root.style.setProperty('--ds-ds-bg-end', '#1B2F4E')
          document.body.style.setProperty('--dsw-specific-sidebar-fill', 'rgba(0,0,0,0)')
          root.style.setProperty('--lg-overlay', 'rgba(16,30,56,.34)')
          root.style.setProperty('--lg-hi', 'rgba(255,255,255,.30)')
          root.style.setProperty('--lg-hi-lo', 'rgba(255,255,255,.14)')
          root.style.setProperty('--lg-hover', 'rgba(255,255,255,.12)')
          root.style.setProperty('--lg-shadow', '0 2px 8px rgba(0,0,0,.22)')
          root.style.setProperty('--ds-particle-fill', '#FFFFFF')
          // 流体 5 色：亮部更亮、暗部更暗
          root.style.setProperty('--ds-fluid-1', '#071024')
          root.style.setProperty('--ds-fluid-2', '#1E4574')
          root.style.setProperty('--ds-fluid-3', '#0E1F3A')
          root.style.setProperty('--ds-fluid-4', '#4E7FC4')
          root.style.setProperty('--ds-fluid-5', '#010509')
          root.style.setProperty('--ds-grid-line', 'rgba(255,255,255,.08)')
          root.style.setProperty('--ds-grid-dot', '255,255,255')
          root.style.setProperty('--ds-grid-dot-a', '0.16')
        } else {
          root.style.setProperty('--ds-ds-bg', 'linear-gradient(180deg, rgba(156,193,231,0.55) 0%, rgba(250,250,250,0.25) 46%, rgba(249,248,248,0.55) 100%)')
          root.style.setProperty('--ds-sidebar-grad', 'linear-gradient(180deg, rgba(251,252,254,0.3) 0%, rgba(237,242,250,0.3) 34%, rgba(245,246,248,0.3) 100%)')
          root.style.setProperty('--ds-ds-bg-end', '#F9F8F8')
          document.body.style.setProperty('--dsw-specific-sidebar-fill', 'rgba(0,0,0,0)')
          root.style.setProperty('--lg-overlay', 'rgba(255,255,255,.30)')
          root.style.setProperty('--lg-hi', 'rgba(255,255,255,.85)')
          root.style.setProperty('--lg-hi-lo', 'rgba(255,255,255,.40)')
          root.style.setProperty('--lg-hover', 'rgba(0,0,0,.08)')
          root.style.setProperty('--lg-shadow', '0 2px 8px rgba(0,0,0,.07)')
          root.style.setProperty('--ds-particle-fill', '#1E3455')
          root.style.setProperty('--ds-fluid-1', '#7FA8D8')
          root.style.setProperty('--ds-fluid-2', '#C6DFF5')
          root.style.setProperty('--ds-fluid-3', '#FFFFFF')
          root.style.setProperty('--ds-fluid-4', '#A8C8E8')
          root.style.setProperty('--ds-fluid-5', '#F8FBFE')
          root.style.setProperty('--ds-grid-line', 'rgba(60,100,160,.10)')
          root.style.setProperty('--ds-grid-dot', '60,100,160')
          root.style.setProperty('--ds-grid-dot-a', '0.20')
        }
      }
      paintTheme()
      const themeObserver = new MutationObserver(paintTheme)
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
      cleanups.push(() => themeObserver.disconnect())
      cleanups.push(() => {
        const root = document.documentElement
        for (const v of ['--ds-ds-bg', '--ds-ds-bg-end', '--ds-sidebar-grad', '--lg-overlay', '--lg-hi', '--lg-hi-lo', '--lg-hover', '--lg-shadow', '--ds-particle-fill', '--ds-fluid-1', '--ds-fluid-2', '--ds-fluid-3', '--ds-fluid-4', '--ds-fluid-5', '--ds-grid-line', '--ds-grid-dot', '--ds-grid-dot-a']) {
          root.style.removeProperty(v)
        }
        document.body.style.removeProperty('--dsw-specific-sidebar-fill')
      })

      // ---------- 5. 鼠标位置（聚光灯 + 粒子斥力共享） ----------
      const mouse = { x: -9999, y: -9999 }
      const onPointerMove = (e) => {
        mouse.x = e.clientX
        mouse.y = e.clientY
        ring.style.transform = 'translate(' + e.clientX + 'px, ' + e.clientY + 'px)'
        const t = e.target
        let on = false
        if (t instanceof Element) {
          const h = t.closest('[class$="_headline"]')
          if (h && h.querySelector('[class$="_headlineText"]')) on = true
        }
        ring.setAttribute('data-on', on ? '1' : '0')
        // 网格唤醒（静止时暂停，一动即恢复）
        gridSchedule()
        // 兜底：hero 挂载中循环意外停止时，鼠标一动即恢复
        if (host && !running) startParticles()
      }
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      cleanups.push(() => window.removeEventListener('pointermove', onPointerMove))

      // ---------- 6. WebGL 流体背景（官网原版 shader） ----------
      let fluidCanvas = null
      let fluidGl = null
      let fluidProgram = null
      let fluidUniforms = {}
      let fluidRaf = 0
      let fluidRunning = false
      let fluidStart = 0
      let fluidLast = 0
      const FLUID_FRAME = 1000 / 30
      const hexToRgb = (hex) => {
        const h = hex.replace('#', '')
        return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]
      }

      const initFluid = () => {
        if (!fluidCanvas || fluidGl) return
        fluidGl = fluidCanvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true })
        if (!fluidGl) return
        const compile = (type, src) => {
          const sh = fluidGl.createShader(type)
          fluidGl.shaderSource(sh, src)
          fluidGl.compileShader(sh)
          if (!fluidGl.getShaderParameter(sh, fluidGl.COMPILE_STATUS)) {
            console.error('dsh-deepseek-theme: fluid shader error', fluidGl.getShaderInfoLog(sh))
            return null
          }
          return sh
        }
        const vs = compile(fluidGl.VERTEX_SHADER, FLUID_VERT)
        const fs = compile(fluidGl.FRAGMENT_SHADER, FLUID_FRAG)
        if (!vs || !fs) return
        fluidProgram = fluidGl.createProgram()
        fluidGl.attachShader(fluidProgram, vs)
        fluidGl.attachShader(fluidProgram, fs)
        fluidGl.linkProgram(fluidProgram)
        fluidGl.useProgram(fluidProgram)
        const buf = fluidGl.createBuffer()
        fluidGl.bindBuffer(fluidGl.ARRAY_BUFFER, buf)
        fluidGl.bufferData(fluidGl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), fluidGl.STATIC_DRAW)
        const loc = fluidGl.getAttribLocation(fluidProgram, 'a_position')
        fluidGl.enableVertexAttribArray(loc)
        fluidGl.vertexAttribPointer(loc, 2, fluidGl.FLOAT, false, 0, 0)
        const f = (name) => fluidGl.getUniformLocation(fluidProgram, name)
        fluidUniforms = {
          u_time: f('u_time'), u_resolution: f('u_resolution'), u_scale: f('u_scale'),
          u_grain: f('u_grain'), u_c1: f('u_c1'), u_c2: f('u_c2'), u_c3: f('u_c3'), u_c4: f('u_c4'), u_c5: f('u_c5'),
        }
        fluidStart = performance.now()
        const rect = fluidCanvas.getBoundingClientRect()
        fluidCanvas.width = Math.max(1, Math.round(rect.width))
        fluidCanvas.height = Math.max(1, Math.round(rect.height))
        fluidGl.viewport(0, 0, fluidCanvas.width, fluidCanvas.height)
      }

      const fluidFrame = (now) => {
        fluidRaf = requestAnimationFrame(fluidFrame)
        if (!fluidGl || !fluidProgram) return
        if (now - fluidLast < FLUID_FRAME) return
        fluidLast = now
        const rect = fluidCanvas.getBoundingClientRect()
        const w = Math.max(1, Math.round(rect.width))
        const h = Math.max(1, Math.round(rect.height))
        if (fluidCanvas.width !== w || fluidCanvas.height !== h) {
          fluidCanvas.width = w
          fluidCanvas.height = h
          fluidGl.viewport(0, 0, w, h)
        }
        const cs = getComputedStyle(document.documentElement)
        const colors = ['--ds-fluid-1', '--ds-fluid-2', '--ds-fluid-3', '--ds-fluid-4', '--ds-fluid-5'].map((v) => hexToRgb(cs.getPropertyValue(v).trim() || '#000000'))
        fluidGl.uniform1f(fluidUniforms.u_scale, FLUID_SCALE)
        fluidGl.uniform1f(fluidUniforms.u_grain, FLUID_GRAIN)
        fluidGl.uniform1f(fluidUniforms.u_time, (now - fluidStart) * 0.001 * (FLUID_SPEED / 100))
        fluidGl.uniform2f(fluidUniforms.u_resolution, fluidCanvas.width, fluidCanvas.height)
        for (let i = 0; i < 5; i++) {
          fluidGl.uniform3f(fluidUniforms['u_c' + (i + 1)], colors[i][0], colors[i][1], colors[i][2])
        }
        fluidGl.drawArrays(fluidGl.TRIANGLE_STRIP, 0, 4)
      }

      const startFluid = () => {
        if (fluidRunning) return
        initFluid()
        if (!fluidGl || !fluidProgram) return
        fluidRunning = true
        fluidRaf = requestAnimationFrame(fluidFrame)
      }
      const stopFluid = () => {
        fluidRunning = false
        cancelAnimationFrame(fluidRaf)
      }

      // ---------- 6.5 官网网格背景（HeroGrid 移植：90px 点阵 + 鼠标斥力 + 弹簧回弹） ----------
      let gridCanvas = null
      let gridCtx = null
      let gridRaf = 0
      let gridPaused = false
      let gridPoints = []
      let gridCols = 0
      let gridRows = 0
      let gridW = 0
      let gridH = 0
      let gridLast = 0
      let gridRebuildTimer = 0
      const GRID_SPACING = 90
      const GRID_RADIUS = 140

      const gridRebuild = () => {
        gridCols = Math.ceil(gridW / GRID_SPACING) + 1
        gridRows = Math.ceil(gridH / GRID_SPACING) + 1
        const ox = (gridW - (gridCols - 1) * GRID_SPACING) / 2
        const oy = (gridH - (gridRows - 1) * GRID_SPACING) / 2
        gridPoints = []
        for (let n = 0; n < gridRows; n++) {
          for (let r = 0; r < gridCols; r++) {
            const x = ox + GRID_SPACING * r
            const y = oy + GRID_SPACING * n
            gridPoints.push({ restX: x, restY: y, x, y, vx: 0, vy: 0 })
          }
        }
      }

      // 静止暂停后，鼠标移动唤醒（官网同款）
      const gridSchedule = () => {
        if (gridPaused) { gridPaused = false; gridRaf = requestAnimationFrame(gridTick) }
      }

      const gridTick = (now) => {
        if (!gridCanvas || !gridCtx) return
        if (now - gridLast < 1000 / 30) { gridRaf = requestAnimationFrame(gridTick); return }
        gridLast = now - (now - gridLast) % (1000 / 30)
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const cw = gridCanvas.clientWidth
        const ch = gridCanvas.clientHeight
        if (cw !== gridW || ch !== gridH) {
          gridW = cw
          gridH = ch
          gridCanvas.width = gridW * dpr
          gridCanvas.height = gridH * dpr
          gridCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
          clearTimeout(gridRebuildTimer)
          gridRebuildTimer = setTimeout(gridRebuild, 150)
        }
        gridCtx.clearRect(0, 0, gridW, gridH)
        const mx = mouse.x
        const my = mouse.y
        let maxV = 0
        // 斥力 + 弹簧回弹
        for (const pt of gridPoints) {
          const dx = pt.x - mx
          const dy = pt.y - my
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < GRID_RADIUS && dist > 0.1) {
            const s = (1 - dist / GRID_RADIUS) * 30
            pt.vx += s * (dx / dist) * 0.1
            pt.vy += s * (dy / dist) * 0.1
          }
          const rx = pt.restX - pt.x
          const ry = pt.restY - pt.y
          pt.vx += 0.05 * rx
          pt.vy += 0.05 * ry
          pt.vx *= 0.85
          pt.vy *= 0.85
          pt.x += pt.vx
          pt.y += pt.vy
          const v = Math.abs(pt.vx) + Math.abs(pt.vy)
          if (v > maxV) maxV = v
        }
        const cs = getComputedStyle(document.documentElement)
        const line = cs.getPropertyValue('--ds-grid-line').trim() || 'rgba(255,255,255,.08)'
        const dotTriple = cs.getPropertyValue('--ds-grid-dot').trim() || '255,255,255'
        const dotBase = parseFloat(cs.getPropertyValue('--ds-grid-dot-a').trim()) || 0.16
        // 横线
        gridCtx.strokeStyle = line
        gridCtx.lineWidth = 0.5
        for (let r = 0; r < gridRows; r++) {
          for (let c = 0; c < gridCols - 1; c++) {
            const a = gridPoints[r * gridCols + c]
            const b = gridPoints[r * gridCols + c + 1]
            const dx = b.x - a.x
            const dy = b.y - a.y
            const len = Math.sqrt(dx * dx + dy * dy)
            if (len < 20) continue
            const nx = dx / len
            const ny = dy / len
            gridCtx.beginPath()
            gridCtx.moveTo(a.x + 10 * nx, a.y + 10 * ny)
            gridCtx.lineTo(b.x - 10 * nx, b.y - 10 * ny)
            gridCtx.stroke()
          }
        }
        // 竖线
        for (let c = 0; c < gridCols; c++) {
          for (let r = 0; r < gridRows - 1; r++) {
            const a = gridPoints[r * gridCols + c]
            const b = gridPoints[(r + 1) * gridCols + c]
            const dx = b.x - a.x
            const dy = b.y - a.y
            const len = Math.sqrt(dx * dx + dy * dy)
            if (len < 20) continue
            const nx = dx / len
            const ny = dy / len
            gridCtx.beginPath()
            gridCtx.moveTo(a.x + 10 * nx, a.y + 10 * ny)
            gridCtx.lineTo(b.x - 10 * nx, b.y - 10 * ny)
            gridCtx.stroke()
          }
        }
        // 交叉点小方块（靠近鼠标变大变亮 = 放大镜观感）
        for (const pt of gridPoints) {
          let size = 1.8
          let alpha = dotBase
          if (!isNaN(mx) && !isNaN(my)) {
            const dist = Math.sqrt((pt.x - mx) * (pt.x - mx) + (pt.y - my) * (pt.y - my))
            const glow = Math.max(0, 1 - dist / GRID_RADIUS)
            size = 1.8 + 2 * glow
            alpha = dotBase + 0.4 * glow
          }
          gridCtx.fillStyle = 'rgba(' + dotTriple + ',' + alpha + ')'
          gridCtx.fillRect(pt.x - size, pt.y - size, size * 2, size * 2)
        }
        // 全部静止 → 暂停循环（省电）；鼠标一动 gridSchedule 唤醒
        if (maxV < 0.01) { gridPaused = true; return }
        gridRaf = requestAnimationFrame(gridTick)
      }

      const startGrid = () => {
        if (!gridCanvas) return
        if (!gridCtx) gridCtx = gridCanvas.getContext('2d')
        if (!gridCtx) return
        gridPaused = false
        gridLast = 0
        cancelAnimationFrame(gridRaf)
        gridRaf = requestAnimationFrame(gridTick)
      }

      const stopGrid = () => {
        cancelAnimationFrame(gridRaf)
        gridRaf = 0
        gridPaused = true
      }

      // ---------- 7. 粒子 LOGO（FishLogo 形状采样 + 动量斥力 + 匀速回正） ----------
      let canvas = null
      let host = null
      let phaseHero = null
      let raf = 0
      let running = false
      let settled = false
      let dirty = true
      let particles = []
      let frameCount = 0
      let logoCenter = { x: 0, y: 0 }
      let fishPath = null
      try { fishPath = new Path2D(FISH_PATH) } catch (err) { fishPath = null }

      const stopParticles = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0 }

      const startParticles = () => {
        if (running) return
        running = true
        settled = false
        dirty = true
        raf = requestAnimationFrame(tick)
      }

      const calcCenter = () => {
        if (!host || !canvas) return null
        const w = Math.max(320, canvas.clientWidth || host.clientWidth || 320)
        const hh = Math.max(240, canvas.clientHeight || host.clientHeight || 240)
        const lw = Math.min(200, w * 0.6)
        const scale = lw / FISH_W
        const logoH = FISH_H * scale
        let cx = w / 2
        let cy = hh * 0.2
        const hb = host.getBoundingClientRect()
        // 只在 hero 根内找 headline，避免过渡期匹配到别的会话
        const headline = phaseHero ? phaseHero.querySelector('[class$="_headline"]:has([class$="_headlineText"])') : null
        if (headline) {
          const hr = headline.getBoundingClientRect()
          cy = (hr.top - hb.top) - 88
        }
        cy = Math.max(logoH / 2 + 12, Math.min(cy, hh - logoH / 2 - 12))
        return { cx, cy, w, hh, scale, logoH }
      }

      const sampleParticles = (center) => {
        const probe = canvas.getContext('2d')
        probe.save()
        probe.resetTransform()
        particles = []
        const step = 0.55
        for (let y = 0; y < FISH_H; y += step) {
          for (let x = 0; x < FISH_W; x += step) {
            if (probe.isPointInPath(fishPath, x, y)) {
              const tx = center.cx + (x - FISH_W / 2) * center.scale
              const ty = center.cy + (y - FISH_H / 2) * center.scale
              particles.push({ rx: tx - center.cx, ry: ty - center.cy, x: tx + (Math.random() - 0.5) * 380, y: ty + (Math.random() - 0.5) * 380, vx: 0, vy: 0 })
            }
          }
        }
        probe.restore()
        logoCenter.x = center.cx
        logoCenter.y = center.cy
      }

      const layout = () => {
        if (!host || !canvas || !fishPath) return false
        const center = calcCenter()
        if (!center) return false
        const dprNow = window.devicePixelRatio || 1
        canvas.width = Math.round(center.w * dprNow)
        canvas.height = Math.round(center.hh * dprNow)
        canvas.getContext('2d').setTransform(dprNow, 0, 0, dprNow, 0, 0)
        sampleParticles(center)
        dirty = true
        return particles.length > 0
      }

      const settleLayout = () => {
        layout()
      }

      const tick = () => {
        // 先查状态再续命：running=false 时（stopParticles 已取消未派发帧）链彻底终止，不会空转
        if (!running || !host || !canvas) { running = false; raf = 0; return }
        raf = requestAnimationFrame(tick)
        frameCount++
        // 1. 每帧尺寸同步（含从 0 尺寸恢复）
        const d = window.devicePixelRatio || 1
        const cw = Math.round(canvas.clientWidth * d)
        const ch = Math.round(canvas.clientHeight * d)
        if (cw > 0 && ch > 0 && (canvas.width !== cw || canvas.height !== ch)) {
          canvas.width = cw
          canvas.height = ch
          canvas.getContext('2d').setTransform(d, 0, 0, d, 0, 0)
          dirty = true
        }
        // 2. 周期健康检查（约每 250ms）：被摘掉就重新挂回；粒子丢失就重采样
        if (frameCount % 15 === 0) {
          if (host.isConnected && !canvas.isConnected) {
            if (canvas.parentElement) canvas.parentElement.removeChild(canvas)
            host.appendChild(canvas)
            dirty = true
          }
          if (particles.length === 0) layout()
        }
        // 3. 目标中心每帧校准；中心漂移（headline 迟到/布局变化）→ 强制重新收敛
        const target = calcCenter()
        if (!target) return
        if (Math.abs(target.cx - logoCenter.x) > 2 || Math.abs(target.cy - logoCenter.y) > 2) settled = false
        logoCenter.x = target.cx
        logoCenter.y = target.cy
        // 4. 斥力 + 匀速回正（固定步长，先快后慢的指数收敛已移除）
        const ctx2 = canvas.getContext('2d')
        const hb = host.getBoundingClientRect()
        const mx = mouse.x - hb.left
        const my = mouse.y - hb.top
        const R = 19
        const RETURN_STEP = 3   // 匀速回正速度 px/帧（60fps ≈ 180px/s）
        const DAMP = 0.86
        let anyMoving = false
        for (const p of particles) {
          const tx = logoCenter.x + p.rx
          const ty = logoCenter.y + p.ry
          const dx = p.x - mx
          const dy = p.y - my
          const d2 = dx * dx + dy * dy
          if (d2 < R * R && d2 > 0.01) {
            const dist = Math.sqrt(d2)
            const f = (1 - dist / R) * (1 - dist / R) * 30
            p.vx += (dx / dist) * f
            p.vy += (dy / dist) * f
            anyMoving = true
          }
          // 动量（斥力残余）阻尼衰减
          p.vx *= DAMP
          p.vy *= DAMP
          p.x += p.vx
          p.y += p.vy
          // 匀速回正：每帧固定步长，不足一步直接归位（不再先快后慢）
          const ox = tx - p.x
          const oy = ty - p.y
          const od = Math.sqrt(ox * ox + oy * oy)
          if (od > 0.01) {
            if (od <= RETURN_STEP) {
              p.x = tx
              p.y = ty
              p.vx = 0
              p.vy = 0
            } else {
              p.x += (ox / od) * RETURN_STEP
              p.y += (oy / od) * RETURN_STEP
            }
          }
          if (Math.abs(p.x - tx) > 0.5 || Math.abs(p.y - ty) > 0.5 || Math.abs(p.vx) > 0.05 || Math.abs(p.vy) > 0.05) anyMoving = true
        }
        // 5. 收敛且无扰动 → 跳过绘制（省电）；任何扰动/尺寸变化立刻恢复绘制
        if (!anyMoving && settled && !dirty) return
        ctx2.clearRect(0, 0, canvas.width, canvas.height)
        ctx2.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ds-particle-fill').trim() || '#FFFFFF'
        for (const p of particles) {
          ctx2.beginPath()
          ctx2.arc(p.x, p.y, 1.4, 0, Math.PI * 2)
          ctx2.fill()
        }
        settled = !anyMoving
        dirty = false
      }

      // ---------- 8. 挂载管理（流体 + 粒子，React 可能清掉 DOM 节点） ----------
      const sync = () => {
        // 作用域查询：只在 hero 根内找，避免过渡期匹配旧会话容器
        const phaseHeroEl = document.querySelector('[data-phase="hero"]')
        const heroHost = phaseHeroEl ? phaseHeroEl.querySelector('[class$="_composerHero"]') : null
        const scrollBody = phaseHeroEl ? phaseHeroEl.querySelector('[class$="_scrollBody"]') : null
        phaseHero = phaseHeroEl
        // 流体：全屏常驻（挂 body），单例防御
        if (!fluidCanvas) {
          fluidCanvas = document.createElement('canvas')
          fluidCanvas.className = 'ds-fluid-canvas'
        }
        for (const s of document.querySelectorAll('.ds-fluid-canvas')) if (s !== fluidCanvas) s.remove()
        if (!fluidCanvas.isConnected) {
          document.body.appendChild(fluidCanvas)
          fluidLast = 0
          startFluid()
        }
        // 网格：全屏常驻（挂 body，流体之上内容之下），单例防御
        if (!gridCanvas) {
          gridCanvas = document.createElement('canvas')
          gridCanvas.className = 'ds-grid-canvas'
        }
        for (const s of document.querySelectorAll('.ds-grid-canvas')) if (s !== gridCanvas) s.remove()
        if (!gridCanvas.isConnected) {
          document.body.appendChild(gridCanvas)
          startGrid()
        }
        // 粒子：仅新会话（hero）显示
        if (heroHost && scrollBody) {
          if (host !== scrollBody || !canvas || canvas.parentElement !== scrollBody) {
            host = scrollBody
            if (!canvas) {
              canvas = document.createElement('canvas')
              canvas.className = 'ds-fish-canvas'
              canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;'
            }
            // 确保 canvas 一定挂在当前 hero 容器下（防挂错/残留）
            if (canvas.parentElement && canvas.parentElement !== scrollBody) canvas.parentElement.removeChild(canvas)
            if (!canvas.isConnected) scrollBody.appendChild(canvas)
            // 单例防御：清掉任何多余的同款 canvas（双份粒子的兜底）
            for (const s of document.querySelectorAll('.ds-fish-canvas')) if (s !== canvas) s.remove()
            settleLayout()
            startParticles()
          } else if (canvas && !canvas.isConnected) {
            scrollBody.appendChild(canvas)
            startParticles()
          }
        } else if (host) {
          host = null
          phaseHero = null
          stopParticles()
          if (canvas) canvas.remove()
        }
      }

      const onResize = () => {
        if (host && canvas) {
          particles = []
          settled = false
          dirty = true
          settleLayout()
          startParticles()
        }
      }
      window.addEventListener('resize', onResize)
      cleanups.push(() => window.removeEventListener('resize', onResize))

      const observer = new MutationObserver(() => sync())
      observer.observe(document.body, { childList: true, subtree: true })
      cleanups.push(() => observer.disconnect())
      cleanups.push(() => {
        stopParticles()
        stopFluid()
        stopGrid()
        if (gridRebuildTimer) clearTimeout(gridRebuildTimer)
        if (canvas) canvas.remove()
        if (fluidCanvas) fluidCanvas.remove()
        if (gridCanvas) gridCanvas.remove()
      })
      sync()

      return () => {
        for (const c of cleanups) c()
      }
    }

    exports.apply = apply
    return module.exports
  }
})
