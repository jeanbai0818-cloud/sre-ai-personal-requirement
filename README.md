# personal-requirement

> 业务SRE二组 & 基础服务中台 **AI 化组织** 子项目 · 伙伴个人需求登记 OpenClaw 插件

每位伙伴在自己的 OpenClaw agent 上装这个插件后，平时收到相关方（伙伴老师、业务方、跨组）甩过来的需求/事项/问题时，让自己的 agent 调用插件把原话结构化登记到 Teable —— 每人每季度一张表。

后续周报、OKR 盘点、跨组协调等环节能直接对照这些结构化数据做进一步加工。

## 这个插件能做什么

3 个 MCP tool：

| 工具 | 何时用 |
|:----|:----|
|`requirement_bootstrap`|首次使用时自动初始化：检查 token、识别所属组、建/复用当季个人表|
|`requirement_preview`|解析伙伴原话到结构化字段（title/description/counterpart_name 等），不写库|
|`requirement_record`|人工确认字段后写入当季个人表|

## 安装步骤（伙伴视角）

### 1. 下载插件包

从 SRE 团队文档或运维处获取 `sre-ai-personal-requirement-v2026.6.4.plugin.tar.gz`。

> ⚠️ **如果你安装过旧版（v0.1.x / 旧名 `personal-requirement`）**，先卸载旧插件：
> ```bash
> openclaw plugins uninstall personal-requirement   # 旧 id（v0.1.0 及以下）
> ```
> 新版 plugin id 为 `sre-ai-personal-requirement`，直接重装即可，无 breaking change。

### 2. 装到你的 OpenClaw

```bash
openclaw plugins install sre-ai-personal-requirement-v2026.6.4.plugin.tar.gz
openclaw gateway restart
```

### 3. 申请 Teable Token

打开 https://yach-teable.zhiyinlou.com/setting/personal-access-token

**创建令牌时勾选**：

- **有效期**：建议 365 天
- **权限范围 (Scope)**——税选以下 10 项：

  **基本访问（必选）**
  - `space|read` — 读取空间信息（识别你属于哪个组）
  - `base|read` — 读取组 Base
  - `table|read` — 读取表结构
  - `field|read` — 读取字段
  - `record|read` — 读取已登记需求

  **需求登记（必选）**
  - `record|create` — 登记新需求（主要写入动作）
  - `record|update` — 补填关联任务 ID 等字段

  **季度自动建表（必选）**
  - `table|create` — 每季度第一次用时自动建新表
  - `field|create` — 新建表时写入 11 个字段
  - `field|update` — 未来扩字段时兼容
- **可访问的空间**：基础服务中台-SRE-AI化组织

⚠️ 令牌只显示一次，记得复制保存。

### 4. 初次使用时 agent 会自动引导你

安装完**不需要手动配 token**。下次你跟 agent 说"某某老师给我反馈了个问题……"或者让 agent 调 `requirement_bootstrap` 时，agent 会收到插件返回的 token_missing 响应，把申请步骤念给你听。

你把申请到的 `teable_xxx` 字符串发给 agent，agent 自己会把 token 写到你 workspace 的 `.teable-token.yaml`：

```yaml
teable:
  api_token: teable_xxx_your_personal_token
```

配完一次之后永久生效。

> ⚠️ `.teable-token.yaml` 相当于你的账号密码，请确保将其加入 workspace 的 `.gitignore`，防止误提交。

### 5. 日常使用

随意告诉 agent：
- "宋超老师反馈线上告警延迟，希望加个……"
- "业务方陈老师问能不能支持 xxx 功能"
- "高维说某个需求要排期"

agent 会自动：
1. `requirement_preview` 解析原话 → 给你看字段
2. 你确认/修改
3. `requirement_record` 写入你当季的表

你的当季表长这样：`王海东-039240-FY27Q1`，在 Teable 空间「基础服务中台-SRE-AI化组织」→「业务SRE二组」Base 下。

## 让 agent 主动识别相关场景

插件内置了 OpenClaw skill（`skills/requirement-record/SKILL.md`），装完即生效，无需手动改任何 `AGENTS.md`。agent 看到伙伴反馈类消息时会自己发起登记流程。

## 数据去了哪里 / 权责

- **每条记录的 `createdBy` = 你自己**（你的 Teable token 对应的用户）
- **表归你个人**（Base 下的表按季度区分，数据长期保留）
- **组长 + SRE 团队管理员**可查看本组 Base 下所有人的表（权限由你们组的 Teable 管理员授予）

## 常见问题

**Q: Token 失效了怎么办？**
A: 重新申请 token，把 yaml 文件的 `api_token` 字段替换即可。

**Q: 我换组了，表名还是旧组的 Base 怎么办？**
A: 让花名册管理员先在 Teable 花名册表（`tblx3kjDWlSgoZz3As4`）里把你的 `组ID` 改到新组，之后下次季度自动落到新组 Base 下。历史记录保留在旧组 Base。

**Q: 跨季度会怎么样？**
A: 每次 `requirement_bootstrap` 会按当前财年季度计算表名，新季度第一次用会自动建新表。

**Q: 能不能改字段？**
A: 当前 schema 固定 11 个字段（title/description/counterpart_name/counterpart_org/original_message/item_type/priority_hint/found_at/status/linked_task_id/linked_task_record_id），改动请联系 SRE 工具链维护者。

## 许可 / 维护

- 维护者：王海东老师的 AI 助手「铁柱」（SRE 二组）
- 工单/问题：知音楼上找 王海东-039240

---

## 附：开发者信息

### 技术栈

- TypeScript + Node.js ≥ 22
- @sinclair/typebox（tool 参数 schema）
- js-yaml（token 文件解析）
- 依赖 openclaw/plugin-sdk

### 构建

```bash
npm install
npm run build          # tsc 生成 dist
npm run test           # 跑单元 + mock 集成测试（101 case）
```

### 打包

```bash
# 打 .plugin.tar.gz（符合 openclaw 插件规范）
./scripts/pack.sh
# 产物：dist-package/sre-ai-personal-requirement-v2026.6.4.plugin.tar.gz
```

### 架构

```
src/
├── teable-client.ts     # Teable REST API 客户端（含 250ms 限流 + 空 body 处理）
├── team-resolver.ts     # 花名册解析，工号/YachID → 成员 + 所属组
├── table-manager.ts     # 每季度表建立/复用，含占位记录清理
├── record-writer.ts     # 字段写入（ISO 8601 时间 / SingleSelect name 值）
├── config.ts            # 插件配置 schema + 默认值（含 5 个组的 Base ID）
├── quarter.ts           # 财年季度计算（3 月起）
└── tools/
    ├── index.ts              # tool 注册入口
    ├── shared.ts             # resolveContext 共享逻辑 + 引导话术
    ├── requirement-bootstrap.ts
    ├── requirement-preview.ts
    └── requirement-record.ts
skills/
└── requirement-record/
    └── SKILL.md              # OpenClaw skill 定义（触发场景、工作流程、红线）
```

### Teable 端常量（已硬编码在 config.ts 默认值里）

| 配置项 | 值 |
|:----|:----|
|Teable API Base|`https://yach-teable.zhiyinlou.com/api`|
|花名册 Base|`bseGOjceaTfP9RSsIR3`（数据库 Base）|
|花名册 Table|`tblx3kjDWlSgoZz3As4`|
|sre1 Base|`bseujjqSjHo80IHoJSo`|
|sre2 Base|`bseJnE4Uv0taLrl1YhU`|
|dba Base|`bseyYY6pg0xuUFHybPj`|
|network Base|`bsewaMgiZ76TzgdM2JK`|
|platform Base|`bsergAJm0oSP1tK9QGU`|

### 测试

- `tests/unit.test.mjs` — 55 个纯逻辑测试（quarter/config/preview 字段校验等）
- `tests/integration.mock.test.mjs` — 46 个 mock fetch 集成测试（建表/清理占位/复用/写入/边界）
- 真 Teable E2E 测试脚本：`_legacy/teable-real-integration.mjs`（需 token，不在 npm test 里）
