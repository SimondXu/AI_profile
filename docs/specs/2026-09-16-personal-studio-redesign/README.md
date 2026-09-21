# Simon’s Studio：个人网站改写实施规格

状态：**待用户批准实施；仅文档交付，不代表允许开始代码、提交、推送或部署。**

日期：2026-09-16

目标仓库：`/Users/edison/Desktop/projects/AI_profile`

用户站点：<https://www.simondxu.com/>

本规格适用于个人网站，不适用于当前会话的 Sidekick 工作目录。

## 1. 如何使用这组文档

| 文档 | 读者与用途 |
| --- | --- |
| [本文件](README.md) | 所有 agent 必读：目标、已知事实、范围、授权、决策 |
| [视觉与交互规范](design-spec.md) | 页面实现者：配色、布局、六页设计、状态、动效、响应式 |
| [架构与数据契约](architecture.md) | 主 agent、实现者：内容、路由、服务端边界、样式、兼容要求 |
| [实施与验收计划](implementation-plan.md) | 主 agent、实施者、reviewer：任务包、文件归属、检查和交接 |

冲突处理顺序：用户最新指令 > 适用仓库指令 > 本组文档。用户改变设计或范围时，先更新本组文档并由主 agent 重新冻结受影响接口；不能由某个 writer 私下改变共享契约。

四份文档应作为同一版本一起评审。所有 agent 至少阅读本文件及自己的任务关联章节；主 agent 必须掌握全部契约，不能仅凭单个页面设计派工。

## 2. 用户需求与产品目标

用户希望个人网站更有个性、更现代、更流畅，有明显但舒服的动画互动，并能够长期加入个人内容。

首版六个页面：Home、Projects、Resume、Ask、Music、Photos。文章暂缓，书架也不在首版。Projects 可使用 AI 生成的概念封面。Resume 保留主要结构，小幅优化。Ask 继续依据个人资料回答。Music 和 Photos 暂无已确认内容，用户明确选择完整页面和真实空状态，稍后添加内容。

用户明确要求：本地文件阅读由 **Luna medium** 完成；主 agent 负责架构、指导和最终判断。本阶段仅编写实施文档，不继续生成业务代码。

### 成功的体验

- 第一次访问能快速知道 Simon 是谁、做什么，并看到清晰的作品入口。
- 首页的「互动收藏台」成为记忆点，物件导航与真实栏目一一对应。
- 页面切换与局部交互流畅，但阅读内容和操作无需等待动画。
- 手机、键盘、减少动态效果模式都有完整路径。
- 新增一个项目、一张照片或一条音乐记录时，主要更新内容文件，不复制页面组件。
- 页面、简历与 Ask 中的职业事实保持一致。

### “Scalable” 在本项目中的含义

本次指内容扩展、清晰模块边界、可独立验证和维护。现阶段不引入数据库、微服务、通用插件框架、CMS 或一套自制页面构建器。

## 3. 已验证的现状与证据

以下为 Luna 对仓库的只读检查结果，不代表本次运行测试通过。

| 现状 | 源码或证据 |
| --- | --- |
| Next 15.2.3、React 19、Tailwind 4、已有 Framer Motion 12.5 | `package.json` |
| `portfolio-config.json` 为既有职业资料的事实源 | `src/lib/config-loader.ts`、`src/lib/config-schema.ts`、`src/types/portfolio.ts` |
| loader 静态导入 JSON，经 Zod 校验，模块级复用配置/parser | `src/lib/config-loader.ts`，导出 `getConfig()`、`getConfigParser()` 等 |
| 首页、项目、简历、Ask 已存在 | `src/app/page.tsx`、`projects/page.tsx`、`resume/page.tsx`、`chat/page.tsx` |
| Ask 支持 `?q=`；API 支持流式 tools 和无 key fallback | `src/components/chat/chat.tsx`、`src/app/api/chat/route.ts`、`fallback.ts` |
| 有访客追踪、提示词记录与简历追踪 | `src/components/tracking/`、`src/app/tracking/`；具体调用由 Luna 在改动前重新定位 |
| 原 Project 没有稳定 id/slug；八项暂无实际 images/links 值 | `src/types/portfolio.ts`、`portfolio-config.json` |
| 全局 CSS 约四千行，多个旧页面样式混合 | `src/app/globals.css` |
| build 配置忽略类型和 lint 错误 | `next.config.ts` |
| 根布局使用 ThemeProvider、PageViewTracker、Toaster，已有 main | `src/app/layout.tsx` |
| 根元数据仍含 `edisonwhale.com` | `src/app/layout.tsx`；不能推断该域当前重定向情况 |
| 未确认真实音乐/照片集合 | `public/` 资产清单；不得将来源不明图片自动归类为个人摄影 |

先前只读检查时原仓库 clean。**每次开始实施前必须重新检查 git 状态**，保护期间出现的用户改动。

## 4. 范围

### 首版必须交付

1. 六页统一的公共导航、主题、页脚、内容宽度和视觉语言。
2. 首页互动收藏台：现有头像、项目卡、简历纸、对话气泡、唱片、空相框；具备真实链接和输入方式降级。
3. Projects 列表、现有 track 筛选、稳定详情地址；详情仅使用已有事实。
4. 三个 featured 项目的同系列概念封面，清楚区别于产品截图。
5. Resume 小优化并保持 PDF/追踪/阅读兼容。
6. Ask 视觉适配及与实际请求状态同步的轻量反馈，不改变 API 协议。
7. Music、Photos 完整且诚实的空状态。
8. 内容结构、动效规范、必要回归验证和维护文档。

### 首版不做

- 文章、书架、登录、后台编辑器、CMS、数据库迁移。
- 音乐 OAuth、播放队列、跨页播放器、真实音频播放系统。
- 没有照片时预先实现完整 lightbox、图片上传和 CDN 管线。
- 自由拖动物件、三维房间、滚动劫持、复杂 Rive 角色、必须等待的片头。
- 跨路由共享元素无缝变形承诺；先单独验证可行性再决定。
- Ask 新检索系统、模型切换、新 citation 协议或 tracking 重构。
- 编造项目指标、公开链接、工作经历、歌曲偏好、个人照片。

## 5. 已冻结的产品决策

| 决策 | 取舍与约束 |
| --- | --- |
| 导航文案 Ask，地址保留 `/chat` | 无需改旧链接和 `?q=` 行为 |
| Projects 首版包含紧凑详情页 | 内容不足时页面简短，不虚构长案例 |
| 单一显式项目 slug | 标题变更不影响 URL，不再另加重复 id |
| 复用 Framer Motion + CSS | 不同时引入第二套动画引擎 |
| 保留现有头像，仅轻量运动 | 不要求重新绘制复杂角色资产 |
| 使用明暗两套语义色 | 默认主题和存储行为沿用现状，除非另有明确决定 |
| 音乐、照片初始数据为空 | 不添加演示条目或不可用播放控件 |
| 页面内容语言沿用英文 | 规范文档中文；不增加双语系统 |

## 6. 实施前待核对项

- 生产站的正式主域、`www` 规范与旧域 redirect：用户提供 `https://www.simondxu.com/`，将其作为拟定主域；不能自动假定 apex 或旧域配置。
- 现有 Ask prompt/tools/fallback 实际输出哪些字段，确认公开边界，不读 `.env` 值。
- 根与各页已有导航/main/provider 归属；避免重复导航、嵌套 main 和重复追踪。
- 当前安装、类型/lint/build 基线和已有用户修改。

这些是实施前核对，不应被理解为需要重新询问已经确定的六页范围、空状态或工具选择。

## 7. 授权与历史草稿

本组文档只提供计划，不自动授权代码实施或任何 Git/外部操作。开始实施需用户后续指令；提交、推送、PR、部署仍分别遵守用户授权。

暂停前存在 `/private/tmp/simon-studio-redesign` 临时副本及少量草稿，曾提交概念图生成请求。它们**不是本规格的已批准实现或验收证据**，不得整体复制回原仓库。原仓库没有因此改动。

## 8. 评审状态

Terra 已对先前架构方案完成两轮基于证据摘要的评审。修订方案没有剩余阻断级架构问题；三项必须落实：Ask 公开字段审计、main 布局归属、SEO 域名验证与回退点。

这不等同于代码、安全、性能或生产验收通过。本组文档最终检查结果由交接说明记录。
