# 架构、数据与兼容契约

关联：[范围](README.md) · [设计](design-spec.md) · [实施](implementation-plan.md)

本文区分当前事实与目标结构。出现的新目录/文件名均为**拟建接口边界**，不表示文件已存在。根 agent 冻结边界后，writer 不得自行移动共享文件。

## 1. 架构原则

1. 保留 Next App Router、既有 JSON 内容源、Chat API、tracking 和 Resume 功能。
2. 改写公开展示层，逐页迁移；不要把所有源码删除重建。
3. 页面数据在服务端准备，交互只放必要 client leaf；不把整个站点升级成一个客户端应用。
4. 职业事实只存一份；展示信息可以映射，但不复制 description、经历、指标到其他文件。
5. 新增功能以具体栏目模块实现，不提前制造通用 widget/plugin 系统。
6. 不改变依赖版本、锁文件、后端契约或安全配置来顺便完成视觉改版。

## 2. 目标模块与所有权

| 模块 | 目标位置 | 职责 |
| --- | --- | --- |
| 根布局 | `src/app/layout.tsx` | ThemeProvider、PageViewTracker、Toaster、唯一根 main、公共 metadata |
| 公开路由组 | `src/app/(public)/layout.tsx` | Public shell、导航、footer、Motion provider；不另建 main |
| 页面路由 | `src/app/(public)/…/page.tsx` | 每页 metadata、服务端内容选择、组合 feature 组件 |
| 公共网站外壳 | `src/components/site/` | 导航、页脚、主题按钮，复用/收敛现有 SiteNav |
| 收藏台 | `src/components/studio/` | 首页物件布局及指针/聚焦交互 |
| 动效边界 | `src/components/motion/` | 小型 provider、共用 transition/reveal；不构建通用动画 DSL |
| 首页内容 | `src/components/landing/` | 身份、精选作品、经历与 About；静态与交互分开 |
| 项目展示 | `src/components/projects/` | 列表筛选、卡片、详情视图 |
| Chat 展示 | `src/components/chat/` | 原状态/消息流程上的样式与轻量反馈 |
| 新栏目 | `src/components/music/`、`src/components/photos/` | 首版空态，以后仅各自扩展 |
| 职业事实 | `portfolio-config.json` | 保留既有字段，项目新增显式 slug |
| 既有验证与 parser | `src/lib/config-schema.ts`、`config-loader.ts`、`config-parser.ts`、`src/types/portfolio.ts` | 保持单一解析入口与向后兼容导出 |
| 项目呈现映射 | `src/content/project-presentation.ts` | 按 slug 关联封面、短标题，不包含重复项目事实 |
| 新栏目内容 | `src/content/music.ts`、`src/content/photos.ts` | 有类型约束的空数组，真实内容以后添加 |
| 概念艺术 | `public/images/projects/` | 已审查和优化的本地概念封面 |

如果目录命名与最新仓库约定冲突，主 agent 在派工前修订此表；writer 不得创建功能重复的第二套 SiteNav/ThemeProvider。

## 3. 布局与路由迁移

### 根布局责任

当前根布局已经拥有主题 provider、追踪、toast 与 main。第一版保留 provider 配置和追踪生命周期。公开路由组提供普通容器、nav/footer 与局部 Motion provider，不新增嵌套 main。各 feature 若已有 main，需要在迁移时去除重复语义而保持样式。

迁移前绘出实际容器层级并检查 CSS 是否依赖标签名。若需要把唯一 main 改由各 route group 拥有，必须作为独立架构决定与 tracking 回归任务，不能某个 writer 私下调整。

API 和 tracking 保持原路径，且不包入公开 studio 外壳。Route group 不改变 URL，但移动 page 时必须同步移除原 page，不能同时注册重复路由。

### URL 兼容矩阵

| URL | 目标 | 必须保留 |
| --- | --- | --- |
| `/` | 公开 Home | 可直接刷新、分享 |
| `/#about`、`/#experience`、`/#projects` | 首页对应 section | 锚点存在，不被 sticky nav 完全遮挡 |
| `/projects` | 新列表 | 默认完整项目集 |
| `/projects?track=ai-ml` | AI/ML 筛选 | URL 驱动、刷新一致 |
| `/projects?track=full-stack` | Full-stack 筛选 | URL 驱动、刷新一致 |
| `/projects/[slug]` | 新详情 | 显式稳定 slug、无效值 404、metadata 正确 |
| `/resume` | 保留简历 | 原 PDF 地址和下载追踪 |
| `/chat?q=…` | Ask | 原 query 初始化语义、不重复发送 |
| `/music`、`/photos` | 新栏目 | 首版空状态 |
| `/tracking/*`、`/api/*` | 既有功能 | 不被公开迁移覆盖或重复包装 |

未知 track 参数按当前已有行为处理；如果当前没有定义，则默认 All，不崩溃，并在测试中固定。详情返回入口可携带白名单 track 参数，避免丢失筛选；不能把任意 `returnTo` 当作跳转地址。

## 4. 项目数据契约

### 当前事实源

`config-loader.ts` 静态导入 JSON，通过 `portfolioConfigSchema.safeParse` 处理，再建立模块级 `ConfigParser`。现有调用者使用 `getConfig()`、`getConfigParser()` 和一组生成数据导出。不能为新页面绕过它再解析第二份事实文件。

### slug 迁移

仓库没有项目 id。此次给八个项目显式增加唯一、持久的 slug，并同步 TypeScript 与 Zod。目标数据要求 slug 非空且由小写字母、数字、连字符组成，不包含路径分隔符。

| 既有项目标题 | 拟定固定 slug |
| --- | --- |
| Conductor: Distributed Multi-Agent Workflow Runtime | `conductor` |
| Engram: Cross-Session Memory MCP for AI Coding Agents | `engram` |
| FigBrain: Figma Multi-Agent Plugin | `figbrain` |
| AI Recognition in Edge Computing & Cloud Native | `ai-recognition-edge` |
| Interactive Map Visualization for Taxi Trip Analysis | `taxi-trip-map` |
| GeekLib: AI-Enhanced Library Management System | `geeklib` |
| InovicePro: MERN Stack Invoice Management System | `invoicepro` |
| Whales Chat: An Instant Messaging Mobile App | `whales-chat` |

保持原始标题事实，包括原 `InovicePro` 拼写；纠正品牌名需要用户确认，slug 的 `invoicepro` 不意味着已更改项目标题。

**不使用运行时 title-normalization fallback，不使用数组索引作为身份。** 当前八项与 schema 在同一变更中迁移。若实施者发现真实外部配置消费者需要旧 schema，先升级为主 agent 决策，不私自加入两套身份规则。

`project-presentation.ts` 仅允许展示字段：slug 对应 shortTitle、conceptArtworkSrc、conceptArtworkAlt。不得复制 summary、achievements、metrics。封面存在与否独立于项目存在与否；缺图仍能访问内容。

冻结模块接口：导出类型 `ProjectPresentation` 与只读映射 `projectPresentationBySlug`，映射 key 为显式项目 slug；类型字段为可选 `shortTitle`、可选 `conceptArtworkSrc` 与 `conceptArtworkAlt`。src/alt 必须同时存在或同时缺省，展示时固定标识为 `Concept artwork`。映射只能包含真实项目 slug；无映射时使用完整配置标题与文字封面。P1 建立契约，P1 交接后仅 P5 owner 可编辑该映射与资产；P3B 只读消费。

详情静态参数来自已验证项目列表；按 slug 查询，不根据请求参数访问文件系统。不存在返回 notFound。不要修改原 config-loader 的 fallback 策略作为无关清理，但实施检查必须直接验证真实 JSON，不允许错误配置被空 fallback 掩盖。

### 不变事实

标题、track、描述、时间、技术栈、成就、指标和既有链接保持原义。新增文案若非直接取自资料，必须标为待确认草案；不能让生成图暗示项目具备未实现功能。

## 5. Music 与 Photos 数据

首版各导出一个只读、有类型的空数组。零条目即 empty，不再维护重复的 status 字段。不增加 fetch、API、状态仓库、上传或账号连接。

冻结导出名：`src/content/music.ts` 导出 `MusicSelection` 类型与 `musicSelections` 只读数组；`src/content/photos.ts` 导出 `PhotoItem` 类型与 `photos` 只读数组。MusicSelection 字段固定为 string 类型的 `id`、`title`、`artist` 与可选 string `note`、`externalUrl`；PhotoItem 字段为 string `id`、`src`、`alt`，number `width`、`height` 与可选 string `caption`。不得由各页面另造同义类型。

最小内容契约用于未来添加真实条目：

| 内容 | 最小字段 | 首版行为 |
| --- | --- | --- |
| Music selection | 稳定 id、title、artist、可选 personal note、可选外部音乐链接 | 初始数组为空；不预加 audioSrc、OAuth/provider 状态等未决定字段 |
| Photo | 稳定 id、src、alt、width、height、可选 caption | 初始数组为空；不建设上传、自动相册和 lightbox 协议 |

输入边界：Music 的 `externalUrl` 如存在，只接受合法 HTTPS URL，禁止 `javascript:`、`data:`、协议相对链接和脚本内容；Photo 首批只接受站内 `/images/photos/` 下的资源路径，禁止路径穿越，不默认允许远程图片。Photo 的 width/height 必须为正整数，alt 非空；各集合 id 唯一。复用现有 Zod 做简单内容校验即可，不创建通用媒体服务；首版空数组有效。添加真实条目时校验仍必须执行，并检查本地资源存在。若以后需要远程图或其他协议，先更新来源策略与验收。

若首版过程中突然提供真实条目，主 agent 先确认展示能力和来源，再增补验收，不把未实现的播放/看图能力当作已经支持。

## 6. Ask 保留契约

保持 `src/app/api/chat/route.ts`、`fallback.ts`、`prompt.ts` 和 `tools/*` 的现有协议；此轮默认只读。

已知：messages 数量/文本长度校验、tracking 参数校验、配置驱动 prompt、六个 tools、无 OpenRouter key 的 fallback 都已存在。新展示必须适配这些行为，不能为了动画改写流式数据或制造第二份聊天状态。

### 实施前明确审计

Luna 列出以下现有字段流向与调用点，主 agent 判断其是否适合公开：

- `generateSystemPrompt()` 实际挑选哪些职业/个人字段。
- getProjects/getPresentation/getResume/getContact/getSkills/getEntryLevel 的返回字段。
- FAQ 和关键词 fallback 使用的字段。
- 前端是否已渲染工具数据和链接，失败如何呈现。

不需要新建 assistantContext 数据库或 citation 协议。Music/Photos 不自动接入 prompt/tools。所谓「来源」只能使用既有可验证资料；若现有 UI 无来源卡，本次不承诺新增来源系统。

### 展示层约束

- `chat.tsx` 保持会话与请求状态的唯一来源。
- 头像状态从真实状态派生；不可用 timeout 假装生成完成。
- `chat-landing.tsx`、`chat-bottombar.tsx` 等改前由 Luna 提供精确 props；writer 不根据组件名猜接口。
- UI 自身 loading/error/retry 必须对应实际能力。
- 不读出、打印或复制 `.env` 值；真实模型验证需另有可用的授权运行环境。

## 7. 样式与动效架构

当前字体栈为 `--font-sans-stack: Helvetica Neue, Helvetica, Arial, sans-serif` 与系统等宽栈，首版复用。

不要添加第三套全局 `:root` 覆盖。新 studio token 定义在**公开外壳作用域**（例如 `.studio-root`）及其 `.dark` 祖先主题规则中；变量名称与 design-spec 一致。旧全局 token 继续服务未迁移和 tracking 页面。

明确主题选择器为 `.studio-root`（Light）与 `html.dark .studio-root`（Dark），并分别设置 `color-scheme: light` / `color-scheme: dark`，使原生控件一致。不得用局部 React state 或另一个 class 判断主题；复用现有 next-themes 的 html class。

各功能采用 CSS Modules，公共 studio 样式只包含 token、有限页面容器、必要 reset。没有复用需求不抽公共组件；不要提供包含十几个布尔开关的万能卡片。

Motion provider 仅包公开页面；客户端 wrapper 可以接收服务端 children，不需要把孩子全部标为 client。pointer/scroll 连续值使用 motion values，组件卸载清理监听。简单颜色与阴影过渡用 CSS；同一节点由一个系统拥有 transform。

新 route 先有完整静态内容与普通链接，再增强动效。跨路由 shared element、自由拖动、Rive 在首版之外。

## 8. SEO 与资产

- 先确认 `www.simondxu.com`、apex 与 `edisonwhale.com` 的生产行为，再确定唯一 canonical origin。
- 每页 canonical 为自己的 pathname；不能继承首页 canonical 导致所有路由指向首页。
- 检查并统一 metadata、手写 canonical、Open Graph、JSON-LD、sitemap、manifest 中实际存在的旧域引用；不要根据文件名猜内容。
- 保留当前公开身份事实；用户姓名展示统一不等于可以改写历史社交地址。
- SEO 修改单独形成可回退 diff；没有生产域名证据时先标为待确认，不作部署操作。
- 图片固定尺寸，below-fold lazy load；首屏资源仅 preload 真正需要的图片，不 preload 整个项目库。
- AI 艺术和真实截图路径/alt 明确区分；不要把概念图加入 Ask 当项目实现证据。

## 9. 后续扩展方式

以后添加文章：新增独立 Writing 模块和内容来源，再接入公共导航；使用现有 shell、token、motion 即可。无需首版预建空路由或动态插件注册表。

以后添加音乐播放：先冻结来源/授权/播放能力，再决定 provider 和跨页状态放在哪里。以后添加照片：先确认真实图片与大小，再加入 gallery/lightbox 及焦点、Escape、返回位置的验收。

## 10. 主要风险与处理

| 风险 | 处理 |
| --- | --- |
| 大型全局 CSS 污染 | 公开 scope + module，新旧并存期间不批量删 selector |
| Route group 移动导致丢导航或重复 tracking | 主 agent 统一迁移，逐路由检查 provider/nav/main |
| 标题改动导致 URL 变动 | 显式固定 slug，引用一致性检查 |
| JSON 校验失败被 fallback 隐藏 | 独立配置检查，不能仅观察页面能打开 |
| UI 动画改变 Chat 状态或滚动 | API/状态流程不变，长回答与中断重点回归 |
| 缺媒体却实现假播放器 | 空数据驱动真实 empty，媒体系统另行任务 |
| 元数据旧域/重复 canonical | 核对部署再修，每路由检查 head |
| build 忽略 types/lint | 独立 tsc/lint，记录基线和新增错误 |
