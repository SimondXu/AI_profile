# Subagent 实施任务与验收计划

关联：[需求与授权](README.md) · [设计规范](design-spec.md) · [架构契约](architecture.md)

**当前状态：计划就绪，尚未授权代码实施。** 以下任务包用于用户后续要求实施时派工；不得因文档存在就开始编程。

## 1. 协作规则

### 角色

- 主 agent：架构、共享接口、产品范围、权限、整合与最终验收。
- Luna medium：所有本地文件阅读、搜索、现状/差异/日志证据整理；不能用“已读取”替代向实施者提供真实片段。
- Implementer：在冻结接口和指定文件范围内写代码。需要本地上下文时向主 agent 请求 Luna 读取，不自行绕过用户要求。
- Terra：稳定方案或实现差异的独立 review。需要本地证据时由 Luna 提供，不直接读取。

执行命令可以隐式使用编译器读取文件；用户指定的显式源码、配置和日志检查仍交给 Luna。主 agent 可根据 Luna 传回的原始片段做最终判断。

### 信息传递

若 subagent 无法直接给另一个 subagent 发消息，由主 agent 转发。不得用用户可见的新任务/线程工具替代内部协作。上下文包必须含精确源码或可靠摘要、路径和必要行号；接收方看不到其他 agent 的工具输出。

### 派工包必填

1. Objective：具体结果。
2. Scope / non-goals：可改文件、不能碰的系统。
3. Evidence：Luna 返回的相关源码、接口和最新 git 状态。
4. Frozen contracts：props、数据字段、路由、token、状态责任。
5. Acceptance：可验证完成条件。
6. Verification：实际可运行的 focused checks；未知命令先核对。
7. Escalation：何时停止依赖工作并交主 agent 决定。

每个 writer 明确“并非独自在仓库工作，不得覆盖或还原他人修改”。所有共享文件只有一个 owner；不能多个 writer 同时改 root layout、config、schema、全局样式和锁文件。

## 2. 开始实施前的门槛

- 用户明确要求进入代码阶段。
- Luna 重新核对原仓库身份和 dirty 状态；不依赖前一日 clean 结论。
- 确认可写位置。当前会话可写根不包含 AI_profile，必须使用环境允许的写入审批；不能因路径限制改到 Sidekick。
- 忽略临时草稿为实现基线，不将整个临时副本复制回原仓库。
- 读取本组文档和最新适用仓库指令，确认范围无变化。
- 没有冻结共享契约前，不并行写公共文件。

## 3. 分阶段任务包

### P0：证据与基线（Luna + 主 agent）

**Change：** 尚不改行为，产出当前路由、layout/provider、数据流、样式和调用者清单。

**读取范围：** README、CLAUDE/AGENTS、package/lock、next config、root layout、目标 pages、site nav、Chat 入口与 display props、config type/schema/parser、相关 tracking 调用。

**Verify：**

- 记录原始工作区改动，保护它们。
- 核对 scripts：现有 dev/build/start/lint；当前 lint 为 `next lint`，需要实测其在安装版本下是否可用，不能直接宣称通过。
- 记录 `pnpm exec tsc --noEmit`、`pnpm lint`、`pnpm build` 的基线结果；环境缺失或失败单独报告，不顺手升级依赖。
- 检查现有公开 URL 与 query 行为；无模型凭据时只验证 fallback，不声称真实流式模型通过。
- 列出进入 prompt/tools/fallback 的公开字段清单。

**完成条件：** 所有后续 writer 能拿到必要源码；不可验证项有原因和补验方式。

域名门槛：若 canonical origin 没有生产证据确认，P5 中的 SEO 域名改动标记 deferred，不能用猜测替换旧域。此项不阻止其他已确认页面实施，但最终不得宣称 SEO 全部完成。

### P1：数据身份与公开壳层契约（单 writer，主 agent 审核）

**Change：** 为八项项目添加 slug；冻结 presentation mapping、空内容类型和 token 名称；公共路由迁移。

**唯一所有权：**

- `portfolio-config.json`
- `src/types/portfolio.ts`
- `src/lib/config-schema.ts`
- 必要的 `src/lib/config-parser.ts` 兼容调整（不是重写）
- `src/content/project-presentation.ts`、`music.ts`、`photos.ts`
- `src/app/layout.tsx`、`src/app/(public)/layout.tsx`
- 原 page 到 public route group 的搬迁，仅此任务可完成

P1 唯一负责将既有公开 page 移到 route group 并移除原位置对应 page、确认 URL 不变。P1 完成前，P3 writer 不得创建任何对应公开 page。新增 Music/Photos 路径的归属在 P1 交接中列清，实际页面由 P3C 在迁移完成后创建。

`project-presentation.ts` 的所有权按阶段交接：P1 只建立冻结类型、空映射或已确认短标题；P1 完成后由 P5 唯一持有该文件和图片资产，其他任务提交请求而不直接编辑。P3B 始终只消费映射。

**禁止：** Chat API/tracking 改造、数字索引/动态标题 slug、添加假内容、CMS。

**Verify：** JSON/schema 可解析，slug 唯一；原 parser/tool 消费者兼容；六页路径不会重复注册；nav/main/provider 的归属明确；原 query 和 PDF 路径不变。

**交接冻结：** 向所有 writer 提供新 page 位置、公共壳层是否已注入 nav/footer、内容模块准确导出、token、主题作用域。

### P2：设计基础与公共导航（一个 writer）

**Change：** 公开作用域 token、公共容器、nav/footer、主题切换、局部 MotionConfig。

**Owner：** `src/components/site/` 必要文件、`src/components/motion/`、公共 studio token 样式；如需公共 layout import，由 P1 owner/主 agent整合。

**Verify：** Light/Dark、390/768/1024/1440px、菜单键盘与焦点、当前项、六页链接；不污染 tracking；主题 storageKey 保留。

**完成条件：** 静态页面先成立，关闭动效也有完整内容。此后 feature writer 不再改公共 token 或导航。

### P3A：首页与收藏台（Implementer A）

**Owner：** `src/components/landing/landing-page.tsx` 及必要首页子组件、`src/components/studio/collection-desk.tsx` 与局部 CSS Module、Home route 的组合代码。

**输入：** P1/P2 冻结内容导出和 shell；现有头像路径；项目 presentation mapping。

**Change：** 按设计规范完成 hero、五物件、精选项目、About/Experience 和旧锚点。

**Verify：** 链接可键盘/触屏访问；label 无遮挡；pointer motion 不使用每帧 React state；reduce-motion 无视差；首屏无虚假播放/照片；无完整简历重复堆叠。

### P3B：Projects 与详情（Implementer B，可与 P3A 并行）

**Owner：** public Projects route、`[slug]/page.tsx`、`src/components/projects/` 内实际新/替换展示组件及 CSS Module。

**输入：** 已冻结 slug、loader API、presentation map；概念封面由主 agent 统一管理。

**Change：** 项目网格、track query、详情页、每页 metadata。

**Verify：** 8 项准确；track 来回切换/刷新/返回一致；无效 slug 为 404；缺图可读；无虚构 CTA；概念图说明正确；长标题不溢出。

**禁止：** 自己重新定义 config schema、复制事实文本、修改共享图片映射或生成额外项目能力。

### P3C：音乐与照片空态（Implementer C，可与 P3A/P3B 并行）

**Owner：** public Music/Photos routes、`src/components/music/`、`src/components/photos/` 及各自局部 CSS。

**输入：** P1 空数组类型、P2 token/shell。

**Change：** 两个完整页面的空状态、唱片/相框视觉与轻量反馈。

**Verify：** 无假内容、无不可操作播放/上传控件、无客户端外部请求；窄屏可读、reduce-motion 静态。

**禁止：** 预建播放器、lightbox、OAuth、媒体 API 或新增依赖。若要改空数组契约，先经主 agent。

### P4：Ask 与 Resume（单 writer，避免状态回归）

**Owner：** public Chat/Resume route；`src/components/chat/chat-landing.tsx`、`chat-bottombar.tsx` 及实际必要的展示文件；Resume 的现有视图文件（Luna 精确定位后列入 packet）。

**Change：** 统一视觉与必要头像反馈；保留原消息、tools、scroll、download/tracking 语义。

**高风险文件：** 若必须改 `chat.tsx`、`simple-chat-view.tsx` 或 tool renderer 的行为，先给主 agent 说明原因与最小差异，不直接重写。

**Verify：** `?q=` 不重复发送、长消息滚动、输入框不遮挡、真实状态与动画一致；无 key fallback、未知问题、错误路径；简历复制/打印/PDF 下载/追踪。

### P5：概念资产与 SEO（主 agent 持有最终决定）

**Owner：** `public/images/projects/`、presentation artwork 路径、root metadata 和实际 sitemap/manifest 等。

**Change：** 生成并优化三张概念封面；核对生产域名后调整正确元数据。可与 feature 编写错开，但 presentation map 修改由同一 owner 串行完成。

**Verify：** 图像对应项目、无乱码/假UI、尺寸与文件大小明确、所有本地引用存在；每路由 canonical/OG 正确，无重复 canonical；旧域行为有实际证据。

**禁止：** 为验证域名而擅自修改 DNS、hosting、redirect 或部署。无法核对时 SEO 域名修改明确延期。

### P6：整合与独立评审（主 agent + Luna + Terra）

**Change：** 合并共享接口、修复真实问题，移除仅因本次变更而失去用途的 import/组件。

**Verify：** 下述验收矩阵，单独 tsc/lint/build/diff-check；Luna 提供稳定完整差异和关键片段，Terra review 后修复再检查。

不批量清理 4000 行 CSS，不升级包，不处理无关 tracking 重构。遗留问题单独记录。

## 4. 并行与共享文件锁

先串行完成 P0/P1/P2，再按实际上下文复杂度开启 P3A/B/C。三个并行 lane 是最大建议，不是必须数量。P4/P5 可在明确无文件冲突时进行。

共享文件锁：root layout、public layout、config/schema/types、presentation mapping、token 文件、package/lock、sitemap/manifest 均由指定 owner 串行修改。其他 writer 只提出 patch 请求，由 owner 整合。

任何 agent 遇到以下情况停止对应依赖工作并上报：未知 props、需要改变 API、共享文件已被修改、无法证明事实、需新增包、需非公开数据、测试显示旧功能回归。不要以方便实现为理由扩大范围。

## 5. 验收矩阵

| 分类 | 检查 | 通过标准 |
| --- | --- | --- |
| 内容 | 对比现有职业资料 | 无新增未经证实事实；8项目保留 |
| 数据 | JSON/Zod/slug/映射/媒体字段 | 校验成功、slug/id 唯一、无悬空映射；媒体 URL/路径与正整数尺寸符合架构边界 |
| 路由 | 六页及项目详情直达、刷新 | 正常加载；无效详情为404 |
| 兼容 | 旧锚点/query/PDF/API | 行为保持，前后退正确 |
| 布局 | 390/768/1024/1440 | 无横向溢出、遮挡、导航挤压 |
| 主题 | 深浅主题及持久化 | 对比度清楚、无主题闪烁/水合错误 |
| 键盘 | Tab/Enter/Space/Escape 适用操作 | 无陷阱、焦点可见、菜单正确关闭 |
| 动效 | reduced-motion、touch、快速连续导航 | 内容完整、无残留遮罩/不可点击状态 |
| Home | 全部物件入口与标签 | 任一输入方式均能进入目标 |
| Projects | track/filter/back/长标题/无图 | 数据一致且可读 |
| Ask | q、fallback、长回答、tool/error/中断 | 无重复请求、无虚假thinking、旧协议兼容 |
| Ask公开边界 | prompt/tools/FAQ字段审计 | 主 agent 可解释实际公开字段，无媒体自动接入 |
| Resume | 复制、打印、PDF、tracking | 原功能保持，无动画导致内容缺失 |
| Media | 零数据 | 清楚空态，无假音频、假照片、假控件 |
| SEO | canonical/OG/JSON-LD/sitemap | 实际域名证据一致，详情有独立元数据 |
| 资产 | 大小、尺寸、lazy、alt | 无破图，布局预留，概念图可识别 |
| 回归 | tracking界面与相关请求 | 无公开CSS污染/重复追踪；无可用环境时记录未验证 |
| 工程 | tsc、lint、build、diff check | 新增问题为零；基线失败与未运行项单列 |

### 性能目标与测量边界

按相同环境比较改前改后；记录设备模拟、网络条件、页面及工具版本。目标参考 LCP≤2.5s、CLS≤0.1，运行时无明显输入阻塞。没有真实用户数据时，不声称生产 INP 达标。

重点看首屏图片、动画 bundle、意外长任务和布局跳动；避免加入大型 3D 依赖。页面静止后不应存在不必要的持续动画工作。Lighthouse 数字是实验数据，不能等同于线上所有访问。

### 检查命令注意事项

拟使用现有包管理器执行 `pnpm exec tsc --noEmit`、`pnpm lint`、`pnpm build`、`git diff --check`。命令是否可用先由 P0 验证。build 忽略类型/lint 是现状，不能用 build 代替两者。

仅对关键契约增加有意义的测试（slug唯一、配置、路由筛选等）；选择仓库可用工具后再冻结具体命令，不为颜色常量或静态文案新增镜像测试。

浏览器检查使用实际本地服务。若没有真实模型凭据，fallback 验证单列，真实 OpenRouter streaming/tools 标记未验证；不得从临时副本复制秘密来绕过环境限制。

## 6. 交接模板

每个任务完成后返回：

- 改动文件与每个改动对应的需求。
- 已保持的契约、实际变更的接口。
- 运行命令、结果、失败原因与基线对比。
- 浏览器检查的页面、视口、主题、输入方式。
- 未运行项与环境限制。
- 需要主 agent 整合的共享文件请求。
- 已知风险及后续任务，不夸大为“全站通过”。

主 agent 在最终交接中区分静态检查、浏览器检查、真实后端、生产验证。未经授权不 commit、push、PR、deploy。

## 7. 回退和止损

以阶段为单位保留可审查差异，不进行未经授权的 Git 提交。回退只针对本任务明确产生的改动，保留用户修改，不能使用 destructive reset/clean。

若 route group 迁移影响 tracking 或 Chat，先停止后续动效，恢复已知兼容边界再解决。若跨页面过渡必须改底层路由缓存或引入高复杂度，维持首版正常导航，不临时扩大架构。
