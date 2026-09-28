# 动画 / 3D / 交互感升级调研（2026-09-28）

> 目标：让 simondxu.com 更有动感和交互感，同时不卡。
> 方法：3 个 subagent 并行调研。一个看获奖作品站（Awwwards / FWA / Codrops，约 50 次搜索），一个读 GitHub 开源作品站的源码（20 个仓库），一个审计本仓库现有动画。本文是三份报告的汇总。

---

## 0. 结论先行

1. **站点本身并不缺动画，缺的是“主角”。** 现有效果都很克制：首页收藏台会跟随指针倾斜、有视差，鸭子会走路，背景有 aurora，主题切换有圆形展开，滚动时内容渐显。这些都是细节层面的动效，没有一个让人一眼记住的**标志性交互**。2026 年的获奖站点通常只做一件难的事，并把它做到极致，而不是堆很多效果。
2. **最适合这个站的标志性交互：让 AI 有“身体”。** 这个站的核心是一个会调用工具的 AI 聊天机器人（getProjects / getSkills …），和 Toukoum 的 “AI-native portfolio” 同一类。这类站普遍缺一个视觉化、有状态的 AI。建议做一个**会随聊天状态变化的 “AI Core” 光球（Orb）**：
   - idle 时缓慢呼吸；
   - 用户输入时朝输入框方向倾；
   - 调用工具时旋转，并按工具换颜色；
   - 流式输出时随 token 速率脉动；
   - 出错时去饱和。
3. **3D 只做渐进增强，文字仍然是 LCP。** 3D 用 react-three-fiber v9，并满足以下条件：
   - 用 `next/dynamic({ ssr:false })` 懒加载，在视口内且浏览器空闲时才挂载；
   - `frameloop` 平时为 `demand`，只在 AI 思考或流式输出时切到 `always`，离屏或切到后台标签页时为 `never`；
   - `dpr` 上限 1.5；
   - 低端 GPU、开启省流量或 reduced-motion 时退回纯 CSS 版本。
   - 预算：3D 相关 JS 约 200 KB gzip，在 LCP 之后加载。
4. **Blender** 适合后期的第二阶段场景，比如 About 区的烘焙小桌面、显示器里嵌入真实聊天。第一阶段的 Orb 用 shader 就够了，不需要模型。
5. **不推荐：**
   - Spline：运行时约 544 KB gzip，是 three.js 的 3 倍以上。
   - 3D 真人说话头像：容易恐怖谷，资源重，而且 Ready Player Me 已于 2026-01-31 关停。
   - 为普通滚动效果引入 GSAP：已经有 Motion，再引入会有两套动画引擎。

> ⚠️ 需要你拍板：仓库已有的设计规范写了 **“避免引入大型 3D 依赖”**（`docs/specs/2026-09-16-personal-studio-redesign/implementation-plan.md:194`）和 **“页面静止后不应持续动画”**。引入 three.js 等于修改这条约束。本文的建议是：只在 Orb 这一处用 3D，懒加载，并且空闲时不渲染。这样基本守住原规范的精神。

---

## 1. 现状诊断（代码审计摘要）

| 项目 | 现状 |
|---|---|
| 动画引擎 | `framer-motion` 只在 2 个文件里用：`studio/collection-desk.tsx`、`projects/project-disclosure.tsx`。其余动画都是 CSS keyframes。 |
| 未使用的 Motion 能力 | `useScroll`、`useInView`、`whileHover`/`whileTap`、`layoutId`/`layout`、`MotionConfig`、`LazyMotion` |
| 3D / Canvas | 无：没有 three、canvas 或 WebGL |
| 懒加载 | 没有 `next/dynamic` |
| reduced-motion | 大部分已覆盖。缺口：`project-card.tsx:47`、`hero-ask-form.tsx:129` 的 hover 位移；`ui/chat/message-loading.tsx` 的 SMIL 动画；`globals.css:136` 的 `scroll-behavior: smooth` |
| 规划了但没做 | `src/components/motion/` 下的全局 Motion Provider（architecture.md:21,25,152） |

**已有的性能隐患（与动画无关，但做 3D 前应先修）：**

1. **客户端组件引入了服务端配置。** `chat.tsx:16`、`chat-landing.tsx:5`、`AllProjects.tsx:6` 等都 import 了 `@/lib/config-loader`，它会把 52 KB 的 `portfolio-config.json`、zod 和 system prompt 生成器一起打进 /chat 的客户端 bundle。
2. `public/profile.jpeg` 有 2.7 MB，而且**没有被任何地方引用**。`public/portfolio.png` 有 2.4 MB，只用作 OG 图，应该压缩。
3. `<Atmosphere/>` 在每个公开页面上都有两个 62vmax、`blur(80px)` 的光斑在无限动画，GPU 持续合成。叠加 3D 之前，应该把它改为空闲时暂停，或者用 Orb 取代它。
4. 首屏的收藏台用的是完整版 `motion`（约 34 KB），没有用 `LazyMotion + m`（约 4.6 KB 起）。

**AI 状态接入点：** `chat.tsx` 的 `useChat` 返回 `status`（`submitted | streaming | ready | error`），配合 `isToolInProgress`（L65-79）和 `errorMessage`（L25），足够推导出 idle / thinking / tool / streaming / error 五种状态。仓库里已经有 `WAVE_EVENT`（`shortcuts.tsx:9`）这种 window CustomEvent 总线。照同样的方式加一个 `studio:chat-state` 事件，首页收藏台的头像也能跟着聊天状态反应。

---

## 2. 值得学习的作品站

| 站点 | 标志性交互 | 技术 | 可借鉴的地方 |
|---|---|---|---|
| [Bruno Simon 2025](https://bruno-simon.com)（[MIT 源码](https://github.com/brunosimon/folio-2025)） | 开车探索物理世界 | Three.js WebGPU + TSL、Rapier | **学资源管线**：Blender → gltf-transform → KTX2，不学游戏玩法 |
| [Henry Heffernan](https://henryheffernan.com)（[MIT](https://github.com/henryjeff/portfolio-website)） | 3D 复古房间，CRT 屏幕里跑着一个真正可用的操作系统 | Three.js + CSS3DRenderer | **把聊天窗口放进 3D 显示器**（drei `<Html transform occlude>`），DOM 仍然可访问 |
| [Jesse Zhou](https://www.jesse-zhou.com) | 3D 拉面店 | Three.js + Blender 烘焙光照 | 烘焙光照：画质接近 Cycles 渲染，运行成本只相当于贴图 |
| [Jordan Breton](https://jordan-breton.com)（FWA 2025） | 浮空岛 | Three.js shader | **固定机位**导航，聊天回答时相机可以飞到对应位置 |
| [Thibault Introvigne](https://www.thibault-introvigne.com) | 收集物品来解锁经历 | R3F + Blender | 每次工具调用“点亮”场景里的一个节点 |
| [Igloo Inc](https://www.igloo.inc)（2024 年度网站） | 粒子会按悬停的链接重组形状 | Three.js GPU 粒子 | 粒子形态可以预告 AI 接下来要展示什么 |
| [Lusion](https://lusion.co) | 流体、液态玻璃 | 自研 WebGL | 折射玻璃质感的 Orb。把它当质量上限参考，不当范围目标 |
| [Robin Noguier](https://robin-noguier.com) | 项目图随滚动速度弯曲 | R3F + GLSL | 项目卡的滚动变形效果（必须共用一个 canvas） |
| [Dennis Snellenberg](https://dennissnellenberg.com) | 磁吸按钮、页面转场 | GSAP | 给 “Ask me” 按钮和问题 chip 加磁吸，成本低、观感提升明显 |
| [Brittany Chiang v4](https://v4.brittanychiang.com) | 跟随光标的聚光灯 | CSS 变量 | 几乎零 JS 成本的 spotlight |
| [Rauno Freiberg](https://rauno.me) | 操作系统隐喻、⌘K、界面音效 | React | 你已经有 `ask-palette.tsx`，可以再加细节打磨 |
| [Emil Kowalski](https://emilkowal.ski) | 可打断的 CSS 过渡 | CSS / Motion | Sonner 和 Vaul 都是他写的，**这两个库本仓库已经在用** |
| [Cyd Stumpel 2025](https://cydstumpel.nl)（Awwwards SOTD） | 原生 View Transitions + CSS 滚动驱动动画 | 以 CSS 为主 | 获奖级动效几乎可以不写 JS |
| [Goodgrowth](https://goodgrowth.com)（Codrops 2026-08） | 游戏机式开机动画 | 3D + 声音 | 1 秒可跳过的 “loading weights…” 开场，和 LLM 主题契合 |
| [Pacôme Pertant](https://pacomepertant.com)（SOTD 2026-06） | 声音驱动的动效、鼠标拖尾 | Three.js + GSAP | 音频响应的思路可以换成 token 速率响应 |
| [Toukoum](https://toukoum.fr)（[源码](https://github.com/toukoum/portfolio)） | AI-native 作品站 | Next + OpenAI | 和你是同一类站。它缺的正是 AI 的可视化状态 |

更多榜单：[Awwwards Three.js](https://www.awwwards.com/websites/three-js/)、[Utsubo 2026 Three.js 最佳网站](https://www.utsubo.com/blog/best-threejs-websites-2026)、[Codrops case studies](https://tympanus.net/codrops/tag/case-study/)

---

## 3. 开源仓库：值得读的源码

| 仓库 | ★ | 许可 | 值得学的模式 |
|---|---|---|---|
| [Naresh-Khatri/3d-portfolio](https://github.com/Naresh-Khatri/3d-portfolio) | 1.3k | MIT（⚠️ 如果复制代码，要删掉 `analytics.tsx` 里上报给作者服务器的 beacon） | **技术栈和你最接近**（Next 16 + React 19 + motion 12）。`usePerfProfile()` 一个 hook 统一决定降级策略；页面上有 “Reduce motion” 开关；Lenis 通过 `prevent` 让弹窗保持原生滚动 |
| [HamishMW/portfolio](https://github.com/HamishMW/portfolio) | 3.5k | MIT | 用 Motion `useSpring` 驱动 three.js：指针写入 spring，rAF 里读 `.get()`，每帧不触发 React 重渲染。reduced-motion 时只渲染一帧静态画面。DecoderText 乱码解码效果把真实文字放在 `VisuallyHidden` 里 |
| [mohitvirli.github.io](https://github.com/mohitvirli/mohitvirli.github.io) | 0.4k | 无许可证，只看不抄 | 证明 **R3F 9 + drei 10 + React 19** 能在生产环境跑。ScrollControls 把滚动映射成相机运动，zustand 在 canvas 和 DOM 之间传状态 |
| [pmndrs/react-three-next](https://github.com/pmndrs/react-three-next) | 2.9k | MIT | **一个常驻 Canvas + 多个 `<View track>`**：页面上多处 3D 共用同一个 WebGL context |
| [ITomPoland/portfolio-itom](https://github.com/ITomPoland/portfolio-itom) | 0.4k | MIT（仅代码） | 设备分 HIGH / MEDIUM / LOW 三档；预加载期间用 `gl.compileAsync()` 预编译 shader，避免首帧卡顿 |
| [magicuidesign/portfolio](https://github.com/magicuidesign/portfolio) | 1.5k | MIT | 和你一样由一个数据文件驱动。BlurFade 约 40 行；FlickeringGrid 用 IntersectionObserver 在离屏时暂停 |
| [ibelick/nim](https://github.com/ibelick/nim) | 0.75k | README 写了开源，但没有 LICENSE 文件 | **和你的技术栈完全一致**（Next 15 + React 19 + Tailwind v4 + motion）：Magnetic、Spotlight、MorphingDialog |
| [edhinrichsen/retro-computer-website](https://github.com/edhinrichsen/retro-computer-website) | 0.4k | MIT | 文字渲染到 RenderTarget，再贴到 CRT 网格上加扫描线 shader |

**组件库（兼容 Tailwind v4 + motion 12）：**

| 组件库 | 许可 | 推荐用途 |
|---|---|---|
| [Magic UI](https://magicui.design) | MIT | Blur-fade、Number ticker、Border beam、Dock |
| [Motion Primitives](https://motion-primitives.com) | MIT | **TextShimmer**（适合 “AI 思考中…”）、TextEffect、Magnetic、MorphingDialog |
| [React Bits](https://reactbits.dev) | MIT + Commons Clause（自己的站可以用） | 背景和文字特效。注意部分组件依赖 ogl、three 或 gsap |
| [Cult UI](https://github.com/nolly-studio/cult-ui) | MIT | Dynamic Island、带 AI SDK 的区块 |
| [Aceternity UI](https://ui.aceternity.com) | 自定义许可（可以用，不能再分发） | Spotlight、3D Card。部分效果较重，要逐个检查 |
| [ElevenLabs UI Orb](https://ui.elevenlabs.io/docs/components/orb) | 开源，基于 shadcn + R3F | **几乎就是需要的 AI Orb**，它的 `agentState` 是 `thinking / listening / talking` |

> 这些库一般从 `motion/react` 导入，本仓库用的是 `framer-motion`（v12，同一个库）。可以装 `motion`，然后统一改成从 `motion/react` 导入。

---

## 4. 技术选型与性能手册

### 4.1 选型

| 需求 | 选用 | 理由 / 体积（gzip） |
|---|---|---|
| 2D 动效、滚动触发、布局动画 | **Motion（已有）**，改用 `LazyMotion + m` | 起步约 4.6 KB，加 `domAnimation` 约 15 KB；比现在的完整版节省 20–30 KB |
| 简单的滚动进度、视差 | **CSS `animation-timeline: view()`** + `@supports` | 0 KB，跑在主线程之外。Firefox 仍在 flag 后面，所以只做渐进增强 |
| 路由转场 | **View Transitions**（React 19.3 `<ViewTransition>` 或 Next 的 `experimental.viewTransition`） | 几乎零 JS；仓库里 `theme-toggle.tsx` 已经用过 |
| 3D | **@react-three/fiber v9 + drei v10**（v9 才支持 React 19） | three.js 约 155 KB，外加 R3F 和少量 drei |
| 只有一个 shader 光球 | 可以考虑 **OGL** | 约 20 KB，但没有 R3F 生态 |
| 平滑滚动 | Lenis（不到 4 KB）。**只有做 WebGL 滚动场景时才加** | 会和聊天窗口的自动滚到底冲突，需要 `data-lenis-prevent` |
| 流式文字 | **Streamdown**（`animated`）或 FlowToken | 逐词淡入，流式结束后移除动画节点，不留 DOM 开销 |
| GSAP | **暂不引入** | 3.13 起完全免费，但只有做 pin + scrub 的长叙事时才值得多带一套引擎 |
| Spline | **不用** | 约 544 KB，有 CPU 占满的问题报告 |

### 4.2 性能规则（每条都有来源，见第 3 节报告链接）

1. **canvas 不算 LCP 元素。** LCP 应该是服务端渲染的 H1 和 hero 文案，不能被 loader 挡住。
2. `next/dynamic(() => import('./orb-scene'), { ssr:false, loading: Poster })`，在视口内（IntersectionObserver）且 `requestIdleCallback` 之后再挂载。
3. `frameloop`：静止时 `demand`，AI 忙时 `always`，离屏或标签页隐藏时 `never`。Spline 团队发现，离屏暂停是单项收益最大的优化。
4. `dpr={[1, 1.5]}`。填充成本和 dpr² 成正比。再加 drei `<PerformanceMonitor onDecline={() => setDpr(1)}>`。
5. **分档降级**：`usePerfProfile()` 统一判断 reduced-motion、`saveData`、指针类型、GPU 档位（可选 `@pmndrs/detect-gpu`，基准数据要自托管）。降级时直接显示 CSS conic-gradient 光球。
6. 首次显示前调用 `gl.compileAsync(scene, camera)` 预编译 shader，避免首帧卡几百毫秒。
7. **全站只用一个 WebGL context**，需要多处 3D 时用 drei `<View>`。浏览器对 context 数量有上限，超出后会丢弃最早的那个。
8. 如果以后用 Blender 模型：`npx gltfjsx model.glb --transform`（Draco + WebP + 1K 贴图，体积减少 70–90%），贴图用 KTX2（显存占用减少 4–8 倍），目标 1–2 MB。
9. 只动画 `transform` 和 `opacity`。指针事件合并到 rAF 里处理，写 CSS 变量或 MotionValue，不写 React state。这和现有设计规范一致。
10. 全局 `<MotionConfig reducedMotion="user">`，同时补上第 1 节列出的 reduced-motion 缺口。
11. 用中端 Android 测试（不要只在 M 系列 Mac 上看）。预算按 Google 标准：LCP ≤ 2.5s、INP ≤ 200ms、CLS ≤ 0.1。

### 4.3 安全的 Orb 挂载骨架

```tsx
'use client'
const OrbScene = dynamic(() => import('./orb-scene'), { ssr: false, loading: () => <OrbPoster /> })

function AiOrb({ state, energy }: { state: ChatVisualState; energy: number }) {
  const { disable3D, maxDpr } = usePerfProfile()   // reduced-motion / saveData / gpu tier
  const [ref, visible] = useInViewport()
  if (disable3D) return <OrbPoster state={state} /> // 纯 CSS 版本，同样有状态颜色
  return (
    <div ref={ref}>
      <OrbScene
        state={state}
        energy={energy}
        dpr={[1, maxDpr]}
        frameloop={!visible ? 'never' : state === 'idle' ? 'demand' : 'always'}
      />
    </div>
  )
}
```

---

## 5. 建议路线图（与代码位置对应）

按“投入小、见效快、风险低”排序。评分：投入 S/M/L，效果满分 5，性能风险 低/中/高。

### 阶段 0：地基（S，风险低）
- [ ] 新建 `src/components/motion/motion-provider.tsx`：`MotionConfig reducedMotion="user"` + `LazyMotion`，挂到 `src/app/(public)/layout.tsx:23-25`
- [ ] 补上 reduced-motion 缺口：`project-card.tsx:47`、`hero-ask-form.tsx:129`、`message-loading.tsx`、`globals.css:136`
- [ ] 客户端组件不再 import `config-loader`，改由服务端组件把需要的字段作为 props 传下去
- [ ] 删除 `public/profile.jpeg`，把 `portfolio.png` 压缩到 1200×630 的 JPG/WebP
- [ ] `<Atmosphere/>` 在标签页隐藏或空闲时暂停

### 阶段 1：聊天体验（S–M，效果 4–5，风险低）：最先让人感觉“活了”
1. **流式文字动效**：`simple-chat-view.tsx:55-59` 的 react-markdown 换成 Streamdown（`animated`），或自己实现逐词淡入；加闪烁光标。
2. **工具调用编排**：`tool-renderer.tsx` 在调用时先显示 “⚙︎ getProjects” chip（shimmer → ✓），结果卡片用 `AnimatePresence` + stagger 弹入，推荐问题 chip 通过 `layoutId` 变形成消息气泡。**这能展示 agent 工程能力，不只是视觉效果。**
3. **“思考中”状态**：用 TextShimmer 替换 `chat.tsx:190-194` 和 `SimplifiedChatView` L62-66 的加载点。
4. 复制、点赞等操作加弹簧反馈，复制成功时弹 Sonner 提示（Sonner 已安装）。

### 阶段 2：标志性交互 AI Core Orb（M，效果 5，风险中）
- 在 `chat.tsx:44-79` 推导出 `ChatVisualState`（idle / thinking / tool / streaming / error），用流式 token 的到达速率作为 `energy`。
- 通过 `window.dispatchEvent(new CustomEvent('studio:chat-state', …))` 广播，写法参照 `WAVE_EVENT`。
- Orb 放在这几个位置：
  - `chat-landing.tsx:27-36`（空状态主视觉）；
  - 输入框旁的缩小版（`chat.tsx:233-247`）；
  - 首页收藏台头像旁，或替换 `<Atmosphere/>` 成为全站背景核心。
- 实现：R3F，一个球体 + noise 顶点位移 + fresnel shader；可以参考 ElevenLabs Orb。降级时显示 CSS conic-gradient，同样按状态变色。
- 可选：工具调用时按工具种类换颜色（projects 紫、skills 青、resume 琥珀），和 Thibault 的“点亮节点”思路一致。

### 阶段 3：全站打磨（S–M，效果 3–4，风险低）
- **磁吸 + spotlight**：`landing-page.tsx:149-160` 的 CTA、`HeroAskForm` 的问题 chip、项目卡（`project-card.tsx`，复用收藏台的 `--desk-lx/ly` 光照写法）。只在 `(hover:hover) and (pointer:fine)` 下启用。
- **滚动叙事**：扩展 `motion/scroll-reveal.tsx` 的变体（blur / stagger / clip）。`experience-timeline.tsx:34` 改成随滚动“画出”的进度线，优先用 CSS `view()`。
- **路由转场**：用 View Transitions 做项目卡到项目详情的封面共享元素过渡。原规范推迟了 exit 和 shared-element 转场，**需要你确认**。
- **导航**：`site-nav.tsx:85-95` 的当前项指示器用 `layoutId` 滑动 pill。

### 阶段 4：可选的“哇”场景（L，效果 4–5，风险中–高）
先确认阶段 2 在中端 Android 上的 Lighthouse 分数达标，再从下面选一个：
- **Embedding 空间粒子图**：用项目、技能、经历的真实 embedding，经 UMAP 降到 3D，在构建时预计算好坐标；悬停高亮一个簇，点击后由 AI 负责“检索”讲解，同时相机飞过去。**非常契合 LLM 工程师的身份，还顺带解释了 RAG。**
- **Blender 烘焙小桌面**：显示器里通过 drei `<Html transform occlude>` 嵌入真实的聊天窗口（Henry Heffernan 风格），和现在的 “Collection Desk” 概念自然衔接。经 `gltfjsx --transform` 和 KTX2 压缩后控制在 1–2 MB 以内。

### 不做
- Spline 做 hero
- 3D 真人头像 + 口型同步
- 每个项目卡各用一个 canvas
- 同时引入 GSAP、Lenis 和 Motion 三套时钟（除非做阶段 4 的滚动场景）

---

## 6. 需要你决策的点

1. 是否放宽规范里“避免引入大型 3D 依赖”这一条？（建议：只允许 Orb 懒加载 R3F，JS 预算约 200 KB gzip）
2. Orb 放哪里：只放在 /chat，还是首页 hero 也放，还是替换全站 `<Atmosphere/>`？
3. 是否开启跨路由的 shared-element 转场（原规范推迟了）？
4. 阶段 4 选 Embedding 粒子图，还是 Blender 桌面？
