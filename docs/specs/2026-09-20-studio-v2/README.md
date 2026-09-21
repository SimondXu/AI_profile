# Simon's Studio v2 — 设计方向与实施契约

日期：2026-09-20 · 状态：已批准实施（用户 2026-09-20 确认）
基线：`../2026-09-16-personal-studio-redesign/`（Codex 方案）。本文只记录**与基线不同**的决定；未提及处沿用基线（尤其其 design-spec §11 动效表、§12 视觉验收、architecture §3 URL 兼容矩阵、implementation-plan §5 验收矩阵）。

## 1. 已定决策（覆盖基线）

| 主题 | 基线 | v2 决定 |
|---|---|---|
| 协作 | 7 阶段 / 3 并行 lane / 文件锁 | 3 个 PR 串行：PR-1 安全（已合并 `6c1bd6b`）→ PR-2 基础 → PR-3 页面（页面内可并行） |
| 字体 | 系统 Helvetica | `next/font/google` 自托管：标题 **Bricolage Grotesque**、正文 **IBM Plex Sans**、等宽 **JetBrains Mono**；运行时零外部字体请求 |
| 样式体系 | CSS Modules + `--studio-*` 平行 token | **Tailwind 4 `@theme`** 重定义现有语义 token；`@custom-variant dark (&:where(.dark, .dark *))` 复用 next-themes 的 html class；不新增 `--studio-` 命名空间；CSS Modules 仅允许收藏台等复杂几何局部 |
| 遗留 CSS | 新旧并存、不批量删 | 抽出 `.tracking-*` 到 `src/app/tracking/tracking.css` 后，**删除** `globals.css` 全部旧内容与 `glob.css`；删除零引用组件（`animated-avatar`、`action-buttons`、`floating-ai-button`、`search-input`、`ConfigData`、`apple-cards-carousel`、`preset-reply`）与 `public/placeholder.jpg` |
| 依赖版本 | 不动 | Next 已升 15.5.25（安全需要）；其余不动；允许新增 `next/font`（内置）。不引入第二套动画库 |
| 身份 | 待核对 | 站内显示名 **Simon Xu**；canonical origin **`https://www.simondxu.com`**（`metadataBase` + 每页 `alternates.canonical` = 自身 pathname）；JSON-LD / manifest / sitemap / robots 全改；`edisonwhale.com` 并行可用至 2027-02，301 在 Caddy/Cloudflare 层做，不在代码里。GitHub/LinkedIn handle、邮箱是真实账号，**保留**。简历 PDF 文件暂保留 `/Edison-resume-2026.pdf`（新 PDF 由简历项目另出，见 §6） |
| Music / Photos | 六项导航 + 空态页 | 路由、内容类型、空态页照建；**导航与收藏台默认不露出**，由 `src/content/site-sections.ts` 的 `visible` 开关控制，内容进来后翻开关即可 |
| 项目详情页 | 8 项全有 | 只给 3 个 featured（conductor / engram / figbrain）建 `/projects/[slug]`；其余 5 项在列表内就地展开；slug 全部 8 项都加（分享/锚点） |
| 封面 | AI 生成 PNG | **程序化 SVG 活封面**（`src/components/projects/covers/`），按 slug 播种，跟随主题 token，hover 有反应，reduced-motion 静态 |
| Ask | 一个页面 | 复用 `chat.tsx` 状态机，新增全站 `⌘K` / `/` 呼出的 Ask 面板；项目卡 "Ask about this →" 走 `/chat?q=`；API 协议不变 |
| 主题切换 | 直接切 | `document.startViewTransition` 可用时从按钮位置圆形扩散；不可用直接切 |
| "Now" 条 | 无 | hero 下方一行：最近一次 GitHub public push（服务端 fetch，ISR 3600s，失败则整条不渲染，不编数据） |

## 2. 颜色 token（Light / Dark）

在 `@theme` 中定义，名字沿用现有语义 token，值替换为：

| token | Light | Dark | 用途 |
|---|---|---|---|
| `--background` | `#F3F0E9` | `#0F1115` | 页面底（暖纸 / 石墨） |
| `--surface` | `#FBFAF6` | `#181B22` | 有层次的表面 |
| `--foreground` | `#191A1F` | `#F1F0EB` | 标题、正文 |
| `--muted-foreground` | `#5E6068` | `#A3A6AF` | 次要文字 |
| `--border` | `#DCD8CE` | `#2B3039` | 非交互分隔 |
| `--input` | `#8A8C94` | `#737784` | 控件边界 |
| `--accent` | `#2E52D4` | `#8FA7FF` | 链接、选中、主按钮（唯一强调色） |
| `--accent-foreground` | `#FFFFFF` | `#0F1115` | 强调按钮文字 |
| `--accent-soft` | `#E6EBFC` | `#232C47` | 轻量选中背景 |
| `--ring` | 同 accent | 同 accent | 焦点环 |
| `--material-paper` / `--material-wood` / `--material-vinyl` | `#FFFDF7` / `#C9A27A` / `#1C1C1E` | `#E9E6DE` / `#8E6B49` / `#0A0A0B` | **仅收藏台物件**可用 |

对比度按基线方法在实现时用脚本复核（正文 ≥ 4.5:1，次要 ≥ 4.5:1，大字 ≥ 3:1），结果记入 PR 描述；不接受口头"应该够"。

## 3. 目标模块

```
src/app/layout.tsx                 providers + metadataBase + 字体变量；不再渲染 <main>
src/app/(public)/layout.tsx        SiteNav + <main id="main"> + SiteFooter + AskPalette 挂载点
src/app/(public)/{page,projects,projects/[slug],resume,chat,music,photos}
src/app/tracking/layout.tsx        自己的容器 + tracking.css（不继承公开壳层）
src/components/site/               site-nav（含移动端菜单）、site-footer、theme-toggle、ask-palette
src/components/studio/             collection-desk（PR-3）
src/components/projects/           grid、card、detail、covers/（PR-3）
src/content/site-sections.ts       导航项与 visible 开关（唯一来源）
src/content/project-presentation.ts  slug → { shortTitle?, coverKind? }，不复制事实
src/content/music.ts / photos.ts   只读空数组 + 类型（字段按基线 architecture §5）
```

## 4. 数据契约（基线 architecture §4 之上的补充）

- `Project.slug`：必填，`^[a-z0-9]+(-[a-z0-9]+)*$`，8 项取值按基线表；Zod 校验唯一性。
- `Project.detail?: boolean`——不加。详情页由 `featured === true` 决定，不新增字段。
- `site-sections.ts` 导出 `siteSections: ReadonlyArray<{ id, label, href, visible }>`；nav、footer、收藏台都从它读。

## 5. PR 切分与验收

- **PR-2 基础**：壳层/route group、token/字体、身份与 SEO、slug 与内容模块、移动端菜单、主题切换、遗留 CSS 与死代码删除、tracking 样式隔离。验收：tsc/lint/build 绿；六个公开路由 + `/tracking/login` 可打开；`/projects?track=` 与 `?q=` 行为不变；每页 `<link rel=canonical>` 指向自身；对比度脚本结果；390/768/1024/1440 无横向溢出。
- **PR-3 页面**（可并行 3 lane，文件不相交）：A 首页 + 收藏台 + Now 条；B Projects 网格 + 活封面 + 3 个详情；C Ask 面板 + Chat/Resume 视觉适配。验收沿用基线矩阵。

## 6. 遗留与后续

- 简历 PDF 仍是 `Edison-resume-2026.pdf`，内容署名待简历项目 `/resume-release` 出 Simon 版后替换，届时同步 `resume.pdfUrl` 与下载文件名。
- `edisonwhale.com` → `www.simondxu.com` 301 属服务器配置，不在本仓库。
- 基线文档 `2026-09-16-*` 与本文一起保留在 `docs/specs/`，作为决策记录。

## 7. Music / Photos 首版（2026-09-20 追加，覆盖基线 §9/§10）

用户决定：Music 做成真播放器并接入自己的网易云歌单 "shadow of the sun"（116 首，2022-08-17 创建）；Photos 先做有氛围的 placeholder。

### 7.1 音源决策：YouTube IFrame API，不用网易云
- 网易云只有无 API 的 outchain iframe；拿直链要走非官方反向 API（已被 DMCA），且海外大量版权不可播。YouTube embed 合法、有状态事件，能真驱动唱臂/盘面/进度/切歌。
- 代价与对策：拿不到音频数据 → 频谱在 YouTube 模式**隐藏**不伪造；45 转禁用；条款要求播放器可见 ≥200×200 → 视频框做成"正在播放的封套"放在右栏；脚本**只在第一次落针后**注入，host 用 `youtube-nocookie.com`。
- 大陆或被墙网络：脚本加载失败 / 8 s 内 player 未 ready → 显示 "YouTube didn't load… may be blocked on your network or in your region"，给 Try again；单曲 101/150（禁止外嵌或地区限制）→ "won't play here… doesn't allow embedding or isn't available from your IP / region"，给 Open on YouTube + Next record，连播中 5 s 自动跳下一首；100 → 已删除/私有。

### 7.2 数据
- `src/content/music-crate.json`：`{ name, createdAt, records[] }`；`MusicSelection.source` 为可辨识联合 `{kind:"file",src:"/audio/…"} | {kind:"youtube",videoId}`，Zod 校验 id 唯一、videoId 11 位、file 路径必须在 `/audio/` 下。
- 116 条中 112 条有 YouTube 源。匹配由 3 个 Sonnet 子代理完成（规则：时长 ±8 s 优先，其次官方频道 / Topic / 厂牌），主 agent 复核后把 10 条二传频道改回官方上传，4 条无法确认的（Summer Lover、SUNDAY MORNING、One Last Time (Lancer remix)、王OK Homage）**不给 source**，crate 里标 "no source"。三首翻唱条目（Let's Fall in Love for the Night、Upside Down、Mr. Forgettable）播原唱并在 note 里说明。全部 112 个 id 用 watch 页 `playableInEmbed` 复核为可外嵌（美国 IP）。

### 7.3 页面
- `/music`：唱机（`turntable.tsx`，empty / file / youtube 三引擎）+ crate（`crate.tsx`）。crate 是横向翻箱：程序化封套（`sleeve-art.ts` 按 id 播种，不拉 YouTube 缩略图）、hover 抽出、当前唱片高亮 + "on the deck" 脉冲、文字搜索、按艺人聚合 chip（≥3 首才出现）、←/→ 翻页按钮与键盘、`?track=<id>` 深链（replaceState 同步）。传输：上一首/下一首/shuffle/repeat(off→crate→one)；键盘 space / n / p / s，并列入 `?` 帮助面板（仅 /music）。
- `/photos`：灯箱空态（`light-table.tsx`）：光斑跟随指针、六格未曝光胶片、三张空白相纸 hover 扇开、快门彩蛋（只闪光 + 计数）。
- 两页仍 `noindex`、导航 `visible=false`。
- 验收：tsc/lint/build 绿；axe 明暗 0 违规；1440/390 无横向溢出；reduced-motion 下盘面不转；页面加载不注入 YouTube 脚本（Playwright 断言）；真实播放/切歌/shuffle/深链在 Chrome 中验证；被墙场景用 route abort 模拟（脚本被拦、embed host 被拦两种）验证错误卡。未能实机验证 101/150 路径（手头没有禁止外嵌的视频）。

### 7.4 v2.5 打磨（2026-09-20，用户要求"更互动、动画更好看、审美更高级"）
- **换片编排**：`select()` 走 lift(420ms) → 旧片下滑淡出(220) → 新片升入(320) → drop(520) 的状态机（`phase` / `swap`），YouTube 在 swap 点开始 load，唱臂落下时正好开播；reduced-motion 下全部时长为 0。
- **唱臂 = 进度**：针落后角度从外圈 14° 随进度走到内圈 24°，250ms 轮询间用 400ms linear 过渡；拖唱臂 seek（pointer 角度反推 progress，`setPointerCapture`）；细进度条保留给键盘/读屏。
- **盘面物理**：rAF 驱动 `rotate()`，指数逼近目标转速（起转 τ=0.4s、减速 τ=0.6s）；盘边频闪点 33⅓ 静止、45 缓慢漂移。
- **封套调色板收敛**：`sleeve-art.ts` 只用 6 组站点材质双色（纸/钴蓝、黑胶/木、钴蓝/黑胶、纸/墨、氧化红/纸、芥末/黑胶），图案与角度按 id 播种；`sleeveGlow(id)` 给出代表色。
- **环境光**：播放时 `html[data-record-playing]` + `--record-glow` 让 `.atmosphere` 极光换成该唱片颜色并调亮（opacity 1.6s 过渡）。
- **Monitor**：播放器创建前显示该唱片的大封套 + "via YouTube" chip；创建后**替换**为播放器（不覆盖）；出错时播放器 `visibility:hidden`，错误卡占位——满足"不得遮挡播放器"。
- **底板**：明暗两套都是炭黑底板 + 木色包边，`.deck` 内重定义语义 token（foreground/surface/border/accent…），Tailwind utilities 自动继承。
- **UI 音效**：`needle-sound.ts` 合成的针落/抬针（thump + 爆豆），`sfx on/off` 开关持久化到 localStorage；不是假音乐。
- **Crate 翻箱**：封套重叠只露 3.4rem 书脊（竖排标题/艺人），hover/focus 抬起并把后面的推开 5.4rem（两个缺口可同时存在，用 CSS 变量相加）；当前唱片常驻抬起；鼠标可按住拖动（超过 6px 才接管 pointer capture，点击不受影响）；触屏原生滚动。
- 移动端唱盘缩到 12rem，标签文字隐藏只留封套图。
- 验收：tsc/lint/build 绿；axe 明暗 0 违规；1440/390 无溢出；headless Chromium 实测：落针→播放、从 crate 换片全程 phase 序列正确、盘面减速/加速数值正确、拖唱臂 seek、抬针；reduced-motion 下盘面无动画。

### 7.5 真实专辑封面（2026-09-21）
- 用户反馈程序化封套不好看。决定用**真实专辑封面**（方形、可识别）而不是 YouTube 缩略图（16:9、带人脸/文字横幅，整箱会像 YouTube 网格；且缩略图的使用条款绑定播放器场景）。
- 来源：iTunes Search API（`is1-ssl.mzstatic.com`，600×600）为主，被限流后用 Deezer Search API（`cdn-images.dzcdn.net`，1000×1000）补齐；匹配规则：标题相似度 65% + 艺人相似度 35%，艺人低于 0.6 拒绝，带额外括号版本扣分；每个 URL HEAD 复核 200。112 首中 105 首有封面，7 首（翻唱/小众曲目）回落程序化封套。
- 数据：`MusicSelection.artwork?: string`，Zod 限定 https 且域名在 mzstatic.com / dzcdn.net；`next.config.ts` `images.remotePatterns` 放行这两个域。热链 CDN，不下载存储。
- 渲染：`sleeve-image.tsx`（next/image `fill` + `onError` 回落程序化封套），用于 crate 封套、唱片标签、monitor（模糊底 + 居中方形封套）。
- 按用户要求删除了 4 首没有 YouTube 源的条目（Summer Lover、SUNDAY MORNING、One Last Time (Lancer remix)、王OK Homage）；crate 现为 112 首。
- 版权说明：专辑封面通过发行平台 CDN 热链用于标识对应曲目，与 YouTube 缩略图同类的"识别性使用"；仍属第三方版权素材，若日后收到要求可整体切回程序化封套（删 `artwork` 字段即可）。

### 7.6 Music 上导航（2026-09-21）
- `site-sections.ts` 的 music `visible: true`：桌面/移动导航、页脚、收藏台同时露出；`/music` 去掉 `noindex`，加入 `public/sitemap.xml`。
- 收藏台的唱片物件重画为"半抽出封套的唱片"（hover 抽出更多），slot 移到气泡下方 `top 36% / left 36%`，马克杯右移到 `top 40% / left 60%`；1024 / 1440 复核无重叠。Photos 仍隐藏。

### 7.7 氛围灯（2026-09-21，替代先前的节拍脉冲方案）
- 用户明确：要的是播放器**外围**的氛围灯慢速跳动，不是播放器内部按节拍的脉冲。节拍方案（BPM 数据、`use-beat`、读数）已整体移除，`bpm` 字段从 schema 与数据中删除。
- `.lampLight`：deck 背后两团该唱片颜色的光（`--record-glow`，来自真实封面主色 `glow`），分别以 5.6s / 7.4s 的周期缓慢呼吸（opacity 0.3–0.8 + 轻微 scale），错相；deck 用 `isolation: isolate`，只有溢出边缘的部分可见，所以是"唱机放在一盏灯下"，不是可视化。停止播放 1.4s 淡出。reduced-motion 下静态 0.5 不呼吸。
- 页面级极光继续按唱片颜色染色（§7.4）。
