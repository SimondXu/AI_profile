# v2.1 排版与信息结构打磨

日期：2026-09-20 · 触发：用户视觉反馈（"整体 UI 和排版不够好看；导航没有主页；About 放在页底不合理"）。本文在 `README.md`（v2）之上做增量修订；冲突处以本文为准。

## 1. 诊断（主 agent 在 1440×900 明暗两套主题下的实际观察）

| 问题 | 证据 | 后果 |
|---|---|---|
| About 段与 hero 重复 | hero 已放 `personal.bio` 第一段；页底 About 再放同一段 + 第二段 | 用户读到同一段两次，且"关于我"排在经历之后不符合阅读顺序 |
| 导航缺 Home | 基线设计"品牌名回首页、省略显式 Home"（design-spec §4） | 用户明确不接受；移动端菜单有 Home、桌面没有，也不一致 |
| 页面像文档不像设计 | 每个 section 都是"左对齐 H2 + 灰字"，无节奏、无容器、无分隔；Experience 的 bullet 行长 > 110 字符 | 整体平、没有视觉层级，被评价"不好看" |
| 次级文字过多过灰 | 卡片正文 14px muted，经历 bullet 13–14px muted | 暗色下能量低、可读性一般 |
| section 标题与页标题同级 | "Featured work / Experience / About" 与 hero 名字视觉重量接近 | 层级混乱 |

## 2. 决定

### 2.1 导航
- 桌面导航显式列出 **Home · Projects · Resume · Ask**（Music/Photos 仍按 `visible` 开关）；品牌名照旧可点回首页。移动端菜单不变。
- 当前页指示保持下划线 + 字重。

### 2.2 首页信息结构（自上而下）
1. **Hero**：eyebrow（title，mono）· H1 姓名 · 一句定位（`aiProfile.positioning` 首句）· CTA（See projects / Resume）· Ask 表单 ｜ 右侧收藏台。**不再放 bio 段落**。
2. **Now 条**：不变。
3. **About**（`id="about"`，紧接 hero）：两栏。左：`personal.bio` 两段（`max-w-prose`，17px/1.7）。右：事实卡（mono 小标 + 值），只取配置已有字段：Education（学位 · 学校 · 时间）、Location（`personal.location.current`）、Open to（`personal.location.relocation` / `entryLevel.availability` 中已有的文案）、Focus（`skills` 顶层分类名前 3–4 个）。没有的字段不渲染，不编。
4. **Selected work**（`id="projects"`）：eyebrow "01 — Selected work"，右侧对齐 "All projects →"；三张 featured 卡（封面 + 标题 24px + summary 15px + 4 个 tech chip）。
5. **Experience**（`id="experience"`）：eyebrow "02 — Experience"，**时间线布局**：左列 mono 日期区间 + 地点（宽 ~11rem，≥1024px 时显示；小屏折到条目上方），右列公司 · 角色（18px semibold）+ 一句职责 + ≤3 条 highlights（16px，`max-w-prose`）。条目间 `border-t border-border`。
6. 页脚不变（联系方式在页脚，不再单独 Contact 段）。

### 2.3 节奏与排版 token（全站）
- section 垂直间距：桌面 `py-24`（96px），移动 `py-16`（64px）；section 之间 `border-t border-border`（hero 与 About 之间不加线，About 用背景 `bg-surface` 的整幅色带区分）。
- 页内标题层级：页 H1 40–56px（display）；section H2 **32px/1.15 display semibold**；卡片 H3 20–24px；eyebrow 12px mono uppercase tracking-[0.18em] `text-muted-foreground`。
- 正文：段落 17px/1.7（About）、卡片与列表 15–16px/1.6；muted 文字仅用于元信息，不用于整段正文。
- 行长：所有段落与 bullet `max-w-prose`（≈65ch）。
- 分区 eyebrow 编号（01 / 02）只在首页使用。

### 2.4 Projects 页
- Header 加 eyebrow "Archive"，H1 40px，intro `max-w-2xl`。
- 筛选做成分段控件（一个 `rounded-[10px] border border-border p-1` 容器内三个 pill，当前项 `bg-accent-soft text-foreground`），保持 `<Link>` + `aria-current`。
- 卡片底部动作区：`border-t border-border pt-4` 一行放 "Read more →"（accent）与 "Ask about this →"（muted），两者之间 `gap-6`。
- 非 featured 卡：在标题上方加一条 6px 高、按 slug 哈希取色（accent / material-wood / material-vinyl 三选一）的短横条，作为无封面卡片的视觉锚点；不是封面，不加 "Concept artwork"。

### 2.5 不动的
收藏台（刚打磨过）、Ask 面板、chat 状态机、Resume 页、Music/Photos 空态、所有事实文案。

## 3. 验收
- `/` HTML 中 `personal.bio` 第一段只出现一次（`grep -c` = 1）。
- 桌面导航含 Home，`aria-current` 在 `/` 上落在 Home。
- 三个锚点 `#about #projects #experience` 存在且在 sticky 导航下方可见（`scroll-mt-20`）。
- 1440 / 1024 / 390 明暗各一张截图，无横向溢出；Experience 在 1024 以上为两列。
- tsc / lint / build / `git diff --check` 绿；`scripts/contrast-check.mjs` 不变（未改 token）。
