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

用户决定：两页先做成有氛围的 placeholder，Music 直接做成可用播放器，playlist 内容 hold。

- **Music `/music` — The deck**：`src/components/music/turntable.tsx` 是真播放器，双模式。
  - 空唱片模式（`musicSelections` 里没有带 `audioSrc` 的条目）：落针后播放 Web Audio 现场合成的空唱片表面噪音（`surface-noise.ts`：低通白噪 + 随机爆豆 + 每转一次的幅度摆动，6 s 循环 buffer），标签写 "No record loaded"，**不显示进度条**（空唱片没有时长）。
  - 曲目模式：`MusicSelection.audioSrc`（Zod 校验：必须是站内 `/audio/` 路径）驱动 `<audio>`，同一 analyser 出频谱；上一首/下一首、进度拖动、结束自动下一首。
  - 共用：33⅓ / 45 转速（真的改 playbackRate 与盘面转速）、音量、12 段频谱（pre-fader）、唱臂落下/抬起、reduced-motion 下盘面不转。
  - "On the shelf"：空态是三只空封套（hover 唱片从封套上抽出），有内容时列出 `musicSelections`。
- **Photos `/photos` — The light table**：`src/components/photos/light-table.tsx`。灯箱光斑跟随指针、六格未曝光胶片、三张空白相纸 hover 扇开、快门彩蛋（只闪光 + 计数，不产生任何照片）。状态行 "Roll 01 · 0 / 36 exposed" 是诚实的空态。有内容时渲染 `photos` 网格。
- 两页仍 `robots: noindex`，导航 `visible` 仍为 false；内容进来后翻 `src/content/site-sections.ts`。
- 验收：axe 明暗各 0 违规；1440 / 390 无横向溢出；reduced-motion 下 `.record` 无动画；键盘 Enter 可落针；真实 `<audio>` 路径用临时 WAV 验证过播放/切歌/自动连播（fixture 已删）。
