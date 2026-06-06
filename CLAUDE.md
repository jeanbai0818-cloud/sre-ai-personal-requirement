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
| ClawHub | `@tal/personal-requirement` |

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
| npm package name（`package.json` 的 `name`） | `@tal/personal-requirement` |
| ClawHub Runtime ID | `personal-requirement` |
| ClawHub 安装命令 | `openclaw plugins install clawhub:@tal/personal-requirement` |
| GitHub repo | `jeanbai0818-cloud/sre-ai-personal-requirement` |
| ClawHub publisher | `tal` |

---

## 历史遗留问题说明

**包名演变历史（当前已稳定在 `@tal`）：**

| 时期 | npm 包名 | manifest id | 原因 |
|------|---------|-------------|------|
| 初始 | `@sre-ai/personal-requirement` | `sre-ai-personal-requirement` | id 与 unscoped name 不一致，安装有告警，已删除 |
| 过渡 | `@jeanbai0818-cloud/personal-requirement` | `personal-requirement` | 绕开 ClawHub runtime id 锁定的临时方案，已删除 |
| 当前 ✅ | `@tal/personal-requirement` | `personal-requirement` | TAL 官方组织账号，id 与 unscoped name 一致，无告警 |

ClawHub 的 runtime id 一旦发布不可修改（soft-delete 也不解除绑定），所以历史包名无法复用，只能换包名重发。

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
clawhub package inspect @tal/personal-requirement
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
