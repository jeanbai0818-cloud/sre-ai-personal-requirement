/**
 * Agent instructions supplement for personal-requirement plugin.
 *
 * 这段内容会在插件加载后、每次生成 agent system prompt 时，
 * 通过 api.registerMemoryPromptSupplement() 自动注入到 agent 的上下文里。
 *
 * 不需要任何 agent 手动改自己的 AGENTS.md。
 *
 * 注入条件：至少有一个本插件的 tool（requirement_bootstrap / requirement_preview
 * / requirement_record）在当前 agent 可用。全都不可用时不注入（避免无关 agent 被污染）。
 */
/** 本插件注册的 3 个 tool 名字，用于 availableTools 判断。 */
const PLUGIN_TOOL_NAMES = new Set([
    "requirement_bootstrap",
    "requirement_preview",
    "requirement_record",
]);
/**
 * 返回 agent 指令正文。仅当至少有一个本插件 tool 可用时注入。
 *
 * 内容组织原则：
 * - 5 大块：触发场景 / 工作流程 / 反问上限 / 前台话术 / 红线
 * - 每块尽量精炼，避免 system prompt 膨胀
 * - 只讲"什么时候调 / 怎么调 / 不要怎么调"，不讲实现细节
 * - 对话约束（人话 vs API 细节）优先级最高，放前面
 */
export function createAgentInstructionsBuilder() {
    return ({ availableTools }) => {
        // 条件注入：本插件 tool 至少 1 个可用才注入
        if (!hasAnyPluginTool(availableTools)) {
            return [];
        }
        return [
            "## 个人需求登记工具（personal-requirement 插件）",
            "",
            "本 agent 提供 3 个 tool：`requirement_bootstrap` / `requirement_preview` / `requirement_record`，用于把伙伴/业务方提出的个人需求登记到 Teable。",
            "",
            "### 触发场景（何时该主动建议登记）",
            "",
            "- 伙伴/老师/跨组同事提出新需求、协作请求、问题反馈（口头/私聊/群聊转述）",
            "- 业务方甩了一个事、要你跟进",
            "- 已知不属于自己主线 OKR、但又答应帮忙的事项",
            "",
            "**反向不适用**（不要调）：",
            "- 闲聊、日常寒暄",
            "- 自己主线 OKR 的里程碑（由 OKR 任务系统管理）",
            "- 稳定运行的例行 cron/日报通知",
            "- 已在项目看板/工单系统独立跟踪的事项",
            "",
            "### 工作流程",
            "",
            "1. **第一次用先 bootstrap**：调 `requirement_bootstrap`。如返回 `ok: false, stage: \"token_missing\"`，把返回的 `instructions` 字段**原样读给用户**（里面有完整申请 token 话术），不要自己总结。用户贴来 token 后写到 `<workspace>/.teable-token.yaml`（插件自动管理），再调一次 bootstrap 确认初始化成功。",
            "",
            "2. **登记流程（两步走）**：",
            "   - 收到伙伴反馈 → 调 `requirement_preview`（必填 `original_message` / `title` / `description` / `counterpart_name`）",
            "   - Preview 返回结构化字段后，**必须停下来用人话念给用户确认**：",
            "     ```",
            "     帮你理解成这样，看对吗？",
            "     - 谁说的：{counterpart_name}（{counterpart_org}）",
            "     - 什么事：{title}",
            "     - 具体内容：{description}",
            "     - 类型：{item_type}",
            "     - 优先级：{priority_hint}",
            "     ——确认后我登记，要改的地方告诉我。",
            "     ```",
            "   - **只有收到\"对/OK/可以/登记吧\"等明确确认后**，才调 `requirement_record` 写入",
            "   - 禁止：preview 完静默写入 / 自作主张补全字段 / 跳过确认",
            "",
            "3. **季度滚动自动处理**：跨季度时首次调用会自动建新季度表，历史表保留。无需 cron、无需手动建。",
            "",
            "### 反问上限（字段缺失时的策略）",
            "",
            "- `original_message`（原话）**必须反问到拿到**——审计留痕用，优先级最高",
            "- 其他字段 LLM 可自行兜底：`title` / `description` 从原话提炼，`item_type` 按语义归类（需求/事项/问题/协作请求）",
            "- **总反问轮次 ≤ 2**。超限后：有什么字段登什么，其他标 `[未确认]` 先登，不要死追",
            "",
            "### 前台说人话（对话约束）",
            "",
            "- ❌ 不说：\"我调了 requirement_preview API\" / \"返回 stage=token_missing\" / \"写入 base_id bseXXX\"",
            "- ✅ 说人话：\"帮你理解了一下\" / \"先装个 token 才能用\" / \"已经登记到这个季度的表里\"",
            "- 插件返回的结构化 JSON 只给自己看，不要原样贴给用户",
            "- 错误处理：`stage=token_missing` 时把 `instructions` 字段话术直接读出来，不要二次加工",
            "",
            "### 红线",
            "",
            "- ❌ 不把 token 写进 memory、日记、代码注释、对话截图",
            "- ❌ 不登记敏感内容（薪资/绩效/离职/裁员相关）——这类走单独脱敏流程",
            "- ❌ 不代其他伙伴登记到他们表里（token 只对应自己，一人一 token）",
            "- ❌ 不跳过 preview 直接调 record（强制两步走）",
        ];
    };
}
function hasAnyPluginTool(available) {
    for (const name of PLUGIN_TOOL_NAMES) {
        if (available.has(name))
            return true;
    }
    return false;
}
//# sourceMappingURL=agent-instructions.js.map