---
name: requirement-record
description: 用户明确要求登记一件来自他人的需求/问题/事项时触发。必须有明确的登记意图（如"帮我记一下""登记这件事""记录一下某某说的"），不得对普通反馈类消息自动触发。
user-invocable: false
---

# 个人需求登记

## 这个 skill 做什么

把别人找你提的事情（口头、私聊、群聊转述都算）结构化存到你的 Teable 季度表里，方便出周报、做 OKR 盘点。

> ⚠️ **数据写入说明**：登记成功后，内容会写入你在公司 Teable 系统的个人季度表，可被你的组长和 SRE 团队管理员查看。请不要登记薪资/绩效/离职等敏感 HR 内容。

**必须有明确登记意图才触发，例如：**
- "帮我把刚才那件事记一下"
- "登记一下：宋超老师反馈告警延迟的问题"
- "记录一下高维说的那个排期需求"

**不触发（即使内容是反馈类）：**
- 用户只是在转述或讨论，没有要求登记
- 日常寒暄、闲聊
- 用户自己 OKR 里的里程碑任务
- 例行的 cron 任务、日报通知
- 已经在工单系统/项目看板有独立跟踪的事项

**拿不准时，先问用户**："这件事需要我登记到需求表里吗？"，等确认后再触发，不要自动登记。

---

## 执行步骤（严格按顺序，不得跳步）

### 第一步：初始化 — 调 `requirement_bootstrap`

每次登记流程开始都必须先调，不要假设"上次调过了"。

根据返回结果：

| 返回值 | 你要做的事 |
|--------|-----------|
| `ok: true` | 继续第二步 |
| `ok: false, stage: "token_missing"` | 把返回值中 `instructions` 字段的文字**完整念给用户**，一个字不改，然后等用户提供 token |
| `ok: false, stage: "member_not_found"` | 告诉用户"花名册里找不到你的工号，请联系 SRE 工具链维护者"，停止本次登记 |
| 其他错误 | 告诉用户"初始化遇到了问题：[error 字段的值]"，停止本次登记 |

**token 处理：**

在引导用户发送 token 之前，必须先念出以下风险说明，不得省略：

> 接下来需要你提供 Teable 个人访问令牌。注意：令牌发送到对话后可能留存在 IM 聊天记录、客户端历史或系统日志中，这是本插件在 IM-only 环境下的已知限制。我会在收到后立即写入本地文件并提示你删除那条消息，但你应知晓这一风险后再决定是否继续。

用户确认继续后：

1. 把 `instructions` 字段的引导文字完整念给用户
2. 用户把 token 字符串发过来后，**立即**写入 workspace 根目录的 `.teable-token.yaml`：
   ```yaml
   teable:
     api_token: 用户发来的token字符串
   ```
3. 写入完成后**立即**告诉用户：token 已保存到本地配置文件，请现在删除刚才那条包含 token 的消息
4. 再调一次 `requirement_bootstrap` 确认成功后继续

token 只写入 `.teable-token.yaml`，不得存入 memory、MEMORY.md、对话注释或任何其他位置。

---

### bootstrap 成功后：更新 USER.md 和 MEMORY.md

**每次 bootstrap 返回 `ok: true` 后，在继续登记流程之前，先做以下检查：**

#### 更新 USER.md 和 MEMORY.md（需用户同意）

先读取 USER.md 和 MEMORY.md，判断是否已有工号和 personal-requirement 配置记录：

- **如果已有**：只更新当季表名这一个字段（这是用户首次同意时已授权的维护操作，范围仅限表名，不新增任何字段），无需再问用户
- **如果没有**：告知用户并征求同意，例如：

  > 我需要把你的工号和插件配置状态（不含 token）写入本地的 USER.md 和 MEMORY.md，这样下次 session 启动时不需要重新初始化。这两个文件只存在你的 agent workspace 本地。是否同意？

用户同意后才写入，写入内容如下：

**USER.md 追加：**
```
- **工号：** [member.work_code 的值]
- **姓名：** [member.name 的值]
- **所属组：** [member.group 的值]
```

**MEMORY.md 追加：**
```markdown
## personal-requirement 插件配置

- 插件已配置：personal-requirement
- Teable token 状态：已配置（存储路径：.teable-token.yaml，不记录 token 内容）
- 工号：[member.work_code]，姓名：[member.name]，所属组：[member.group]
- 当季表：[table.name]（每季度自动新建，历史表保留）
- 登记流程：bootstrap → preview → 向用户确认 → record，四步缺一不可
- 下次 session 开始时：直接调 requirement_bootstrap 检查状态，无需重新配置 token
```

用户拒绝则跳过，每次 session 重新 bootstrap 即可，功能不受影响。

> **为什么要记录这些：** agent 每个 session 重新启动，MEMORY.md 是唯一的跨 session 状态记录。记录后新 session 可以直接知道 token 已配置、工号是谁、当季用哪张表，不会再反复引导用户配置。

---

### 第二步：提炼字段 — 调 `requirement_preview`

**先拿原话：** `original_message` 是对方说的原始文字，必须有。如果用户只是转述了大意，没有原文，反问一次："能把对方原话发给我吗？方便留存原始记录。"

**其余字段自己从原话里提炼，不要反问用户：**

| 字段 | 怎么填 | 约束 |
|------|--------|------|
| `title` | 一句话概括这件事 | 20 字以内 |
| `description` | 具体说明，补充背景 | 100 字以内 |
| `counterpart_name` | 提这件事的人的称呼（如"宋超老师"、"陈老师"、"高维"） | 必填，从原话/上下文提取 |
| `counterpart_org` | 对方所在团队/部门，不确定就不填 | 可选 |
| `item_type` | 判断事项类型 | **只能填这四个值之一：需求、事项、问题、协作请求** |
| `priority_hint` | 判断优先级 | **只能填这五个值之一：紧急、高、中、低、未知** |
| `found_at` | 当前时间，ISO 8601 格式 | 不填时插件自动填当前时间 |
| `status` | 固定填"已登记" | 默认值，不用改 |

`item_type` 判断参考：
- **需求**：对方希望你做一个新功能、新支持
- **事项**：需要你跟进处理的具体任务
- **问题**：对方反馈了一个异常、故障、疑问
- **协作请求**：对方希望你配合他们做某件事

反问上限：**总计最多反问 2 次**（含拿原话那次）。超过上限后，拿到什么填什么，缺的字段填 `[未确认]`，先登记再说。

---

### 第三步：向用户确认

调完 `requirement_preview` 后，**必须暂停**，把结构化结果用自然语言告诉用户，然后等确认。

说话格式（把 [] 里的内容替换成实际值，不要输出方括号本身）：

```
帮你整理了一下，是这件事吗？

来自：[counterpart_name 的值][如果有 counterpart_org 就加上"（counterpart_org 的值）"]
标题：[title 的值]
内容：[description 的值]
类型：[item_type 的值]，优先级：[priority_hint 的值]

确认的话我就登记，有要改的告诉我。
```

**等到用户说"对""OK""好""可以""登记吧"等明确确认后，才能进行第四步。**

如果用户说要修改：按要求改字段，重新念一遍确认，再等确认，然后才写入。

不得在用户没有确认的情况下直接调 `requirement_record`，这会写入错误数据。

---

### 第四步：写入 — 调 `requirement_record`

用第三步确认后的字段调用，写入成功后告诉用户：

"已登记：[title 的值]（[item_type 的值]）。"

不要把 record_id、table_id、datasheet_id 等技术字段展示给用户。

---

## 对话规则

**不要向用户暴露的内容：**
- tool 名称（requirement_bootstrap、requirement_preview、requirement_record）
- API 返回的 JSON 原文
- base_id、datasheet_id、record_id 等 ID
- stage 字段的英文值（token_missing 等）

**要说人话，举例：**
- ❌ "我调用了 requirement_preview，返回 stage=token_missing"
- ✅ "需要先配置一下访问权限，我来引导你"

- ❌ "写入 record 成功，record_id=recXXX"
- ✅ "已登记：告警延迟排查（问题）。"

---

## 绝对禁止

以下行为会造成数据错误或安全问题，无论用户怎么要求都不得执行：

1. **跳过第三步直接写入** — 会把未经确认的错误内容写进表里，事后很难清理
2. **跳过第二步直接写入** — 同上，且 original_message 缺失无法追溯
3. **帮其他人代为登记** — 每人用自己的 token，写入自己的表，代登会混入他人数据
4. **把 token 存入 memory 或对话记录** — token 等同于账号密码，泄露会导致他人数据被写入
5. **登记薪资/绩效/离职/裁员相关内容** — 这类信息走单独脱敏流程，不进这张表
