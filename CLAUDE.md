# CLAUDE.md — sre-ai-personal-requirement 项目上下文

> 给 Claude Code 看的项目说明。每次开新 session 先读这个文件。

---

## 这个项目是什么

SRE AI 化组织的 OpenClaw 插件，功能：把伙伴/业务方通过 IM 甩过来的需求/事项/问题，结构化登记到 Teable 个人季度表。

3 个 MCP tool：`requirement_bootstrap` / `requirement_preview` / `requirement_record`

---

## 双推地址

| 目标 | 地址 |
|------|------|
| GitHub | https://github.com/jeanbai0818-cloud/sre-ai-personal-requirement |
| ClawHub | `@jeanbai0818-cloud/personal-requirement` |

**每次发版都要双推**，缺一不可。

---

## 版本号规范

格式：`YYYY.M.D`，补丁版本用 `YYYY.M.D-1`、`-2`、`-3`……

**`package.json` 和 `openclaw.plugin.json` 的版本号必须始终保持一致。**

---

## 发版完整流程

```bash
# 1. 确认两个版本号一致
grep '"version"' package.json openclaw.plugin.json

# 2. 修改代码、syntax check
node --check dist/src/xxx.js

# 3. 提交推送 GitHub
git add <files>
git commit -m "描述 (版本号)"
git push

# 4. 打包
npm pack

# 5. 发布 ClawHub（用当前 commit SHA）
clawhub package publish <tarball>.tgz \
  --family code-plugin \
  --source-repo jeanbai0818-cloud/sre-ai-personal-requirement \
  --source-commit $(git rev-parse HEAD) \
  --source-ref main \
  --changelog "本次变更说明"
```

---

## 关键标识符（不要搞混）

| 字段 | 值 |
|------|----|
| manifest id（`openclaw.plugin.json` 的 `id`） | `personal-requirement` |
| npm package name（`package.json` 的 `name`） | `@jeanbai0818-cloud/personal-requirement` |
| ClawHub Runtime ID | `personal-requirement` |
| ClawHub 安装命令 | `openclaw plugins install clawhub:@jeanbai0818-cloud/personal-requirement` |
| GitHub repo | `jeanbai0818-cloud/sre-ai-personal-requirement` |
| ClawHub publisher | `jeanbai0818-cloud`（`@sre-ai` publisher 也存在，但包名被旧历史污染，见下方说明） |

---

## 历史遗留问题说明

**为什么 ClawHub 用的是个人账号而不是 `@sre-ai`：**

第一次发布时，manifest id 错误地设为 `sre-ai-personal-requirement`（应为 `personal-requirement`），ClawHub 将其与包名 `@sre-ai/personal-requirement` 永久绑定。ClawHub 的 runtime id 一旦发布不可修改，soft-delete 也不解除绑定，所以只能用新包名 `@jeanbai0818-cloud/personal-requirement` 从头重新发布。

如果未来想迁移回 `@sre-ai` 名下：用一个**未用过的新包名**（如 `@sre-ai/sre-personal-requirement`），manifest id 继续设 `personal-requirement`，发布后即可，旧包名 `@sre-ai/personal-requirement` 无法再使用。

---

## 目录结构

```
dist/               编译产物（直接发布这个，不发 src/）
  index.js          插件入口，definePluginEntry id="personal-requirement"
  src/
    agent-instructions.js   注入 agent system prompt 的指令
    config.js               插件配置 schema + 默认值
    quarter.js              财年季度计算
    record-writer.js        写 Teable 记录
    table-manager.js        建表/复用季度表
    teable-client.js        Teable REST API 客户端
    team-resolver.js        花名册解析（工号 → 成员 + 所属组）
    tools/
      index.js              tool 注册（factory 形式）
      shared.js             resolveContext + TOKEN_BOOTSTRAP_INSTRUCTIONS
      requirement-bootstrap.js
      requirement-preview.js
      requirement-record.js
skills/
  requirement-record/
    SKILL.md        OpenClaw skill 定义（agent 行为指南）
openclaw.plugin.json
package.json
README.md
CLAUDE.md           本文件
```

---

## 常见操作速查

**更新后本地安装验证：**
```bash
openclaw plugins install .
openclaw gateway restart
```

**查看已发布版本：**
```bash
clawhub package inspect @jeanbai0818-cloud/personal-requirement
```

**查看安装日志（确认没有 ParseError）：**
```bash
openclaw logs 2>&1 | grep personal-requirement
```

**修改 JS 文件后的语法检查：**
```bash
node --check dist/src/agent-instructions.js
node --check dist/src/tools/shared.js
```
