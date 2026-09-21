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
